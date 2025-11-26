from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.db.models import Prefetch, Q
from django.db import transaction
from teams.models import Team
from teams.serializers import TeamSerializer, TeamCreateSerializer, TeamUpdateSerializer
from prs_forms.models import FormTemplate, FormField
from prs_forms.serializers import FormTemplateDetailSerializer, TeamMinimalSerializer
from attachments.models import AttachmentCategory
from attachments.serializers import AttachmentCategorySerializer
from accounts.permissions import IsSystemAdmin, ReadOnlyOrAdmin
from accounts.models import AccessScope
from purchase_requests.models import PurchaseRequest
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from workflows.serializers import WorkflowDetailSerializer


class TeamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing teams.
    
    System Admins can create, update, and deactivate teams.
    All authenticated users can read active teams.
    Teams cannot be deleted, only deactivated.
    """
    queryset = Team.objects.all()
    permission_classes = [ReadOnlyOrAdmin]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return TeamCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TeamUpdateSerializer
        else:
            return TeamSerializer

    def get_queryset(self):
        """
        Filter teams based on user permissions and query parameters.
        - System Admins see all teams (including inactive)
        - Regular users see only teams they are assigned to via AccessScope
        - Supports search by name
        """
        qs = super().get_queryset()
        
        # System Admins see all teams
        if self.request.user.is_superuser or self.request.user.is_staff:
            # Admins can see all teams, but filter by is_active if requested
            is_active = self.request.query_params.get('is_active')
            if is_active is not None:
                if is_active.lower() in ('true', '1', 'yes'):
                    qs = qs.filter(is_active=True)
                elif is_active.lower() in ('false', '0', 'no'):
                    qs = qs.filter(is_active=False)
        else:
            # Regular users: only show teams they are assigned to via AccessScope
            user_team_ids = AccessScope.objects.filter(
                user=self.request.user,
                team__isnull=False,
                is_active=True
            ).values_list('team_id', flat=True).distinct()
            
            qs = qs.filter(
                id__in=user_team_ids,
                is_active=True
            )
        
        # Search by name (case-insensitive contains)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(name__icontains=search)
        
        return qs.order_by('name')
    
    def destroy(self, request, *args, **kwargs):
        """
        Prevent physical deletion of teams.
        Teams can only be deactivated (soft delete).
        """
        raise ValidationError(
            'Teams cannot be deleted. Use the deactivate action to deactivate a team instead.'
        )
    
    @extend_schema(
        summary="Deactivate a team",
        description="Deactivates a team. Deactivated teams cannot be selected for new requests. "
                    "The team cannot be deactivated if it has active requests in progress.",
        responses={
            200: TeamSerializer,
            400: {'description': 'Validation error - team has active requests'},
            403: {'description': 'Permission denied'},
            404: {'description': 'Team not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='deactivate')
    @transaction.atomic
    def deactivate(self, request, pk=None):
        """Deactivate a team"""
        team = self.get_object()
        
        # Check if team has active requests in progress
        active_statuses = ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW', 'REJECTED', 'RESUBMITTED', 
                          'FULLY_APPROVED', 'FINANCE_REVIEW']
        active_requests = PurchaseRequest.objects.filter(
            team=team,
            is_active=True,
            status__code__in=active_statuses
        ).exists()
        
        if active_requests:
            raise ValidationError(
                'Cannot deactivate team: team has active requests in progress. '
                'Wait for all requests to be completed or archived before deactivating.'
            )
        
        # Deactivate the team
        team.is_active = False
        team.save()
        
        serializer = TeamSerializer(team)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Activate a team",
        description="Activates a previously deactivated team.",
        responses={
            200: TeamSerializer,
            403: {'description': 'Permission denied'},
            404: {'description': 'Team not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='activate')
    @transaction.atomic
    def activate(self, request, pk=None):
        """Activate a team"""
        team = self.get_object()
        
        team.is_active = True
        team.save()
        
        serializer = TeamSerializer(team)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get active form template for a team",
        description="Returns the active form template for the specified team, including all form fields ordered by their order field.",
        responses={
            200: FormTemplateDetailSerializer,
            404: {'description': 'No active form template found for this team'},
        },
    )
    @action(detail=True, methods=['get'], url_path='form-template')
    def form_template(self, request, pk=None):
        """
        Retrieve the active form template for this team.
        Returns 404 if no active template exists.
        """
        team = self.get_object()
        
        # Find active FormTemplate for this team with optimized queries
        # Explicitly order fields by 'order' field
        try:
            template = FormTemplate.objects.filter(
                team=team,
                is_active=True
            ).select_related('team').prefetch_related(
                Prefetch('fields', queryset=FormField.objects.order_by('order'))
            ).get()
        except FormTemplate.DoesNotExist:
            raise NotFound(
                detail=f'No active form template found for team "{team.name}". '
                       'Please contact an administrator to create an active form template.'
            )
        
        # Serialize template and team separately to match the required response format
        template_data = FormTemplateDetailSerializer(template).data
        team_data = TeamMinimalSerializer(team).data
        
        # Construct response in the required format: {team: {...}, template: {...}}
        response_data = {
            'team': team_data,
            'template': template_data,
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get active workflow for a team",
        description="Returns the active workflow for the specified team, including all workflow steps and approvers ordered by step_order.",
        responses={
            200: WorkflowDetailSerializer,
            404: {'description': 'No active workflow found for this team'},
        },
    )
    @action(detail=True, methods=['get'], url_path='workflow')
    def workflow(self, request, pk=None):
        """
        Retrieve the active workflow for this team.
        Returns 404 if no active workflow exists.
        """
        team = self.get_object()
        
        # Find active Workflow for this team with optimized queries
        try:
            workflow = Workflow.objects.filter(
                team=team,
                is_active=True
            ).select_related('team').prefetch_related(
                Prefetch(
                    'steps',
                    queryset=WorkflowStep.objects.filter(is_active=True).order_by('step_order').prefetch_related(
                        Prefetch(
                            'approvers',
                            queryset=WorkflowStepApprover.objects.filter(is_active=True).select_related('role')
                        )
                    )
                )
            ).get()
        except Workflow.DoesNotExist:
            raise NotFound(
                detail=f'No active workflow found for team "{team.name}". '
                       'Please contact an administrator to create an active workflow.'
            )
        
        serializer = WorkflowDetailSerializer(workflow)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get attachment categories for a team",
        description="Returns all active attachment categories for the specified team.",
        responses={
            200: AttachmentCategorySerializer(many=True),
        },
    )
    @action(detail=True, methods=['get'], url_path='attachment-categories')
    def attachment_categories(self, request, pk=None):
        """
        Retrieve all active attachment categories for this team.
        """
        team = self.get_object()
        
        categories = AttachmentCategory.objects.filter(
            team=team,
            is_active=True
        ).order_by('name')
        
        serializer = AttachmentCategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

