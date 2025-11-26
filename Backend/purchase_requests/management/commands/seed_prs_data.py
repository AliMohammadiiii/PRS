"""
Management command to seed PRS test data.

This command creates:
- Test users (requestor_user, manager_user, finance_user)
- Teams (Marketing, Tech, Product, Finance)
- Form templates for each team
- Workflows with steps for each team
- Workflow step approvers
- Attachment categories for each team

Usage:
    python manage.py seed_prs_data
    python manage.py seed_prs_data --reset  # Delete existing test data first
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Max
from django.contrib.auth import get_user_model
from classifications.models import LookupType, Lookup
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from attachments.models import AttachmentCategory

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed PRS test data (users, teams, workflows, form templates, attachment categories)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing test data before seeding',
        )

    def handle(self, *args, **options):
        reset = options['reset']

        with transaction.atomic():
            if reset:
                self.stdout.write(self.style.WARNING('Deleting existing test data...'))
                self._delete_test_data()

            self.stdout.write(self.style.SUCCESS('Seeding PRS test data...'))

            # Verify lookup types exist
            self._verify_lookup_types()

            # Create test users
            requestor_user = self._create_user('requestor_user', 'Requestor User', 'requestor@example.com')
            manager_user = self._create_user('manager_user', 'Manager User', 'manager@example.com')
            finance_user = self._create_user('finance_user', 'Finance User', 'finance@example.com')

            # Create teams
            marketing_team = self._create_team('Marketing', 'Marketing team')
            tech_team = self._create_team('Tech', 'Technology team')
            product_team = self._create_team('Product', 'Product team')
            finance_team = self._create_team('Finance', 'Finance team')

            # Create form templates for each team
            marketing_template = self._create_form_template(marketing_team, requestor_user)
            tech_template = self._create_form_template(tech_team, requestor_user)
            product_template = self._create_form_template(product_team, requestor_user)
            finance_template = self._create_form_template(finance_team, requestor_user)

            # Create workflows for each team
            marketing_workflow = self._create_workflow(marketing_team, 'Marketing Approval Workflow')
            tech_workflow = self._create_workflow(tech_team, 'Tech Approval Workflow')
            product_workflow = self._create_workflow(product_team, 'Product Approval Workflow')
            finance_workflow = self._create_workflow(finance_team, 'Finance Approval Workflow')

            # Create workflow steps and approvers
            self._create_workflow_steps(marketing_workflow, manager_user, finance_user)
            self._create_workflow_steps(tech_workflow, manager_user, finance_user)
            self._create_workflow_steps(product_workflow, manager_user, finance_user)
            self._create_workflow_steps(finance_workflow, manager_user, finance_user)

            # Create attachment categories for each team
            self._create_attachment_categories(marketing_team)
            self._create_attachment_categories(tech_team)
            self._create_attachment_categories(product_team)
            self._create_attachment_categories(finance_team)

            self.stdout.write(self.style.SUCCESS('\n✅ Successfully seeded PRS test data!'))
            self.stdout.write(self.style.SUCCESS('\nTest users created:'))
            self.stdout.write(f'  - requestor_user (password: testpass123)')
            self.stdout.write(f'  - manager_user (password: testpass123)')
            self.stdout.write(f'  - finance_user (password: testpass123)')
            self.stdout.write(self.style.SUCCESS('\nTeams created: Marketing, Tech, Product, Finance'))
            self.stdout.write(self.style.SUCCESS('\nEach team has:'))
            self.stdout.write('  - Active form template')
            self.stdout.write('  - Workflow with 2 steps (Manager Approval → Finance Review)')
            self.stdout.write('  - Attachment categories (Invoice required, Contract optional)')

    def _verify_lookup_types(self):
        """Verify that required lookup types exist"""
        try:
            request_status_type = LookupType.objects.get(code='REQUEST_STATUS')
            purchase_type_type = LookupType.objects.get(code='PURCHASE_TYPE')
            
            # Verify required statuses exist
            required_statuses = ['DRAFT', 'PENDING_APPROVAL', 'IN_REVIEW', 'REJECTED', 
                               'RESUBMITTED', 'FULLY_APPROVED', 'FINANCE_REVIEW', 'COMPLETED']
            for status_code in required_statuses:
                if not Lookup.objects.filter(type=request_status_type, code=status_code).exists():
                    raise ValueError(f'Missing REQUEST_STATUS lookup: {status_code}')
            
            # Verify purchase types exist
            if not Lookup.objects.filter(type=purchase_type_type, code='SERVICE').exists():
                raise ValueError('Missing PURCHASE_TYPE lookup: SERVICE')
            if not Lookup.objects.filter(type=purchase_type_type, code='GOOD').exists():
                raise ValueError('Missing PURCHASE_TYPE lookup: GOOD')
                
            self.stdout.write(self.style.SUCCESS('✓ Lookup types verified'))
        except LookupType.DoesNotExist as e:
            raise ValueError(
                f'Required lookup types not found. Please run migrations first: {e}'
            )

    def _create_user(self, username, full_name, email):
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
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created user: {username}'))
        else:
            self.stdout.write(self.style.WARNING(f'  - User already exists: {username}'))
        return user

    def _create_team(self, name, description):
        """Create or get a team"""
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
        """Create or get an active form template for a team"""
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

    def _create_workflow(self, team, name):
        """Create or get a workflow for a team"""
        workflow, created = Workflow.objects.get_or_create(
            team=team,
            defaults={
                'name': name,
                'is_active': True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created workflow for {team.name}'))
        else:
            if not workflow.is_active:
                workflow.is_active = True
                workflow.save()
            self.stdout.write(self.style.WARNING(f'  - Workflow already exists for {team.name}'))
        return workflow

    def _create_workflow_steps(self, workflow, manager_user, finance_user):
        """Create workflow steps with approvers"""
        # Step 1: Manager Approval
        step1, created1 = WorkflowStep.objects.get_or_create(
            workflow=workflow,
            step_order=1,
            defaults={
                'step_name': 'Team Manager Approval',
                'is_finance_review': False,
                'is_active': True,
            }
        )
        if created1:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created step 1 for {workflow.team.name}'))
        
        # Assign manager as approver for step 1
        WorkflowStepApprover.objects.get_or_create(
            step=step1,
            approver=manager_user,
            defaults={'is_active': True}
        )

        # Step 2: Finance Review
        step2, created2 = WorkflowStep.objects.get_or_create(
            workflow=workflow,
            step_order=2,
            defaults={
                'step_name': 'Finance Review',
                'is_finance_review': True,
                'is_active': True,
            }
        )
        if created2:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created step 2 (Finance) for {workflow.team.name}'))
        
        # Assign finance user as approver for step 2
        WorkflowStepApprover.objects.get_or_create(
            step=step2,
            approver=finance_user,
            defaults={'is_active': True}
        )

    def _create_attachment_categories(self, team):
        """Create attachment categories for a team"""
        # Invoice (required)
        invoice_cat, created1 = AttachmentCategory.objects.get_or_create(
            team=team,
            name='Invoice',
            defaults={
                'required': True,
                'is_active': True,
            }
        )
        if created1:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created attachment category: Invoice for {team.name}'))

        # Contract (optional)
        contract_cat, created2 = AttachmentCategory.objects.get_or_create(
            team=team,
            name='Contract',
            defaults={
                'required': False,
                'is_active': True,
            }
        )
        if created2:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created attachment category: Contract for {team.name}'))

    def _delete_test_data(self):
        """Delete existing test data"""
        # Delete in reverse dependency order
        WorkflowStepApprover.objects.filter(
            step__workflow__team__name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        WorkflowStep.objects.filter(
            workflow__team__name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        Workflow.objects.filter(
            team__name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        FormField.objects.filter(
            template__team__name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        FormTemplate.objects.filter(
            team__name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        AttachmentCategory.objects.filter(
            team__name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        Team.objects.filter(
            name__in=['Marketing', 'Tech', 'Product', 'Finance']
        ).delete()
        User.objects.filter(
            username__in=['requestor_user', 'manager_user', 'finance_user']
        ).delete()

