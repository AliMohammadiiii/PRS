"""
Views for UI configuration API endpoints.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings


class UiModeView(APIView):
    """
    GET /api/ui-mode/ - Get UI mode based on domain and user role
    
    Returns:
    - "FULL_DASHBOARD" for admins/staff or non-messenger domains
    - "MESSENGER_ONLY" for non-admin users on messenger-only domains
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Determine UI mode based on request host and user permissions"""
        user = request.user
        
        # Extract host from request (strip port if present)
        host = request.get_host().split(':')[0]
        
        # Get messenger-only domains from settings
        messenger_domains = getattr(settings, 'MESSENGER_ONLY_DOMAINS', [])
        
        # Check if current host is a messenger-only domain
        is_messenger_domain = host in messenger_domains
        
        if is_messenger_domain:
            # On messenger domain: check if user should see full dashboard
            # Admins, staff, or users with view_dashboard permission get full dashboard
            if (user.is_superuser or 
                user.is_staff or 
                user.has_perm("purchase_requests.view_dashboard")):
                ui_mode = "FULL_DASHBOARD"
            else:
                ui_mode = "MESSENGER_ONLY"
        else:
            # Classic domain: always show full dashboard
            ui_mode = "FULL_DASHBOARD"
        
        return Response({
            "ui_mode": ui_mode,
            "username": user.username,
            "is_staff": user.is_staff,
        }, status=status.HTTP_200_OK)





