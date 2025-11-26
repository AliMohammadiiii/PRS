from django.db import migrations, models
import django.db.models.deletion


def migrate_step_approvers_to_roles(apps, schema_editor):
    """
    Data migration to back-fill WorkflowStepApprover.role from existing approver
    user assignments, using AccessScope where possible.
    """
    WorkflowStepApprover = apps.get_model('workflows', 'WorkflowStepApprover')
    WorkflowStep = apps.get_model('workflows', 'WorkflowStep')
    AccessScope = apps.get_model('accounts', 'AccessScope')

    # Best-effort: for each (step, approver) record from the previous schema,
    # try to find an AccessScope with PRS_ROLE for the workflow's team and use
    # that role. If multiple roles exist, pick the first. If none exist, leave
    # role as-is (null) so that admins can fix configuration manually.
    for step_role in WorkflowStepApprover.objects.all():
        if getattr(step_role, 'role_id', None):
            continue

        step = step_role.step
        # Older rows may still have an `approver_id` column present in the DB.
        approver_id = getattr(step_role, 'approver_id', None)
        if not approver_id:
            continue

        try:
            workflow_step = WorkflowStep.objects.get(pk=step.id)
        except WorkflowStep.DoesNotExist:
            continue

        team = workflow_step.workflow.team

        scope_qs = AccessScope.objects.filter(
            user_id=approver_id,
            team=team,
            is_active=True,
            role__type__code='PRS_ROLE',
        ).order_by('created_at')

        scope = scope_qs.first()
        if scope:
            step_role.role_id = scope.role_id
            step_role.save(update_fields=['role'])


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0004_add_prs_lookups'),
        ('accounts', '0004_alter_user_options_and_more'),
        ('workflows', '0002_rename_workflows_w_team_id_idx_workflows_w_team_id_34a077_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='workflowstepapprover',
            name='role',
            field=models.ForeignKey(default=None, help_text='Role required to approve at this step (PRS_ROLE lookup).', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='workflow_step_roles', to='classifications.lookup'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='workflowstepapprover',
            name='step',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='approvers', to='workflows.workflowstep'),
        ),
        migrations.AlterUniqueTogether(
            name='workflowstepapprover',
            unique_together={('step', 'role')},
        ),
        migrations.AddIndex(
            model_name='workflowstepapprover',
            index=models.Index(fields=['role', 'is_active'], name='workflows_w_role_id_idx'),
        ),
        migrations.RunPython(migrate_step_approvers_to_roles, migrations.RunPython.noop),
        # Note: The old `approver` FK column is left in the database schema to
        # preserve history but is no longer used by the application code.
    ]



