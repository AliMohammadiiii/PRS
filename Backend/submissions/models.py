from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from core.models import BaseModel


class ReportSubmissionGroup(BaseModel):
    """
    Groups multiple submissions together with shared report details.
    Multiple groups can exist for the same (company, financial_period, reporting_period) combination.
    """
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    company = models.ForeignKey('org.OrgNode', on_delete=models.CASCADE, related_name='report_submission_groups')
    financial_period = models.ForeignKey('periods.FinancialPeriod', on_delete=models.PROTECT, related_name='report_submission_groups')
    reporting_period = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='report_submission_groups_by_period', limit_choices_to={'type__code': 'REPORTING_PERIOD'})
    status = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='report_submission_groups_by_status', limit_choices_to={'type__code': 'REPORT_STATUS'}, null=True, blank=True)
    submitted_by = models.ForeignKey('accounts.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='submitted_report_groups')

    class Meta:
        indexes = [
            models.Index(fields=['status', 'financial_period']),
        ]

    def __str__(self) -> str:
        return f'{self.company} - {self.financial_period} - {self.reporting_period}'
    
    def _validate_status_transition(self, old_status_code, new_status_code):
        """
        Validate status transitions according to state machine:
        - DRAFT → UNDER_REVIEW (when submitted)
        - UNDER_REVIEW → APPROVED (when approved)
        - UNDER_REVIEW → REJECTED (when rejected)
        - REJECTED → UNDER_REVIEW (when resubmitted)
        - APPROVED → (no transitions allowed, immutable)
        """
        if old_status_code == new_status_code:
            return  # No change, always valid
        
        # If no previous status, allow any status (new object)
        if old_status_code is None:
            return
        
        # APPROVED is immutable - cannot transition from APPROVED
        if old_status_code == 'APPROVED':
            raise ValidationError('Approved groups cannot change status.')
        
        # Define valid transitions
        valid_transitions = {
            'DRAFT': ['UNDER_REVIEW'],
            'UNDER_REVIEW': ['APPROVED', 'REJECTED'],
            'REJECTED': ['UNDER_REVIEW'],
        }
        
        allowed_next = valid_transitions.get(old_status_code, [])
        if new_status_code not in allowed_next:
            raise ValidationError(
                f'Invalid status transition from {old_status_code} to {new_status_code}. '
                f'Allowed transitions: {", ".join(allowed_next)}'
            )
    
    def clean(self):
        # Company must be of node_type COMPANY
        if self.company and getattr(self.company, 'node_type', None) != 'COMPANY':
            raise ValidationError('ReportSubmissionGroup company must be a COMPANY node.')
        # Lookup type guards
        if self.reporting_period and getattr(getattr(self.reporting_period, 'type', None), 'code', None) != 'REPORTING_PERIOD':
            raise ValidationError('reporting_period must reference REPORTING_PERIOD lookups.')
        if self.status and getattr(getattr(self.status, 'type', None), 'code', None) != 'REPORT_STATUS':
            raise ValidationError('status must reference REPORT_STATUS lookups.')
        
        # Validate status transitions
        if self.pk and self.status:
            try:
                previous = ReportSubmissionGroup.objects.get(pk=self.pk)
                old_status_code = getattr(previous.status, 'code', None) if previous.status else None
                new_status_code = getattr(self.status, 'code', None) if self.status else None
                self._validate_status_transition(old_status_code, new_status_code)
            except ReportSubmissionGroup.DoesNotExist:
                pass


class Submission(BaseModel):
    report = models.ForeignKey('reports.ReportBox', on_delete=models.CASCADE, related_name='submissions')
    company = models.ForeignKey('org.OrgNode', on_delete=models.CASCADE, related_name='submissions')
    financial_period = models.ForeignKey('periods.FinancialPeriod', on_delete=models.PROTECT, related_name='submissions')
    reporting_period = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='reporting_period_submissions', limit_choices_to={'type__code': 'REPORTING_PERIOD'})
    status = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='status_submissions', limit_choices_to={'type__code': 'REPORT_STATUS'})
    submitted_by = models.ForeignKey('accounts.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='submitted_reports')
    rejection_comment = models.TextField(null=True, blank=True)
    group = models.ForeignKey('ReportSubmissionGroup', on_delete=models.CASCADE, related_name='submissions', null=True, blank=True)

    class Meta:
        unique_together = ('report', 'company', 'financial_period', 'reporting_period')
        indexes = [
            models.Index(fields=['status', 'financial_period']),
        ]

    def __str__(self) -> str:
        return f'{self.company} - {self.report} - {self.financial_period}'
    
    def _validate_status_transition(self, old_status_code, new_status_code):
        """
        Validate status transitions according to state machine:
        - DRAFT → UNDER_REVIEW (when submitted)
        - UNDER_REVIEW → APPROVED (when approved)
        - UNDER_REVIEW → REJECTED (when rejected)
        - REJECTED → UNDER_REVIEW (when resubmitted)
        - APPROVED → (no transitions allowed, immutable)
        """
        if old_status_code == new_status_code:
            return  # No change, always valid
        
        # If no previous status, allow any status (new object)
        if old_status_code is None:
            return
        
        # APPROVED is immutable - cannot transition from APPROVED
        if old_status_code == 'APPROVED':
            raise ValidationError('Approved submissions cannot change status.')
        
        # Define valid transitions
        valid_transitions = {
            'DRAFT': ['UNDER_REVIEW'],
            'UNDER_REVIEW': ['APPROVED', 'REJECTED'],
            'REJECTED': ['UNDER_REVIEW'],
        }
        
        allowed_next = valid_transitions.get(old_status_code, [])
        if new_status_code not in allowed_next:
            raise ValidationError(
                f'Invalid status transition from {old_status_code} to {new_status_code}. '
                f'Allowed transitions: {", ".join(allowed_next)}'
            )
    
    def clean(self):
        # Company must be of node_type COMPANY
        if self.company and getattr(self.company, 'node_type', None) != 'COMPANY':
            raise ValidationError('Submission company must be a COMPANY node.')
        # Lookup type guards
        if self.reporting_period and getattr(getattr(self.reporting_period, 'type', None), 'code', None) != 'REPORTING_PERIOD':
            raise ValidationError('reporting_period must reference REPORTING_PERIOD lookups.')
        if self.status and getattr(getattr(self.status, 'type', None), 'code', None) != 'REPORT_STATUS':
            raise ValidationError('status must reference REPORT_STATUS lookups.')
        
        # Validate status transitions
        if self.pk and self.status:
            try:
                previous = Submission.objects.get(pk=self.pk)
                old_status_code = getattr(previous.status, 'code', None) if previous.status else None
                new_status_code = getattr(self.status, 'code', None) if self.status else None
                self._validate_status_transition(old_status_code, new_status_code)
            except Submission.DoesNotExist:
                pass


class SubmissionFieldValue(BaseModel):
    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name='values')
    field = models.ForeignKey('reports.ReportField', on_delete=models.CASCADE, related_name='values')

    value_number = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    value_text = models.TextField(null=True, blank=True)
    value_bool = models.BooleanField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    value_file = models.FileField(null=True, blank=True, upload_to='report_files/', validators=[FileExtensionValidator(allowed_extensions=['pdf', 'xlsx', 'xls', 'csv', 'txt', 'jpg', 'png'])])
    entity_ref_uuid = models.UUIDField(null=True, blank=True)

    class Meta:
        unique_together = ('submission', 'field')
        constraints = [
            # Ensure at most one value field is non-null
            # This constraint checks that for each pair of fields, at least one is null
            models.CheckConstraint(
                name='single_value_column',
                check=(
                    models.Q(value_number__isnull=True) | models.Q(value_text__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ) & (
                    models.Q(value_file__isnull=True) | models.Q(entity_ref_uuid__isnull=True)
                ),
            ),
        ]

    def __str__(self) -> str:
        return f'{self.submission} - {self.field}'

