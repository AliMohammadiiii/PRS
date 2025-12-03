import logging
from rest_framework import viewsets, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_ratelimit.decorators import ratelimit
from django.db import transaction
from django.db.models import Q
from drf_spectacular.utils import extend_schema
from accounts.models import User, AccessScope
from accounts.serializers import (
    UserSerializer, 
    AccessScopeSerializer, 
    ChangePasswordSerializer,
    UserWithTeamsSerializer
)
from accounts.permissions import IsSystemAdmin
from core.views import SoftDeleteModelViewSet
from teams.models import Team
from purchase_requests.models import PurchaseRequest
from workflows.models import WorkflowStepApprover
from classifications.models import Lookup, LookupType

logger = logging.getLogger(__name__)


class UserViewSet(SoftDeleteModelViewSet):
    """
    ViewSet for managing users.
    
    System Admins can create, update, and deactivate users.
    Supports team assignment via AccessScope.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsSystemAdmin]  # Use custom permission class
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['retrieve', 'list']:
            return UserWithTeamsSerializer
        return UserSerializer
    
    def get_queryset(self):
        """Filter users with search support"""
        qs = super().get_queryset()
        
        # Search by username, email, first_name, last_name
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        # Filter by team
        team_id = self.request.query_params.get('team_id')
        if team_id:
            # Find users with AccessScope for this team
            user_ids = AccessScope.objects.filter(
                team_id=team_id,
                is_active=True
            ).values_list('user_id', flat=True).distinct()
            qs = qs.filter(id__in=user_ids)
        
        # Filter by is_active
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ('true', '1', 'yes'):
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ('false', '0', 'no'):
                qs = qs.filter(is_active=False)
        
        return qs.order_by('username')

    def update(self, request, *args, **kwargs):
        """
        Prevent deactivation of admin users via generic update (PUT/PATCH).
        Admin is defined as is_superuser or is_staff.
        """
        partial = kwargs.get('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Disallow changing admin users to inactive
        if 'is_active' in serializer.validated_data:
            new_is_active = serializer.validated_data['is_active']
            if (instance.is_superuser or instance.is_staff) and new_is_active is False:
                raise ValidationError('Admin users cannot be deactivated.')

        self.perform_update(serializer)
        return Response(serializer.data)

    @extend_schema(
        summary="Deactivate a user",
        description="Deactivates a user. Deactivated users cannot login or be assigned as approvers. "
                    "Checks if user has pending approvals before deactivation.",
        responses={
            200: UserSerializer,
            400: {'description': 'Validation error - user has pending approvals'},
            403: {'description': 'Permission denied'},
            404: {'description': 'User not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='deactivate')
    @transaction.atomic
    def deactivate(self, request, pk=None):
        """Deactivate a user"""
        user = self.get_object()

        # Never allow deactivation of admin users (superuser or staff)
        if user.is_superuser or user.is_staff:
            raise ValidationError('Admin users cannot be deactivated.')
        
        # Check if user is assigned as an approver for any active workflow steps
        # with pending requests
        active_statuses = ['PENDING_APPROVAL', 'IN_REVIEW', 'FINANCE_REVIEW']
        
        # Find steps where user is an approver
        user_step_ids = WorkflowStepApprover.objects.filter(
            approver=user,
            is_active=True,
            step__is_active=True
        ).values_list('step_id', flat=True)
        
        # Check if there are pending requests at those steps
        if user_step_ids:
            pending_requests = PurchaseRequest.objects.filter(
                current_step_id__in=user_step_ids,
                is_active=True,
                status__code__in=active_statuses
            ).exists()
            
            if pending_requests:
                raise ValidationError(
                    'Cannot deactivate user: user is assigned as an approver for requests '
                    'that are pending approval. Reassign approvers before deactivating the user.'
                )
        
        # Deactivate the user (non-admin only)
        user.is_active = False
        user.save(update_fields=['is_active', 'updated_at'])
        
        # Also deactivate all AccessScopes for this user
        AccessScope.objects.filter(user=user, is_active=True).update(is_active=False)
        
        serializer = UserWithTeamsSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Assign user to team with role",
        description="Assigns a user to a team with a specific role via AccessScope.",
        request={
            'application/json': {
                'type': 'object',
                'required': ['team_id', 'role_id'],
                'properties': {
                    'team_id': {'type': 'string', 'format': 'uuid'},
                    'role_id': {'type': 'string', 'format': 'uuid'},
                    'position_title': {'type': 'string', 'required': False}
                }
            }
        },
        responses={
            201: AccessScopeSerializer,
            400: {'description': 'Validation error'},
            403: {'description': 'Permission denied'},
        },
    )
    @action(detail=True, methods=['post'], url_path='assign-team')
    @transaction.atomic
    def assign_team(self, request, pk=None):
        """Assign user to a team with a role"""
        user = self.get_object()
        
        team_id = request.data.get('team_id')
        role_id = request.data.get('role_id')
        position_title = request.data.get('position_title')
        
        if not team_id or not role_id:
            raise ValidationError({'detail': 'team_id and role_id are required.'})
        
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            raise ValidationError({'team_id': 'Team not found or inactive.'})
        
        try:
            role = Lookup.objects.get(id=role_id, is_active=True)
        except Lookup.DoesNotExist:
            raise ValidationError({'role_id': 'Role not found or inactive.'})
        
        # Check if AccessScope already exists
        access_scope, created = AccessScope.objects.get_or_create(
            user=user,
            team=team,
            role=role,
            defaults={
                'position_title': position_title,
                'is_active': True
            }
        )
        
        if not created:
            # Reactivate if it was deactivated
            access_scope.is_active = True
            if position_title is not None:
                access_scope.position_title = position_title
            access_scope.save()
        
        serializer = AccessScopeSerializer(access_scope)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @extend_schema(
        summary="Remove user from team",
        description="Removes a user's AccessScope for a team (soft delete).",
        request={
            'application/json': {
                'type': 'object',
                'required': ['team_id', 'role_id'],
                'properties': {
                    'team_id': {'type': 'string', 'format': 'uuid'},
                    'role_id': {'type': 'string', 'format': 'uuid'}
                }
            }
        },
        responses={
            204: {'description': 'Team assignment removed'},
            400: {'description': 'Validation error'},
            404: {'description': 'AccessScope not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='remove-team')
    @transaction.atomic
    def remove_team(self, request, pk=None):
        """Remove user's team assignment"""
        user = self.get_object()
        
        team_id = request.data.get('team_id')
        role_id = request.data.get('role_id')
        
        if not team_id or not role_id:
            raise ValidationError({'detail': 'team_id and role_id are required.'})
        
        try:
            access_scope = AccessScope.objects.get(
                user=user,
                team_id=team_id,
                role_id=role_id,
                is_active=True
            )
        except AccessScope.DoesNotExist:
            raise ValidationError({'detail': 'Team assignment not found.'})
        
        # Soft delete
        access_scope.is_active = False
        access_scope.save()
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class AccessScopeViewSet(SoftDeleteModelViewSet):
    queryset = AccessScope.objects.all()
    serializer_class = AccessScopeSerializer
    permission_classes = [IsAdminUser]
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Create an access scope, or reactivate/update if one already exists with the same (user, team, role).
        This handles the unique constraint gracefully by checking for existing scopes (even inactive ones).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        validated_data = serializer.validated_data
        user = validated_data.get('user')
        team = validated_data.get('team')
        org_node = validated_data.get('org_node')
        role = validated_data.get('role')
        
        # Check if a scope already exists with the same (user, team, role) or (user, org_node, role)
        # This includes inactive scopes since unique_together applies to all records
        existing_scope = None
        if team:
            existing_scope = AccessScope.objects.filter(
                user=user,
                team=team,
                role=role
            ).first()
        elif org_node:
            existing_scope = AccessScope.objects.filter(
                user=user,
                org_node=org_node,
                role=role
            ).first()
        
        if existing_scope:
            # Update and reactivate the existing scope
            for key, value in validated_data.items():
                setattr(existing_scope, key, value)
            existing_scope.is_active = validated_data.get('is_active', True)
            existing_scope.save()
            
            response_serializer = self.get_serializer(existing_scope)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        
        # No existing scope, create a new one
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@extend_schema(
    summary="Change user password",
    description="Change the password for the currently authenticated user. Rate limited to 5 requests per 15 minutes.",
    request=ChangePasswordSerializer,
    responses={
        200: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string', 'example': 'رمز عبور با موفقیت تغییر یافت.'}
            }
        },
        400: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string'},
                'old_password': {'type': 'array', 'items': {'type': 'string'}},
                'new_password': {'type': 'array', 'items': {'type': 'string'}},
                'confirm_password': {'type': 'array', 'items': {'type': 'string'}},
            }
        },
        500: {
            'type': 'object',
            'properties': {
                'detail': {'type': 'string'}
            }
        }
    },
)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@ratelimit(key='user', rate='5/15m', method='POST', block=True)
def change_password_view(request):
    """
    Change user password with proper error handling.
    """
    try:
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save(update_fields=['password', 'updated_at'])
            return Response(
                {'detail': 'رمز عبور با موفقیت تغییر یافت.'},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Log the error but don't expose details to client
        logger.exception("Error changing password")
        return Response(
            {'detail': 'An error occurred while changing password. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
