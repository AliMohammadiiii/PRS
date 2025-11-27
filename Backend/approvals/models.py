from django.db import models
from django.core.exceptions import ValidationError
from core.models import BaseModel


class ApprovalHistory(BaseModel):
    """
    Approval/rejection history for purchase requests in Purchase Request System.
    
    Records all approval actions at each workflow step with timestamps and comments.
    Provides complete audit trail of all approval/rejection decisions.
    
    Supports both legacy WorkflowStep and new WorkflowTemplateStep.
    """
    APPROVE = 'APPROVE'
    REJECT = 'REJECT'
    
    ACTION_CHOICES = [
        (APPROVE, 'Approve'),
        (REJECT, 'Reject'),
    ]

    request = models.ForeignKey('purchase_requests.PurchaseRequest', on_delete=models.CASCADE, related_name='approval_history')
    # Legacy step reference (for backward compatibility)
    step = models.ForeignKey(
        'workflows.WorkflowStep',
        on_delete=models.PROTECT,
        related_name='approval_history',
        null=True,
        blank=True,
        help_text='Legacy workflow step (for old requests)'
    )
    # New template step reference
    template_step = models.ForeignKey(
        'workflows.WorkflowTemplateStep',
        on_delete=models.PROTECT,
        related_name='approval_history',
        null=True,
        blank=True,
        help_text='Workflow template step (for new requests)'
    )
    approver = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='approval_actions')
    # Optional role context for this approval, matching the workflow step role used.
    role = models.ForeignKey(
        'classifications.Lookup',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='approval_history_roles',
        help_text='Role under which the approver acted (COMPANY_ROLE lookup).',
    )
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    comment = models.TextField(null=True, blank=True, help_text='Required for rejections, optional for approvals')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['request', 'step']),
            models.Index(fields=['request', 'template_step']),
            models.Index(fields=['request', 'timestamp']),
            models.Index(fields=['approver', 'timestamp']),
        ]
        ordering = ['request', 'timestamp']

    def clean(self):
        # Approver must be active
        if self.approver and not self.approver.is_active:
            raise ValidationError('Approver must be active.')
        
        # At least one step reference must be provided
        if not self.step and not self.template_step:
            raise ValidationError('Either step or template_step must be provided.')
        
        # Step must be active (if provided)
        if self.step and not self.step.is_active:
            raise ValidationError('Step must be active.')
        if self.template_step and not self.template_step.is_active:
            raise ValidationError('Template step must be active.')
        
        # Role (if present) must be active and of correct type
        if self.role:
            if not self.role.is_active:
                raise ValidationError('Approval role must be active.')
            if getattr(getattr(self.role, 'type', None), 'code', None) != 'COMPANY_ROLE':
                raise ValidationError('Approval roles must use COMPANY_ROLE lookups.')
        
        # Rejection requires comment (minimum 10 characters)
        if self.action == self.REJECT:
            if not self.comment or len(self.comment.strip()) < 10:
                raise ValidationError('Rejection requires a comment with at least 10 characters.')
        
        # Templates are team-agnostic - no need to validate team matching
        # Legacy step validation (for backward compatibility)
        if self.step and self.request and self.step.workflow.team != self.request.team:
            raise ValidationError('Step must belong to the request\'s team\'s workflow.')

    def __str__(self) -> str:
        step_name = self.template_step.step_name if self.template_step else (self.step.step_name if self.step else 'Unknown')
        return f'{self.request} - {step_name} - {self.action} by {self.approver}'
