from rest_framework.permissions import BasePermission, IsAuthenticated
from accounts.models import AccessScope


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

