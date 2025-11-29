# Generated for PRS multi-template support

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '0006_migrate_workflow_to_template'),
        ('approvals', '0004_remove_approvalhistory_approvals_a_role_id_idx'),
    ]

    operations = [
        # Make step nullable for new requests that use template_step
        migrations.AlterField(
            model_name='approvalhistory',
            name='step',
            field=models.ForeignKey(
                blank=True,
                help_text='Legacy workflow step (for old requests)',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='approval_history',
                to='workflows.workflowstep',
            ),
        ),
        # Add template_step field
        migrations.AddField(
            model_name='approvalhistory',
            name='template_step',
            field=models.ForeignKey(
                blank=True,
                help_text='Workflow template step (for new requests)',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='approval_history',
                to='workflows.workflowtemplatestep',
            ),
        ),
        # Add index for template_step
        migrations.AddIndex(
            model_name='approvalhistory',
            index=models.Index(fields=['request', 'template_step'], name='approvals_a_req_tmpl_step_idx'),
        ),
    ]




