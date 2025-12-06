# Generated for PRS multi-template support

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '0006_migrate_workflow_to_template'),
        ('purchase_requests', '0002_remove_requestfieldvalue_single_value_column_and_more'),
    ]

    operations = [
        # Add workflow_template field to PurchaseRequest
        migrations.AddField(
            model_name='purchaserequest',
            name='workflow_template',
            field=models.ForeignKey(
                blank=True,
                help_text='Workflow template used for this request. Nullable for legacy requests.',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='purchase_requests',
                to='workflows.workflowtemplate',
            ),
        ),
        # Add current_template_step field to PurchaseRequest
        migrations.AddField(
            model_name='purchaserequest',
            name='current_template_step',
            field=models.ForeignKey(
                blank=True,
                help_text='Current step in the workflow template (for new requests)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='current_requests',
                to='workflows.workflowtemplatestep',
            ),
        ),
    ]











