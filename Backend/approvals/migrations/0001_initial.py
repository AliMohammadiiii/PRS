# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('workflows', '0001_initial'),
        ('purchase_requests', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ApprovalHistory',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('action', models.CharField(choices=[('APPROVE', 'Approve'), ('REJECT', 'Reject')], max_length=16)),
                ('comment', models.TextField(blank=True, help_text='Required for rejections, optional for approvals', null=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('approver', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='approval_actions', to='accounts.user')),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approval_history', to='purchase_requests.purchaserequest')),
                ('step', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='approval_history', to='workflows.workflowstep')),
            ],
            options={
                'ordering': ['request', 'timestamp'],
                'indexes': [
                    models.Index(fields=['request', 'step'], name='approvals_a_request_idx'),
                    models.Index(fields=['request', 'timestamp'], name='approvals_a_request_2_idx'),
                    models.Index(fields=['approver', 'timestamp'], name='approvals_a_approve_idx'),
                ],
            },
        ),
    ]


