# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0001_initial'),
        ('purchase_requests', '0001_initial'),
        ('prs_forms', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditevent',
            name='request',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='audit_events', to='purchase_requests.purchaserequest'),
        ),
        migrations.AlterField(
            model_name='auditevent',
            name='submission',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='audit_events', to='submissions.submission'),
        ),
        migrations.AlterField(
            model_name='auditevent',
            name='event_type',
            field=models.CharField(choices=[('SUBMIT', 'Submit'), ('STATUS_CHANGE', 'Status Change'), ('FIELD_UPDATE', 'Field Update'), ('REQUEST_CREATED', 'Request Created'), ('REQUEST_SUBMITTED', 'Request Submitted'), ('APPROVAL', 'Approval'), ('REJECTION', 'Rejection'), ('RESUBMISSION', 'Resubmission'), ('WORKFLOW_STEP_CHANGE', 'Workflow Step Change'), ('REQUEST_COMPLETED', 'Request Completed'), ('ATTACHMENT_UPLOAD', 'Attachment Upload'), ('ATTACHMENT_REMOVED', 'Attachment Removed')], max_length=32),
        ),
        migrations.AddField(
            model_name='fieldchange',
            name='form_field',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='audit_field_changes', to='prs_forms.formfield'),
        ),
        migrations.AddField(
            model_name='fieldchange',
            name='field_name',
            field=models.CharField(blank=True, help_text='Field name for non-field-model changes (e.g., status, vendor_name)', max_length=128, null=True),
        ),
        migrations.AlterField(
            model_name='fieldchange',
            name='field',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='audit_field_changes', to='reports.reportfield'),
        ),
        migrations.AddIndex(
            model_name='auditevent',
            index=models.Index(fields=['request', 'event_type', 'created_at'], name='audit_audit_request_idx'),
        ),
        migrations.AddIndex(
            model_name='auditevent',
            index=models.Index(fields=['submission', 'event_type', 'created_at'], name='audit_audit_submiss_idx'),
        ),
        migrations.AddIndex(
            model_name='fieldchange',
            index=models.Index(fields=['audit_event', 'field'], name='audit_field_audit_e_idx'),
        ),
        migrations.AddIndex(
            model_name='fieldchange',
            index=models.Index(fields=['audit_event', 'form_field'], name='audit_field_audit_e_2_idx'),
        ),
    ]
