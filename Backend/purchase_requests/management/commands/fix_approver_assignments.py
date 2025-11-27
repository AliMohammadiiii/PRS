"""
Quick fix command to verify and fix approver assignments for workflow steps.

This command checks if approvers are correctly assigned to workflow steps
and fixes any missing or inactive assignments.

Usage:
    python manage.py fix_approver_assignments --team "Marketing"
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from teams.models import Team
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Verify and fix approver assignments for workflow steps'

    def add_arguments(self, parser):
        parser.add_argument(
            '--team',
            type=str,
            default='Marketing',
            help='Team name to check (default: Marketing)',
        )

    def handle(self, *args, **options):
        team_name = options.get('team', 'Marketing')

        with transaction.atomic():
            try:
                team = Team.objects.get(name=team_name, is_active=True)
            except Team.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Team not found: {team_name}'))
                return

            try:
                workflow = Workflow.objects.get(team=team, is_active=True)
            except Workflow.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'No active workflow found for team: {team_name}'))
                return

            self.stdout.write(self.style.SUCCESS(f'Checking workflow for team: {team_name}'))
            self.stdout.write(f'Workflow: {workflow.name}\n')

            # Get all active steps
            steps = WorkflowStep.objects.filter(workflow=workflow, is_active=True).order_by('step_order')
            
            if not steps.exists():
                self.stdout.write(self.style.ERROR('No active workflow steps found!'))
                return

            # Expected assignments based on setup_workflow_test_data
            expected_assignments = {
                'Manager Approval': 'approver1_user',
                'Director Approval': 'approver2_user',
            }

            fixed_count = 0
            for step in steps:
                self.stdout.write(f'Step {step.step_order}: {step.step_name}')
                
                # Get all approvers for this step
                approvers = WorkflowStepApprover.objects.filter(step=step, is_active=True)
                
                if not approvers.exists():
                    self.stdout.write(self.style.WARNING(f'  ⚠ No active approvers found for this step!'))
                    
                    # Try to fix if we know the expected approver
                    expected_username = expected_assignments.get(step.step_name)
                    if expected_username:
                        try:
                            user = User.objects.get(username=expected_username, is_active=True)
                            approver, created = WorkflowStepApprover.objects.get_or_create(
                                step=step,
                                approver=user,
                                defaults={'is_active': True}
                            )
                            if created:
                                self.stdout.write(self.style.SUCCESS(f'  ✓ Created assignment: {user.username}'))
                                fixed_count += 1
                            elif not approver.is_active:
                                approver.is_active = True
                                approver.save()
                                self.stdout.write(self.style.SUCCESS(f'  ✓ Activated assignment: {user.username}'))
                                fixed_count += 1
                        except User.DoesNotExist:
                            self.stdout.write(self.style.ERROR(f'  ✗ Expected user "{expected_username}" not found'))
                else:
                    for approver in approvers:
                        status = '✓' if approver.is_active else '⚠'
                        self.stdout.write(f'  {status} {approver.approver.username} (is_active={approver.is_active})')
                        
                        # Fix if inactive
                        if not approver.is_active:
                            approver.is_active = True
                            approver.save()
                            self.stdout.write(self.style.SUCCESS(f'    → Activated assignment'))
                            fixed_count += 1
                
                self.stdout.write('')

            if fixed_count > 0:
                self.stdout.write(self.style.SUCCESS(f'\n✅ Fixed {fixed_count} approver assignment(s)'))
            else:
                self.stdout.write(self.style.SUCCESS('\n✅ All approver assignments are correct'))

            # Summary
            self.stdout.write('\n' + '='*60)
            self.stdout.write('Summary:')
            self.stdout.write(f'  Team: {team_name}')
            self.stdout.write(f'  Workflow: {workflow.name}')
            self.stdout.write(f'  Steps: {steps.count()}')
            
            total_approvers = WorkflowStepApprover.objects.filter(
                step__workflow=workflow,
                is_active=True
            ).count()
            self.stdout.write(f'  Active approver assignments: {total_approvers}')
            
            # Check specific users
            for username in ['approver1_user', 'approver2_user']:
                try:
                    user = User.objects.get(username=username)
                    assignments = WorkflowStepApprover.objects.filter(
                        approver=user,
                        step__workflow=workflow,
                        is_active=True
                    ).count()
                    self.stdout.write(f'  {username}: {assignments} assignment(s)')
                except User.DoesNotExist:
                    self.stdout.write(self.style.WARNING(f'  {username}: User not found'))




