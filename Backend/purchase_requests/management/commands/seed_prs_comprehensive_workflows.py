"""
Helper module for seeding WorkflowTemplates, Steps, and StepApprovers for comprehensive PRS seed data.
"""

from django.db.models import Max
from workflows.models import WorkflowTemplate, WorkflowTemplateStep, WorkflowTemplateStepApprover


def _get_or_create_workflow_template(template_name):
    """Helper to get or create WorkflowTemplate with proper version number handling."""
    # Check if template with this name exists
    template = WorkflowTemplate.objects.filter(name=template_name, is_active=True).first()
    if not template:
        # Get max version number for this template name
        max_version = WorkflowTemplate.objects.filter(name=template_name).aggregate(
            max_version=Max('version_number')
        )['max_version'] or 0
        template = WorkflowTemplate.objects.create(
            name=template_name,
            version_number=max_version + 1,
            is_active=True
        )
    return template


def create_workflow_template_standard(team, name, purchase_type_code, company_roles):
    """Create standard 3-step workflow: TEAM_MANAGER → PROCUREMENT_OFFICER → FINANCE_CONTROLLER."""
    # team, name, purchase_type_code parameters kept for backward compatibility but not used
    template = _get_or_create_workflow_template('فلو تأیید استاندارد - مدیر تیم، تدارکات، مالی')
    
    # Step 1: Team Manager Approval
    step1, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=1,
        defaults={
            'step_name': 'تأیید مدیر تیم',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step1,
        role=company_roles['TEAM_MANAGER'],
        defaults={'is_active': True}
    )
    
    # Step 2: Procurement Approval
    step2, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=2,
        defaults={
            'step_name': 'تأیید تدارکات',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step2,
        role=company_roles['PROCUREMENT_OFFICER'],
        defaults={'is_active': True}
    )
    
    # Step 3: Finance Review (is_finance_review=True)
    step3, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=3,
        defaults={
            'step_name': 'بررسی و تأیید مالی',
            'is_finance_review': True,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step3,
        role=company_roles['FINANCE_CONTROLLER'],
        defaults={'is_active': True}
    )
    
    return template


def create_workflow_template_asset(team, name, purchase_type_code, company_roles):
    """Create asset 4-step workflow: TEAM_MANAGER → DEPARTMENT_HEAD → LEGAL_REVIEWER → FINANCE_CONTROLLER."""
    # team, name, purchase_type_code parameters kept for backward compatibility but not used
    template = _get_or_create_workflow_template('فلو تأیید سرمایه‌ای - مدیر تیم، مدیر ارشد، حقوقی، مالی')
    
    # Step 1: Team Manager Approval
    step1, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=1,
        defaults={
            'step_name': 'تأیید مدیر فنی',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step1,
        role=company_roles['TEAM_MANAGER'],
        defaults={'is_active': True}
    )
    
    # Step 2: Department Head Approval
    step2, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=2,
        defaults={
            'step_name': 'تأیید مدیر محصول / ذی‌نفع کسب‌وکار',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step2,
        role=company_roles['DEPARTMENT_HEAD'],
        defaults={'is_active': True}
    )
    
    # Step 3: Legal Review
    step3, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=3,
        defaults={
            'step_name': 'بررسی حقوقی / قرارداد',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step3,
        role=company_roles['LEGAL_REVIEWER'],
        defaults={'is_active': True}
    )
    
    # Step 4: Finance Review (is_finance_review=True)
    step4, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=4,
        defaults={
            'step_name': 'بررسی مالی و بودجه',
            'is_finance_review': True,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step4,
        role=company_roles['FINANCE_CONTROLLER'],
        defaults={'is_active': True}
    )
    
    return template


def create_workflow_template_consulting(team, name, purchase_type_code, company_roles):
    """Create consulting 3-step workflow: TEAM_MANAGER → DEPARTMENT_HEAD → FINANCE_CONTROLLER."""
    # team, name, purchase_type_code parameters kept for backward compatibility but not used
    template = _get_or_create_workflow_template('فلو تأیید مشاوره - مدیر تیم، مدیر ارشد، مالی')
    
    # Step 1: Team Manager Approval
    step1, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=1,
        defaults={
            'step_name': 'تأیید مدیر محصول',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step1,
        role=company_roles['TEAM_MANAGER'],
        defaults={'is_active': True}
    )
    
    # Step 2: Department Head Approval
    step2, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=2,
        defaults={
            'step_name': 'تأیید مدیر ارشد محصول / CPO',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step2,
        role=company_roles['DEPARTMENT_HEAD'],
        defaults={'is_active': True}
    )
    
    # Step 3: Finance Review (is_finance_review=True)
    step3, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=3,
        defaults={
            'step_name': 'بررسی مالی',
            'is_finance_review': True,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step3,
        role=company_roles['FINANCE_CONTROLLER'],
        defaults={'is_active': True}
    )
    
    return template


def create_workflow_template_emergency(team, company_roles):
    """Create emergency 3-step workflow: TEAM_MANAGER → CEO → FINANCE_CONTROLLER."""
    template = _get_or_create_workflow_template('فلو تأیید اضطراری - مدیر تیم، مدیرعامل، مالی')
    
    # Step 1: Team Manager Approval
    step1, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=1,
        defaults={
            'step_name': 'تأیید مدیر مستقیم',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step1,
        role=company_roles['TEAM_MANAGER'],
        defaults={'is_active': True}
    )
    
    # Step 2: CEO Approval
    step2, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=2,
        defaults={
            'step_name': 'تأیید مدیریت ارشد / CEO',
            'is_finance_review': False,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step2,
        role=company_roles['CEO'],
        defaults={'is_active': True}
    )
    
    # Step 3: Finance Review (is_finance_review=True)
    step3, _ = WorkflowTemplateStep.objects.get_or_create(
        workflow_template=template,
        step_order=3,
        defaults={
            'step_name': 'تأیید مالی اضطراری',
            'is_finance_review': True,
            'is_active': True
        }
    )
    WorkflowTemplateStepApprover.objects.get_or_create(
        step=step3,
        role=company_roles['FINANCE_CONTROLLER'],
        defaults={'is_active': True}
    )
    
    return template

