"""
Integration tests for AI handlers with PRS services (TDD approach).

Tests that handlers correctly call PRS services and return structured results.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from django.contrib.auth import get_user_model
from ai_agent.models import ChatThread, ChatMessage
from purchase_requests.models import PurchaseRequest
from approvals.models import ApprovalHistory
from classifications.models import Lookup, LookupType
from teams.models import Team
from prs_forms.models import FormTemplate
from workflows.models import WorkflowTemplate, WorkflowTemplateStep

User = get_user_model()


@pytest.mark.django_db
class TestApproveStepHandlerCallsPrsServicesAndReturnsResult:
    """TEST 1: Approve handler calls PRS services and returns structured result"""
    
    def test_approve_step_handler_calls_prs_services_and_returns_result(self, db, monkeypatch):
        """Test that approve_step_handler calls PRS services correctly"""
        # Arrange: Create test data
        user = User.objects.create_user(
            username="approver",
            password="testpass123",
            email="approver@example.com"
        )
        
        # Create LookupType and Lookup for status
        status_type = LookupType.objects.create(code="REQUEST_STATUS", title="Request Status")
        status = Lookup.objects.create(
            type=status_type,
            code="IN_REVIEW",
            title="In Review",
            is_active=True
        )
        
        # Create LookupType and Lookup for purchase_type
        purchase_type_type = LookupType.objects.create(code="PURCHASE_TYPE", title="Purchase Type")
        purchase_type = Lookup.objects.create(
            type=purchase_type_type,
            code="SERVICE",
            title="Service",
            is_active=True
        )
        
        # Create Team
        team = Team.objects.create(name="Test Team", is_active=True)
        
        # Create FormTemplate
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
        
        # Create WorkflowTemplate
        workflow_template = WorkflowTemplate.objects.create(
            name="Test Workflow",
            version_number=1,
            is_active=True
        )
        
        # Create a WorkflowTemplateStep for the request
        from workflows.models import WorkflowTemplateStep
        current_step = WorkflowTemplateStep.objects.create(
            workflow_template=workflow_template,
            step_name="Test Step",
            step_order=1,
            is_active=True
        )
        
        # Create PurchaseRequest with current step
        request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            workflow_template=workflow_template,
            status=status,
            vendor_name="Test Vendor",
            vendor_account="IBAN123",
            subject="Test Subject",
            description="Test Description",
            purchase_type=purchase_type,
            current_template_step=current_step,
        )
        
        # Create ChatThread linked to request
        thread = ChatThread.objects.create(title="Test Thread", request=request)
        thread.participants.add(user)
        
        # Create ChatMessage
        message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="ok"
        )
        
        # Build context
        context = {
            "user": user,
            "thread": thread,
            "request": request,
            "latest_message": {
                "content": message.content,
                "sender_type": message.sender_type
            },
            "messages": [],
        }
        
        # Mock PRS services
        ensure_user_called = Mock()
        progress_workflow_called = Mock(return_value=request)
        approval_history_create = Mock()
        
        monkeypatch.setattr(
            "purchase_requests.services.ensure_user_is_step_approver",
            ensure_user_called
        )
        monkeypatch.setattr(
            "purchase_requests.services.progress_workflow_after_approval",
            progress_workflow_called
        )
        monkeypatch.setattr(
            "approvals.models.ApprovalHistory.objects.create",
            approval_history_create
        )
        
        # Act: Call handler
        from ai_agent.handlers import approve_step_handler
        result = approve_step_handler(context)
        
        # Assert: Services were called correctly
        ensure_user_called.assert_called_once_with(user, request)
        approval_history_create.assert_called_once()
        # Check ApprovalHistory create call args
        call_kwargs = approval_history_create.call_args[1]
        assert call_kwargs["request"] == request
        assert call_kwargs["approver"] == user
        assert call_kwargs["action"] == ApprovalHistory.APPROVE
        
        progress_workflow_called.assert_called_once_with(request)
        
        # Assert: Handler returns structured result
        assert result["action"] == "approve_step"
        assert "new_status" in result
        assert "moved_to_next_step" in result
        assert isinstance(result["moved_to_next_step"], bool)


@pytest.mark.django_db
class TestRejectStepHandlerCallsPrsServicesWithComment:
    """TEST 2: Reject handler calls PRS services with comment and returns structured result"""
    
    def test_reject_step_handler_calls_prs_services_with_comment(self, db, monkeypatch):
        """Test that reject_step_handler calls PRS services with comment"""
        # Arrange: Create test data
        user = User.objects.create_user(
            username="approver",
            password="testpass123",
            email="approver@example.com"
        )
        
        # Create LookupType and Lookup for status
        status_type = LookupType.objects.create(code="REQUEST_STATUS", title="Request Status")
        status = Lookup.objects.create(
            type=status_type,
            code="IN_REVIEW",
            title="In Review",
            is_active=True
        )
        rejected_status = Lookup.objects.create(
            type=status_type,
            code="REJECTED",
            title="Rejected",
            is_active=True
        )
        
        # Create LookupType and Lookup for purchase_type
        purchase_type_type = LookupType.objects.create(code="PURCHASE_TYPE", title="Purchase Type")
        purchase_type = Lookup.objects.create(
            type=purchase_type_type,
            code="SERVICE",
            title="Service",
            is_active=True
        )
        
        # Create Team
        team = Team.objects.create(name="Test Team", is_active=True)
        
        # Create FormTemplate
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
        
        # Create WorkflowTemplate
        workflow_template = WorkflowTemplate.objects.create(
            name="Test Workflow",
            version_number=1,
            is_active=True
        )
        
        # Create PurchaseRequest
        request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            workflow_template=workflow_template,
            status=status,
            vendor_name="Test Vendor",
            vendor_account="IBAN123",
            subject="Test Subject",
            description="Test Description",
            purchase_type=purchase_type,
        )
        
        # Create ChatThread linked to request
        thread = ChatThread.objects.create(title="Test Thread", request=request)
        thread.participants.add(user)
        
        # Create rejection message (length > 10)
        rejection_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="Rejected - budget too high for this quarter"
        )
        
        # Build context
        context = {
            "user": user,
            "thread": thread,
            "request": request,
            "latest_message": {
                "content": rejection_message.content,
                "sender_type": rejection_message.sender_type
            },
            "messages": [],
        }
        
        # Mock PRS services
        ensure_user_called = Mock()
        handle_rejection_called = Mock(return_value=request)
        
        # Mock to set status to REJECTED
        def mock_handle_rejection(req, comment, approver):
            req.status = rejected_status
            return req
        
        handle_rejection_called.side_effect = mock_handle_rejection
        
        monkeypatch.setattr(
            "purchase_requests.services.ensure_user_is_step_approver",
            ensure_user_called
        )
        monkeypatch.setattr(
            "purchase_requests.services.handle_request_rejection",
            handle_rejection_called
        )
        
        # Act: Call handler
        from ai_agent.handlers import reject_step_handler
        result = reject_step_handler(context)
        
        # Assert: Services were called correctly
        ensure_user_called.assert_called_once_with(user, request)
        handle_rejection_called.assert_called_once_with(
            request,
            rejection_message.content,
            user
        )
        
        # Assert: Handler returns structured result
        assert result["action"] == "reject_step"
        assert result["new_status"] == "REJECTED"
        assert "comment" in result
        assert rejection_message.content in result["comment"]


@pytest.mark.django_db
class TestFillMissingDataHandlerUsesPrsValidationServices:
    """TEST 3: Fill-missing-data handler uses PRS validation services"""
    
    def test_fill_missing_data_handler_uses_prs_validation_services(self, db, monkeypatch):
        """Test that fill_missing_data_handler uses PRS validation services"""
        # Arrange: Create test data
        user = User.objects.create_user(
            username="user",
            password="testpass123",
            email="user@example.com"
        )
        
        # Create LookupType and Lookup for status
        status_type = LookupType.objects.create(code="REQUEST_STATUS", title="Request Status")
        status = Lookup.objects.create(
            type=status_type,
            code="DRAFT",
            title="Draft",
            is_active=True
        )
        
        # Create LookupType and Lookup for purchase_type
        purchase_type_type = LookupType.objects.create(code="PURCHASE_TYPE", title="Purchase Type")
        purchase_type = Lookup.objects.create(
            type=purchase_type_type,
            code="SERVICE",
            title="Service",
            is_active=True
        )
        
        # Create Team
        team = Team.objects.create(name="Test Team", is_active=True)
        
        # Create FormTemplate
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
        
        # Create PurchaseRequest
        request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            status=status,
            vendor_name="Test Vendor",
            vendor_account="IBAN123",
            subject="Test Subject",
            description="Test Description",
            purchase_type=purchase_type,
        )
        
        # Create ChatThread linked to request
        thread = ChatThread.objects.create(title="Test Thread", request=request)
        thread.participants.add(user)
        
        # Build context
        context = {
            "user": user,
            "thread": thread,
            "request": request,
            "team": team,
            "form_template": form_template,
            "latest_message": {
                "content": "What's missing?",
                "sender_type": "USER"
            },
            "messages": [],
        }
        
        # Mock PRS validation services
        validate_fields_called = Mock(return_value=[
            {"field_name": "vendor_name", "error": "Required field is missing."},
            {"field_name": "budget_amount", "error": "Required field is missing."}
        ])
        validate_attachments_called = Mock(return_value=[
            {"category_name": "Invoice", "error": "Required attachment is missing."}
        ])
        
        monkeypatch.setattr(
            "purchase_requests.services.validate_required_fields",
            validate_fields_called
        )
        monkeypatch.setattr(
            "purchase_requests.services.validate_required_attachments",
            validate_attachments_called
        )
        
        # Act: Call handler
        from ai_agent.handlers import fill_missing_data_handler
        result = fill_missing_data_handler(context)
        
        # Assert: Validation services were called
        validate_fields_called.assert_called_once_with(request)
        validate_attachments_called.assert_called_once_with(request)
        
        # Assert: Handler returns structured result
        assert result["action"] == "ask_user_for_more_info"
        assert "missing_fields" in result
        assert "missing_attachments" in result
        assert "vendor_name" in result["missing_fields"]
        assert "budget_amount" in result["missing_fields"]
        assert "Invoice" in result["missing_attachments"]


@pytest.mark.django_db
class TestSummarizeRequestHandlerBuildsSummaryFromRequest:
    """TEST 4: Summarize handler builds a simple structured summary"""
    
    def test_summarize_request_handler_builds_summary_from_request(self, db):
        """Test that summarize_request_handler builds summary from request"""
        # Arrange: Create test data
        user = User.objects.create_user(
            username="user",
            password="testpass123",
            email="user@example.com"
        )
        
        # Create LookupType and Lookup for status and purchase_type
        status_type = LookupType.objects.create(code="REQUEST_STATUS", title="Request Status")
        status = Lookup.objects.create(
            type=status_type,
            code="IN_REVIEW",
            title="In Review",
            is_active=True
        )
        
        purchase_type_type = LookupType.objects.create(code="PURCHASE_TYPE", title="Purchase Type")
        purchase_type = Lookup.objects.create(
            type=purchase_type_type,
            code="GOOD",
            title="Good",
            is_active=True
        )
        
        # Create Team
        team = Team.objects.create(name="Test Team", is_active=True)
        
        # Create FormTemplate
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
        
        # Create PurchaseRequest with all fields
        request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            status=status,
            vendor_name="Acme Corp",
            vendor_account="IBAN123456",
            subject="Office Supplies Purchase",
            description="Need to purchase office supplies for Q1",
            purchase_type=purchase_type,
        )
        
        # Create ChatThread linked to request
        thread = ChatThread.objects.create(title="Test Thread", request=request)
        
        # Build context
        context = {
            "user": user,
            "thread": thread,
            "request": request,
            "latest_message": {
                "content": "Summarize this request",
                "sender_type": "USER"
            },
            "messages": [],
        }
        
        # Act: Call handler
        from ai_agent.handlers import summarize_request_handler
        result = summarize_request_handler(context)
        
        # Assert: Handler returns structured result
        assert result["action"] == "summary"
        assert "summary_text" in result
        assert isinstance(result["summary_text"], str)
        assert len(result["summary_text"]) > 0
        # Check that summary includes key fields
        assert "Acme Corp" in result["summary_text"]
        assert "Office Supplies Purchase" in result["summary_text"]


@pytest.mark.django_db
class TestRunOrchestratorWithApproveIntentCallsPrsAwareHandler:
    """TEST 5: Orchestrator end-to-end calls approve handler with PRS context"""
    
    def test_run_orchestrator_with_approve_intent_calls_prs_aware_handler(self, db, monkeypatch):
        """Test that orchestrator calls approve handler with PRS context"""
        # Arrange: Create test data
        user = User.objects.create_user(
            username="approver",
            password="testpass123",
            email="approver@example.com"
        )
        
        # Create LookupType and Lookup for status
        status_type = LookupType.objects.create(code="REQUEST_STATUS", title="Request Status")
        status = Lookup.objects.create(
            type=status_type,
            code="IN_REVIEW",
            title="In Review",
            is_active=True
        )
        
        # Create LookupType and Lookup for purchase_type
        purchase_type_type = LookupType.objects.create(code="PURCHASE_TYPE", title="Purchase Type")
        purchase_type = Lookup.objects.create(
            type=purchase_type_type,
            code="SERVICE",
            title="Service",
            is_active=True
        )
        
        # Create Team
        team = Team.objects.create(name="Test Team", is_active=True)
        
        # Create FormTemplate
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
        
        # Create WorkflowTemplate
        workflow_template = WorkflowTemplate.objects.create(
            name="Test Workflow",
            version_number=1,
            is_active=True
        )
        
        # Create PurchaseRequest
        request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            workflow_template=workflow_template,
            status=status,
            vendor_name="Test Vendor",
            vendor_account="IBAN123",
            subject="Test Subject",
            description="Test Description",
            purchase_type=purchase_type,
        )
        
        # Create ChatThread linked to request
        thread = ChatThread.objects.create(title="Test Thread", request=request)
        thread.participants.add(user)
        
        # Create ChatMessage
        message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="ok"
        )
        
        # Create FakeLLMClient
        from ai_agent.tests.test_orchestrator import FakeLLMClient
        fake_llm = FakeLLMClient({
            "intent": "approve_step",
            "confidence": 0.9,
            "raw": {}
        })
        
        # Config
        config = {
            "confidence_threshold": 0.5,
            "enabled_intents": ["approve_step"]
        }
        
        # Mock PRS services
        ensure_user_called = Mock()
        progress_workflow_called = Mock(return_value=request)
        approval_history_create = Mock()
        # Create a real WorkflowTemplateStep for get_current_step
        from workflows.models import WorkflowTemplateStep
        current_step = WorkflowTemplateStep.objects.create(
            workflow_template=workflow_template,
            step_name="Test Step",
            step_order=1,
            is_active=True
        )
        # Set it on the request
        request.current_template_step = current_step
        request.save()
        get_current_step_mock = Mock(return_value=current_step)
        
        monkeypatch.setattr(
            "purchase_requests.services.ensure_user_is_step_approver",
            ensure_user_called
        )
        monkeypatch.setattr(
            "purchase_requests.services.get_current_step",
            get_current_step_mock
        )
        monkeypatch.setattr(
            "purchase_requests.services.progress_workflow_after_approval",
            progress_workflow_called
        )
        monkeypatch.setattr(
            "approvals.models.ApprovalHistory.objects.create",
            approval_history_create
        )
        # Also need to mock in handlers module
        monkeypatch.setattr(
            "ai_agent.handlers.prs_services.get_current_step",
            get_current_step_mock
        )
        
        # Act: Call orchestrator
        from ai_agent.orchestrator import run_orchestrator
        result = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=message,
            llm_client=fake_llm,
            config=config
        )
        
        # Assert: Orchestrator result
        assert result.final_intent == "approve_step"
        assert result.handler_name == "approve_step_handler"
        assert result.handler_result["action"] == "approve_step"
        
        # Assert: PRS services were called
        ensure_user_called.assert_called_once_with(user, request)
        approval_history_create.assert_called_once()
        progress_workflow_called.assert_called_once_with(request)

