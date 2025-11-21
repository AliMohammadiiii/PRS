from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from classifications.models import LookupType, Lookup
from periods.models import FinancialPeriod
from org.models import OrgNode
from reports.models import ReportBox, ReportField
from submissions.models import Submission
from datetime import date


class WorkflowApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Users
        self.admin = get_user_model().objects.create_user(username='admin', password='pass', is_staff=True)
        self.fm = get_user_model().objects.create_user(username='fm', password='pass')
        # Lookups
        self.role_type, _ = LookupType.objects.get_or_create(code='COMPANY_ROLE', defaults={'title': 'Company Role'})
        self.report_status_type, _ = LookupType.objects.get_or_create(code='REPORT_STATUS', defaults={'title': 'Report Status'})
        self.reporting_period_type, _ = LookupType.objects.get_or_create(code='REPORTING_PERIOD', defaults={'title': 'Reporting Period'})
        self.approved, _ = Lookup.objects.get_or_create(type=self.report_status_type, code='APPROVED', defaults={'title': 'Approved'})
        self.under_review, _ = Lookup.objects.get_or_create(type=self.report_status_type, code='UNDER_REVIEW', defaults={'title': 'Under Review'})
        self.rejected, _ = Lookup.objects.get_or_create(type=self.report_status_type, code='REJECTED', defaults={'title': 'Rejected'})
        self.rp_h1, _ = Lookup.objects.get_or_create(type=self.reporting_period_type, code='H1', defaults={'title': 'First Half'})
        # Org
        self.holding = OrgNode.objects.create(node_type=OrgNode.HOLDING, name='H', code='H1')
        self.company = OrgNode.objects.create(
            parent=self.holding, node_type=OrgNode.COMPANY, name='C', code='C1', economic_code='EC1'
        )
        # Period
        self.period = FinancialPeriod.objects.create(title='1403', start_date=date(2024, 3, 20), end_date=date(2025, 3, 20))
        # Report
        self.box = ReportBox.objects.create(code='R1', name='Report 1')
        self.field = ReportField.objects.create(report=self.box, field_id='F1', name='Amount', data_type='NUMBER')

    def test_admin_review_queue_empty(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.get('/api/review/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), [])
