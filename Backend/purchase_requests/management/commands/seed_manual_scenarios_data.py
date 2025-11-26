"""
Seed data to support all manual PRS scenarios (S02, S04, S05, S06–S10, UA-01–UA-10).

This command is designed to be idempotent and to build on top of the existing
`seed_prs_data.py` and `setup_workflow_test_data.py` helpers without breaking them.

It creates:
- Core lookup values (REQUEST_STATUS, PURCHASE_TYPE, COMPANY_ROLE)
- Users for each role used in the scenarios
- Teams: Marketing (Team A), Tech (Team B), Data Science, Product, R&D
- AccessScope links between users, teams and roles
- Form templates + fields for each team as described in the specs
- Workflows + steps + step-approver roles
- Example PurchaseRequests in specific states:
  - REQ_A_DRAFT      – Team A draft
  - REQ_A_PENDING    – Team A in approval step
  - REQ_B_COMPLETED  – Team B completed
  - REQ_FINANCE      – Finance review in progress

Usage:
    python manage.py seed_manual_scenarios_data
    python manage.py seed_manual_scenarios_data --reset
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db import models

from classifications.models import LookupType, Lookup
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from accounts.models import AccessScope
from purchase_requests.models import PurchaseRequest, RequestFieldValue
from audit.models import AuditEvent

User = get_user_model()


class Command(BaseCommand):
    help = "Seed data required for the PRS manual test scenarios (S02, S04, S05, S06–S10, UA-01–UA-10)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing manual-scenario test data before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        reset = options["reset"]

        if reset:
            self.stdout.write(self.style.WARNING("Deleting existing manual-scenario test data..."))
            self._delete_manual_scenario_data()

        self.stdout.write(self.style.SUCCESS("Seeding PRS manual-scenario data..."))

        # 1) Lookups (REQUEST_STATUS, PURCHASE_TYPE, COMPANY_ROLE)
        self._ensure_lookup_types_and_values()

        # 2) Core users
        users = self._ensure_users()

        # 3) Teams
        teams = self._ensure_teams()

        # 4) Access scopes / roles
        roles = self._ensure_company_roles()
        self._ensure_access_scopes(users, teams, roles)

        # 5) Form templates + fields
        templates = self._ensure_form_templates_and_fields(users, teams)

        # 6) Workflows + steps + approver roles
        steps = self._ensure_workflows_and_steps(teams, roles)

        # 7) PurchaseRequests in specific states + audit
        self._ensure_purchase_requests(users, teams, templates, steps)

        self.stdout.write(self.style.SUCCESS("\n✅ Manual-scenario seed data is ready."))

    # -------------------------------------------------------------------------
    # Lookups
    # -------------------------------------------------------------------------

    def _ensure_lookup_types_and_values(self):
        request_status_type, _ = LookupType.objects.get_or_create(
            code="REQUEST_STATUS", defaults={"title": "Request Statuses", "is_active": True}
        )
        purchase_type_type, _ = LookupType.objects.get_or_create(
            code="PURCHASE_TYPE", defaults={"title": "Purchase Types", "is_active": True}
        )
        company_role_type, _ = LookupType.objects.get_or_create(
            code="COMPANY_ROLE", defaults={"title": "Company Roles", "is_active": True}
        )

        # Always keep them active
        for lt in (request_status_type, purchase_type_type, company_role_type):
            if not lt.is_active:
                lt.is_active = True
                lt.save()

        required_statuses = [
            "DRAFT",
            "PENDING_APPROVAL",
            "IN_REVIEW",
            "REJECTED",
            "RESUBMITTED",
            "FULLY_APPROVED",
            "FINANCE_REVIEW",
            "COMPLETED",
        ]
        for code in required_statuses:
            lookup, _ = Lookup.objects.get_or_create(
                type=request_status_type,
                code=code,
                defaults={"title": code.replace("_", " ").title(), "is_active": True},
            )
            if not lookup.is_active:
                lookup.is_active = True
                lookup.save()

        for code in ["SERVICE", "GOOD"]:
            lookup, _ = Lookup.objects.get_or_create(
                type=purchase_type_type,
                code=code,
                defaults={"title": code.title(), "is_active": True},
            )
            if not lookup.is_active:
                lookup.is_active = True
                lookup.save()

    # -------------------------------------------------------------------------
    # Users, teams, roles, access scopes
    # -------------------------------------------------------------------------

    def _ensure_users(self):
        def upsert_user(username, full_name, email, is_staff=False, is_superuser=False):
            first, *rest = full_name.split() if full_name else [username]
            last = " ".join(rest) if rest else ""
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "is_active": True,
                    "is_staff": is_staff,
                    "is_superuser": is_superuser,
                },
            )
            if created:
                user.set_password("testpass123")
                self.stdout.write(self.style.SUCCESS(f"  ✓ Created user {username}"))
            else:
                # ensure predictable password/state for test users
                user.is_active = True
                user.is_staff = user.is_staff or is_staff
                user.is_superuser = user.is_superuser or is_superuser
                user.set_password("testpass123")
            user.save()
            return user

        users = {
            "requester_user": upsert_user("requester_user", "Requester User", "requester@example.com"),
            "approver1_user": upsert_user("approver1_user", "Approver One", "approver1@example.com"),
            "approver2_user": upsert_user("approver2_user", "Approver Two", "approver2@example.com"),
            "approver_user": upsert_user("approver_user", "Generic Approver", "approver@example.com"),
            "finance_user": upsert_user("finance_user", "Finance User", "finance@example.com"),
            "admin_user": upsert_user(
                "admin_user",
                "Admin User",
                "admin@example.com",
                is_staff=True,
                is_superuser=True,
            ),
            "non_approver_user": upsert_user("non_approver_user", "Non Approver", "non_approver@example.com"),
            "requester_user_B": upsert_user("requester_user_B", "Requester B", "requester_b@example.com"),
            "requester_user_RnD": upsert_user("requester_user_RnD", "Requester RnD", "requester_rnd@example.com"),
        }
        return users

    def _ensure_teams(self):
        def upsert_team(name, description):
            team, created = Team.objects.get_or_create(
                name=name, defaults={"description": description, "is_active": True}
            )
            if not created and not team.is_active:
                team.is_active = True
                team.save()
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✓ Created team {name}"))
            return team

        teams = {
            "Team A": upsert_team("Marketing", "Team A – Marketing"),
            "Team B": upsert_team("Tech", "Team B – Tech"),
            "Data Science": upsert_team("Data Science", "Data Science & Analytics team"),
            "Product": upsert_team("Product", "Product team"),
            "R&D": upsert_team("R&D", "Research & Development"),
        }
        return teams

    def _ensure_company_roles(self):
        company_role_type = LookupType.objects.get(code="COMPANY_ROLE")
        role_codes = {
            "REQUESTER": "Requester",
            "APPROVER_MANAGER": "Manager Approver",
            "APPROVER_DIRECTOR": "Director Approver",
            "APPROVER_GENERIC": "Generic Approver",
            "FINANCE": "Finance",
            "ADMIN": "Admin",
        }
        roles = {}
        for code, title in role_codes.items():
            role, _ = Lookup.objects.get_or_create(
                type=company_role_type,
                code=code,
                defaults={"title": title, "is_active": True},
            )
            if not role.is_active:
                role.is_active = True
                role.save()
            roles[code] = role
        return roles

    def _ensure_access_scopes(self, users, teams, roles):
        # AccessScope is per team+role
        def scope(user_key, team_key, role_code, position_title=None):
            user = users[user_key]
            team = teams[team_key]
            role = roles[role_code]
            scope_obj, created = AccessScope.objects.get_or_create(
                user=user,
                team=team,
                role=role,
                defaults={"position_title": position_title or role_code, "is_active": True},
            )
            if not created and not scope_obj.is_active:
                scope_obj.is_active = True
                scope_obj.save()

        # Requesters
        scope("requester_user", "Team A", "REQUESTER")
        scope("requester_user_B", "Team B", "REQUESTER")
        scope("requester_user_RnD", "R&D", "REQUESTER")

        # Approvers for Marketing workflow (Team A)
        scope("approver1_user", "Team A", "APPROVER_MANAGER")
        scope("approver2_user", "Team A", "APPROVER_DIRECTOR")
        scope("approver_user", "Team A", "APPROVER_GENERIC")

        # Generic approver + finance approver for R&D workflow
        scope("approver_user", "R&D", "APPROVER_GENERIC")
        scope("finance_user", "R&D", "FINANCE")

        # Admin has access to multiple teams but approval authority still via roles
        scope("admin_user", "Team A", "ADMIN")
        scope("admin_user", "Team B", "ADMIN")
        scope("admin_user", "R&D", "ADMIN")

    # -------------------------------------------------------------------------
    # Form templates / fields
    # -------------------------------------------------------------------------

    def _ensure_form_templates_and_fields(self, users, teams):
        templates = {}
        requester = users["requester_user"]

        def new_active_template(team):
            # Deactivate existing
            FormTemplate.objects.filter(team=team, is_active=True).update(is_active=False)
            max_version = (
                FormTemplate.objects.filter(team=team).aggregate(max_v=models.Max("version_number"))["max_v"] or 0
            )
            template, _ = FormTemplate.objects.get_or_create(
                team=team,
                version_number=max_version + 1,
                defaults={"created_by": requester, "is_active": True},
            )
            template.is_active = True
            template.save()
            return template

        # Team A (Marketing) – BUDGET_AMOUNT + CAMPAIGN_NAME
        team_a = teams["Team A"]
        template_a = new_active_template(team_a)
        templates["Team A"] = template_a
        self._ensure_field(
            template_a,
            field_id="BUDGET_AMOUNT",
            name="budget_amount",
            label="Budget Amount",
            field_type=FormField.NUMBER,
            required=True,
            order=1,
        )
        self._ensure_field(
            template_a,
            field_id="CAMPAIGN_NAME",
            name="campaign_name",
            label="Campaign Name",
            field_type=FormField.TEXT,
            required=True,
            order=2,
        )

        # Team B (Tech) – SERVER_TYPE, EXPECTED_LOAD
        team_b = teams["Team B"]
        template_b = new_active_template(team_b)
        templates["Team B"] = template_b
        self._ensure_field(
            template_b,
            field_id="SERVER_TYPE",
            name="server_type",
            label="Server Type",
            field_type=FormField.DROPDOWN,
            required=True,
            order=1,
            dropdown_options=["VM", "Bare Metal", "Kubernetes"],
        )
        self._ensure_field(
            template_b,
            field_id="EXPECTED_LOAD",
            name="expected_load",
            label="Expected Load",
            field_type=FormField.NUMBER,
            required=False,
            order=2,
        )

        # R&D – simple template for S10 end-to-end
        rnd_team = teams["R&D"]
        template_rnd = new_active_template(rnd_team)
        templates["R&D"] = template_rnd
        self._ensure_field(
            template_rnd,
            field_id="PROJECT_NAME",
            name="project_name",
            label="Project Name",
            field_type=FormField.TEXT,
            required=True,
            order=1,
        )
        self._ensure_field(
            template_rnd,
            field_id="ESTIMATED_COST",
            name="estimated_cost",
            label="Estimated Cost",
            field_type=FormField.NUMBER,
            required=True,
            order=2,
        )

        # Data Science / Product – minimal templates to keep admin scenarios realistic
        ds_team = teams["Data Science"]
        template_ds = new_active_template(ds_team)
        templates["Data Science"] = template_ds
        self._ensure_field(
            template_ds,
            field_id="DS_BUDGET",
            name="ds_budget",
            label="DS Budget",
            field_type=FormField.NUMBER,
            required=False,
            order=1,
        )

        product_team = teams["Product"]
        template_product = new_active_template(product_team)
        templates["Product"] = template_product
        self._ensure_field(
            template_product,
            field_id="PRODUCT_NAME",
            name="product_name",
            label="Product Name",
            field_type=FormField.TEXT,
            required=True,
            order=1,
        )

        return templates

    def _ensure_field(
        self,
        template,
        field_id,
        name,
        label,
        field_type,
        required,
        order,
        dropdown_options=None,
    ):
        field, created = FormField.objects.get_or_create(
            template=template,
            field_id=field_id,
            defaults={
                "name": name,
                "label": label,
                "field_type": field_type,
                "required": required,
                "order": order,
            },
        )
        if not created:
            field.name = name
            field.label = label
            field.field_type = field_type
            field.required = required
            field.order = order
        if dropdown_options is not None:
            field.field_type = FormField.DROPDOWN
            field.dropdown_options = dropdown_options
        field.is_active = True
        field.save()
        return field

    # -------------------------------------------------------------------------
    # Workflows
    # -------------------------------------------------------------------------

    def _ensure_workflows_and_steps(self, teams, roles):
        steps = {}

        def active_workflow(team, name):
            workflow, _ = Workflow.objects.get_or_create(
                team=team,
                defaults={"name": name, "is_active": True},
            )
            if not workflow.is_active:
                workflow.is_active = True
                workflow.save()
            return workflow

        # Team A – Manager → Director (no finance step here, matches S04)
        team_a = teams["Team A"]
        wf_a = active_workflow(team_a, "Team A Workflow")
        step1_a = self._ensure_step(wf_a, 1, "Manager Approval", is_finance_review=False)
        step2_a = self._ensure_step(wf_a, 2, "Director Approval", is_finance_review=False)
        self._ensure_step_role(step1_a, roles["APPROVER_MANAGER"])
        self._ensure_step_role(step2_a, roles["APPROVER_DIRECTOR"])
        steps["Team A_step1"] = step1_a
        steps["Team A_step2"] = step2_a

        # Team B – Manager → Finance
        team_b = teams["Team B"]
        wf_b = active_workflow(team_b, "Tech Workflow")
        step1_b = self._ensure_step(wf_b, 1, "Tech Manager Approval", is_finance_review=False)
        step2_b = self._ensure_step(wf_b, 2, "Tech Finance Review", is_finance_review=True)
        self._ensure_step_role(step1_b, roles["APPROVER_GENERIC"])
        self._ensure_step_role(step2_b, roles["FINANCE"])
        steps["Team B_step1"] = step1_b
        steps["Team B_step2"] = step2_b

        # R&D – Manager → Finance (for S10)
        rnd_team = teams["R&D"]
        wf_rnd = active_workflow(rnd_team, "R&D Workflow")
        step1_rnd = self._ensure_step(wf_rnd, 1, "R&D Manager Approval", is_finance_review=False)
        step2_rnd = self._ensure_step(wf_rnd, 2, "R&D Finance Review", is_finance_review=True)
        self._ensure_step_role(step1_rnd, roles["APPROVER_GENERIC"])
        self._ensure_step_role(step2_rnd, roles["FINANCE"])
        steps["R&D_step1"] = step1_rnd
        steps["R&D_step2"] = step2_rnd

        return steps

    def _ensure_step(self, workflow, order, name, is_finance_review):
        step, created = WorkflowStep.objects.get_or_create(
            workflow=workflow,
            step_order=order,
            defaults={
                "step_name": name,
                "is_finance_review": is_finance_review,
                "is_active": True,
            },
        )
        if not created:
            step.step_name = name
            step.is_finance_review = is_finance_review
            step.is_active = True
            step.save()
        return step

    def _ensure_step_role(self, step, role):
        wsa, created = WorkflowStepApprover.objects.get_or_create(
            step=step,
            role=role,
            defaults={"is_active": True},
        )
        if not created and not wsa.is_active:
            wsa.is_active = True
            wsa.save()
        return wsa

    # -------------------------------------------------------------------------
    # PurchaseRequests + audit
    # -------------------------------------------------------------------------

    def _ensure_purchase_requests(self, users, teams, templates, steps):
        status_type = LookupType.objects.get(code="REQUEST_STATUS")
        purchase_type_type = LookupType.objects.get(code="PURCHASE_TYPE")

        def status(code):
            return Lookup.objects.get(type=status_type, code=code)

        def ptype(code):
            return Lookup.objects.get(type=purchase_type_type, code=code)

        now = timezone.now()

        # REQ_A_DRAFT – S02 base + used in S05 draft visibility
        pr_a_draft, _ = PurchaseRequest.objects.get_or_create(
            subject="REQ_A_DRAFT – Q2 Social Campaign",
            requestor=users["requester_user"],
            team=teams["Team A"],
            defaults={
                "form_template": templates["Team A"],
                "status": status("DRAFT"),
                "vendor_name": "ACME Media Agency",
                "vendor_account": "IR-123-456-789-0",
                "description": "Draft request for Marketing",
                "purchase_type": ptype("SERVICE"),
            },
        )
        pr_a_draft.status = status("DRAFT")
        pr_a_draft.current_step = None
        pr_a_draft.save()
        self._ensure_request_fields_team_a(pr_a_draft, templates["Team A"])

        # REQ_A_PENDING – S05-04/05 pending approval, current_step step1
        pr_a_pending, _ = PurchaseRequest.objects.get_or_create(
            subject="REQ_A_PENDING – Multi-level approval test",
            requestor=users["requester_user"],
            team=teams["Team A"],
            defaults={
                "form_template": templates["Team A"],
                "status": status("PENDING_APPROVAL"),
                "vendor_name": "ACME Media Agency",
                "vendor_account": "IR-123-456-789",
                "description": "Pending approval for S05 tests",
                "purchase_type": ptype("SERVICE"),
            },
        )
        pr_a_pending.status = status("PENDING_APPROVAL")
        pr_a_pending.current_step = steps["Team A_step1"]
        pr_a_pending.submitted_at = now
        pr_a_pending.save()
        self._ensure_request_fields_team_a(pr_a_pending, templates["Team A"])

        # REQ_B_COMPLETED – completed Team B request with some history
        pr_b_completed, _ = PurchaseRequest.objects.get_or_create(
            subject="REQ_B_COMPLETED – Tech Infra Purchase",
            requestor=users["requester_user_B"],
            team=teams["Team B"],
            defaults={
                "form_template": templates["Team B"],
                "status": status("COMPLETED"),
                "vendor_name": "Infra Vendor Ltd",
                "vendor_account": "IR-987-654-321",
                "description": "Completed infra request for S05-02/07",
                "purchase_type": ptype("GOOD"),
            },
        )
        pr_b_completed.status = status("COMPLETED")
        pr_b_completed.current_step = None
        pr_b_completed.submitted_at = now - timezone.timedelta(days=10)
        pr_b_completed.completed_at = now - timezone.timedelta(days=5)
        pr_b_completed.save()
        self._ensure_request_fields_team_b(pr_b_completed, templates["Team B"])
        self._ensure_basic_audit_history(pr_b_completed, users)

        # REQ_FINANCE – in FINANCE_REVIEW, used for S05-06 and finance completion
        pr_finance, _ = PurchaseRequest.objects.get_or_create(
            subject="REQ_FINANCE – Finance review in progress",
            requestor=users["requester_user_RnD"],
            team=teams["R&D"],
            defaults={
                "form_template": templates["R&D"],
                "status": status("FINANCE_REVIEW"),
                "vendor_name": "R&D Vendor",
                "vendor_account": "IR-111-222-333",
                "description": "Finance review test request",
                "purchase_type": ptype("SERVICE"),
            },
        )
        pr_finance.status = status("FINANCE_REVIEW")
        pr_finance.current_step = steps["R&D_step2"]
        pr_finance.submitted_at = now - timezone.timedelta(days=2)
        pr_finance.save()
        self._ensure_request_fields_rnd(pr_finance, templates["R&D"])

    def _ensure_request_fields_team_a(self, request, template):
        fields = {f.field_id: f for f in template.fields.all()}
        budget = fields.get("BUDGET_AMOUNT")
        campaign = fields.get("CAMPAIGN_NAME")
        if budget:
            RequestFieldValue.objects.update_or_create(
                request=request,
                field=budget,
                defaults={"value_number": "5000000"},
            )
        if campaign:
            RequestFieldValue.objects.update_or_create(
                request=request,
                field=campaign,
                defaults={"value_text": "Spring Campaign 1404"},
            )

    def _ensure_request_fields_team_b(self, request, template):
        fields = {f.field_id: f for f in template.fields.all()}
        server = fields.get("SERVER_TYPE")
        load = fields.get("EXPECTED_LOAD")
        if server:
            RequestFieldValue.objects.update_or_create(
                request=request,
                field=server,
                defaults={"value_dropdown": "VM"},
            )
        if load:
            RequestFieldValue.objects.update_or_create(
                request=request,
                field=load,
                defaults={"value_number": "1000"},
            )

    def _ensure_request_fields_rnd(self, request, template):
        fields = {f.field_id: f for f in template.fields.all()}
        project = fields.get("PROJECT_NAME")
        cost = fields.get("ESTIMATED_COST")
        if project:
            RequestFieldValue.objects.update_or_create(
                request=request,
                field=project,
                defaults={"value_text": "R&D Scenario Project"},
            )
        if cost:
            RequestFieldValue.objects.update_or_create(
                request=request,
                field=cost,
                defaults={"value_number": "7500000"},
            )

    def _ensure_basic_audit_history(self, request, users):
        # Only ensure at least one created + submitted + completed trail for admin visibility tests.
        if request.audit_events.exists():
            return
        AuditEvent.objects.create(
            event_type=AuditEvent.REQUEST_CREATED,
            actor=users["requester_user_B"],
            request=request,
            metadata={"detail": "Seeded request created"},
        )
        AuditEvent.objects.create(
            event_type=AuditEvent.REQUEST_SUBMITTED,
            actor=users["requester_user_B"],
            request=request,
            metadata={"detail": "Seeded request submitted"},
        )
        AuditEvent.objects.create(
            event_type=AuditEvent.REQUEST_COMPLETED,
            actor=users["finance_user"],
            request=request,
            metadata={"detail": "Seeded request completed"},
        )

    # -------------------------------------------------------------------------
    # Reset
    # -------------------------------------------------------------------------

    def _delete_manual_scenario_data(self):
        # Delete PurchaseRequests and related data that we own (by subject prefix)
        subjects = [
            "REQ_A_DRAFT – Q2 Social Campaign",
            "REQ_A_PENDING – Multi-level approval test",
            "REQ_B_COMPLETED – Tech Infra Purchase",
            "REQ_FINANCE – Finance review in progress",
        ]
        prs = PurchaseRequest.objects.filter(subject__in=subjects)
        AuditEvent.objects.filter(request__in=prs).delete()
        RequestFieldValue.objects.filter(request__in=prs).delete()
        prs.delete()

        # We intentionally do NOT delete teams / users / templates / workflows here
        # to avoid surprising other seed/test commands. They are inexpensive to
        # reconfigure idempotently when the command is re-run.


