import logging
from typing import List
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema

logger = logging.getLogger(__name__)

@extend_schema(
    summary="Health check",
    description="Health check endpoint for monitoring and load balancers.",
    responses={
        200: {
            'type': 'object',
            'properties': {
                'status': {'type': 'string', 'example': 'healthy'}
            }
        }
    },
)
@api_view(['GET'])
@permission_classes([AllowAny])
def health_view(request):
    """
    Health check endpoint for monitoring and load balancers.
    """
    return Response({"status": "healthy"}, status=status.HTTP_200_OK)

@extend_schema(
    summary="Get current user information",
    description="Returns information about the currently authenticated user, including roles and accessible companies.",
    responses={
        200: {
            'type': 'object',
            'properties': {
                'id': {'type': 'string', 'format': 'uuid'},
                'username': {'type': 'string'},
                'is_admin': {'type': 'boolean'},
                'roles': {'type': 'array', 'items': {'type': 'string'}},
                'accessible_companies': {'type': 'array', 'items': {'type': 'object'}},
                'company_roles': {'type': 'object', 'additionalProperties': {'type': 'array', 'items': {'type': 'object'}}},
            }
        }
    },
)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me_view(request):
    user = request.user
    # Derive roles and access metadata from AccessScope
    roles: List[str] = []
    accessible_companies = []
    company_roles = {}  # Map of company_id -> list of role dicts

    try:
        from accounts.models import AccessScope  # type: ignore
        from org.models import OrgNode  # type: ignore
        from org.serializers import OrgNodeSerializer  # type: ignore

        # All active access scopes for role detection (team-based OR company-based)
        all_active_scopes = (
            AccessScope.objects.filter(user=user, is_active=True)
            .select_related("org_node", "role")
        )

        # Backend exposes stable, uppercase role *codes* for frontend RBAC
        roles = list(
            set(
                [
                    scope.role.code
                    for scope in all_active_scopes
                    if getattr(scope, "role", None) and getattr(scope.role, "code", None)
                ]
            )
        )
        
        # Check if user is assigned as an approver in any workflow step
        # This allows users to have APPROVER role without explicit AccessScope
        try:
            from workflows.models import WorkflowStepApprover  # type: ignore
            has_approver_assignment = WorkflowStepApprover.objects.filter(
                approver=user,
                is_active=True,
                step__is_active=True
            ).exists()
            
            if has_approver_assignment and 'APPROVER' not in roles:
                roles.append('APPROVER')
        except Exception:
            # If workflows app is not available, skip this check
            pass

        # Company-level access is optional; we keep previous behaviour but it is
        # not required for PRS RBAC in the frontend.
        company_scopes = all_active_scopes.filter(
            org_node__is_active=True,
            org_node__node_type=OrgNode.COMPANY,
        ).select_related("org_node", "role")

        company_ids = set()
        for scope in company_scopes:
            if scope.org_node and scope.org_node.id not in company_ids:
                company_ids.add(scope.org_node.id)
                accessible_companies.append(scope.org_node)

            if scope.org_node and scope.role:
                company_id = str(scope.org_node.id)
                if company_id not in company_roles:
                    company_roles[company_id] = []
                company_roles[company_id].append(
                    {
                        "id": str(scope.role.id),
                        "title": scope.role.title,
                        "code": scope.role.code,
                        "position_title": scope.position_title,
                    }
                )

        accessible_companies = OrgNodeSerializer(accessible_companies, many=True).data
    except Exception:
        # If there's an error loading access scopes, return empty data
        # Log error in production but don't expose details to client
        logger.exception("Error loading user access scopes")
        roles = []
        accessible_companies = []
        company_roles = {}

    is_admin = bool(getattr(user, "is_superuser", False) or getattr(user, "is_staff", False))
    return Response(
        {
            "id": str(getattr(user, "id", "")),
            "username": getattr(user, "username", ""),
            "is_admin": is_admin,
            "roles": roles,
            "accessible_companies": accessible_companies,
            "company_roles": company_roles,  # Map of company_id -> list of roles
        },
        status=status.HTTP_200_OK
    )
