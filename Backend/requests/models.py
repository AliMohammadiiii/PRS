from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from core.models import BaseModel


class PurchaseRequest(BaseModel):
    """
    Purchase request entity.
    Each request moves through a workflow with multiple approval steps.
    Status transitions are validated according to PRD section 2.6.
    """
    # Base fields (always present)
    requestor = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='purchase_requests')
    team = models.ForeignKey('teams.Team', on_delete=models.PROTECT, related_name='purchase_requests')
    template_version = models.ForeignKey('forms.FormTemplate', on_delete=models.PROTECT, related_name='purchase_requests')
    
    # Status management
    status = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='purchase_requests', limit_choices_to={'type__code': 'REQUEST_STATUS'})
    current_step = models.ForeignKey('workflows.WorkflowStep', on_delete=models.SET_NULL, null=True, blank=True, related_name='current_requests')
    
    # Vendor information
    vendor_name = models.CharField(max_length=255)
    vendor_account = models.CharField(max_length=128, help_text='Bank account details or IBAN for payment')
    
    # Request details
    subject = models.CharField(max_length=200)
    description = models.TextField(max_length=2000)
    purchase_type = models.ForeignKey('classifications.Lookup', on_delete=models.PROTECT, related_name='purchase_requests_by_type', limit_choices_to={'type__code': 'PURCHASE_TYPE'})
    
    # Timestamps
    submitted_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Rejection information
    rejection_comment = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'team']),
            models.Index(fields=['requestor', 'created_at']),
            models.Index(fields=['team', 'created_at']),
            models.Index(fields=['status', 'created_at']),
        ]
        ordering = ['-created_at']

    def _validate_status_transition(self, old_status_code, new_status_code):
        """
        Validate status transitions according to PRD section 2.6:
        - Draft → Pending Approval (when submitted)
        - Pending Approval → In Review (Step 1) or Rejected
        - In Review (Step X) → In Review (Step X+1), Rejected, or Fully Approved
        - Rejected → Resubmitted or Draft
        - Resubmitted → Pending Approval or In Review (Step 1)
        - Fully Approved → Finance Review or Rejected
        - Finance Review → Completed or Rejected
        - Completed → (no transitions allowed, immutable)
        """
        if old_status_code == new_status_code:
            return  # No change, always valid
        
        # If no previous status, allow any status (new object)
        if old_status_code is None:
            return
        
        # COMPLETED is immutable - cannot transition from COMPLETED
        if old_status_code == 'COMPLETED':
            raise ValidationError('Completed requests cannot change status.')
        
        # Define valid transitions
        valid_transitions = {
            'DRAFT': ['PENDING_APPROVAL'],
            'PENDING_APPROVAL': ['IN_REVIEW_STEP_1', 'REJECTED'],
            'IN_REVIEW_STEP_1': ['IN_REVIEW_STEP_2', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_2': ['IN_REVIEW_STEP_3', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_3': ['IN_REVIEW_STEP_4', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_4': ['IN_REVIEW_STEP_5', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_5': ['IN_REVIEW_STEP_6', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_6': ['IN_REVIEW_STEP_7', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_7': ['IN_REVIEW_STEP_8', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_8': ['IN_REVIEW_STEP_9', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_9': ['IN_REVIEW_STEP_10', 'REJECTED', 'FULLY_APPROVED'],
            'IN_REVIEW_STEP_10': ['REJECTED', 'FULLY_APPROVED'],
            'REJECTED': ['RESUBMITTED', 'DRAFT'],
            'RESUBMITTED': ['PENDING_APPROVAL', 'IN_REVIEW_STEP_1'],
            'FULLY_APPROVED': ['FINANCE_REVIEW', 'REJECTED'],
            'FINANCE_REVIEW': ['COMPLETED', 'REJECTED'],
        }
        
        allowed_next = valid_transitions.get(old_status_code, [])
        if new_status_code not in allowed_next:
            raise ValidationError(
                f'Invalid status transition from {old_status_code} to {new_status_code}. '
                f'Allowed transitions: {", ".join(allowed_next)}'
            )

    def clean(self):
        # Team must be active
        if self.team and not self.team.is_active:
            raise ValidationError('Team must be active.')
        # Template version must belong to the team
        if self.template_version and self.team and self.template_version.team != self.team:
            raise ValidationError('Template version must belong to the selected team.')
        # Lookup type guards
        if self.status and getattr(getattr(self.status, 'type', None), 'code', None) != 'REQUEST_STATUS':
            raise ValidationError('status must reference REQUEST_STATUS lookups.')
        if self.purchase_type and getattr(getattr(self.purchase_type, 'type', None), 'code', None) != 'PURCHASE_TYPE':
            raise ValidationError('purchase_type must reference PURCHASE_TYPE lookups.')
        
        # Validate status transitions
        if self.pk and self.status:
            try:
                previous = PurchaseRequest.objects.get(pk=self.pk)
                old_status_code = getattr(previous.status, 'code', None) if previous.status else None
                new_status_code = getattr(self.status, 'code', None) if self.status else None
                self._validate_status_transition(old_status_code, new_status_code)
            except PurchaseRequest.DoesNotExist:
                pass

    def __str__(self) -> str:
        return f'{self.subject} - {self.requestor} ({self.team.name})'


class RequestFieldValue(BaseModel):
    """
    Field value for a purchase request.
    Uses multi-column pattern similar to SubmissionFieldValue.
    Only one value column should be non-null at a time.
    """
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='field_values')
    field = models.ForeignKey('forms.FormField', on_delete=models.CASCADE, related_name='request_values')

    value_number = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    value_text = models.TextField(null=True, blank=True)
    value_bool = models.BooleanField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    value_file = models.FileField(null=True, blank=True, upload_to='request_files/', validators=[FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'docx'])])
    value_dropdown = models.JSONField(null=True, blank=True, help_text='Stores selected dropdown option value')

    class Meta:
        unique_together = ('request', 'field')
        constraints = [
            # Ensure at most one value field is non-null
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
                    models.Q(value_number__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(value_file__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_file__isnull=True) | models.Q(value_dropdown__isnull=True)
                ),
            ),
        ]
        indexes = [
            models.Index(fields=['request', 'field']),
        ]

    def __str__(self) -> str:
        return f'{self.request} - {self.field}'


