from django.db import models
from core.models import BaseModel


class AuditEvent(BaseModel):
    SUBMIT = 'SUBMIT'
    STATUS_CHANGE = 'STATUS_CHANGE'
    FIELD_UPDATE = 'FIELD_UPDATE'
    EVENT_CHOICES = [
        (SUBMIT, 'Submit'),
        (STATUS_CHANGE, 'Status Change'),
        (FIELD_UPDATE, 'Field Update'),
    ]

    event_type = models.CharField(max_length=32, choices=EVENT_CHOICES)
    actor = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='audit_events')
    submission = models.ForeignKey('submissions.Submission', on_delete=models.CASCADE, related_name='audit_events')
    metadata = models.JSONField(default=dict, blank=True)

    def __str__(self) -> str:
        return f'{self.event_type} - {self.submission_id}'


class FieldChange(BaseModel):
    audit_event = models.ForeignKey(AuditEvent, on_delete=models.CASCADE, related_name='field_changes')
    field = models.ForeignKey('reports.ReportField', on_delete=models.CASCADE, related_name='audit_field_changes')
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)

    def __str__(self) -> str:
        return f'{self.field_id} change'

from django.db import models

# Create your models here.
