from django.db import migrations, models
import django.db.models.deletion


def backfill_approval_roles(apps, schema_editor):
    """
    Best-effort backfill of ApprovalHistory.role based on historical approver
    assignments and AccessScope.
    """
    ApprovalHistory = apps.get_model('approvals', 'ApprovalHistory')
    # Historical version of WorkflowStepApprover at this point in the migration
    # chain may not yet have a `role` field, depending on the workflows app
    # migration ordering. To keep this migration robust, bail out early if the
    # historical model doesn't expose `role_id`.
    WorkflowStepApprover = apps.get_model('workflows', 'WorkflowStepApprover')
    if 'role_id' not in {f.attname for f in WorkflowStepApprover._meta.get_fields()}:
        # Schema does not yet have role_id on WorkflowStepApprover; skip
        # best-effort backfill and leave ApprovalHistory.role as NULL.
        return

    AccessScope = apps.get_model('accounts', 'AccessScope')

    for approval in ApprovalHistory.objects.filter(role_id__isnull=True):
        step_id = approval.step_id
        user_id = approval.approver_id
        if not step_id or not user_id:
            continue

        # Try to infer from current step roles and user's AccessScope on team
        step_roles = WorkflowStepApprover.objects.filter(
            step_id=step_id,
            is_active=True,
        ).values_list('role_id', flat=True)
        if not step_roles:
            continue

        team = getattr(getattr(approval.request, 'team', None), 'id', None)
        if not team:
            continue

        scope_qs = AccessScope.objects.filter(
            user_id=user_id,
            team_id=team,
            is_active=True,
            role_id__in=step_roles,
        ).order_by('created_at')
        scope = scope_qs.first()
        if scope:
            approval.role_id = scope.role_id
            approval.save(update_fields=['role'])


class Migration(migrations.Migration):

    dependencies = [
        ('classifications', '0004_add_prs_lookups'),
        ('approvals', '0002_rename_approvals_a_request_idx_approvals_a_request_98049a_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='approvalhistory',
            name='role',
            field=models.ForeignKey(blank=True, help_text='Role under which the approver acted (PRS_ROLE lookup).', null=True, on_delete=django.db.models.deletion.PROTECT, related_name='approval_history_roles', to='classifications.lookup'),
        ),
        migrations.AddIndex(
            model_name='approvalhistory',
            index=models.Index(fields=['role', 'timestamp'], name='approvals_a_role_id_idx'),
        ),
        migrations.RunPython(backfill_approval_roles, migrations.RunPython.noop),
    ]


