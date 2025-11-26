from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from core.models import BaseModel


class PurchaseRequest(BaseModel):
    """
    Purchase request entity for Purchase Request System.
    
    Each request moves through a workflow with multiple approval steps.
    Status transitions are validated according to PRD section 2.6.
    Status values: DRAFT, PENDING_APPROVAL, IN_REVIEW, REJECTED, RESUBMITTED, 
    FULLY_APPROVED, FINANCE_REVIEW, COMPLETED, ARCHIVED.
    """
    # Base fields (always present)
    requestor = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='purchase_requests')
    team = models.ForeignKey('teams.Team', on_delete=models.PROTECT, related_name='purchase_requests')
    form_template = models.ForeignKey('prs_forms.FormTemplate', on_delete=models.PROTECT, related_name='purchase_requests', help_text='Form template version used when this request was created')
    
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
    # Note: This stores only the latest rejection comment. Full approval/rejection history
    # with all comments is maintained in the ApprovalHistory model.
    rejection_comment = models.TextField(null=True, blank=True, help_text='Latest rejection comment. Full history in ApprovalHistory.')

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
        Validate status transitions according to PRD section 10.2 (status model).

        Status values: DRAFT, PENDING_APPROVAL, IN_REVIEW, REJECTED, RESUBMITTED,
        FULLY_APPROVED, FINANCE_REVIEW, COMPLETED, ARCHIVED.

        Allowed transitions (summarised from PRD):
        - DRAFT → PENDING_APPROVAL (Submission)
        - REJECTED → RESUBMITTED (Edit & submit again)
        - RESUBMITTED → PENDING_APPROVAL (Submission)
        - PENDING_APPROVAL → IN_REVIEW (Manager started review)
        - IN_REVIEW → FINANCE_REVIEW (Final step) or FULLY_APPROVED (no next non‑finance step)
        - FULLY_APPROVED → FINANCE_REVIEW (Finance step starts)
        - FINANCE_REVIEW → COMPLETED (Finance completion)
        - COMPLETED → ARCHIVED (Future cleanup)
        - Any non‑terminal status → REJECTED (Rejection)
        COMPLETED and ARCHIVED are treated as terminal states.
        """
        if old_status_code == new_status_code:
            return  # No change, always valid
        
        # If no previous status, allow any status (new object)
        if old_status_code is None:
            return
        
        # COMPLETED and ARCHIVED are immutable - cannot transition from these
        if old_status_code in ('COMPLETED', 'ARCHIVED'):
            raise ValidationError(f'{old_status_code} requests cannot change status.')

        # Rejection can happen from any non-terminal status
        if new_status_code == 'REJECTED':
            # Already handled terminal states above
            return
        
        # Define valid transitions
        valid_transitions = {
            'DRAFT': ['PENDING_APPROVAL'],
            'REJECTED': ['RESUBMITTED'],
            'RESUBMITTED': ['PENDING_APPROVAL'],
            'PENDING_APPROVAL': ['IN_REVIEW'],
            # IN_REVIEW: next non‑finance step keeps IN_REVIEW, final non‑finance step goes to FULLY_APPROVED
            # or directly to FINANCE_REVIEW depending on workflow configuration.
            'IN_REVIEW': ['FINANCE_REVIEW', 'FULLY_APPROVED'],
            'FULLY_APPROVED': ['FINANCE_REVIEW'],
            'FINANCE_REVIEW': ['COMPLETED'],
            'COMPLETED': ['ARCHIVED'],
            'ARCHIVED': [],
        }
        
        allowed_next = valid_transitions.get(old_status_code, [])
        if new_status_code not in allowed_next:
            raise ValidationError(
                f'Invalid status transition from {old_status_code} to {new_status_code}. '
                f'Allowed transitions: {", ".join(allowed_next) if allowed_next else "none (terminal state)"}'
            )

    def clean(self):
        # Team must be active
        if self.team and not self.team.is_active:
            raise ValidationError('Team must be active.')
        # Form template must belong to the team
        if self.form_template and self.team and self.form_template.team != self.team:
            raise ValidationError('Form template must belong to the selected team.')
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
    Field value for a purchase request in Purchase Request System.
    
    Uses multi-column pattern for different field types.
    Only one value column should be non-null at a time (enforced via constraint).
    Note: FILE_UPLOAD field types are satisfied via Attachment records, not stored here.
    """
    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='field_values')
    field = models.ForeignKey('prs_forms.FormField', on_delete=models.CASCADE, related_name='request_values')

    value_number = models.DecimalField(max_digits=20, decimal_places=4, null=True, blank=True)
    value_text = models.TextField(null=True, blank=True)
    value_bool = models.BooleanField(null=True, blank=True)
    value_date = models.DateField(null=True, blank=True)
    # Note: value_file removed - FILE_UPLOAD fields use Attachment model instead
    value_dropdown = models.JSONField(null=True, blank=True, help_text='Stores selected dropdown option value')

    class Meta:
        unique_together = ('request', 'field')
        constraints = [
            # Ensure at most one value field is non-null
            models.CheckConstraint(
                name='prs_requestfieldvalue_single_value_column',
                check=(
                    models.Q(value_number__isnull=True) | models.Q(value_text__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_number__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_bool__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_text__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_date__isnull=True)
                ) & (
                    models.Q(value_bool__isnull=True) | models.Q(value_dropdown__isnull=True)
                ) & (
                    models.Q(value_date__isnull=True) | models.Q(value_dropdown__isnull=True)
                ),
            ),
        ]
        indexes = [
            models.Index(fields=['request', 'field']),
        ]

    def __str__(self) -> str:
        return f'{self.request} - {self.field}'

