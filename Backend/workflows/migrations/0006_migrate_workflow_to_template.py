# Data migration: Convert existing Workflow records to WorkflowTemplate

from django.db import migrations


def migrate_workflows_to_templates(apps, schema_editor):
    """
    Convert existing Workflow, WorkflowStep, and WorkflowStepApprover records
    to the new WorkflowTemplate, WorkflowTemplateStep, and WorkflowTemplateStepApprover models.
    
    This maintains backward compatibility by creating equivalent template records
    for all existing workflows.
    """
    Workflow = apps.get_model('workflows', 'Workflow')
    WorkflowStep = apps.get_model('workflows', 'WorkflowStep')
    WorkflowStepApprover = apps.get_model('workflows', 'WorkflowStepApprover')
    WorkflowTemplate = apps.get_model('workflows', 'WorkflowTemplate')
    WorkflowTemplateStep = apps.get_model('workflows', 'WorkflowTemplateStep')
    WorkflowTemplateStepApprover = apps.get_model('workflows', 'WorkflowTemplateStepApprover')
    
    # Mapping from old step IDs to new step IDs (for approver migration)
    step_id_mapping = {}
    
    for workflow in Workflow.objects.all():
        # Create WorkflowTemplate from Workflow
        template = WorkflowTemplate.objects.create(
            team=workflow.team,
            name=workflow.name,
            version_number=1,
            is_active=workflow.is_active,
            description=f'Migrated from legacy workflow',
        )
        
        # Migrate WorkflowSteps to WorkflowTemplateSteps
        for step in WorkflowStep.objects.filter(workflow=workflow).order_by('step_order'):
            new_step = WorkflowTemplateStep.objects.create(
                workflow_template=template,
                step_name=step.step_name,
                step_order=step.step_order,
                is_finance_review=step.is_finance_review,
                is_active=step.is_active,
            )
            step_id_mapping[step.id] = new_step.id
            
            # Migrate approvers for this step
            for approver in WorkflowStepApprover.objects.filter(step=step):
                WorkflowTemplateStepApprover.objects.create(
                    step=new_step,
                    role=approver.role,
                    is_active=approver.is_active,
                )


def reverse_migration(apps, schema_editor):
    """
    Reverse the migration by deleting all WorkflowTemplate records.
    The original Workflow records are preserved.
    """
    WorkflowTemplate = apps.get_model('workflows', 'WorkflowTemplate')
    # Cascade delete will handle steps and approvers
    WorkflowTemplate.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('workflows', '0005_workflow_template_models'),
    ]

    operations = [
        migrations.RunPython(migrate_workflows_to_templates, reverse_migration),
    ]




