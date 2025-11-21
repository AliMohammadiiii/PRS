from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from org.models import OrgNode, CompanyClassification
from org.serializers import OrgNodeSerializer, CompanyClassificationSerializer
from core.views import SoftDeleteModelViewSet
from accounts.permissions import HasCompanyAccess
from accounts.models import AccessScope


class OrgNodeViewSet(SoftDeleteModelViewSet):
    queryset = OrgNode.objects.all()
    serializer_class = OrgNodeSerializer
    permission_classes = [HasCompanyAccess]

    def get_queryset(self):
        """
        Filter queryset to only show org nodes the user has access to.
        Admins see all, regular users see only their accessible companies.
        """
        qs = super().get_queryset()
        
        # Optimize queries by selecting related objects
        qs = qs.select_related('parent', 'org_type', 'legal_entity_type', 'industry', 'sub_industry')
        
        # Admins can see all
        if self.request.user.is_superuser or self.request.user.is_staff:
            return qs
        
        # Regular users see only companies they have access to
        accessible_org_node_ids = AccessScope.objects.filter(
            user=self.request.user,
            is_active=True
        ).values_list('org_node_id', flat=True)
        
        return qs.filter(id__in=accessible_org_node_ids)


class CompanyClassificationViewSet(SoftDeleteModelViewSet):
    queryset = CompanyClassification.objects.all()
    serializer_class = CompanyClassificationSerializer
    permission_classes = [IsAdminUser]
