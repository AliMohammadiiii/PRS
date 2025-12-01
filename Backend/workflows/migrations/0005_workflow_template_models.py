# Generated for PRS multi-template support

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('teams', '0001_initial'),
        ('classifications', '0001_initial'),
        ('workflows', '0004_remove_workflowstepapprover_workflows_w_approve_6090ad_idx_and_more'),
    ]

    operations = [
        # Create WorkflowTemplate model
        migrations.CreateModel(
            name='WorkflowTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('name', models.CharField(max_length=128)),
                ('version_number', models.PositiveIntegerField(default=1)),
                ('description', models.TextField(blank=True, null=True)),
                ('team', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='workflow_templates', to='teams.team')),
            ],
            options={
                'ordering': ['team', '-version_number'],
                'unique_together': {('team', 'version_number')},
            },
        ),
        migrations.AddIndex(
            model_name='workflowtemplate',
            index=models.Index(fields=['team', 'is_active'], name='workflows_w_team_is_active_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowtemplate',
            index=models.Index(fields=['team', 'version_number'], name='workflows_w_team_ver_idx'),
        ),
        # Create WorkflowTemplateStep model
        migrations.CreateModel(
            name='WorkflowTemplateStep',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('step_name', models.CharField(max_length=128)),
                ('step_order', models.PositiveIntegerField()),
                ('is_finance_review', models.BooleanField(default=False, help_text='True if this is the final Finance Review step')),
                ('workflow_template', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='steps', to='workflows.workflowtemplate')),
            ],
            options={
                'ordering': ['workflow_template', 'step_order'],
                'unique_together': {('workflow_template', 'step_order')},
            },
        ),
        migrations.AddIndex(
            model_name='workflowtemplatestep',
            index=models.Index(fields=['workflow_template', 'step_order'], name='workflows_wts_template_order_idx'),
        ),
        # Create WorkflowTemplateStepApprover model
        migrations.CreateModel(
            name='WorkflowTemplateStepApprover',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('step', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approvers', to='workflows.workflowtemplatestep')),
                ('role', models.ForeignKey(blank=True, help_text='Role required to approve at this step (COMPANY_ROLE lookup).', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='workflow_template_step_roles', to='classifications.lookup')),
            ],
            options={
                'unique_together': {('step', 'role')},
            },
        ),
        migrations.AddIndex(
            model_name='workflowtemplatestepapprover',
            index=models.Index(fields=['step', 'is_active'], name='workflows_wtsa_step_active_idx'),
        ),
        migrations.AddIndex(
            model_name='workflowtemplatestepapprover',
            index=models.Index(fields=['role', 'is_active'], name='workflows_wtsa_role_active_idx'),
        ),
    ]








