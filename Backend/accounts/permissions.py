from rest_framework.permissions import BasePermission, IsAuthenticated
from accounts.models import AccessScope
from classifications.models import Lookup


class HasOrgAccess(BasePermission):
    """
    Usage: requires `org_id` in view kwargs or query to verify user has AccessScope.
    Superusers pass automatically.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        org_id = getattr(view, 'org_id', None) or request.query_params.get('org_id') or request.data.get('org_id')
        if not org_id:
            return True  # allow endpoints that don't scope to an org
        return AccessScope.objects.filter(user=request.user, org_node_id=org_id, is_active=True).exists()


class IsAdmin(BasePermission):
    """
    Simple wrapper around request.user.is_staff
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class ReadOnlyOrAdmin(BasePermission):
    """
    Allows read-only access to authenticated users, but write access only to admins.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Allow read operations (GET, HEAD, OPTIONS) for all authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        
        # Allow write operations only for admins
        return bool(request.user.is_superuser or request.user.is_staff)


class HasCompanyAccess(BasePermission):
    """
    Checks if the authenticated user has access to a specific company UUID.
    Looks for `pk` (DRF ViewSet detail views), `company_uuid` in kwargs, then in query/body as `company_id` or `company`.
    If no company_id is provided, allows access (for endpoints that list all accessible companies).
    Also implements object-level permission checking for update/delete operations.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Try to get company UUID from various sources
        company_uuid = None
        
        # 1. Check view kwargs (DRF ViewSets use 'pk' for detail views)
        if hasattr(view, 'kwargs') and view.kwargs:
            company_uuid = view.kwargs.get('pk') or view.kwargs.get('company_uuid')
        
        # 2. Check query parameters
        if not company_uuid and hasattr(request, 'query_params'):
            company_uuid = request.query_params.get('company_id') or request.query_params.get('company')
        
        # 3. Check request body (for POST/PUT/PATCH)
        if not company_uuid and hasattr(request, 'data'):
            try:
                # request.data might be a dict or QueryDict-like object
                data = request.data
                if hasattr(data, 'get'):
                    company_uuid = data.get('company_id') or data.get('company')
                elif isinstance(data, dict):
                    company_uuid = data.get('company_id') or data.get('company')
            except (AttributeError, TypeError):
                pass
        
        # 4. Fallback to Django's request.POST
        if not company_uuid and hasattr(request, 'POST'):
            company_uuid = request.POST.get('company_id') or request.POST.get('company')
        
        # If no company_id provided, allow (endpoint will handle filtering by accessible companies)
        if not company_uuid:
            return True
        
        return AccessScope.objects.filter(user=request.user, org_node_id=company_uuid, is_active=True).exists()
    
    def has_object_permission(self, request, view, obj):
        """
        Object-level permission check. Ensures user has access to the specific org node.
        """
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or request.user.is_staff:
            return True
        
        # Check if user has access-scope for this org node
        return AccessScope.objects.filter(
            user=request.user,
            org_node=obj,
            is_active=True
        ).exists()


class IsSystemAdmin(BasePermission):
    """
    Permission class for System Admin role.
    System Admins have full control over system configuration, all teams, all users, all workflows, all forms.
    
    For now, checks is_staff or is_superuser. In future, can check for specific role lookup.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # Superusers are always System Admins
        if request.user.is_superuser:
            return True
        # Check for System Admin role via AccessScope
        # For now, also allow staff users as System Admins
        if request.user.is_staff:
            return True
        # Future: Check for specific role lookup
        # return AccessScope.objects.filter(
        #     user=request.user,
        #     role__type__code='PRS_ROLE',
        #     role__code='SYSTEM_ADMIN',
        #     is_active=True
        # ).exists()
        return False


class IsWorkflowAdmin(BasePermission):
    """
    Permission class for Workflow Admin role.
    Workflow Admins can create/modify workflows & forms for assigned teams only.
    
    Checks if user has Workflow Admin role for any team (or is System Admin).
    For team-specific operations, use object-level permission checking.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # System Admins are also Workflow Admins
        if IsSystemAdmin().has_permission(request, view):
            return True
        # Future: Check for Workflow Admin role via AccessScope
        # return AccessScope.objects.filter(
        #     user=request.user,
        #     role__type__code='PRS_ROLE',
        #     role__code='WORKFLOW_ADMIN',
        #     is_active=True
        # ).exists()
        return False


class IsInitiator(BasePermission):
    """
    Permission class for Initiator role.
    Initiators can create & submit purchase requests for their assigned teams.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # System Admins and Workflow Admins can also initiate
        if IsSystemAdmin().has_permission(request, view):
            return True
        if IsWorkflowAdmin().has_permission(request, view):
            return True
        # Future: Check for Initiator role via AccessScope
        # return AccessScope.objects.filter(
        #     user=request.user,
        #     role__type__code='PRS_ROLE',
        #     role__code='INITIATOR',
        #     is_active=True
        # ).exists()
        # For now, allow all authenticated users to be Initiators
        return True


class IsApprover(BasePermission):
    """
    Permission class for Approver role.
    Approvers can approve/reject requests at assigned workflow step(s).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # System Admins and Workflow Admins can also approve
        if IsSystemAdmin().has_permission(request, view):
            return True
        if IsWorkflowAdmin().has_permission(request, view):
            return True
        # Future: Check for Approver role via AccessScope
        # For now, allow all authenticated users (specific step access is checked in views)
        return True


class IsFinanceReviewer(BasePermission):
    """
    Permission class for Finance Reviewer role.
    Finance Reviewers can final review and completion of fully approved requests.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # System Admins can also complete requests
        if IsSystemAdmin().has_permission(request, view):
            return True
        # Future: Check for Finance Reviewer role via AccessScope
        # For now, allow all authenticated users (specific step access is checked in views)
        return True

