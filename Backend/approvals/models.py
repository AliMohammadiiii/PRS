from django.db import models
from django.core.exceptions import ValidationError
from core.models import BaseModel


class ApprovalHistory(BaseModel):
    """
    Approval/rejection history for purchase requests in Purchase Request System.
    
    Records all approval actions at each workflow step with timestamps and comments.
    Provides complete audit trail of all approval/rejection decisions.
    """
    APPROVE = 'APPROVE'
    REJECT = 'REJECT'
    
    ACTION_CHOICES = [
        (APPROVE, 'Approve'),
        (REJECT, 'Reject'),
    ]

    request = models.ForeignKey('purchase_requests.PurchaseRequest', on_delete=models.CASCADE, related_name='approval_history')
    step = models.ForeignKey('workflows.WorkflowStep', on_delete=models.PROTECT, related_name='approval_history')
    approver = models.ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='approval_actions')
    action = models.CharField(max_length=16, choices=ACTION_CHOICES)
    comment = models.TextField(null=True, blank=True, help_text='Required for rejections, optional for approvals')
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['request', 'step']),
            models.Index(fields=['request', 'timestamp']),
            models.Index(fields=['approver', 'timestamp']),
        ]
        ordering = ['request', 'timestamp']

    def clean(self):
        # Approver must be active
        if self.approver and not self.approver.is_active:
            raise ValidationError('Approver must be active.')
        # Step must be active
        if self.step and not self.step.is_active:
            raise ValidationError('Step must be active.')
        # Rejection requires comment (minimum 10 characters)
        if self.action == self.REJECT:
            if not self.comment or len(self.comment.strip()) < 10:
                raise ValidationError('Rejection requires a comment with at least 10 characters.')
        # Step must belong to the request's team's workflow
        if self.step and self.request and self.step.workflow.team != self.request.team:
            raise ValidationError('Step must belong to the request\'s team\'s workflow.')

    def __str__(self) -> str:
        return f'{self.request} - {self.step} - {self.action} by {self.approver}'

