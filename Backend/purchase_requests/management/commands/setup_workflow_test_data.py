"""
Management command to set up test data for S04 - Multi-level approval workflow test.

This command creates:
- Test users (requester_user, approver1_user, approver2_user, non_approver_user)
- Team A (Marketing)
- Form template for Team A with BUDGET_AMOUNT and CAMPAIGN_NAME fields
- Workflow W1 for Team A with 2 steps (Manager Approval → Director Approval)
- AccessScope assignments

Usage:
    python manage.py setup_workflow_test_data
    python manage.py setup_workflow_test_data --reset  # Delete existing test data first
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Max
from django.contrib.auth import get_user_model
from classifications.models import LookupType, Lookup
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from accounts.models import AccessScope
from attachments.models import AttachmentCategory

User = get_user_model()


class Command(BaseCommand):
    help = 'Set up test data for S04 - Multi-level approval workflow test'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing test data before setting up',
        )

    def handle(self, *args, **options):
        reset = options['reset']

        with transaction.atomic():
            if reset:
                self.stdout.write(self.style.WARNING('Deleting existing test data...'))
                self._delete_test_data()

            self.stdout.write(self.style.SUCCESS('Setting up S04 workflow test data...'))

            # Verify lookup types exist
            self._verify_lookup_types()

            # Create test users
            requester_user = self._create_user(
                'requester_user',
                'Requester User',
                'requester@example.com',
                'Requester'
            )
            approver1_user = self._create_user(
                'approver1_user',
                'Approver 1 User',
                'approver1@example.com',
                'Approver 1'
            )
            approver2_user = self._create_user(
                'approver2_user',
                'Approver 2 User',
                'approver2@example.com',
                'Approver 2'
            )
            non_approver_user = self._create_user(
                'non_approver_user',
                'Non Approver User',
                'nonapprover@example.com',
                'Non Approver'
            )

            # Create Team A (Marketing)
            team_a = self._create_team('Marketing', 'Marketing team for workflow test')

            # Create form template for Team A with required fields
            form_template = self._create_form_template(team_a, requester_user)
            self._create_form_fields(form_template)

            # Create workflow W1 for Team A
            workflow_w1 = self._create_workflow(team_a, 'Team A Workflow')

            # Create workflow steps (2 steps, no finance step as per test spec)
            step1 = self._create_workflow_step(
                workflow_w1,
                step_order=1,
                step_name='Manager Approval',
                is_finance_review=False
            )
            step2 = self._create_workflow_step(
                workflow_w1,
                step_order=2,
                step_name='Director Approval',
                is_finance_review=False
            )

            # Assign approvers to steps
            self._assign_approver(step1, approver1_user)
            self._assign_approver(step2, approver2_user)

            # Create AccessScope: requester_user assigned to Team A
            self._create_access_scope(requester_user, team_a, 'REQUESTER')

            # Ensure attachment categories are optional (for test scenario)
            self._ensure_optional_attachments(team_a)

            self.stdout.write(self.style.SUCCESS('\n✅ Successfully set up S04 workflow test data!'))
            self.stdout.write(self.style.SUCCESS('\nTest users created (password: testpass123):'))
            self.stdout.write(f'  - requester_user (Requester)')
            self.stdout.write(f'  - approver1_user (Manager Approval)')
            self.stdout.write(f'  - approver2_user (Director Approval)')
            self.stdout.write(f'  - non_approver_user (for negative tests)')
            self.stdout.write(self.style.SUCCESS('\nTeam A (Marketing) created with:'))
            self.stdout.write('  - Form template with BUDGET_AMOUNT (NUMBER, required) and CAMPAIGN_NAME (TEXT, required)')
            self.stdout.write('  - Workflow W1 with 2 steps:')
            self.stdout.write('    • Step 1: Manager Approval (approver1_user)')
            self.stdout.write('    • Step 2: Director Approval (approver2_user)')
            self.stdout.write('\nNote: No finance step as per test specification.')

    def _verify_lookup_types(self):
        """Verify that required lookup types exist and are active"""
        try:
            request_status_type = LookupType.objects.get(code='REQUEST_STATUS')
            purchase_type_type = LookupType.objects.get(code='PURCHASE_TYPE')
            
            # Ensure lookup types are active
            if not request_status_type.is_active:
                request_status_type.is_active = True
                request_status_type.save()
            if not purchase_type_type.is_active:
                purchase_type_type.is_active = True
                purchase_type_type.save()
            
            # Verify required statuses exist and are active
            required_statuses = ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW', 'REJECTED', 
                               'FULLY_APPROVED']
            for status_code in required_statuses:
                lookup, created = Lookup.objects.get_or_create(
                    type=request_status_type,
                    code=status_code,
                    defaults={'title': status_code.replace('_', ' ').title(), 'is_active': True}
                )
                if not lookup.is_active:
                    lookup.is_active = True
                    lookup.save()
            
            # Verify purchase types exist and are active
            for purchase_code in ['SERVICE', 'GOOD']:
                lookup, created = Lookup.objects.get_or_create(
                    type=purchase_type_type,
                    code=purchase_code,
                    defaults={'title': purchase_code.title(), 'is_active': True}
                )
                if not lookup.is_active:
                    lookup.is_active = True
                    lookup.save()
                
            self.stdout.write(self.style.SUCCESS('✓ Lookup types verified and activated'))
        except LookupType.DoesNotExist as e:
            raise ValueError(
                f'Required lookup types not found. Please run migrations first: {e}'
            )

    def _create_user(self, username, full_name, email, display_name):
        """Create or get a test user"""
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': full_name.split()[0] if full_name else '',
                'last_name': ' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
                'is_active': True,
            }
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created user: {username} ({display_name})'))
        else:
            # Update password to ensure it's set
            user.set_password('testpass123')
            user.is_active = True
            user.save()
            self.stdout.write(self.style.WARNING(f'  - User already exists: {username} (password reset)'))
        return user

    def _create_team(self, name, description):
        """Create or get Team A"""
        team, created = Team.objects.get_or_create(
            name=name,
            defaults={
                'description': description,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created team: {name}'))
        else:
            # Ensure it's active
            if not team.is_active:
                team.is_active = True
                team.save()
            self.stdout.write(self.style.WARNING(f'  - Team already exists: {name}'))
        return team

    def _create_form_template(self, team, created_by):
        """Create or get an active form template for Team A"""
        # Deactivate any existing active template
        FormTemplate.objects.filter(team=team, is_active=True).update(is_active=False)
        
        # Get the highest version number
        max_version = FormTemplate.objects.filter(team=team).aggregate(
            max_version=Max('version_number')
        )['max_version'] or 0
        
        template, created = FormTemplate.objects.get_or_create(
            team=team,
            version_number=max_version + 1,
            defaults={
                'created_by': created_by,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created form template for {team.name}'))
        else:
            template.is_active = True
            template.save()
            self.stdout.write(self.style.WARNING(f'  - Form template already exists for {team.name}'))
        return template

    def _create_form_fields(self, template):
        """Create BUDGET_AMOUNT and CAMPAIGN_NAME fields"""
        # BUDGET_AMOUNT (NUMBER, required)
        budget_field, created1 = FormField.objects.get_or_create(
            template=template,
            field_id='BUDGET_AMOUNT',
            defaults={
                'name': 'budget_amount',
                'label': 'Budget Amount',
                'field_type': FormField.NUMBER,
                'required': True,
                'order': 1,
            }
        )
        if created1:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created field: BUDGET_AMOUNT (NUMBER, required)'))
        else:
            # Update to ensure it's correct
            budget_field.required = True
            budget_field.field_type = FormField.NUMBER
            budget_field.order = 1
            budget_field.save()
            self.stdout.write(self.style.WARNING(f'    - Field BUDGET_AMOUNT already exists (updated)'))

        # CAMPAIGN_NAME (TEXT, required)
        campaign_field, created2 = FormField.objects.get_or_create(
            template=template,
            field_id='CAMPAIGN_NAME',
            defaults={
                'name': 'campaign_name',
                'label': 'Campaign Name',
                'field_type': FormField.TEXT,
                'required': True,
                'order': 2,
            }
        )
        if created2:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created field: CAMPAIGN_NAME (TEXT, required)'))
        else:
            # Update to ensure it's correct
            campaign_field.required = True
            campaign_field.field_type = FormField.TEXT
            campaign_field.order = 2
            campaign_field.save()
            self.stdout.write(self.style.WARNING(f'    - Field CAMPAIGN_NAME already exists (updated)'))

    def _create_workflow(self, team, name):
        """Create or get workflow W1 for Team A"""
        workflow, created = Workflow.objects.get_or_create(
            team=team,
            defaults={
                'name': name,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created workflow: {name}'))
        else:
            if not workflow.is_active:
                workflow.is_active = True
                workflow.save()
            self.stdout.write(self.style.WARNING(f'  - Workflow already exists: {name}'))
        return workflow

    def _create_workflow_step(self, workflow, step_order, step_name, is_finance_review):
        """Create a workflow step"""
        step, created = WorkflowStep.objects.get_or_create(
            workflow=workflow,
            step_order=step_order,
            defaults={
                'step_name': step_name,
                'is_finance_review': is_finance_review,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created step {step_order}: {step_name}'))
        else:
            # Update to ensure it's correct
            step.step_name = step_name
            step.is_finance_review = is_finance_review
            step.is_active = True
            step.save()
            self.stdout.write(self.style.WARNING(f'    - Step {step_order} already exists (updated)'))
        return step

    def _assign_approver(self, step, approver):
        """Assign an approver to a workflow step"""
        # Ensure step and approver are active
        if not step.is_active:
            step.is_active = True
            step.save()
        if not approver.is_active:
            approver.is_active = True
            approver.save()
        
        approver_assignment, created = WorkflowStepApprover.objects.get_or_create(
            step=step,
            approver=approver,
            defaults={'is_active': True}
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'      ✓ Assigned {approver.username} to {step.step_name}'))
        else:
            # Always ensure it's active
            if not approver_assignment.is_active:
                approver_assignment.is_active = True
                approver_assignment.save()
                self.stdout.write(self.style.SUCCESS(f'      ✓ Activated assignment: {approver.username} to {step.step_name}'))
            else:
                self.stdout.write(self.style.WARNING(f'      - {approver.username} already assigned to {step.step_name}'))
        
        # Verify the assignment was created correctly
        if not WorkflowStepApprover.objects.filter(
            step=step,
            approver=approver,
            is_active=True
        ).exists():
            raise ValueError(f'Failed to create/activate WorkflowStepApprover for {approver.username} on {step.step_name}')

    def _create_access_scope(self, user, team, role_code):
        """Create AccessScope to assign user to team with a role"""
        # Get or create ROLE lookup type
        role_type, _ = LookupType.objects.get_or_create(
            code='ROLE',
            defaults={'title': 'User Roles'}
        )
        
        # Get or create the role lookup
        role, _ = Lookup.objects.get_or_create(
            type=role_type,
            code=role_code,
            defaults={'title': role_code.title()}
        )
        
        # Create AccessScope
        scope, created = AccessScope.objects.get_or_create(
            user=user,
            team=team,
            role=role,
            defaults={
                'position_title': role_code,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created AccessScope: {user.username} -> {team.name} ({role_code})'))
        else:
            scope.is_active = True
            scope.save()
            self.stdout.write(self.style.WARNING(f'  - AccessScope already exists: {user.username} -> {team.name}'))

    def _ensure_optional_attachments(self, team):
        """Ensure all attachment categories for the team are optional (for test scenario)"""
        # Get all attachment categories for this team
        categories = AttachmentCategory.objects.filter(team=team, is_active=True)
        
        updated_count = 0
        for category in categories:
            if category.required:
                category.required = False
                category.save()
                updated_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Made attachment category "{category.name}" optional'))
        
        if updated_count == 0:
            self.stdout.write(self.style.WARNING('  - No required attachment categories found (or already optional)'))

    def _delete_test_data(self):
        """Delete existing test data"""
        # Delete in reverse dependency order
        test_usernames = ['requester_user', 'approver1_user', 'approver2_user', 'non_approver_user']
        test_team_name = 'Marketing'
        
        # Delete workflow step approvers
        WorkflowStepApprover.objects.filter(
            step__workflow__team__name=test_team_name
        ).delete()
        
        # Delete workflow steps
        WorkflowStep.objects.filter(
            workflow__team__name=test_team_name
        ).delete()
        
        # Delete workflows
        Workflow.objects.filter(
            team__name=test_team_name
        ).delete()
        
        # Delete form fields
        FormField.objects.filter(
            template__team__name=test_team_name
        ).delete()
        
        # Delete form templates
        FormTemplate.objects.filter(
            team__name=test_team_name
        ).delete()
        
        # Delete access scopes
        AccessScope.objects.filter(
            user__username__in=test_usernames,
            team__name=test_team_name
        ).delete()
        
        # Delete teams
        Team.objects.filter(name=test_team_name).delete()
        
        # Delete users
        User.objects.filter(username__in=test_usernames).delete()

