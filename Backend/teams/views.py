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
from teams.serializers import TeamSerializer, TeamCreateSerializer, TeamUpdateSerializer, TeamMinimalSerializer
from prs_forms.models import FormTemplate, FormField
from prs_forms.serializers import FormTemplateDetailSerializer, FormTemplateSerializer
from attachments.models import AttachmentCategory
from attachments.serializers import AttachmentCategorySerializer
from accounts.permissions import IsSystemAdmin, ReadOnlyOrAdmin
from accounts.models import AccessScope
from purchase_requests.models import PurchaseRequest
from workflows.models import (
    Workflow, WorkflowStep, WorkflowStepApprover,
    WorkflowTemplate, WorkflowTemplateStep, WorkflowTemplateStepApprover
)
from workflows.serializers import (
    WorkflowDetailSerializer,
    WorkflowTemplateListSerializer,
    WorkflowTemplateDetailSerializer
)
from prs_team_config.models import TeamPurchaseConfig
from prs_team_config.serializers import (
    TeamPurchaseConfigListSerializer,
    EffectiveTemplateSerializer
)
from classifications.models import Lookup


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
        description="Returns the active form template for the specified team, including all form fields ordered by their order field. "
                    "Note: Templates are now purchase-type specific. This endpoint returns the first available template for the team. "
                    "For purchase-type specific templates, use the effective-template endpoint instead.",
        responses={
            200: {'description': 'Form template response with team and template'},
            404: {'description': 'No active form template found for this team'},
        },
    )
    @action(detail=True, methods=['get'], url_path='form-template')
    def form_template(self, request, pk=None):
        """
        Retrieve the active form template for this team (legacy endpoint for backwards compatibility).
        
        Since FormTemplate is now team-agnostic and linked via TeamPurchaseConfig,
        this endpoint finds the first active configuration for the team and returns its form template.
        
        For purchase-type specific templates, use the effective-template endpoint instead.
        Returns 404 if no active configuration exists.
        """
        team = self.get_object()
        
        # Find active TeamPurchaseConfig for this team (any purchase type)
        # Since templates are now team-agnostic, we need to go through TeamPurchaseConfig
        try:
            config = TeamPurchaseConfig.objects.filter(
                team=team,
                is_active=True
            ).select_related(
                'form_template'
            ).prefetch_related(
                Prefetch(
                    'form_template__fields',
                    queryset=FormField.objects.filter(is_active=True).order_by('order')
                )
            ).first()
            
            if not config or not config.form_template:
                raise NotFound(
                    detail=f'No active form template configuration found for team "{team.name}". '
                           'Please contact an administrator to configure this team. '
                           'Note: Templates are now purchase-type specific. Use the effective-template endpoint for purchase-type specific templates.'
                )
            
            template = config.form_template
        except TeamPurchaseConfig.DoesNotExist:
            raise NotFound(
                detail=f'No active form template configuration found for team "{team.name}". '
                       'Please contact an administrator to configure this team. '
                       'Note: Templates are now purchase-type specific. Use the effective-template endpoint for purchase-type specific templates.'
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

    # =========================================================================
    # NEW MULTI-TEMPLATE ENDPOINTS
    # =========================================================================

    @extend_schema(
        summary="List all form templates for a team",
        description="Returns all active form templates configured for the specified team via TeamPurchaseConfig.",
        responses={
            200: FormTemplateSerializer(many=True),
        },
    )
    @action(detail=True, methods=['get'], url_path='form-templates')
    def form_templates(self, request, pk=None):
        """
        List all active form templates configured for this team.
        
        Since FormTemplate is now team-agnostic, this endpoint returns templates
        that are linked to this team via TeamPurchaseConfig.
        """
        team = self.get_object()
        
        # Get all active configs for this team and extract unique form templates
        configs = TeamPurchaseConfig.objects.filter(
            team=team,
            is_active=True,
            form_template__is_active=True
        ).select_related('form_template', 'form_template__created_by')
        
        # Extract unique templates (using set to avoid duplicates)
        template_ids = set(config.form_template_id for config in configs if config.form_template)
        
        templates = FormTemplate.objects.filter(
            id__in=template_ids,
            is_active=True
        ).select_related('created_by').order_by('-version_number')
        
        serializer = FormTemplateSerializer(templates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="List all workflow templates for a team",
        description="Returns all active workflow templates configured for the specified team via TeamPurchaseConfig.",
        responses={
            200: WorkflowTemplateListSerializer(many=True),
        },
    )
    @action(detail=True, methods=['get'], url_path='workflow-templates')
    def workflow_templates(self, request, pk=None):
        """
        List all active workflow templates configured for this team.
        
        Since WorkflowTemplate is now team-agnostic, this endpoint returns templates
        that are linked to this team via TeamPurchaseConfig.
        """
        team = self.get_object()
        
        # Get all active configs for this team and extract unique workflow templates
        configs = TeamPurchaseConfig.objects.filter(
            team=team,
            is_active=True,
            workflow_template__is_active=True
        ).select_related('workflow_template')
        
        # Extract unique templates (using set to avoid duplicates)
        template_ids = set(config.workflow_template_id for config in configs if config.workflow_template)
        
        templates = WorkflowTemplate.objects.filter(
            id__in=template_ids,
            is_active=True
        ).prefetch_related('steps').order_by('-version_number')
        
        serializer = WorkflowTemplateListSerializer(templates, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="List all purchase configurations for a team",
        description="Returns all active team purchase configurations (mappings between purchase type and templates).",
        responses={
            200: TeamPurchaseConfigListSerializer(many=True),
        },
    )
    @action(detail=True, methods=['get'], url_path='configs')
    def configs(self, request, pk=None):
        """
        List all active purchase configurations for this team.
        """
        team = self.get_object()
        
        configs = TeamPurchaseConfig.objects.filter(
            team=team,
            is_active=True
        ).select_related(
            'purchase_type',
            'purchase_type__type',
            'form_template',
            'workflow_template'
        ).order_by('purchase_type__title')
        
        serializer = TeamPurchaseConfigListSerializer(configs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Get effective template pair for a team and purchase type",
        description="Returns the active form template and workflow template for the specified team and purchase type combination.",
        parameters=[
            OpenApiParameter(
                name='purchase_type',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                description='Purchase type code (e.g., "SERVICE", "GOODS")',
                required=True,
            ),
        ],
        responses={
            200: EffectiveTemplateSerializer,
            400: {'description': 'Missing or invalid purchase_type parameter'},
            404: {'description': 'No active configuration found for this team and purchase type'},
        },
    )
    @action(detail=True, methods=['get'], url_path='effective-template')
    def effective_template(self, request, pk=None):
        """
        Get the effective form template and workflow template for a team + purchase type.
        
        This endpoint is used when creating a new purchase request to determine
        which templates to use based on the selected team and purchase type.
        """
        team = self.get_object()
        
        # Get purchase_type from query params
        purchase_type_code = request.query_params.get('purchase_type')
        if not purchase_type_code:
            raise ValidationError({
                'purchase_type': 'This query parameter is required.'
            })
        
        # Get purchase type lookup
        try:
            purchase_type = Lookup.objects.get(
                type__code='PURCHASE_TYPE',
                code=purchase_type_code,
                is_active=True
            )
        except Lookup.DoesNotExist:
            raise ValidationError({
                'purchase_type': f'Purchase type "{purchase_type_code}" not found.'
            })
        
        # Get active TeamPurchaseConfig for this team + purchase_type
        try:
            config = TeamPurchaseConfig.objects.select_related(
                'form_template',
                'workflow_template',
                'purchase_type',
                'purchase_type__type'
            ).prefetch_related(
                Prefetch(
                    'form_template__fields',
                    queryset=FormField.objects.filter(is_active=True).order_by('order')
                ),
                Prefetch(
                    'workflow_template__steps',
                    queryset=WorkflowTemplateStep.objects.filter(is_active=True).order_by('step_order')
                )
            ).get(
                team=team,
                purchase_type=purchase_type,
                is_active=True
            )
        except TeamPurchaseConfig.DoesNotExist:
            raise NotFound(
                detail=f'No active procurement configuration found for team "{team.name}" '
                       f'and purchase type "{purchase_type_code}". '
                       'Please contact an administrator to configure this team.'
            )
        
        # Build response data
        response_data = {
            'team': team,
            'purchase_type': config.purchase_type,
            'form_template': config.form_template,
            'workflow_template': config.workflow_template,
        }
        
        serializer = EffectiveTemplateSerializer(response_data)
        return Response(serializer.data, status=status.HTTP_200_OK)

