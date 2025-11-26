from django.db import models
from core.models import BaseModel


class AuditEvent(BaseModel):
    # Legacy event types (CFO Wise)
    SUBMIT = 'SUBMIT'
    STATUS_CHANGE = 'STATUS_CHANGE'
    FIELD_UPDATE = 'FIELD_UPDATE'
    # PRS event types
    REQUEST_CREATED = 'REQUEST_CREATED'
    REQUEST_SUBMITTED = 'REQUEST_SUBMITTED'
    APPROVAL = 'APPROVAL'
    REJECTION = 'REJECTION'
    RESUBMISSION = 'RESUBMISSION'
    WORKFLOW_STEP_CHANGE = 'WORKFLOW_STEP_CHANGE'
    REQUEST_COMPLETED = 'REQUEST_COMPLETED'
    ATTACHMENT_UPLOAD = 'ATTACHMENT_UPLOAD'
    ATTACHMENT_REMOVED = 'ATTACHMENT_REMOVED'
    
    EVENT_CHOICES = [
        # Legacy
        (SUBMIT, 'Submit'),
        (STATUS_CHANGE, 'Status Change'),
        (FIELD_UPDATE, 'Field Update'),
        # PRS
        (REQUEST_CREATED, 'Request Created'),
        (REQUEST_SUBMITTED, 'Request Submitted'),
        (APPROVAL, 'Approval'),
        (REJECTION, 'Rejection'),
        (RESUBMISSION, 'Resubmission'),
        (WORKFLOW_STEP_CHANGE, 'Workflow Step Change'),
        (REQUEST_COMPLETED, 'Request Completed'),
        (ATTACHMENT_UPLOAD, 'Attachment Upload'),
        (ATTACHMENT_REMOVED, 'Attachment Removed'),
    ]

    event_type = models.CharField(max_length=32, choices=EVENT_CHOICES)
    actor = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='audit_events')
    
    # Legacy FK (CFO Wise)
    submission = models.ForeignKey('submissions.Submission', on_delete=models.CASCADE, related_name='audit_events', null=True, blank=True)
    # PRS FK
    request = models.ForeignKey('purchase_requests.PurchaseRequest', on_delete=models.CASCADE, related_name='audit_events', null=True, blank=True)
    
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['request', 'event_type', 'created_at']),
            models.Index(fields=['submission', 'event_type', 'created_at']),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        # At least one of submission or request must be set
        if not self.submission and not self.request:
            raise ValidationError('Either submission or request must be set.')
        # Both cannot be set
        if self.submission and self.request:
            raise ValidationError('Cannot set both submission and request.')

    def __str__(self) -> str:
        entity_id = self.request_id if self.request else self.submission_id
        return f'{self.event_type} - {entity_id}'


class FieldChange(BaseModel):
    audit_event = models.ForeignKey(AuditEvent, on_delete=models.CASCADE, related_name='field_changes')
    
    # Legacy FK (CFO Wise)
    field = models.ForeignKey('reports.ReportField', on_delete=models.CASCADE, related_name='audit_field_changes', null=True, blank=True)
    # PRS FK
    form_field = models.ForeignKey('prs_forms.FormField', on_delete=models.CASCADE, related_name='audit_field_changes', null=True, blank=True)
    # For non-field changes (e.g., status changes), store field name as string
    field_name = models.CharField(max_length=128, null=True, blank=True, help_text='Field name for non-field-model changes (e.g., status, vendor_name)')
    
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['audit_event', 'field']),
            models.Index(fields=['audit_event', 'form_field']),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        # At least one of field, form_field, or field_name must be set
        if not self.field and not self.form_field and not self.field_name:
            raise ValidationError('Either field, form_field, or field_name must be set.')

    def __str__(self) -> str:
        field_ref = self.field or self.form_field or self.field_name
        return f'{field_ref} change'

from django.db import models

# Create your models here.
