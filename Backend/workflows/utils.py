from django.db import models
from django.db.models import Max
from workflows.models import (
    WorkflowTemplate,
    WorkflowTemplateStep,
    WorkflowTemplateStepApprover
)


def clone_workflow_template(old_template, new_name=None):
    """
    Creates a new version of a workflow template by cloning it with all steps and approvers.
    
    Args:
        old_template: WorkflowTemplate instance to clone
        new_name: Optional name for the new template (defaults to old template name)
    
    Returns:
        New WorkflowTemplate instance with incremented version_number
    
    Note:
        - The new template will have is_active=True
        - All steps and approvers are copied from the old template
        - The old template should be deactivated separately if needed
    """
    # Get the next version number for this template name
    name = new_name or old_template.name
    max_version = WorkflowTemplate.objects.filter(name=name).aggregate(
        max_ver=Max('version_number')
    )['max_ver'] or 0
    version_number = max_version + 1
    
    # Create new template
    new_template = WorkflowTemplate.objects.create(
        name=name,
        version_number=version_number,
        description=old_template.description,
        is_active=True
    )
    
    # Get all active steps from the old template, ordered by step_order
    old_steps = WorkflowTemplateStep.objects.filter(
        workflow_template=old_template,
        is_active=True
    ).order_by('step_order').select_related().prefetch_related('approvers')
    
    # Copy each step and its approvers
    step_mapping = {}  # Map old step IDs to new step instances for reference
    for old_step in old_steps:
        # Create new step
        new_step = WorkflowTemplateStep.objects.create(
            workflow_template=new_template,
            step_name=old_step.step_name,
            step_order=old_step.step_order,
            is_finance_review=old_step.is_finance_review,
            is_active=True
        )
        step_mapping[old_step.id] = new_step
        
        # Copy approvers for this step
        old_approvers = WorkflowTemplateStepApprover.objects.filter(
            step=old_step,
            is_active=True
        ).select_related('role')
        
        for old_approver in old_approvers:
            WorkflowTemplateStepApprover.objects.create(
                step=new_step,
                role=old_approver.role,
                is_active=True
            )
    
    return new_template


def detect_workflow_changes(old_template, new_steps_data):
    """
    Detects if there are any changes between an existing workflow template and new steps data.
    
    Args:
        old_template: WorkflowTemplate instance to compare against
        new_steps_data: List of dicts containing step data (from request.data)
    
    Returns:
        bool: True if changes detected, False otherwise
    
    Changes detected:
        - Different number of steps
        - Modified step properties (step_name, step_order, is_finance_review)
        - Different approver assignments per step
    """
    # Get current steps with approvers
    old_steps = WorkflowTemplateStep.objects.filter(
        workflow_template=old_template,
        is_active=True
    ).order_by('step_order').prefetch_related('approvers')
    
    old_steps_list = list(old_steps)
    
    # Compare step count
    if len(old_steps_list) != len(new_steps_data):
        return True
    
    # Create a mapping of step_order to step for easy lookup
    old_steps_by_order = {step.step_order: step for step in old_steps_list}
    
    # Compare each step
    for new_step_data in new_steps_data:
        step_order = new_step_data.get('step_order')
        old_step = old_steps_by_order.get(step_order)
        
        if not old_step:
            # New step order not found in old template
            return True
        
        # Compare step properties
        if (old_step.step_name != new_step_data.get('step_name') or
            old_step.is_finance_review != new_step_data.get('is_finance_review', False)):
            return True
        
        # Compare approver roles
        new_role_ids = set(new_step_data.get('role_ids', []))
        old_role_ids = set(
            approver.role.id for approver in old_step.approvers.all()
            if approver.is_active and approver.role
        )
        
        if new_role_ids != old_role_ids:
            return True
    
    return False

