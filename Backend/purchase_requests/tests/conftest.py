"""
Test fixtures for Purchase Request System tests
"""
import pytest
import io
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from classifications.models import LookupType, Lookup
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from attachments.models import AttachmentCategory

User = get_user_model()


@pytest.fixture
def api_client():
    """DRF APIClient fixture"""
    return APIClient()


@pytest.fixture
def user_requestor(db):
    """Requestor user fixture"""
    return User.objects.create_user(
        username="requestor_user",
        password="testpass123",
        email="requestor@example.com"
    )


@pytest.fixture
def user_manager(db):
    """Manager user fixture (non-finance approver)"""
    return User.objects.create_user(
        username="manager_user",
        password="testpass123",
        email="manager@example.com"
    )


@pytest.fixture
def user_finance(db):
    """Finance user fixture (finance approver)"""
    return User.objects.create_user(
        username="finance_user",
        password="testpass123",
        email="finance@example.com"
    )


@pytest.fixture
def random_user(db):
    """Random unrelated user fixture"""
    return User.objects.create_user(
        username="random_user",
        password="testpass123",
        email="random@example.com"
    )


@pytest.fixture
def request_status_lookups(db):
    """Create REQUEST_STATUS lookup type and all status codes"""
    type_obj, _ = LookupType.objects.get_or_create(
        code="REQUEST_STATUS",
        defaults={"title": "Request Status", "description": "Purchase request status codes"}
    )
    
    codes = [
        "DRAFT",
        "PENDING_APPROVAL",
        "IN_REVIEW",
        "REJECTED",
        "RESUBMITTED",
        "FULLY_APPROVED",
        "FINANCE_REVIEW",
        "COMPLETED",
        "ARCHIVED",
    ]
    
    lookups = {}
    for code in codes:
        lookup, _ = Lookup.objects.get_or_create(
            type=type_obj,
            code=code,
            defaults={
                "title": code.replace("_", " ").title(),
                "is_active": True
            }
        )
        lookups[code] = lookup
    
    return lookups


@pytest.fixture
def purchase_type_lookups(db):
    """Create PURCHASE_TYPE lookup type and common purchase types"""
    type_obj, _ = LookupType.objects.get_or_create(
        code="PURCHASE_TYPE",
        defaults={"title": "Purchase Type", "description": "Types of purchases"}
    )
    
    types = {
        "SERVICE": "Service",
        "GOOD": "Good",
        "EQUIPMENT": "Equipment",
    }
    
    lookups = {}
    for code, name in types.items():
        lookup, _ = Lookup.objects.get_or_create(
            type=type_obj,
            code=code,
            defaults={
                "title": name,
                "is_active": True
            }
        )
        lookups[code] = lookup
    
    return lookups


@pytest.fixture
def team_with_workflow(db, user_manager, user_finance, request_status_lookups, purchase_type_lookups):
    """
    Create a complete team setup with:
    - Team
    - Active FormTemplate with fields
    - Workflow with steps
    - Approvers assigned
    - Required attachment category
    """
    # Create team
    team = Team.objects.create(name="Marketing", is_active=True)
    
    # Create active form template
    template = FormTemplate.objects.create(
        team=team,
        version_number=1,
        is_active=True,
        created_by=user_manager
    )
    
    # Create required TEXT field
    field_text = FormField.objects.create(
        template=template,
        field_id="REQ_DESC",
        name="description",
        label="Description",
        field_type=FormField.TEXT,
        required=True,
        order=1,
    )
    
    # Create optional NUMBER field
    field_number = FormField.objects.create(
        template=template,
        field_id="AMOUNT",
        name="amount",
        label="Amount",
        field_type=FormField.NUMBER,
        required=False,
        order=2,
    )
    
    # Create optional BOOLEAN field
    field_bool = FormField.objects.create(
        template=template,
        field_id="URGENT",
        name="urgent",
        label="Urgent",
        field_type=FormField.BOOLEAN,
        required=False,
        order=3,
    )
    
    # Create optional DATE field
    field_date = FormField.objects.create(
        template=template,
        field_id="NEED_BY",
        name="need_by",
        label="Need By Date",
        field_type=FormField.DATE,
        required=False,
        order=4,
    )
    
    # Create optional DROPDOWN field
    field_dropdown = FormField.objects.create(
        template=template,
        field_id="PRIORITY",
        name="priority",
        label="Priority",
        field_type=FormField.DROPDOWN,
        required=False,
        order=5,
        dropdown_options=["Low", "Medium", "High"]
    )
    
    # Create FILE_UPLOAD field
    field_file = FormField.objects.create(
        template=template,
        field_id="DOCUMENT",
        name="document",
        label="Document",
        field_type=FormField.FILE_UPLOAD,
        required=False,
        order=6,
    )
    
    # Create workflow
    workflow = Workflow.objects.create(team=team, name="Marketing PRS Workflow", is_active=True)
    
    # Create manager approval step
    step1 = WorkflowStep.objects.create(
        workflow=workflow,
        step_name="Manager Approval",
        step_order=1,
        is_finance_review=False,
        is_active=True
    )
    
    # Create finance review step
    finance_step = WorkflowStep.objects.create(
        workflow=workflow,
        step_name="Finance Review",
        step_order=2,
        is_finance_review=True,
        is_active=True
    )
    
    # Assign approvers
    WorkflowStepApprover.objects.create(step=step1, approver=user_manager, is_active=True)
    WorkflowStepApprover.objects.create(step=finance_step, approver=user_finance, is_active=True)
    
    # Create required attachment category
    invoice_cat = AttachmentCategory.objects.create(
        team=team,
        name="Invoice",
        required=True,
        is_active=True
    )
    
    # Create optional attachment category
    quote_cat = AttachmentCategory.objects.create(
        team=team,
        name="Quote",
        required=False,
        is_active=True
    )
    
    return {
        "team": team,
        "template": template,
        "field_text": field_text,
        "field_number": field_number,
        "field_bool": field_bool,
        "field_date": field_date,
        "field_dropdown": field_dropdown,
        "field_file": field_file,
        "workflow": workflow,
        "step1": step1,
        "finance_step": finance_step,
        "invoice_cat": invoice_cat,
        "quote_cat": quote_cat,
    }


@pytest.fixture
def sample_file():
    """Create a sample file for attachment testing"""
    file_content = b"%PDF-1.4\nfake pdf content"
    file_obj = io.BytesIO(file_content)
    file_obj.name = "test_invoice.pdf"
    return file_obj


@pytest.fixture
def sample_image_file():
    """Create a sample image file for attachment testing"""
    # Minimal PNG file
    file_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xdb\x00\x00\x00\x00IEND\xaeB`\x82'
    file_obj = io.BytesIO(file_content)
    file_obj.name = "test_image.png"
    return file_obj


def auth(client, user):
    """Helper function to authenticate a client with a user"""
    client.force_authenticate(user=user)



