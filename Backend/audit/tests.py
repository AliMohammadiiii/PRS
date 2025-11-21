from django.test import TestCase
from django.contrib.auth import get_user_model
from classifications.models import LookupType, Lookup
from periods.models import FinancialPeriod
from org.models import OrgNode
from reports.models import ReportBox, ReportField
from submissions.models import Submission, SubmissionFieldValue
from audit.models import FieldChange, AuditEvent
from datetime import date


class AuditTrailTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username='u', password='pass')
        # Lookups
        self.rs_type, _ = LookupType.objects.get_or_create(code='REPORT_STATUS', defaults={'title': 'Report Status'})
        self.reporting_period_type, _ = LookupType.objects.get_or_create(code='REPORTING_PERIOD', defaults={'title': 'Reporting Period'})
        self.under_review, _ = Lookup.objects.get_or_create(type=self.rs_type, code='UNDER_REVIEW', defaults={'title': 'Under Review'})
        self.rejected, _ = Lookup.objects.get_or_create(type=self.rs_type, code='REJECTED', defaults={'title': 'Rejected'})
        self.approved, _ = Lookup.objects.get_or_create(type=self.rs_type, code='APPROVED', defaults={'title': 'Approved'})
        self.rp, _ = Lookup.objects.get_or_create(type=self.reporting_period_type, code='H1', defaults={'title': 'First Half'})
        # Org
        self.holding = OrgNode.objects.create(node_type=OrgNode.HOLDING, name='H', code='H1')
        self.company = OrgNode.objects.create(
            parent=self.holding, node_type=OrgNode.COMPANY, name='C', code='C1', economic_code='EC1'
        )
        # Period
        self.period = FinancialPeriod.objects.create(title='1403', start_date=date(2024, 3, 20), end_date=date(2025, 3, 20))
        # Report + field
        self.box = ReportBox.objects.create(code='R1', name='Report 1')
        self.field = ReportField.objects.create(report=self.box, field_id='F1', name='Amount', data_type='NUMBER')

    def test_status_change_logged(self):
        s = Submission.objects.create(
            report=self.box,
            company=self.company,
            financial_period=self.period,
            reporting_period=self.rp,
            status=self.under_review,
            submitted_by=self.user,
        )
        # Change status to Rejected with comment -> should create AuditEvent via signal
        s.status = self.rejected
        s.rejection_comment = 'Incomplete'
        s.save()
        self.assertTrue(AuditEvent.objects.filter(submission=s, event_type=AuditEvent.STATUS_CHANGE).exists())
