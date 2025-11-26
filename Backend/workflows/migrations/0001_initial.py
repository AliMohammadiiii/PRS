# Generated manually for PRS models

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('teams', '0001_initial'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Workflow',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=128)),
                ('team', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='workflow', to='teams.team')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['team', 'is_active'], name='workflows_w_team_id_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='WorkflowStep',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('step_name', models.CharField(max_length=128)),
                ('step_order', models.PositiveIntegerField()),
                ('is_finance_review', models.BooleanField(default=False, help_text='True if this is the final Finance Review step')),
                ('workflow', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='steps', to='workflows.workflow')),
            ],
            options={
                'ordering': ['workflow', 'step_order'],
                'unique_together': {('workflow', 'step_order')},
                'indexes': [
                    models.Index(fields=['workflow', 'step_order'], name='workflows_w_workflo_idx'),
                ],
            },
        ),
        migrations.CreateModel(
            name='WorkflowStepApprover',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('step', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approvers', to='workflows.workflowstep')),
                ('approver', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workflow_step_assignments', to='accounts.user')),
            ],
            options={
                'unique_together': {('step', 'approver')},
                'indexes': [
                    models.Index(fields=['step', 'is_active'], name='workflows_w_step_id_idx'),
                    models.Index(fields=['approver', 'is_active'], name='workflows_w_approve_idx'),
                ],
            },
        ),
    ]


