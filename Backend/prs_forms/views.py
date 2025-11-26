from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django.db import transaction
from django.db.models import Prefetch, Q, Max
from django.core.exceptions import ValidationError as DjangoValidationError
from prs_forms.models import FormTemplate, FormField
from prs_forms.serializers import (
    FormTemplateDetailSerializer,
    FormTemplateSerializer,
    FormTemplateCreateSerializer,
    FormTemplateUpdateSerializer,
    FormFieldSerializer,
    FormFieldCreateSerializer,
    FormFieldUpdateSerializer
)
from accounts.permissions import IsSystemAdmin, IsWorkflowAdmin
from teams.models import Team
from purchase_requests.models import PurchaseRequest


class FormTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing form templates per team.
    
    System Admins and Workflow Admins can create, update, and manage form templates.
    Templates are versioned - changes create new versions when active requests exist.
    """
    queryset = FormTemplate.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return FormTemplateCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return FormTemplateUpdateSerializer
        elif self.action in ['retrieve', 'list']:
            return FormTemplateDetailSerializer
        else:
            return FormTemplateSerializer
    
    def get_queryset(self):
        """Filter form templates by team and permissions"""
        qs = super().get_queryset().select_related('team', 'created_by').prefetch_related(
            Prefetch('fields', queryset=FormField.objects.order_by('order'))
        )
        
        # Filter by team if provided
        team_id = self.request.query_params.get('team_id')
        if team_id:
            qs = qs.filter(team_id=team_id)
        
        # Filter by is_active if provided
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            if is_active.lower() in ('true', '1', 'yes'):
                qs = qs.filter(is_active=True)
            elif is_active.lower() in ('false', '0', 'no'):
                qs = qs.filter(is_active=False)
        
        # Non-admins only see active templates
        if not (self.request.user.is_superuser or self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        
        return qs.order_by('team', '-version_number')
    
    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Read operations: any authenticated user
        Write operations: System Admin or Workflow Admin
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            # Create, update, delete require admin permissions
            permission_classes = [IsSystemAdmin | IsWorkflowAdmin]
        return [permission() for permission in permission_classes]
    
    def has_object_permission(self, request, view, obj):
        """Check if user can modify this template"""
        # System Admins can modify any template
        if IsSystemAdmin().has_permission(request, view):
            return True
        
        # Workflow Admins can only modify templates for their teams
        if IsWorkflowAdmin().has_permission(request, view):
            # TODO: Check if user has Workflow Admin role for this team
            # For now, allow if user is staff
            return request.user.is_staff
        
        return False
    
    @extend_schema(
        summary="Create a new form template version",
        description="Creates a new form template for a team. If a template already exists and has active requests, "
                    "creates a new version instead of modifying the existing one.",
        request=FormTemplateCreateSerializer,
        responses={
            201: FormTemplateDetailSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new form template"""
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        team = serializer.validated_data['team']
        
        # Check if team already has an active template
        existing_active = FormTemplate.objects.filter(team=team, is_active=True).first()
        
        if existing_active:
            # Check if existing template has active requests
            active_statuses = ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW', 'REJECTED', 'RESUBMITTED', 
                             'FULLY_APPROVED', 'FINANCE_REVIEW']
            has_active_requests = PurchaseRequest.objects.filter(
                form_template=existing_active,
                is_active=True,
                status__code__in=active_statuses
            ).exists()
            
            if has_active_requests:
                # Deactivate old template and create new version
                existing_active.is_active = False
                existing_active.save()
                
                # Get next version number
                max_version = FormTemplate.objects.filter(team=team).aggregate(
                    max_ver=Max('version_number')
                )['max_ver'] or 0
                version_number = max_version + 1
            else:
                # No active requests - can update existing template or create new version
                # For now, create new version
                max_version = FormTemplate.objects.filter(team=team).aggregate(
                    max_ver=Max('version_number')
                )['max_ver'] or 0
                version_number = max_version + 1
        else:
            version_number = 1
        
        # Create new template
        form_template = FormTemplate.objects.create(
            team=team,
            version_number=version_number,
            created_by=request.user,
            is_active=True
        )
        
        # Create fields
        fields_data = request.data.get('fields', [])
        for field_data in fields_data:
            field_data['template'] = form_template.id
            field_serializer = FormFieldCreateSerializer(data=field_data)
            field_serializer.is_valid(raise_exception=True)
            field_serializer.save(template=form_template)
        
        # Return created template with fields
        read_serializer = FormTemplateDetailSerializer(form_template)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        summary="Update form template fields",
        description="Updates a form template. If the template has active requests, creates a new version instead.",
        request=FormTemplateUpdateSerializer,
        responses={
            200: FormTemplateDetailSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update form template - creates new version if active requests exist"""
        instance = self.get_object()
        
        # Check if template has active requests
        active_statuses = ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW', 'REJECTED', 'RESUBMITTED', 
                         'FULLY_APPROVED', 'FINANCE_REVIEW']
        has_active_requests = PurchaseRequest.objects.filter(
            form_template=instance,
            is_active=True,
            status__code__in=active_statuses
        ).exists()
        
        if has_active_requests and instance.is_active:
            # Create new version instead of updating
            # Deactivate old template
            instance.is_active = False
            instance.save()
            
            # Create new version
            max_version = FormTemplate.objects.filter(team=instance.team).aggregate(
                max_ver=Max('version_number')
            )['max_ver'] or 0
            version_number = max_version + 1
            
            new_template = FormTemplate.objects.create(
                team=instance.team,
                version_number=version_number,
                created_by=request.user,
                is_active=True
            )
            
            # Copy or create fields
            fields_data = request.data.get('fields', [])
            for field_data in fields_data:
                field_data['template'] = new_template.id
                field_serializer = FormFieldCreateSerializer(data=field_data)
                field_serializer.is_valid(raise_exception=True)
                field_serializer.save(template=new_template)
            
            instance = new_template
        else:
            # Update existing template directly
            # Delete existing fields
            instance.fields.all().delete()
            
            # Create new fields
            fields_data = request.data.get('fields', [])
            for field_data in fields_data:
                field_data['template'] = instance.id
                field_serializer = FormFieldCreateSerializer(data=field_data)
                field_serializer.is_valid(raise_exception=True)
                field_serializer.save(template=instance)
        
        # Return updated template
        read_serializer = FormTemplateDetailSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Reorder form fields",
        description="Updates the order of form fields for a template.",
        request={
            'application/json': {
                'type': 'object',
                'required': ['field_orders'],
                'properties': {
                    'field_orders': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'required': ['field_id', 'order'],
                            'properties': {
                                'field_id': {'type': 'string', 'format': 'uuid'},
                                'order': {'type': 'integer', 'minimum': 0}
                            }
                        }
                    }
                }
            }
        },
        responses={
            200: FormTemplateDetailSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @action(detail=True, methods=['post'], url_path='reorder-fields')
    @transaction.atomic
    def reorder_fields(self, request, pk=None):
        """Reorder form fields"""
        template = self.get_object()
        
        field_orders = request.data.get('field_orders', [])
        if not field_orders:
            raise ValidationError({'field_orders': 'field_orders is required.'})
        
        # Update field orders
        for item in field_orders:
            field_id = item.get('field_id')
            order = item.get('order')
            
            if field_id is None or order is None:
                continue
            
            try:
                field = FormField.objects.get(id=field_id, template=template)
                field.order = order
                field.save()
            except FormField.DoesNotExist:
                continue
        
        # Return updated template
        read_serializer = FormTemplateDetailSerializer(template)
        return Response(read_serializer.data, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion if template has associated requests"""
        instance = self.get_object()
        
        # Check if template has any associated requests
        has_requests = PurchaseRequest.objects.filter(form_template=instance).exists()
        
        if has_requests:
            raise ValidationError(
                'Cannot delete form template: template has associated purchase requests. '
                'Deactivate the template instead.'
            )
        
        # If no requests, allow deletion
        return super().destroy(request, *args, **kwargs)


    @extend_schema(
        summary="List form fields for a template",
        description="Returns all form fields for a template, ordered by order field.",
        responses={
            200: FormFieldSerializer(many=True),
        },
    )
    @action(detail=True, methods=['get'], url_path='fields')
    def list_fields(self, request, pk=None):
        """List all fields for a form template"""
        template = self.get_object()
        fields = FormField.objects.filter(template=template).order_by('order')
        serializer = FormFieldSerializer(fields, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Add a field to a template",
        description="Adds a new field to a form template.",
        request=FormFieldCreateSerializer,
        responses={
            201: FormFieldSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @action(detail=True, methods=['post'], url_path='fields')
    @transaction.atomic
    def add_field(self, request, pk=None):
        """Add a field to a form template"""
        template = self.get_object()
        
        # Check permissions
        if not (IsSystemAdmin().has_permission(request, self) or 
                IsWorkflowAdmin().has_permission(request, self)):
            raise PermissionDenied('Only System Admins or Workflow Admins can add fields.')
        
        serializer = FormFieldCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        field = serializer.save(template=template)
        
        response_serializer = FormFieldSerializer(field)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

