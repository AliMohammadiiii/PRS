from django.test import TestCase
from django.contrib.auth import get_user_model
from classifications.models import LookupType, Lookup
from org.models import OrgNode
from accounts.models import AccessScope
from accounts.permissions import HasCompanyAccess
from rest_framework.test import APIRequestFactory


class HasCompanyAccessTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='u1', password='pass')
        self.holding = OrgNode.objects.create(node_type=OrgNode.HOLDING, name='H', code='H1')
        self.company = OrgNode.objects.create(
            parent=self.holding, node_type=OrgNode.COMPANY, name='C', code='C1', economic_code='EC1'
        )
        role_type, _ = LookupType.objects.get_or_create(code='COMPANY_ROLE', defaults={'title': 'Company Role'})
        role, _ = Lookup.objects.get_or_create(type=role_type, code='FM', defaults={'title': 'Financial Manager'})
        AccessScope.objects.create(user=self.user, org_node=self.company, role=role)
        self.factory = APIRequestFactory()

    def test_has_company_access_true(self):
        request = self.factory.get('/x', {'company_id': str(self.company.id)})
        request.user = self.user
        perm = HasCompanyAccess()
        self.assertTrue(perm.has_permission(request, type('V', (), {})()))
