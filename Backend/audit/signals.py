from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from audit.models import AuditEvent, FieldChange
from submissions.models import Submission, SubmissionFieldValue


@receiver(post_save, sender=Submission)
def log_submit_event(sender, instance: Submission, created: bool, **kwargs):
    # On creation, record a SUBMIT event
    if created:
        AuditEvent.objects.create(
            event_type=AuditEvent.SUBMIT,
            actor=instance.submitted_by,
            submission=instance,
            metadata={
                'status': getattr(instance.status, 'code', None),
            },
        )


@receiver(pre_save, sender=Submission)
def log_status_change(sender, instance: Submission, **kwargs):
    if not instance.pk:
        return
    try:
        previous = Submission.objects.get(pk=instance.pk)
    except Submission.DoesNotExist:
        return
    if previous.status_id != instance.status_id or previous.rejection_comment != instance.rejection_comment:
        AuditEvent.objects.create(
            event_type=AuditEvent.STATUS_CHANGE,
            actor=instance.submitted_by,
            submission=instance,
            metadata={
                'old_status': str(previous.status_id),
                'new_status': str(instance.status_id),
                'rejection_comment': instance.rejection_comment,
            },
        )


@receiver(pre_save, sender=SubmissionFieldValue)
def log_field_update(sender, instance: SubmissionFieldValue, **kwargs):
    previous = None
    if instance.pk:
        try:
            previous = SubmissionFieldValue.objects.get(pk=instance.pk)
        except SubmissionFieldValue.DoesNotExist:
            previous = None
    def serialize(v):
        if v is None:
            return None
        return str(v)
    # determine which column carries value
    def pick_value(obj):
        for key in ['value_number', 'value_text', 'value_bool', 'value_date', 'value_file', 'entity_ref_uuid']:
            v = getattr(obj, key, None)
            if v not in (None, ''):
                return key, v
        return None, None
    old_col, old_v = (None, None)
    new_col, new_v = pick_value(instance)
    if previous:
        old_col, old_v = pick_value(previous)
    old_val = serialize(old_v)
    new_val = serialize(new_v)
    if old_val != new_val:
        event = AuditEvent.objects.create(
            event_type=AuditEvent.FIELD_UPDATE,
            actor=instance.submission.submitted_by,
            submission=instance.submission,
            metadata={'field_id': str(instance.field_id), 'column': new_col},
        )
        FieldChange.objects.create(
            audit_event=event,
            field=instance.field,
            old_value=old_val,
            new_value=new_val,
        )


