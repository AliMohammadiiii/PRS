# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('attachments', '0002_rename_attachment_request_idx_attachments_request_f5fc49_idx_and_more'),
        ('approvals', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='attachment',
            name='approval_history',
            field=models.ForeignKey(
                blank=True,
                help_text='Optional link to approval history entry if attachment was added during submit/approve/reject/complete action',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='attachments',
                to='approvals.approvalhistory'
            ),
        ),
        migrations.AddIndex(
            model_name='attachment',
            index=models.Index(fields=['approval_history'], name='attachments_approval_idx'),
        ),
    ]




