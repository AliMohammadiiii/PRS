from django.db import models
from django.core.exceptions import ValidationError
from core.models import BaseModel


# =============================================================================
# NEW TEMPLATE-BASED MODELS
# =============================================================================

class WorkflowTemplate(BaseModel):
    """
    General workflow template definition for Purchase Request System.
    
    Workflow templates are team-agnostic and can be assigned to multiple teams
    via TeamPurchaseConfig. The active template for a given (team, purchase_type)
    is selected via TeamPurchaseConfig.
    Templates define sequential approval steps ending with a Finance Review step.
    """
    name = models.CharField(max_length=128)
    version_number = models.PositiveIntegerField(default=1)
    description = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = ('name', 'version_number')
        indexes = [
            models.Index(fields=['name', 'is_active']),
            models.Index(fields=['name', 'version_number']),
        ]
        ordering = ['name', '-version_number']

    def clean(self):
        # No team validation needed - templates are team-agnostic
        pass

    def __str__(self) -> str:
        return f'{self.name} (v{self.version_number})'


class WorkflowTemplateStep(BaseModel):
    """
    Sequential step in a workflow template for Purchase Request System.
    
    Steps are executed in order (step_order).
    Each workflow template must have at least 2 steps: one approval step + Finance Review.
    Each workflow template must have exactly one step with is_finance_review=True (enforced via clean/save).
    """
    workflow_template = models.ForeignKey(
        WorkflowTemplate,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    step_name = models.CharField(max_length=128)
    step_order = models.PositiveIntegerField()
    is_finance_review = models.BooleanField(
        default=False,
        help_text='True if this is the final Finance Review step'
    )

    class Meta:
        unique_together = ('workflow_template', 'step_order')
        indexes = [
            models.Index(fields=['workflow_template', 'step_order']),
        ]
        ordering = ['workflow_template', 'step_order']

    def clean(self):
        # Workflow template must be active
        if self.workflow_template and not self.workflow_template.is_active:
            raise ValidationError('Workflow template must be active.')
        # Step order must be positive
        if self.step_order < 1:
            raise ValidationError('Step order must be at least 1.')
        
        # Enforce exactly one finance review step per workflow template
        if self.is_finance_review:
            existing_finance_step = WorkflowTemplateStep.objects.filter(
                workflow_template=self.workflow_template,
                is_finance_review=True
            ).exclude(pk=self.pk if self.pk else None)
            
            if existing_finance_step.exists():
                raise ValidationError(
                    f'Workflow template {self.workflow_template.name} already has a Finance Review step. '
                    'Each workflow template must have exactly one Finance Review step.'
                )

    def save(self, *args, **kwargs):
        # Ensure clean() is called to validate exactly one finance step
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.workflow_template} - Step {self.step_order}: {self.step_name}'


class WorkflowTemplateStepApprover(BaseModel):
    """
    Approver assignment to a workflow template step.
    Multiple approver roles at a step require all to approve (AND logic).
    """
    step = models.ForeignKey(
        WorkflowTemplateStep,
        on_delete=models.CASCADE,
        related_name='approvers'
    )
    # Roles are represented by `classifications.Lookup` with type.code = 'COMPANY_ROLE'.
    role = models.ForeignKey(
        'classifications.Lookup',
        on_delete=models.PROTECT,
        related_name='workflow_template_step_roles',
        null=True,
        blank=True,
        help_text='Role required to approve at this step (COMPANY_ROLE lookup).',
    )

    class Meta:
        unique_together = ('step', 'role')
        indexes = [
            models.Index(fields=['step', 'is_active']),
            models.Index(fields=['role', 'is_active']),
        ]

    def clean(self):
        # Step must be active
        if self.step and not self.step.is_active:
            raise ValidationError('Step must be active.')
        # Role must be present, active and of correct type
        if not self.role:
            raise ValidationError('Workflow step approver must have a role assigned.')
        if not self.role.is_active:
            raise ValidationError('Role must be active.')
        if getattr(getattr(self.role, 'type', None), 'code', None) != 'COMPANY_ROLE':
            raise ValidationError('Workflow step roles must use COMPANY_ROLE lookups.')

    def __str__(self) -> str:
        return f'{self.step} - role {self.role.code}'


# =============================================================================
# LEGACY MODELS (kept for backward compatibility during migration)
# =============================================================================

class Workflow(BaseModel):
    """
    DEPRECATED: Legacy workflow definition per team.
    
    This model is kept for backward compatibility during the migration to
    WorkflowTemplate. New code should use WorkflowTemplate instead.
    
    Each team has exactly one active workflow (one-to-one relationship).
    Workflows define sequential approval steps ending with a Finance Review step.
    Workflows cannot be edited if requests are in progress (enforced in views).
    """
    team = models.OneToOneField('teams.Team', on_delete=models.CASCADE, related_name='workflow')
    name = models.CharField(max_length=128)

    class Meta:
        indexes = [
            models.Index(fields=['team', 'is_active']),
        ]

    def clean(self):
        # Team must be active
        if self.team and not self.team.is_active:
            raise ValidationError('Team must be active.')

    def __str__(self) -> str:
        return f'{self.team.name} - {self.name}'


class WorkflowStep(BaseModel):
    """
    DEPRECATED: Legacy sequential step in a workflow.
    
    This model is kept for backward compatibility during the migration to
    WorkflowTemplateStep. New code should use WorkflowTemplateStep instead.
    
    Steps are executed in order (step_order).
    Each workflow must have at least 2 steps: one approval step + Finance Review.
    Each workflow must have exactly one step with is_finance_review=True (enforced via clean/save).
    """
    workflow = models.ForeignKey(Workflow, on_delete=models.CASCADE, related_name='steps')
    step_name = models.CharField(max_length=128)
    step_order = models.PositiveIntegerField()
    is_finance_review = models.BooleanField(default=False, help_text='True if this is the final Finance Review step')

    class Meta:
        unique_together = ('workflow', 'step_order')
        indexes = [
            models.Index(fields=['workflow', 'step_order']),
        ]
        ordering = ['workflow', 'step_order']

    def clean(self):
        # Workflow must be active
        if self.workflow and not self.workflow.is_active:
            raise ValidationError('Workflow must be active.')
        # Step order must be positive
        if self.step_order < 1:
            raise ValidationError('Step order must be at least 1.')
        
        # Enforce exactly one finance review step per workflow
        if self.is_finance_review:
            existing_finance_step = WorkflowStep.objects.filter(
                workflow=self.workflow,
                is_finance_review=True
            ).exclude(pk=self.pk if self.pk else None)
            
            if existing_finance_step.exists():
                raise ValidationError(
                    f'Workflow {self.workflow.name} already has a Finance Review step. '
                    'Each workflow must have exactly one Finance Review step.'
                )

    def save(self, *args, **kwargs):
        # Ensure clean() is called to validate exactly one finance step
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.workflow} - Step {self.step_order}: {self.step_name}'


class WorkflowStepApprover(BaseModel):
    """
    DEPRECATED: Legacy approver assignment to a workflow step.
    
    This model is kept for backward compatibility during the migration to
    WorkflowTemplateStepApprover. New code should use WorkflowTemplateStepApprover instead.
    
    Multiple approver roles at a step require all to approve (AND logic).
    """
    step = models.ForeignKey(WorkflowStep, on_delete=models.CASCADE, related_name='approvers')
    # NOTE: This used to point directly to `accounts.User`. It is now role-based.
    # Roles are represented by `classifications.Lookup` with type.code = 'COMPANY_ROLE'.
    role = models.ForeignKey(
        'classifications.Lookup',
        on_delete=models.PROTECT,
        related_name='workflow_step_roles',
        null=True,
        blank=True,
        help_text='Role required to approve at this step (COMPANY_ROLE lookup).',
    )

    class Meta:
        unique_together = ('step', 'role')
        indexes = [
            models.Index(fields=['step', 'is_active']),
            models.Index(fields=['role', 'is_active']),
        ]

    def clean(self):
        # Step must be active
        if self.step and not self.step.is_active:
            raise ValidationError('Step must be active.')
        # Role must be present, active and of correct type
        if not self.role:
            raise ValidationError('Workflow step approver must have a role assigned.')
        if not self.role.is_active:
            raise ValidationError('Role must be active.')
        if getattr(getattr(self.role, 'type', None), 'code', None) != 'COMPANY_ROLE':
            raise ValidationError('Workflow step roles must use COMPANY_ROLE lookups.')

    def __str__(self) -> str:
        return f'{self.step} - role {self.role.code}'
