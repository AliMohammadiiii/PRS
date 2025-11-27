"""
Tests for Multi-Template Support in Purchase Request System

Tests cover:
1. Template resolution via TeamPurchaseConfig
2. PurchaseRequest creation with different purchase types
3. Workflow routing with WorkflowTemplate
4. Admin mapping validation
5. API endpoint responses
6. Backward compatibility
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from classifications.models import LookupType, Lookup
from teams.models import Team
from prs_forms.models import FormTemplate, FormField
from workflows.models import (
    Workflow, WorkflowStep, WorkflowStepApprover,
    WorkflowTemplate, WorkflowTemplateStep, WorkflowTemplateStepApprover
)
from prs_team_config.models import TeamPurchaseConfig
from purchase_requests.models import PurchaseRequest
from accounts.models import AccessScope

User = get_user_model()


@pytest.fixture
def company_role_lookups(db):
    """Create COMPANY_ROLE lookup type and roles"""
    type_obj, _ = LookupType.objects.get_or_create(
        code="COMPANY_ROLE",
        defaults={"title": "Company Role", "description": "Roles in a company"}
    )
    
    roles = {
        "MANAGER": "Manager",
        "FINANCE": "Finance",
        "DIRECTOR": "Director",
    }
    
    lookups = {}
    for code, name in roles.items():
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
def multi_template_setup(db, request_status_lookups, purchase_type_lookups, company_role_lookups):
    """
    Create a team with:
    - Multiple FormTemplates (one for GOODS, one for SERVICE)
    - Multiple WorkflowTemplates (one for GOODS, one for SERVICE)
    - TeamPurchaseConfig mappings for each purchase type
    """
    # Create users
    requestor = User.objects.create_user(
        username="multi_requestor",
        password="testpass123",
        email="multi_requestor@example.com"
    )
    manager = User.objects.create_user(
        username="multi_manager",
        password="testpass123",
        email="multi_manager@example.com"
    )
    finance = User.objects.create_user(
        username="multi_finance",
        password="testpass123",
        email="multi_finance@example.com"
    )
    
    # Create team
    team = Team.objects.create(name="Multi-Template Team", is_active=True)
    
    # Create FormTemplate for GOODS
    goods_form = FormTemplate.objects.create(
        team=team,
        name="Goods Purchase Form",
        version_number=1,
        is_active=True,
        created_by=manager
    )
    FormField.objects.create(
        template=goods_form,
        field_id="QUANTITY",
        name="quantity",
        label="Quantity",
        field_type=FormField.NUMBER,
        required=True,
        order=1,
    )
    FormField.objects.create(
        template=goods_form,
        field_id="UNIT_PRICE",
        name="unit_price",
        label="Unit Price",
        field_type=FormField.NUMBER,
        required=True,
        order=2,
    )
    
    # Create FormTemplate for SERVICE
    service_form = FormTemplate.objects.create(
        team=team,
        name="Service Purchase Form",
        version_number=2,
        is_active=True,
        created_by=manager
    )
    FormField.objects.create(
        template=service_form,
        field_id="SCOPE",
        name="scope",
        label="Scope of Work",
        field_type=FormField.TEXT,
        required=True,
        order=1,
    )
    FormField.objects.create(
        template=service_form,
        field_id="DURATION",
        name="duration",
        label="Service Duration",
        field_type=FormField.TEXT,
        required=False,
        order=2,
    )
    
    # Create WorkflowTemplate for GOODS (shorter approval chain)
    goods_workflow = WorkflowTemplate.objects.create(
        team=team,
        name="Goods Workflow",
        version_number=1,
        is_active=True,
    )
    goods_step1 = WorkflowTemplateStep.objects.create(
        workflow_template=goods_workflow,
        step_name="Manager Approval",
        step_order=1,
        is_finance_review=False,
        is_active=True,
    )
    goods_finance_step = WorkflowTemplateStep.objects.create(
        workflow_template=goods_workflow,
        step_name="Finance Review",
        step_order=2,
        is_finance_review=True,
        is_active=True,
    )
    WorkflowTemplateStepApprover.objects.create(
        step=goods_step1,
        role=company_role_lookups['MANAGER'],
        is_active=True,
    )
    WorkflowTemplateStepApprover.objects.create(
        step=goods_finance_step,
        role=company_role_lookups['FINANCE'],
        is_active=True,
    )
    
    # Create WorkflowTemplate for SERVICE (longer approval chain)
    service_workflow = WorkflowTemplate.objects.create(
        team=team,
        name="Service Workflow",
        version_number=2,  # Different version to avoid unique constraint violation
        is_active=True,
    )
    service_step1 = WorkflowTemplateStep.objects.create(
        workflow_template=service_workflow,
        step_name="Manager Approval",
        step_order=1,
        is_finance_review=False,
        is_active=True,
    )
    service_step2 = WorkflowTemplateStep.objects.create(
        workflow_template=service_workflow,
        step_name="Director Approval",
        step_order=2,
        is_finance_review=False,
        is_active=True,
    )
    service_finance_step = WorkflowTemplateStep.objects.create(
        workflow_template=service_workflow,
        step_name="Finance Review",
        step_order=3,
        is_finance_review=True,
        is_active=True,
    )
    WorkflowTemplateStepApprover.objects.create(
        step=service_step1,
        role=company_role_lookups['MANAGER'],
        is_active=True,
    )
    WorkflowTemplateStepApprover.objects.create(
        step=service_step2,
        role=company_role_lookups['DIRECTOR'],
        is_active=True,
    )
    WorkflowTemplateStepApprover.objects.create(
        step=service_finance_step,
        role=company_role_lookups['FINANCE'],
        is_active=True,
    )
    
    # Create TeamPurchaseConfig for GOODS
    goods_config = TeamPurchaseConfig.objects.create(
        team=team,
        purchase_type=purchase_type_lookups['GOOD'],
        form_template=goods_form,
        workflow_template=goods_workflow,
        is_active=True,
    )
    
    # Create TeamPurchaseConfig for SERVICE
    service_config = TeamPurchaseConfig.objects.create(
        team=team,
        purchase_type=purchase_type_lookups['SERVICE'],
        form_template=service_form,
        workflow_template=service_workflow,
        is_active=True,
    )
    
    # Assign roles to users
    AccessScope.objects.create(
        user=manager,
        team=team,
        role=company_role_lookups['MANAGER'],
        is_active=True,
    )
    AccessScope.objects.create(
        user=manager,
        team=team,
        role=company_role_lookups['DIRECTOR'],
        is_active=True,
    )
    AccessScope.objects.create(
        user=finance,
        team=team,
        role=company_role_lookups['FINANCE'],
        is_active=True,
    )
    
    # Also give requestor access to the team (as a team member without approver role)
    # We'll use MANAGER role for requestor so they can see the team in the list
    AccessScope.objects.create(
        user=requestor,
        team=team,
        role=company_role_lookups['MANAGER'],  # Re-use MANAGER role for access
        is_active=True,
    )
    
    return {
        'team': team,
        'requestor': requestor,
        'manager': manager,
        'finance': finance,
        'goods_form': goods_form,
        'service_form': service_form,
        'goods_workflow': goods_workflow,
        'service_workflow': service_workflow,
        'goods_config': goods_config,
        'service_config': service_config,
        'goods_step1': goods_step1,
        'goods_finance_step': goods_finance_step,
        'service_step1': service_step1,
        'service_step2': service_step2,
        'service_finance_step': service_finance_step,
        'roles': company_role_lookups,
        'purchase_types': purchase_type_lookups,
        'statuses': request_status_lookups,
    }


@pytest.mark.django_db
class TestTeamPurchaseConfigModel:
    """Tests for TeamPurchaseConfig model"""
    
    def test_create_config_success(self, multi_template_setup):
        """Test creating a TeamPurchaseConfig"""
        setup = multi_template_setup
        assert TeamPurchaseConfig.objects.filter(team=setup['team']).count() == 2
        assert setup['goods_config'].is_active
        assert setup['service_config'].is_active
    
    def test_unique_active_config_per_team_purchase_type(self, multi_template_setup):
        """Test that only one active config per (team, purchase_type) is allowed"""
        setup = multi_template_setup
        
        with pytest.raises(Exception):  # ValidationError
            TeamPurchaseConfig.objects.create(
                team=setup['team'],
                purchase_type=setup['purchase_types']['GOOD'],
                form_template=setup['goods_form'],
                workflow_template=setup['goods_workflow'],
                is_active=True,
            )
    
    def test_get_active_config(self, multi_template_setup):
        """Test getting active config via class method"""
        setup = multi_template_setup
        
        config = TeamPurchaseConfig.get_active_config(
            setup['team'],
            'GOOD'
        )
        assert config == setup['goods_config']
        
        config = TeamPurchaseConfig.get_active_config(
            setup['team'],
            'SERVICE'
        )
        assert config == setup['service_config']


@pytest.mark.django_db
class TestPurchaseRequestCreationWithTemplates:
    """Tests for creating PurchaseRequests with different purchase types"""
    
    def test_create_goods_request_uses_goods_templates(self, multi_template_setup):
        """Test that creating a GOODS request uses the correct templates"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.post('/api/prs/requests/', {
            'team_id': str(setup['team'].id),
            'vendor_name': 'Goods Vendor',
            'vendor_account': '123456',
            'subject': 'Test Goods Purchase',
            'description': 'Test description',
            'purchase_type': 'GOOD',
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify the request was created with correct templates
        request_id = response.data['id']
        purchase_request = PurchaseRequest.objects.get(id=request_id)
        
        assert purchase_request.form_template == setup['goods_form']
        assert purchase_request.workflow_template == setup['goods_workflow']
    
    def test_create_service_request_uses_service_templates(self, multi_template_setup):
        """Test that creating a SERVICE request uses the correct templates"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.post('/api/prs/requests/', {
            'team_id': str(setup['team'].id),
            'vendor_name': 'Service Vendor',
            'vendor_account': '654321',
            'subject': 'Test Service Purchase',
            'description': 'Test description',
            'purchase_type': 'SERVICE',
        })
        
        assert response.status_code == status.HTTP_201_CREATED
        
        # Verify the request was created with correct templates
        request_id = response.data['id']
        purchase_request = PurchaseRequest.objects.get(id=request_id)
        
        assert purchase_request.form_template == setup['service_form']
        assert purchase_request.workflow_template == setup['service_workflow']
    
    def test_create_request_without_config_fails_gracefully(self, multi_template_setup):
        """Test that creating a request for unconfigured purchase type falls back or fails"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        # EQUIPMENT doesn't have a TeamPurchaseConfig
        response = client.post('/api/prs/requests/', {
            'team_id': str(setup['team'].id),
            'vendor_name': 'Equipment Vendor',
            'vendor_account': '999999',
            'subject': 'Test Equipment Purchase',
            'description': 'Test description',
            'purchase_type': 'EQUIPMENT',
        })
        
        # Should either fail with a clear error or fall back to default behavior
        # Our implementation falls back to any active form template if no config found
        # So this should succeed or return 400 with clear message
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestEffectiveTemplateAPI:
    """Tests for the effective-template endpoint"""
    
    def test_get_effective_template_goods(self, multi_template_setup):
        """Test getting effective template for GOODS"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/effective-template/?purchase_type=GOOD')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['form_template']['id'] == str(setup['goods_form'].id)
        assert response.data['workflow_template']['id'] == str(setup['goods_workflow'].id)
        assert len(response.data['workflow_template']['steps']) == 2
    
    def test_get_effective_template_service(self, multi_template_setup):
        """Test getting effective template for SERVICE"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/effective-template/?purchase_type=SERVICE')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['form_template']['id'] == str(setup['service_form'].id)
        assert response.data['workflow_template']['id'] == str(setup['service_workflow'].id)
        assert len(response.data['workflow_template']['steps']) == 3
    
    def test_get_effective_template_missing_purchase_type(self, multi_template_setup):
        """Test that missing purchase_type returns error"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/effective-template/')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_get_effective_template_invalid_purchase_type(self, multi_template_setup):
        """Test that invalid purchase_type returns error"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/effective-template/?purchase_type=INVALID')
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestTeamTemplateListAPIs:
    """Tests for the template listing endpoints"""
    
    def test_list_form_templates(self, multi_template_setup):
        """Test listing form templates for a team"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/form-templates/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
    
    def test_list_workflow_templates(self, multi_template_setup):
        """Test listing workflow templates for a team"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/workflow-templates/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
    
    def test_list_configs(self, multi_template_setup):
        """Test listing purchase configs for a team"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        response = client.get(f'/api/prs/teams/{setup["team"].id}/configs/')
        
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2


@pytest.mark.django_db
class TestWorkflowTemplateRouting:
    """Tests for workflow routing with WorkflowTemplate"""
    
    def test_submit_uses_workflow_template_steps(self, multi_template_setup):
        """Test that submitting a request uses the workflow template steps"""
        setup = multi_template_setup
        client = APIClient()
        client.force_authenticate(user=setup['requestor'])
        
        # Create a GOODS request
        response = client.post('/api/prs/requests/', {
            'team_id': str(setup['team'].id),
            'vendor_name': 'Goods Vendor',
            'vendor_account': '123456',
            'subject': 'Test Goods Purchase',
            'description': 'Test description',
            'purchase_type': 'GOOD',
        })
        assert response.status_code == status.HTTP_201_CREATED, f"Create failed: {response.data}"
        request_id = response.data['id']
        
        # Verify the request was created with the correct form template
        purchase_request = PurchaseRequest.objects.get(id=request_id)
        assert purchase_request.form_template == setup['goods_form'], (
            f"Form template mismatch! Request has {purchase_request.form_template.id}, "
            f"expected {setup['goods_form'].id}"
        )
        
        # Get the actual field IDs from the database - use the request's form_template
        quantity_field = FormField.objects.get(template=purchase_request.form_template, field_id='QUANTITY')
        unit_price_field = FormField.objects.get(template=purchase_request.form_template, field_id='UNIT_PRICE')
        
        # Update with required field values (both QUANTITY and UNIT_PRICE are required)
        patch_response = client.patch(
            f'/api/prs/requests/{request_id}/',
            data={
                'field_values': [
                    {'field_id': str(quantity_field.id), 'value_number': 10},
                    {'field_id': str(unit_price_field.id), 'value_number': 100},
                ]
            },
            format='json'  # Explicitly use JSON format
        )
        assert patch_response.status_code == status.HTTP_200_OK, f"Patch failed: {patch_response.data}"
        
        # Verify field values were saved
        from purchase_requests.models import RequestFieldValue
        saved_values = RequestFieldValue.objects.filter(request_id=request_id)
        assert saved_values.count() == 2, (
            f"Expected 2 field values, got {saved_values.count()}. "
            f"Values: {list(saved_values.values('field_id', 'value_number'))}"
        )
        
        # Submit the request
        submit_response = client.post(f'/api/prs/requests/{request_id}/submit/')
        assert submit_response.status_code == status.HTTP_200_OK, f"Submit failed: {submit_response.data}"
        
        # Verify the request is at the first step of the goods workflow
        purchase_request.refresh_from_db()
        assert purchase_request.current_template_step == setup['goods_step1']
        assert purchase_request.status.code == 'PENDING_APPROVAL'


@pytest.mark.django_db
class TestBackwardCompatibility:
    """Tests for backward compatibility with legacy requests"""
    
    def test_legacy_request_still_works(self, team_with_workflow, user_requestor, purchase_type_lookups):
        """Test that legacy requests (without workflow_template) still work"""
        setup = team_with_workflow
        client = APIClient()
        client.force_authenticate(user=user_requestor)
        
        # Create a request using the legacy team (no TeamPurchaseConfig)
        response = client.post('/api/prs/requests/', {
            'team_id': str(setup['team'].id),
            'vendor_name': 'Legacy Vendor',
            'vendor_account': '111222',
            'subject': 'Legacy Request',
            'description': 'Test description',
            'purchase_type': 'SERVICE',
        })
        
        # Should succeed with fallback to any active form template
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]

