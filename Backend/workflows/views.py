from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, NotFound, PermissionDenied
from drf_spectacular.utils import extend_schema
from django.db import transaction
from django.db.models import Prefetch, Q
from workflows.models import (
    Workflow, WorkflowStep, WorkflowStepApprover,
    WorkflowTemplate, WorkflowTemplateStep, WorkflowTemplateStepApprover
)
from workflows.serializers import (
    WorkflowSerializer,
    WorkflowCreateSerializer,
    WorkflowUpdateSerializer,
    WorkflowDetailSerializer,
    WorkflowStepSerializer,
    WorkflowStepCreateSerializer,
    WorkflowStepUpdateSerializer,
    WorkflowStepApproverSerializer,
    WorkflowTemplateSerializer,
    WorkflowTemplateListSerializer,
    WorkflowTemplateDetailSerializer,
    WorkflowTemplateCreateSerializer,
    WorkflowTemplateUpdateSerializer,
    WorkflowTemplateStepSerializer,
    WorkflowTemplateStepApproverSerializer
)
from accounts.permissions import IsSystemAdmin, IsWorkflowAdmin
from teams.models import Team
from purchase_requests.models import PurchaseRequest
from classifications.models import Lookup


class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflows per team.
    
    System Admins and Workflow Admins can create, update, and manage workflows.
    Workflows cannot be edited if requests are in progress.
    Each team has exactly one active workflow.
    """
    queryset = Workflow.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return WorkflowCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return WorkflowUpdateSerializer
        elif self.action in ['retrieve', 'list']:
            return WorkflowDetailSerializer
        else:
            return WorkflowSerializer
    
    def get_queryset(self):
        """Filter workflows by team and permissions"""
        qs = super().get_queryset().select_related('team').prefetch_related(
            Prefetch(
                'steps',
                queryset=WorkflowStep.objects.filter(is_active=True).order_by('step_order').prefetch_related(
                    Prefetch(
                        'approvers',
                        queryset=WorkflowStepApprover.objects.filter(is_active=True).select_related('role')
                    )
                )
            )
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
        
        # Non-admins only see active workflows
        if not (self.request.user.is_superuser or self.request.user.is_staff):
            qs = qs.filter(is_active=True)
        
        return qs.order_by('team', 'name')
    
    def get_permissions(self):
        """Require admin permissions for write operations"""
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [IsSystemAdmin | IsWorkflowAdmin]
        return [permission() for permission in permission_classes]
    
    def _check_active_requests(self, workflow):
        """Check if workflow has active requests in progress"""
        active_statuses = ['PENDING_APPROVAL', 'IN_REVIEW', 'REJECTED', 'RESUBMITTED', 
                         'FULLY_APPROVED', 'FINANCE_REVIEW']
        active_requests = PurchaseRequest.objects.filter(
            team=workflow.team,
            is_active=True,
            status__code__in=active_statuses
        ).exists()
        
        if active_requests:
            raise ValidationError(
                'Cannot modify workflow: team has active requests in progress. '
                'Wait for all requests to be completed or archived before modifying the workflow.'
            )
    
    @extend_schema(
        summary="Create a new workflow for a team",
        description="Creates a new workflow for a team. Each team can have exactly one active workflow.",
        request=WorkflowCreateSerializer,
        responses={
            201: WorkflowDetailSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new workflow with steps"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        team = serializer.validated_data['team']
        name = serializer.validated_data['name']
        steps_data = request.data.get('steps', [])
        
        # Create workflow
        workflow = Workflow.objects.create(
            team=team,
            name=name,
            is_active=True
        )
        
        # Create steps with approver roles
        for step_data in steps_data:
            step = WorkflowStep.objects.create(
                workflow=workflow,
                step_name=step_data['step_name'],
                step_order=step_data['step_order'],
                is_finance_review=step_data.get('is_finance_review', False)
            )
            
            # Assign approver roles (COMPANY_ROLE lookups)
            role_ids = step_data.get('role_ids', [])
            for role_id in role_ids:
                try:
                    role = Lookup.objects.get(id=role_id, is_active=True, type__code='COMPANY_ROLE')
                    WorkflowStepApprover.objects.create(
                        step=step,
                        role=role,
                        is_active=True
                    )
                except Lookup.DoesNotExist:
                    continue
        
        # Validate that at most one finance review step exists.
        # Note: We intentionally allow creating a workflow with zero steps so that
        # admins can create the shell workflow first and add steps afterwards.
        steps = WorkflowStep.objects.filter(workflow=workflow, is_active=True)
        finance_steps = steps.filter(is_finance_review=True)
        if finance_steps.count() > 1:
            workflow.delete()
            raise ValidationError('Workflow cannot have more than one Finance Review step.')
        
        # Return created workflow
        read_serializer = WorkflowDetailSerializer(workflow)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        summary="Update a workflow",
        description="Updates a workflow. Cannot be updated if team has active requests in progress.",
        request=WorkflowUpdateSerializer,
        responses={
            200: WorkflowDetailSerializer,
            400: {'description': 'Validation error - active requests exist'},
        },
    )
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update workflow - check for active requests first"""
        instance = self.get_object()
        
        # Check if workflow has active requests
        self._check_active_requests(instance)
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        # Update name
        if 'name' in serializer.validated_data:
            instance.name = serializer.validated_data['name']
            instance.save()
        
        # Update steps if provided
        steps_data = request.data.get('steps')
        if steps_data is not None:
            # Deactivate all existing steps
            WorkflowStep.objects.filter(workflow=instance).update(is_active=False)
            
            # Create new steps
            for step_data in steps_data:
                step = WorkflowStep.objects.create(
                    workflow=instance,
                    step_name=step_data['step_name'],
                    step_order=step_data['step_order'],
                    is_finance_review=step_data.get('is_finance_review', False)
                )
                
                # Assign approver roles (COMPANY_ROLE lookups)
                role_ids = step_data.get('role_ids', [])
                for role_id in role_ids:
                    try:
                        role = Lookup.objects.get(id=role_id, is_active=True, type__code='COMPANY_ROLE')
                        WorkflowStepApprover.objects.create(
                            step=step,
                            role=role,
                            is_active=True
                        )
                    except Lookup.DoesNotExist:
                        continue
            
            # Validate workflow structure (at most one finance review step).
            steps = WorkflowStep.objects.filter(workflow=instance, is_active=True)
            finance_steps = steps.filter(is_finance_review=True)
            if finance_steps.count() > 1:
                raise ValidationError('Workflow cannot have more than one Finance Review step.')
        
        # Return updated workflow
        read_serializer = WorkflowDetailSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Get workflow for a team",
        description="Returns the active workflow for a specific team.",
        responses={
            200: WorkflowDetailSerializer,
            404: {'description': 'No active workflow found for this team'},
        },
    )
    @action(detail=False, methods=['get'], url_path='by-team/(?P<team_id>[^/.]+)')
    def by_team(self, request, team_id=None):
        """Get workflow by team ID"""
        try:
            team = Team.objects.get(id=team_id, is_active=True)
        except Team.DoesNotExist:
            raise NotFound('Team not found or inactive.')
        
        try:
            workflow = Workflow.objects.get(team=team, is_active=True)
        except Workflow.DoesNotExist:
            raise NotFound(f'No active workflow found for team "{team.name}".')
        
        serializer = WorkflowDetailSerializer(workflow)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @extend_schema(
        summary="Add a step to a workflow",
        description="Adds a new step to a workflow. Cannot add steps if team has active requests.",
        request=WorkflowStepCreateSerializer,
        responses={
            201: WorkflowStepSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @action(detail=True, methods=['post'], url_path='steps')
    @transaction.atomic
    def add_step(self, request, pk=None):
        """Add a step to a workflow"""
        workflow = self.get_object()
        
        # Check for active requests
        self._check_active_requests(workflow)
        
        serializer = WorkflowStepCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check step_order doesn't conflict
        step_order = serializer.validated_data['step_order']
        existing = WorkflowStep.objects.filter(
            workflow=workflow,
            step_order=step_order,
            is_active=True
        )
        if existing.exists():
            raise ValidationError(f'Step order {step_order} already exists in this workflow.')
        
        # Create step
        step = WorkflowStep.objects.create(
            workflow=workflow,
            step_name=serializer.validated_data['step_name'],
            step_order=step_order,
            is_finance_review=serializer.validated_data.get('is_finance_review', False)
        )
        
        # Assign approver roles (COMPANY_ROLE lookups)
        role_ids = request.data.get('role_ids', [])
        for role_id in role_ids:
            try:
                role = Lookup.objects.get(id=role_id, is_active=True, type__code='COMPANY_ROLE')
                WorkflowStepApprover.objects.create(
                    step=step,
                    role=role,
                    is_active=True
                )
            except Lookup.DoesNotExist:
                continue
        
        # Validate workflow structure
        steps = WorkflowStep.objects.filter(workflow=workflow, is_active=True)
        finance_steps = steps.filter(is_finance_review=True)
        if finance_steps.count() > 1:
            step.delete()
            raise ValidationError('Workflow cannot have more than one Finance Review step.')
        
        response_serializer = WorkflowStepSerializer(step)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        summary="Assign approver roles to a workflow step",
        description="Assigns COMPANY_ROLE roles as approvers for a specific workflow step.",
        request={
            'application/json': {
                'type': 'object',
                'required': ['role_ids'],
                'properties': {
                    'role_ids': {
                        'type': 'array',
                        'items': {'type': 'string', 'format': 'uuid'}
                    }
                }
            }
        },
        responses={
            200: WorkflowStepSerializer,
            400: {'description': 'Validation error'},
            404: {'description': 'Step not found'},
        },
    )
    @action(detail=True, methods=['post'], url_path='steps/(?P<step_id>[^/.]+)/assign-approvers')
    @transaction.atomic
    def assign_approvers(self, request, pk=None, step_id=None):
        """Assign approver roles to a workflow step"""
        workflow = self.get_object()
        
        # Check for active requests
        self._check_active_requests(workflow)
        
        try:
            step = WorkflowStep.objects.get(id=step_id, workflow=workflow, is_active=True)
        except WorkflowStep.DoesNotExist:
            raise NotFound('Workflow step not found.')
        
        role_ids = request.data.get('role_ids', [])
        if not role_ids:
            raise ValidationError({'role_ids': 'role_ids is required and cannot be empty.'})
        
        # Remove existing approver roles
        WorkflowStepApprover.objects.filter(step=step, is_active=True).update(is_active=False)
        
        # Add new approver roles (COMPANY_ROLE lookups)
        for role_id in role_ids:
            try:
                role = Lookup.objects.get(id=role_id, is_active=True, type__code='COMPANY_ROLE')
                WorkflowStepApprover.objects.create(
                    step=step,
                    role=role,
                    is_active=True
                )
            except Lookup.DoesNotExist:
                raise ValidationError(f'Role with ID {role_id} not found or inactive.')
        
        # Return updated step
        response_serializer = WorkflowStepSerializer(step)
        return Response(response_serializer.data, status=status.HTTP_200_OK)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion if workflow has associated requests"""
        instance = self.get_object()
        
        # Check for active requests
        self._check_active_requests(instance)
        
        # Check if workflow has any associated requests
        has_requests = PurchaseRequest.objects.filter(team=instance.team).exists()
        
        if has_requests:
            raise ValidationError(
                'Cannot delete workflow: workflow has associated purchase requests. '
                'Deactivate the workflow instead.'
            )
        
        # If no requests, allow deletion
        return super().destroy(request, *args, **kwargs)


# =============================================================================
# WORKFLOW TEMPLATE VIEWSET
# =============================================================================

class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow templates.
    
    System Admins and Workflow Admins can create, update, and manage workflow templates.
    Templates are team-agnostic and can be assigned to teams via TeamPurchaseConfig.
    """
    queryset = WorkflowTemplate.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return WorkflowTemplateCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return WorkflowTemplateUpdateSerializer
        elif self.action in ['retrieve', 'list']:
            return WorkflowTemplateDetailSerializer
        else:
            return WorkflowTemplateSerializer
    
    def get_queryset(self):
        """Filter workflow templates by permissions"""
        qs = super().get_queryset().prefetch_related(
            Prefetch(
                'steps',
                queryset=WorkflowTemplateStep.objects.filter(is_active=True).order_by('step_order').prefetch_related(
                    Prefetch(
                        'approvers',
                        queryset=WorkflowTemplateStepApprover.objects.filter(is_active=True).select_related('role')
                    )
                )
            )
        )
        
        # Filter by name if provided
        name = self.request.query_params.get('name')
        if name:
            qs = qs.filter(name=name)
        
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
        
        return qs.order_by('name', '-version_number')
    
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
    
    @extend_schema(
        summary="Update a workflow template",
        description="Updates a workflow template including its steps.",
        request=WorkflowTemplateUpdateSerializer,
        responses={
            200: WorkflowTemplateDetailSerializer,
            400: {'description': 'Validation error'},
        },
    )
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """Update workflow template - handle steps if provided"""
        instance = self.get_object()
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        
        # Update name and description
        if 'name' in serializer.validated_data:
            instance.name = serializer.validated_data['name']
        if 'description' in serializer.validated_data:
            instance.description = serializer.validated_data['description']
        instance.save()
        
        # Update steps if provided
        steps_data = request.data.get('steps')
        if steps_data is not None:
            # Deactivate all existing steps
            WorkflowTemplateStep.objects.filter(workflow_template=instance).update(is_active=False)
            
            # Create new steps
            for step_data in steps_data:
                step = WorkflowTemplateStep.objects.create(
                    workflow_template=instance,
                    step_name=step_data['step_name'],
                    step_order=step_data['step_order'],
                    is_finance_review=step_data.get('is_finance_review', False)
                )
                
                # Assign approver roles (COMPANY_ROLE lookups)
                role_ids = step_data.get('role_ids', [])
                for role_id in role_ids:
                    try:
                        role = Lookup.objects.get(id=role_id, is_active=True, type__code='COMPANY_ROLE')
                        WorkflowTemplateStepApprover.objects.create(
                            step=step,
                            role=role,
                            is_active=True
                        )
                    except Lookup.DoesNotExist:
                        continue
            
            # Validate workflow template structure (at most one finance review step).
            steps = WorkflowTemplateStep.objects.filter(workflow_template=instance, is_active=True)
            finance_steps = steps.filter(is_finance_review=True)
            if finance_steps.count() > 1:
                raise ValidationError('Workflow template cannot have more than one Finance Review step.')
        
        # Return updated workflow template
        read_serializer = WorkflowTemplateDetailSerializer(instance)
        return Response(read_serializer.data, status=status.HTTP_200_OK)


