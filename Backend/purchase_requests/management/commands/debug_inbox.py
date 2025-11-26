"""
Diagnostic command to debug why requests don't appear in approver inbox.

This command checks:
- What requests exist
- What their status and current_step are
- What approvers are assigned to the current_step
- Why they might not appear in the inbox

Usage:
    python manage.py debug_inbox --user approver1_user
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from purchase_requests.models import PurchaseRequest
from purchase_requests.services import get_approver_inbox_qs
from workflows.models import WorkflowStepApprover
from approvals.models import ApprovalHistory

User = get_user_model()


class Command(BaseCommand):
    help = 'Debug why requests don\'t appear in approver inbox'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            required=True,
            help='Username to check inbox for (e.g., approver1_user)',
        )

    def handle(self, *args, **options):
        username = options['user']

        try:
            user = User.objects.get(username=username, is_active=True)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User not found: {username}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Checking inbox for user: {username} (ID: {user.id})\n'))

        # Get inbox queryset
        inbox_qs = get_approver_inbox_qs(user)
        inbox_count = inbox_qs.count()
        
        self.stdout.write(f'📥 Inbox query result: {inbox_count} request(s)\n')

        # Check all active requests with current_step
        all_requests = PurchaseRequest.objects.filter(
            is_active=True,
            current_step__isnull=False
        ).select_related('status', 'current_step', 'team', 'requestor')

        self.stdout.write(f'📋 All active requests with current_step: {all_requests.count()}\n')

        for request in all_requests:
            self.stdout.write(f'Request ID: {request.id}')
            self.stdout.write(f'  Subject: {request.subject}')
            self.stdout.write(f'  Status: {request.status.code if request.status else "None"}')
            self.stdout.write(f'  Team: {request.team.name}')
            self.stdout.write(f'  Requestor: {request.requestor.username}')
            
            if request.current_step:
                self.stdout.write(f'  Current Step: {request.current_step.step_name} (order: {request.current_step.step_order})')
                
                # Check approvers for this step
                approvers = WorkflowStepApprover.objects.filter(
                    step=request.current_step,
                    is_active=True
                ).select_related('approver')
                
                self.stdout.write(f'  Step Approvers ({approvers.count()}):')
                for approver in approvers:
                    is_target_user = approver.approver == user
                    marker = '👉' if is_target_user else '  '
                    self.stdout.write(f'    {marker} {approver.approver.username} (is_active={approver.is_active})')
                
                # Check if user has already approved
                already_approved = ApprovalHistory.objects.filter(
                    request=request,
                    step=request.current_step,
                    approver=user,
                    action=ApprovalHistory.APPROVE
                ).exists()
                
                if already_approved:
                    self.stdout.write(f'  ⚠️  {username} has already approved this step')
                
                # Check if request should appear in inbox
                should_appear = (
                    request.status.code in ['PENDING_APPROVAL', 'IN_REVIEW'] and
                    approvers.filter(approver=user, is_active=True).exists() and
                    not already_approved
                )
                
                if should_appear:
                    self.stdout.write(self.style.SUCCESS(f'  ✅ Should appear in inbox'))
                else:
                    reasons = []
                    if request.status.code not in ['PENDING_APPROVAL', 'IN_REVIEW']:
                        reasons.append(f'Status is {request.status.code} (needs PENDING_APPROVAL or IN_REVIEW)')
                    if not approvers.filter(approver=user, is_active=True).exists():
                        reasons.append(f'{username} is not an active approver for this step')
                    if already_approved:
                        reasons.append(f'{username} has already approved')
                    
                    self.stdout.write(self.style.WARNING(f'  ❌ Should NOT appear in inbox:'))
                    for reason in reasons:
                        self.stdout.write(self.style.WARNING(f'      - {reason}'))
            else:
                self.stdout.write(f'  Current Step: None')
            
            self.stdout.write('')

        # Summary
        self.stdout.write('='*60)
        self.stdout.write('Summary:')
        self.stdout.write(f'  User: {username}')
        self.stdout.write(f'  Requests in inbox: {inbox_count}')
        self.stdout.write(f'  Total active requests with current_step: {all_requests.count()}')
        
        # Check user's WorkflowStepApprover assignments
        user_assignments = WorkflowStepApprover.objects.filter(
            approver=user,
            is_active=True,
            step__is_active=True
        ).select_related('step', 'step__workflow')
        
        self.stdout.write(f'\n  User\'s WorkflowStepApprover assignments: {user_assignments.count()}')
        for assignment in user_assignments:
            self.stdout.write(f'    - {assignment.step.step_name} (workflow: {assignment.step.workflow.name}, team: {assignment.step.workflow.team.name})')
        
        # Check if there are any requests that should appear but don't
        if inbox_count == 0 and all_requests.count() > 0:
            self.stdout.write(self.style.WARNING('\n⚠️  No requests in inbox, but requests exist. Possible issues:'))
            self.stdout.write(self.style.WARNING('  1. Requests might have wrong status (need PENDING_APPROVAL or IN_REVIEW)'))
            self.stdout.write(self.style.WARNING('  2. User might not be assigned as approver for the current_step'))
            self.stdout.write(self.style.WARNING('  3. User might have already approved the requests'))
            self.stdout.write(self.style.WARNING('  4. WorkflowStepApprover records might be inactive'))
        
        # Test the query manually
        self.stdout.write('\n' + '='*60)
        self.stdout.write('Testing inbox query manually:')
        test_requests = PurchaseRequest.objects.filter(
            is_active=True,
            current_step__isnull=False,
            status__code__in=['PENDING_APPROVAL', 'IN_REVIEW'],
            current_step__approvers__approver=user,
            current_step__approvers__is_active=True,
        ).distinct()
        
        self.stdout.write(f'  Requests matching inbox criteria (before excluding already approved): {test_requests.count()}')
        
        # Check already approved
        for req in test_requests:
            already_approved = ApprovalHistory.objects.filter(
                request=req,
                step=req.current_step,
                approver=user,
                action=ApprovalHistory.APPROVE
            ).exists()
            if already_approved:
                self.stdout.write(f'    - Request {req.id}: {username} has already approved')

