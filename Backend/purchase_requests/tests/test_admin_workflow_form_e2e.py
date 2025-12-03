"""
End-to-end tests for admin workflow/form configuration and permissions.

Scenarios covered:
- System Admin can create form & workflow templates via API, wire them to a team
  via TeamPurchaseConfig, and the purchase request flow uses them.
- Non-admin users cannot create or edit form/workflow templates (403).
- Editing templates via API creates new versions and updates TeamPurchaseConfig.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from classifications.models import LookupType, Lookup
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import (
    WorkflowTemplate,
    WorkflowTemplateStep,
    WorkflowTemplateStepApprover,
)
from prs_team_config.models import TeamPurchaseConfig
from purchase_requests.models import PurchaseRequest
from accounts.models import AccessScope

from .conftest import auth  # reuse helper used in other E2E tests


User = get_user_model()


def create_system_admin_user():
    """Create a System Admin (staff) user."""
    return User.objects.create_user(
        username="admin_user",
        password="testpass123",
        email="admin@example.com",
        is_staff=True,
        is_superuser=False,
    )


def create_regular_user(username="regular_user"):
    """Create a non-admin, non-staff user."""
    return User.objects.create_user(
        username=username,
        password="testpass123",
        email=f"{username}@example.com",
        is_staff=False,
        is_superuser=False,
    )


@pytest.fixture
def purchase_type_service(db):
    """
    Ensure PURCHASE_TYPE lookup type and a SERVICE code exist.
    This is similar to purchase_type_lookups but returns only SERVICE.
    """
    type_obj, _ = LookupType.objects.get_or_create(
        code="PURCHASE_TYPE",
        defaults={"title": "Purchase Type", "description": "Types of purchases"},
    )
    service, _ = Lookup.objects.get_or_create(
        type=type_obj,
        code="SERVICE",
        defaults={"title": "Service", "is_active": True},
    )
    return service


@pytest.mark.django_db
class TestAdminCanConfigureWorkflowAndFormTemplates:
    """
    Admin happy-path:
    - Create form template via API
    - Create workflow template via API
    - Wire both to a team via TeamPurchaseConfig
    - Verify team effective-template endpoint returns them
    - Verify purchase request creation uses these templates
    """

    def test_admin_creates_templates_and_team_config_and_flow_uses_them(
        self,
        purchase_type_service,
        request_status_lookups,
    ):
        client = APIClient()
        admin_user = create_system_admin_user()
        client.force_authenticate(user=admin_user)

        # 1) Create a new team
        team = Team.objects.create(name="Config Test Team", is_active=True)

        # 2) Create a form template via API as System Admin
        form_payload = {
            "name": "Config Test Form",
            "fields": [
                {
                    "field_id": "BUDGET",
                    "name": "budget",
                    "label": "Budget",
                    "field_type": FormField.NUMBER,
                    "required": True,
                    "order": 1,
                },
                {
                    "field_id": "JUSTIFICATION",
                    "name": "justification",
                    "label": "Justification",
                    "field_type": FormField.TEXT,
                    "required": False,
                    "order": 2,
                },
            ],
        }
        resp = client.post("/api/prs/form-templates/", form_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        form_template_id = resp.data["id"]
        form_template = FormTemplate.objects.get(id=form_template_id)

        # 3) Create a workflow template via API as System Admin
        workflow_payload = {
            "name": "Config Test Workflow",
            "description": "Simple single-step workflow",
        }
        resp = client.post("/api/prs/workflows/", workflow_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        workflow_template_id = resp.data["id"]
        workflow_template = WorkflowTemplate.objects.get(id=workflow_template_id)

        # For this test it's enough that the workflow template exists;
        # steps are not strictly required for the config / effective-template wiring.

        # 4) Wire templates to team + purchase type via TeamPurchaseConfig
        config = TeamPurchaseConfig.objects.create(
            team=team,
            purchase_type=purchase_type_service,
            form_template=form_template,
            workflow_template=workflow_template,
            is_active=True,
        )
        assert config.is_active

        # 5) Verify team effective-template endpoint returns our templates
        resp = client.get(
            f"/api/prs/teams/{team.id}/effective-template/?purchase_type=SERVICE"
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        assert resp.data["form_template"]["id"] == str(form_template.id)
        assert resp.data["workflow_template"]["id"] == str(workflow_template.id)

        # 6) Requestor uses the configured templates to create a purchase request
        requestor = create_regular_user("config_requestor")
        # Create a basic COMPANY_ROLE lookup for the requestor
        role_type, _ = LookupType.objects.get_or_create(
            code="COMPANY_ROLE",
            defaults={"title": "Company Role", "description": "Roles in a company"},
        )
        member_role, _ = Lookup.objects.get_or_create(
            type=role_type,
            code="MEMBER",
            defaults={"title": "Member", "is_active": True},
        )
        # Give requestor access to the team (using any role; permissions on create are handled separately)
        AccessScope.objects.create(
            user=requestor,
            team=team,
            role=member_role,
            is_active=True,
        )

        client.force_authenticate(user=requestor)
        pr_payload = {
            "team_id": str(team.id),
            "vendor_name": "Config Vendor",
            "vendor_account": "IBAN-CONFIG-123",
            "subject": "Config-based Request",
            "description": "Request using team config templates",
            "purchase_type": "SERVICE",
        }
        resp = client.post("/api/prs/requests/", pr_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        pr_id = resp.data["id"]
        pr = PurchaseRequest.objects.get(id=pr_id)
        # The purchase request should reference the configured templates
        assert pr.form_template == form_template
        assert pr.workflow_template == workflow_template


@pytest.mark.django_db
class TestNonAdminCannotConfigureTemplates:
    """
    Non-admin / non-workflow-admin users should not be able to create or
    modify form/workflow templates via the public APIs.
    """

    def test_non_admin_cannot_create_or_update_templates(self):
        client = APIClient()
        user = create_regular_user("nonadmin_user")
        client.force_authenticate(user=user)

        # Attempt to create form template
        resp = client.post(
            "/api/prs/form-templates/",
            {
                "name": "Non-Admin Form",
                "fields": [],
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        # Attempt to create workflow template
        resp = client.post(
            "/api/prs/workflows/",
            {
                "name": "Non-Admin Workflow",
                "description": "Should be forbidden",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        # Prepare existing templates via ORM (bypassing API) to test update 403
        admin_user = create_system_admin_user()
        form_template = FormTemplate.objects.create(
            name="Existing Form",
            version_number=1,
            is_active=True,
            created_by=admin_user,
        )
        workflow_template = WorkflowTemplate.objects.create(
            name="Existing Workflow",
            version_number=1,
            is_active=True,
        )

        # As non-admin, attempts to update should still be forbidden
        resp = client.patch(
            f"/api/prs/form-templates/{form_template.id}/",
            {"fields": []},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN

        resp = client.patch(
            f"/api/prs/workflows/{workflow_template.id}/",
            {"name": "Updated Name"},
            format="json",
        )
        assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestEditingTemplatesCreatesNewVersionsAndUpdatesConfigs:
    """
    Verify that editing form/workflow templates via API:
    - creates new versions when requests exist
    - deactivates old versions
    - updates TeamPurchaseConfig to point to the new templates
    """

    def test_admin_editing_templates_versions_and_config_update(
        self,
        purchase_type_service,
        request_status_lookups,
    ):
        admin_user = create_system_admin_user()
        client = APIClient()
        client.force_authenticate(user=admin_user)

        # Base data: team + templates created via ORM to simplify step data
        team = Team.objects.create(name="Versioned Team", is_active=True)

        # Initial form template with one required field
        form_template = FormTemplate.objects.create(
            name="Versioned Form",
            version_number=1,
            is_active=True,
            created_by=admin_user,
        )
        FormField.objects.create(
            template=form_template,
            field_id="REQ_FIELD",
            name="req_field",
            label="Required Field",
            field_type=FormField.TEXT,
            required=True,
            order=1,
        )

        # Initial workflow template with a single step
        workflow_template = WorkflowTemplate.objects.create(
            name="Versioned Workflow",
            version_number=1,
            is_active=True,
        )
        step = WorkflowTemplateStep.objects.create(
            workflow_template=workflow_template,
            step_name="Manager Approval",
            step_order=1,
            is_finance_review=False,
            is_active=True,
        )

        # Create a basic COMPANY_ROLE lookup to attach to the step
        role_type, _ = LookupType.objects.get_or_create(
            code="COMPANY_ROLE",
            defaults={"title": "Company Role", "description": "Roles in a company"},
        )
        manager_role, _ = Lookup.objects.get_or_create(
            type=role_type,
            code="MANAGER",
            defaults={"title": "Manager", "is_active": True},
        )
        WorkflowTemplateStepApprover.objects.create(
            step=step,
            role=manager_role,
            is_active=True,
        )

        # Team configuration points to initial templates
        config = TeamPurchaseConfig.objects.create(
            team=team,
            purchase_type=purchase_type_service,
            form_template=form_template,
            workflow_template=workflow_template,
            is_active=True,
        )

        # Create a request using these templates to trigger "has_any_requests" logic
        requestor = create_regular_user("version_requestor")
        AccessScope.objects.create(
            user=requestor,
            team=team,
            role=manager_role,
            is_active=True,
        )
        client.force_authenticate(user=requestor)
        pr_payload = {
            "team_id": str(team.id),
            "vendor_name": "Versioned Vendor",
            "vendor_account": "V-ACC-1",
            "subject": "Versioned Request",
            "description": "Initial version templates",
            "purchase_type": "SERVICE",
        }
        resp = client.post("/api/prs/requests/", pr_payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED, resp.data
        pr = PurchaseRequest.objects.get(id=resp.data["id"])
        assert pr.form_template == form_template
        assert pr.workflow_template == workflow_template

        # Now authenticate as admin again to perform template edits
        client.force_authenticate(user=admin_user)

        # ---- Edit FormTemplate via API (add a new field) ----
        form_update_payload = {
            # name is immutable in the serializer; we only send updated fields
            "fields": [
                {
                    "field_id": "REQ_FIELD",
                    "name": "req_field",
                    "label": "Required Field",
                    "field_type": FormField.TEXT,
                    "required": True,
                    "order": 1,
                },
                {
                    "field_id": "NEW_FIELD",
                    "name": "new_field",
                    "label": "New Field",
                    "field_type": FormField.TEXT,
                    "required": False,
                    "order": 2,
                },
            ]
        }
        resp = client.patch(
            f"/api/prs/form-templates/{form_template.id}/",
            form_update_payload,
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        updated_form_id = resp.data["id"]
        assert updated_form_id != str(form_template.id)

        new_form_template = FormTemplate.objects.get(id=updated_form_id)
        # Old template should be inactive; new one active
        form_template.refresh_from_db()
        assert not form_template.is_active
        assert new_form_template.is_active
        assert new_form_template.version_number > form_template.version_number

        # TeamPurchaseConfig should now point to the new form template
        config.refresh_from_db()
        assert config.form_template == new_form_template

        # ---- Edit WorkflowTemplate via API (no structural change needed because
        #      presence of requests already forces a new version) ----
        workflow_update_payload = {
            "name": "Versioned Workflow",  # Keep same name to test version increment
            "description": "Updated description",
            "steps": [
                {
                    "step_name": "Manager Approval",
                    "step_order": 1,
                    "is_finance_review": False,
                    "role_ids": [str(manager_role.id)],
                }
            ],
        }
        resp = client.patch(
            f"/api/prs/workflows/{workflow_template.id}/",
            workflow_update_payload,
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK, resp.data
        updated_workflow_id = resp.data["id"]
        assert updated_workflow_id != str(workflow_template.id)

        new_workflow_template = WorkflowTemplate.objects.get(id=updated_workflow_id)
        workflow_template.refresh_from_db()
        assert not workflow_template.is_active
        assert new_workflow_template.is_active
        assert new_workflow_template.version_number > workflow_template.version_number

        # TeamPurchaseConfig should now point to the new workflow template as well
        config.refresh_from_db()
        assert config.workflow_template == new_workflow_template


