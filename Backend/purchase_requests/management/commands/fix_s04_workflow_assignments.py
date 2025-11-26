"""
Quick fix command to normalize S04 (multi-level approval) workflow assignments.

Goal (per Workflow.md S04):
- Team: Marketing
- Step 1: Manager Approval → ONLY approver1_user
- Step 2: Director Approval → ONLY approver2_user
- No extra approvers (e.g. manager_user, finance_user) on these steps.

This command:
- Finds the active workflow for team "Marketing"
- Ensures step 1 has exactly one active approver: approver1_user
- Ensures step 2 has exactly one active approver: approver2_user
- Deletes any other approver assignments on these steps

Usage:
    python manage.py fix_s04_workflow_assignments
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model

from teams.models import Team
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover

User = get_user_model()


class Command(BaseCommand):
    help = 'Normalize S04 workflow approver assignments for Marketing team'

    def handle(self, *args, **options):
        team_name = 'Marketing'

        with transaction.atomic():
            try:
                team = Team.objects.get(name=team_name, is_active=True)
            except Team.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Team not found or inactive: {team_name}'))
                return

            try:
                workflow = Workflow.objects.get(team=team, is_active=True)
            except Workflow.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'No active workflow found for team: {team_name}'))
                return

            self.stdout.write(self.style.SUCCESS(f'Normalizing workflow for team: {team_name}'))
            self.stdout.write(f'Workflow: {workflow.name}\n')

            steps = list(
                WorkflowStep.objects.filter(workflow=workflow, is_active=True)
                .order_by('step_order')
            )
            if len(steps) < 2:
                self.stdout.write(self.style.ERROR('Expected at least 2 active steps (Manager/Director).'))
                return

            step1 = steps[0]
            step2 = steps[1]

            self.stdout.write(f'Step 1 (order={step1.step_order}): {step1.step_name}')
            self.stdout.write(f'Step 2 (order={step2.step_order}): {step2.step_name}\n')

            # Ensure users exist
            try:
                approver1 = User.objects.get(username='approver1_user', is_active=True)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR('User not found or inactive: approver1_user'))
                return

            try:
                approver2 = User.objects.get(username='approver2_user', is_active=True)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR('User not found or inactive: approver2_user'))
                return

            # Helper to enforce single approver on a step
            def enforce_single_approver(step: WorkflowStep, user: User):
                self.stdout.write(f'  Normalizing approvers for step: {step.step_name}')

                # Delete all existing assignments for this step
                deleted_count, _ = WorkflowStepApprover.objects.filter(step=step).delete()
                if deleted_count:
                    self.stdout.write(self.style.WARNING(f'    - Deleted {deleted_count} existing assignment(s)'))

                # Create the single required assignment
                assignment, created = WorkflowStepApprover.objects.get_or_create(
                    step=step,
                    approver=user,
                    defaults={'is_active': True},
                )
                if created:
                    self.stdout.write(self.style.SUCCESS(f'    ✓ Created assignment: {user.username}'))
                else:
                    if not assignment.is_active:
                        assignment.is_active = True
                        assignment.save()
                        self.stdout.write(
                            self.style.SUCCESS(f'    ✓ Reactivated assignment: {user.username}')
                        )
                    else:
                        self.stdout.write(
                            self.style.WARNING(f'    - Assignment already existed and active: {user.username}')
                        )

            # Enforce S04 configuration
            enforce_single_approver(step1, approver1)
            enforce_single_approver(step2, approver2)

            # Summary
            self.stdout.write('\n' + '=' * 60)
            self.stdout.write('Summary after normalization:')
            for step in (step1, step2):
                assignees = WorkflowStepApprover.objects.filter(step=step, is_active=True).select_related(
                    'approver'
                )
                self.stdout.write(f'  Step {step.step_order}: {step.step_name}')
                for a in assignees:
                    self.stdout.write(f'    - {a.approver.username} (is_active={a.is_active})')

            self.stdout.write(self.style.SUCCESS('\n✅ S04 workflow approver assignments normalized successfully'))




