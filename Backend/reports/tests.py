from django.test import TestCase
from classifications.models import LookupType, Lookup
from org.models import OrgNode, CompanyClassification
from reports.models import ReportBox, ReportField, ReportGroup
from reports.services import get_reports_for_company


class ReportServiceTests(TestCase):
    def setUp(self):
        # Minimal lookup setup
        self.class_type, _ = LookupType.objects.get_or_create(code='COMPANY_CLASSIFICATION', defaults={'title': 'Company Classification'})
        self.cc_service, _ = Lookup.objects.get_or_create(type=self.class_type, code='SERVICE', defaults={'title': 'Service'})
        # Org
        self.holding = OrgNode.objects.create(node_type=OrgNode.HOLDING, name='Holding A', code='H-A')
        self.company = OrgNode.objects.create(
            parent=self.holding, node_type=OrgNode.COMPANY, name='Company A', code='C-A', economic_code='ECO1'
        )
        CompanyClassification.objects.create(company=self.company, classification=self.cc_service)
        # Reports
        self.box = ReportBox.objects.create(code='R1', name='Report 1')
        self.box.classifications.add(self.cc_service)

    def test_get_reports_for_company_returns_classification_reports(self):
        qs = get_reports_for_company(self.company)
        self.assertIn(self.box, qs)
