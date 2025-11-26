"""
Management command to set up test data for:
S05 – Admin user visibility & control over purchase requests

This command prepares the preconditions described in
`Manual Test scenarios/Admin user visibility.md` section 1 (lines 18–34),
and also provides a dedicated finance user + sample finance inbox request:

- Users
  - admin_user – Admin role (staff/superuser for simplicity)
  - requester_user_A – Requester in Team A
  - requester_user_B – Requester in Team B
  - approver_user – Approver for some steps
  - finance_user – Finance reviewer for finance steps
- Teams
  - Team A and Team B (both active)
- Requests
  - REQ_A_DRAFT – DRAFT request created by requester_user_A in Team A
  - REQ_A_PENDING – PENDING_APPROVAL request in Team A, with a workflow step
                    where only approver_user is configured as approver
  - REQ_B_COMPLETED – COMPLETED request created by requester_user_B in Team B
  - REQ_FINANCE – FINANCE_REVIEW request in Team A assigned to finance_user
- Workflow & Lookups
  - Valid workflow(s) and statuses configured
  - Admin is NOT configured as approver in any workflow step

Usage:
    python manage.py setup_admin_visibility_test_data
    python manage.py setup_admin_visibility_test_data --reset  # Delete existing test data first
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
from purchase_requests.models import PurchaseRequest


User = get_user_model()


class Command(BaseCommand):
    help = 'Set up test data for S05 – Admin user visibility & control over purchase requests'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing S05 test data before setting up',
        )

    def handle(self, *args, **options):
        reset = options['reset']

        with transaction.atomic():
            if reset:
                self.stdout.write(self.style.WARNING('Deleting existing S05 test data...'))
                self._delete_test_data()

            self.stdout.write(self.style.SUCCESS('Setting up S05 admin visibility test data...'))

            # Verify lookup types and required lookups
            self._verify_lookup_types()

            # Create users
            admin_user = self._create_user(
                username='admin_user',
                full_name='Admin User',
                email='admin@example.com',
                is_staff=True,
                is_superuser=True,
            )
            requester_user_a = self._create_user(
                username='requester_user_A',
                full_name='Requester A User',
                email='requester_a@example.com',
            )
            requester_user_b = self._create_user(
                username='requester_user_B',
                full_name='Requester B User',
                email='requester_b@example.com',
            )
            approver_user = self._create_user(
                username='approver_user',
                full_name='Approver User',
                email='approver@example.com',
            )
            finance_user = self._create_user(
                username='finance_user',
                full_name='Finance User',
                email='finance@example.com',
            )

            # Create teams
            team_a = self._create_team('Team A', 'Team A for admin visibility tests')
            team_b = self._create_team('Team B', 'Team B for admin visibility tests')

            # Create form templates for each team
            template_a = self._create_form_template(team_a, requester_user_a)
            template_b = self._create_form_template(team_b, requester_user_b)

            # Ensure we have at least one numeric and one text field on each template
            self._ensure_basic_form_fields(template_a)
            self._ensure_basic_form_fields(template_b)

            # Create workflows for each team
            workflow_a = self._create_workflow(team_a, 'Team A Workflow')
            workflow_b = self._create_workflow(team_b, 'Team B Workflow')

            # For Team A: create non‑finance approval step and a finance review step
            step_a_1 = self._create_workflow_step(
                workflow=workflow_a,
                step_order=1,
                step_name='Team A Manager Approval',
                is_finance_review=False,
            )
            step_a_finance = self._create_workflow_step(
                workflow=workflow_a,
                step_order=2,
                step_name='Team A Finance Review',
                is_finance_review=True,
            )

            # For Team B: similar structure
            step_b_1 = self._create_workflow_step(
                workflow=workflow_b,
                step_order=1,
                step_name='Team B Manager Approval',
                is_finance_review=False,
            )
            step_b_finance = self._create_workflow_step(
                workflow=workflow_b,
                step_order=2,
                step_name='Team B Finance Review',
                is_finance_review=True,
            )

            # Assign approver_user as the ONLY approver on the non‑finance steps
            self._assign_approver(step_a_1, approver_user)
            self._assign_approver(step_b_1, approver_user)
            # Assign finance_user as finance reviewer on finance steps
            self._assign_approver(step_a_finance, finance_user)
            self._assign_approver(step_b_finance, finance_user)

            # IMPORTANT: Do NOT assign admin_user as approver anywhere

            # Access scopes / roles
            self._create_role_lookups_if_needed()
            self._create_access_scope(admin_user, None, 'ADMIN')
            self._create_access_scope(requester_user_a, team_a, 'REQUESTER')
            self._create_access_scope(requester_user_b, team_b, 'REQUESTER')
            self._create_access_scope(approver_user, team_a, 'APPROVER')
            self._create_access_scope(approver_user, team_b, 'APPROVER')
            self._create_access_scope(finance_user, team_a, 'FINANCE')
            self._create_access_scope(finance_user, team_b, 'FINANCE')

            # Create purchase requests for the scenario
            req_a_draft, req_a_pending, req_b_completed, req_finance = self._create_requests(
                requester_user_a=requester_user_a,
                requester_user_b=requester_user_b,
                team_a=team_a,
                team_b=team_b,
                template_a=template_a,
                template_b=template_b,
                step_a_1=step_a_1,
                step_b_finance=step_b_finance,
            )

            self.stdout.write(self.style.SUCCESS('\n✅ Successfully set up S05 admin visibility test data!'))
            self.stdout.write(self.style.SUCCESS('\nUsers (password: testpass123):'))
            self.stdout.write('  - admin_user (staff, superuser)')
            self.stdout.write('  - requester_user_A')
            self.stdout.write('  - requester_user_B')
            self.stdout.write('  - approver_user')
            self.stdout.write('  - finance_user (finance reviewer for finance steps)')

            self.stdout.write(self.style.SUCCESS('\nTeams:'))
            self.stdout.write(f'  - Team A (id={team_a.id})')
            self.stdout.write(f'  - Team B (id={team_b.id})')

            self.stdout.write(self.style.SUCCESS('\nRequests created:'))
            self.stdout.write(f'  - REQ_A_DRAFT: id={req_a_draft.id}, status={req_a_draft.status.code}, team={req_a_draft.team.name}')
            self.stdout.write(f'  - REQ_A_PENDING: id={req_a_pending.id}, status={req_a_pending.status.code}, team={req_a_pending.team.name}')
            self.stdout.write(f'  - REQ_B_COMPLETED: id={req_b_completed.id}, status={req_b_completed.status.code}, team={req_b_completed.team.name}')
            self.stdout.write(f'  - REQ_FINANCE: id={req_finance.id}, status={req_finance.status.code}, team={req_finance.team.name}')

    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------

    def _verify_lookup_types(self):
        """Ensure REQUEST_STATUS and PURCHASE_TYPE lookups exist and are active."""
        try:
            request_status_type, _ = LookupType.objects.get_or_create(
                code='REQUEST_STATUS',
                defaults={'title': 'Purchase Request Statuses', 'is_active': True},
            )
            purchase_type_type, _ = LookupType.objects.get_or_create(
                code='PURCHASE_TYPE',
                defaults={'title': 'Purchase Types', 'is_active': True},
            )

            if not request_status_type.is_active:
                request_status_type.is_active = True
                request_status_type.save()
            if not purchase_type_type.is_active:
                purchase_type_type.is_active = True
                purchase_type_type.save()

            # Ensure all needed statuses exist and are active
            required_statuses = [
                'DRAFT',
                'PENDING_APPROVAL',
                'IN_REVIEW',
                'REJECTED',
                'RESUBMITTED',
                'FULLY_APPROVED',
                'FINANCE_REVIEW',
                'COMPLETED',
            ]
            for status_code in required_statuses:
                lookup, _ = Lookup.objects.get_or_create(
                    type=request_status_type,
                    code=status_code,
                    defaults={'title': status_code.replace('_', ' ').title(), 'is_active': True},
                )
                if not lookup.is_active:
                    lookup.is_active = True
                    lookup.save()

            # Ensure at least two purchase types exist
            for purchase_code in ['SERVICE', 'GOOD']:
                lookup, _ = Lookup.objects.get_or_create(
                    type=purchase_type_type,
                    code=purchase_code,
                    defaults={'title': purchase_code.title(), 'is_active': True},
                )
                if not lookup.is_active:
                    lookup.is_active = True
                    lookup.save()

            self.stdout.write(self.style.SUCCESS('✓ Lookup types verified and activated'))
        except LookupType.DoesNotExist as exc:
            raise ValueError(
                f'Required lookup types not found. Please run migrations first: {exc}'
            )

    def _create_user(self, username, full_name, email, is_staff=False, is_superuser=False):
        """Create or get a user with a known password for testing."""
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': full_name.split()[0] if full_name else '',
                'last_name': ' '.join(full_name.split()[1:]) if len(full_name.split()) > 1 else '',
                'is_active': True,
                'is_staff': is_staff,
                'is_superuser': is_superuser,
            },
        )
        if created:
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created user: {username}'))
        else:
            # Ensure flags and password are correct
            user.is_active = True
            user.is_staff = is_staff or user.is_staff
            user.is_superuser = is_superuser or user.is_superuser
            user.set_password('testpass123')
            user.save()
            self.stdout.write(self.style.WARNING(f'  - User already exists: {username} (refreshed)'))
        return user

    def _create_team(self, name, description):
        """Create or get a team."""
        team, created = Team.objects.get_or_create(
            name=name,
            defaults={
                'description': description,
                'is_active': True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created team: {name}'))
        else:
            if not team.is_active:
                team.is_active = True
                team.save()
            self.stdout.write(self.style.WARNING(f'  - Team already exists: {name}'))
        return team

    def _create_form_template(self, team, created_by):
        """Create or get an active form template for a team."""
        # Deactivate existing active template
        FormTemplate.objects.filter(team=team, is_active=True).update(is_active=False)

        max_version = (
            FormTemplate.objects.filter(team=team).aggregate(max_version=Max('version_number'))[
                'max_version'
            ]
            or 0
        )

        template, created = FormTemplate.objects.get_or_create(
            team=team,
            version_number=max_version + 1,
            defaults={
                'created_by': created_by,
                'is_active': True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created form template for {team.name}'))
        else:
            template.is_active = True
            template.save()
            self.stdout.write(self.style.WARNING(f'  - Form template already exists for {team.name}'))
        return template

    def _ensure_basic_form_fields(self, template):
        """Ensure the template has at least a NUMBER and a TEXT field."""
        # Budget amount (NUMBER, required)
        budget_field, created1 = FormField.objects.get_or_create(
            template=template,
            field_id='BUDGET_AMOUNT',
            defaults={
                'name': 'budget_amount',
                'label': 'Budget Amount',
                'field_type': FormField.NUMBER,
                'required': True,
                'order': 1,
            },
        )
        if created1:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created field BUDGET_AMOUNT for template {template.id}'))
        else:
            budget_field.field_type = FormField.NUMBER
            budget_field.required = True
            budget_field.order = 1
            budget_field.save()

        # Description (TEXT, required)
        desc_field, created2 = FormField.objects.get_or_create(
            template=template,
            field_id='DESCRIPTION',
            defaults={
                'name': 'description',
                'label': 'Description',
                'field_type': FormField.TEXT,
                'required': True,
                'order': 2,
            },
        )
        if created2:
            self.stdout.write(self.style.SUCCESS(f'    ✓ Created field DESCRIPTION for template {template.id}'))
        else:
            desc_field.field_type = FormField.TEXT
            desc_field.required = True
            desc_field.order = 2
            desc_field.save()

    def _create_workflow(self, team, name):
        """Create or get a workflow for a team."""
        workflow, created = Workflow.objects.get_or_create(
            team=team,
            defaults={
                'name': name,
                'is_active': True,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Created workflow for {team.name}'))
        else:
            if not workflow.is_active:
                workflow.is_active = True
                workflow.save()
            self.stdout.write(self.style.WARNING(f'  - Workflow already exists for {team.name}'))
        return workflow

    def _create_workflow_step(self, workflow, step_order, step_name, is_finance_review):
        """Create or update a workflow step."""
        step, created = WorkflowStep.objects.get_or_create(
            workflow=workflow,
            step_order=step_order,
            defaults={
                'step_name': step_name,
                'is_finance_review': is_finance_review,
                'is_active': True,
            },
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'    ✓ Created step {step_order} for {workflow.team.name}: {step_name}'
                )
            )
        else:
            step.step_name = step_name
            step.is_finance_review = is_finance_review
            step.is_active = True
            step.save()
            self.stdout.write(
                self.style.WARNING(
                    f'    - Step {step_order} for {workflow.team.name} already exists (updated)'
                )
            )
        return step

    def _assign_approver(self, step, approver):
        """Assign an approver to a workflow step (ensuring assignment is active)."""
        if not step.is_active:
            step.is_active = True
            step.save()
        if not approver.is_active:
            approver.is_active = True
            approver.save()

        assignment, created = WorkflowStepApprover.objects.get_or_create(
            step=step,
            approver=approver,
            defaults={'is_active': True},
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'      ✓ Assigned approver {approver.username} to step {step.step_order} ({step.step_name})'
                )
            )
        else:
            if not assignment.is_active:
                assignment.is_active = True
                assignment.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'      ✓ Reactivated approver {approver.username} on step {step.step_order}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'      - Approver {approver.username} already assigned to step {step.step_order}'
                    )
                )

    def _create_role_lookups_if_needed(self):
        """Ensure ROLE lookup type and basic role codes exist for AccessScope."""
        role_type, _ = LookupType.objects.get_or_create(
            code='ROLE',
            defaults={'title': 'User Roles', 'is_active': True},
        )
        if not role_type.is_active:
            role_type.is_active = True
            role_type.save()

        # Core roles used in PRS tests and UI navigation
        for code in ['ADMIN', 'REQUESTER', 'APPROVER', 'FINANCE']:
            lookup, _ = Lookup.objects.get_or_create(
                type=role_type,
                code=code,
                defaults={'title': code.title(), 'is_active': True},
            )
            if not lookup.is_active:
                lookup.is_active = True
                lookup.save()

    def _create_access_scope(self, user, team, role_code):
        """
        Create AccessScope entry.

        - If team is None, scope is on org_node=None and team=None (global role like ADMIN).
        - If team is provided, scope is per-team (REQUESTER / APPROVER).
        """
        role_type = LookupType.objects.get(code='ROLE')
        role = Lookup.objects.get(type=role_type, code=role_code)

        scope, created = AccessScope.objects.get_or_create(
            user=user,
            team=team,
            org_node=None,
            role=role,
            defaults={
                'position_title': role_code,
                'is_active': True,
            },
        )
        if created:
            self.stdout.write(
                self.style.SUCCESS(
                    f'  ✓ Created AccessScope: {user.username} -> '
                    f'{"GLOBAL" if team is None else team.name} ({role_code})'
                )
            )
        else:
            scope.is_active = True
            scope.save()
            self.stdout.write(
                self.style.WARNING(
                    f'  - AccessScope already exists: {user.username} -> '
                    f'{"GLOBAL" if team is None else team.name} ({role_code})'
                )
            )

    def _get_request_status(self, code):
        status_type = LookupType.objects.get(code='REQUEST_STATUS')
        return Lookup.objects.get(type=status_type, code=code)

    def _get_purchase_type(self):
        purchase_type_type = LookupType.objects.get(code='PURCHASE_TYPE')
        # Prefer SERVICE, fall back to any existing
        try:
            return Lookup.objects.get(type=purchase_type_type, code='SERVICE')
        except Lookup.DoesNotExist:
            return Lookup.objects.filter(type=purchase_type_type).first()

    def _create_requests(
        self,
        requester_user_a,
        requester_user_b,
        team_a,
        team_b,
        template_a,
        template_b,
        step_a_1,
        step_b_finance,
    ):
        """Create the three key purchase requests used in the admin visibility tests."""
        purchase_type = self._get_purchase_type()
        status_draft = self._get_request_status('DRAFT')
        status_pending = self._get_request_status('PENDING_APPROVAL')
        status_completed = self._get_request_status('COMPLETED')
        status_finance = self._get_request_status('FINANCE_REVIEW')

        # REQ_A_DRAFT – DRAFT request in Team A
        req_a_draft, _ = PurchaseRequest.objects.get_or_create(
            requestor=requester_user_a,
            team=team_a,
            subject='REQ_A_DRAFT – Draft request in Team A',
            defaults={
                'form_template': template_a,
                'status': status_draft,
                'current_step': None,
                'vendor_name': 'Draft Vendor A',
                'vendor_account': 'IR001122334455',
                'description': 'Draft request for admin visibility tests (Team A)',
                'purchase_type': purchase_type,
            },
        )

        # REQ_A_PENDING – PENDING_APPROVAL in Team A, current_step = step_a_1
        req_a_pending, _ = PurchaseRequest.objects.get_or_create(
            requestor=requester_user_a,
            team=team_a,
            subject='REQ_A_PENDING – Pending approval in Team A',
            defaults={
                'form_template': template_a,
                'status': status_pending,
                'current_step': step_a_1,
                'vendor_name': 'Pending Vendor A',
                'vendor_account': 'IR998877665544',
                'description': 'Pending approval request for admin visibility tests (Team A)',
                'purchase_type': purchase_type,
            },
        )

        # REQ_B_COMPLETED – COMPLETED request in Team B
        # We set current_step to the finance step to reflect completion via finance.
        req_b_completed, _ = PurchaseRequest.objects.get_or_create(
            requestor=requester_user_b,
            team=team_b,
            subject='REQ_B_COMPLETED – Completed request in Team B',
            defaults={
                'form_template': template_b,
                'status': status_completed,
                'current_step': step_b_finance,
                'vendor_name': 'Completed Vendor B',
                'vendor_account': 'IR556677889900',
                'description': 'Completed request for admin visibility tests (Team B)',
                'purchase_type': purchase_type,
            },
        )

        # Ensure completed_at is set for the completed request
        if req_b_completed.completed_at is None:
            from django.utils import timezone

            req_b_completed.completed_at = timezone.now()
            req_b_completed.save()

        # REQ_FINANCE – FINANCE_REVIEW request in Team A assigned to finance_user
        # This is used to populate the finance inbox (status FINANCE_REVIEW).
        from workflows.models import WorkflowStep
        finance_step_a = step_b_finance  # default fallback
        try:
            # Prefer using the Team A finance step explicitly if it still exists
            finance_step_a = WorkflowStep.objects.get(
                workflow=step_a_1.workflow,
                is_finance_review=True,
                is_active=True,
            )
        except WorkflowStep.DoesNotExist:
            # Fallback: keep using provided finance step for Team B
            pass

        req_finance, _ = PurchaseRequest.objects.get_or_create(
            requestor=requester_user_a,
            team=team_a,
            subject='REQ_FINANCE – Finance review pending in Team A',
            defaults={
                'form_template': template_a,
                'status': status_finance,
                'current_step': finance_step_a,
                'vendor_name': 'Finance Vendor A',
                'vendor_account': 'IR445566778899',
                'description': 'Finance review sample request for finance_user inbox',
                'purchase_type': purchase_type,
            },
        )

        return req_a_draft, req_a_pending, req_b_completed, req_finance

    def _delete_test_data(self):
        """Delete S05-specific test data."""
        usernames = ['admin_user', 'requester_user_A', 'requester_user_B', 'approver_user']
        team_names = ['Team A', 'Team B']

        # Delete purchase requests in those teams created by our test users
        PurchaseRequest.objects.filter(
            requestor__username__in=usernames,
            team__name__in=team_names,
        ).delete()

        # Delete workflows, steps, and approvers for Team A/B
        WorkflowStepApprover.objects.filter(
            step__workflow__team__name__in=team_names
        ).delete()
        WorkflowStep.objects.filter(workflow__team__name__in=team_names).delete()
        Workflow.objects.filter(team__name__in=team_names).delete()

        # Delete form fields and templates for Team A/B
        FormField.objects.filter(template__team__name__in=team_names).delete()
        FormTemplate.objects.filter(team__name__in=team_names).delete()

        # Delete access scopes for these users
        AccessScope.objects.filter(user__username__in=usernames).delete()

        # Delete teams
        Team.objects.filter(name__in=team_names).delete()

        # Delete users themselves
        User.objects.filter(username__in=usernames).delete()

        self.stdout.write(self.style.SUCCESS('✓ Deleted existing S05 test data'))


