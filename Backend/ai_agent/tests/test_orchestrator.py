"""
Tests for AI orchestrator following TDD approach.
"""
import pytest
from typing import Dict, Any, List
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from ai_agent.models import ChatThread, ChatMessage
from ai_agent.llm_client import LLMClient

User = get_user_model()


class FakeLLMClient:
    """Fake LLM client for testing that stores call arguments and returns configured responses."""
    
    def __init__(self, intent_response: Dict[str, Any]):
        """
        Initialize with a fixed intent response.
        
        Args:
            intent_response: Dict with "intent", "confidence", and "raw" keys
        """
        self.intent_response = intent_response
        self.last_prompt = None
        self.last_messages = None
        self.call_count = 0
    
    def detect_intent(self, *, prompt: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Store call arguments and return configured response."""
        self.last_prompt = prompt
        self.last_messages = messages
        self.call_count += 1
        return self.intent_response.copy()


@pytest.mark.django_db
class TestPipelineRunsNodesInCorrectOrderForKnownIntent:
    """TEST 1: Pipeline runs nodes in correct order for known intent"""
    
    def test_pipeline_runs_nodes_in_correct_order_for_known_intent(self, db, monkeypatch):
        """Test that orchestrator calls nodes in correct order and returns expected result"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Create minimal PRS data for handler to work
        from classifications.models import LookupType, Lookup
        from teams.models import Team
        from prs_forms.models import FormTemplate
        from purchase_requests.models import PurchaseRequest
        
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
            code="SERVICE",
            title="Service",
            is_active=True
        )
        team = Team.objects.create(name="Test Team", is_active=True)
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
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
        
        # Create ChatMessage
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="Please approve this step"
        )
        
        # Create FakeLLMClient
        fake_llm = FakeLLMClient({
            "intent": "approve_step",
            "confidence": 0.92,
            "raw": {"some": "payload"}
        })
        
        # Create config
        config = {
            "confidence_threshold": 0.7,
            "enabled_intents": ["approve_step", "reject_step", "fill_missing_data"]
        }
        
        # Mock PRS services to avoid needing full workflow setup for orchestrator test
        from unittest.mock import Mock
        mock_ensure_user = Mock()
        mock_get_current_step = Mock(return_value=None)
        mock_progress = Mock(return_value=request)
        
        monkeypatch.setattr('ai_agent.handlers.prs_services.ensure_user_is_step_approver', mock_ensure_user)
        monkeypatch.setattr('ai_agent.handlers.prs_services.get_current_step', mock_get_current_step)
        monkeypatch.setattr('ai_agent.handlers.prs_services.progress_workflow_after_approval', mock_progress)
        
        # Import orchestrator
        from ai_agent.orchestrator import run_orchestrator
        
        # Act: Call orchestrator
        result = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=latest_message,
            llm_client=fake_llm,
            config=config
        )
        
        # Assert: Verify result
        assert result.final_intent == "approve_step"
        assert result.confidence == 0.92
        assert result.handler_name == "approve_step_handler"
        # Handler now returns PRS-aware result (will have error for no current_step, but structure is correct)
        assert result.handler_result["action"] == "approve_step"
        assert "error" in result.handler_result  # Expected since we mocked no current_step
        
        # Assert: Verify call order
        assert "call_order" in result.debug
        call_order = result.debug["call_order"]
        assert call_order == [
            "load_config",
            "load_context",
            "detect_intent",
            "apply_threshold",
            "route_to_handler"
        ]
        
        # Assert: Verify LLM was called
        assert fake_llm.call_count == 1


@pytest.mark.django_db
class TestLowConfidenceIntentIsMappedToUnknownAndUsesFallbackHandler:
    """TEST 2: Low confidence intent is mapped to unknown and uses fallback handler"""
    
    def test_low_confidence_intent_is_mapped_to_unknown_and_uses_fallback_handler(self, db):
        """Test that low confidence intents are mapped to unknown"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Create ChatThread
        thread = ChatThread.objects.create(title="Test Thread")
        thread.participants.add(user)
        
        # Create ChatMessage
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="Maybe approve?"
        )
        
        # Create FakeLLMClient with low confidence
        fake_llm = FakeLLMClient({
            "intent": "approve_step",
            "confidence": 0.4,
            "raw": {}
        })
        
        # Create config with threshold 0.7
        config = {
            "confidence_threshold": 0.7,
            "enabled_intents": ["approve_step", "reject_step", "fill_missing_data"]
        }
        
        # Import orchestrator
        from ai_agent.orchestrator import run_orchestrator
        
        # Act: Call orchestrator
        result = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=latest_message,
            llm_client=fake_llm,
            config=config
        )
        
        # Assert: Should map to unknown
        assert result.final_intent == "unknown"
        assert result.handler_name == "unknown_intent_handler"
        assert result.handler_result == {"action": "unknown_intent"}
        
        # Assert: Debug info should contain original intent and confidence
        assert "original_intent" in result.debug
        assert result.debug["original_intent"] == "approve_step"
        assert "original_confidence" in result.debug
        assert result.debug["original_confidence"] == 0.4


@pytest.mark.django_db
class TestDisabledIntentFallsBackToUnknownHandlerEvenIfConfident:
    """TEST 3: Disabled intent falls back to unknown handler even if confident"""
    
    def test_disabled_intent_falls_back_to_unknown_handler_even_if_confident(self, db):
        """Test that disabled intents are mapped to unknown even with high confidence"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Create ChatThread
        thread = ChatThread.objects.create(title="Test Thread")
        thread.participants.add(user)
        
        # Create ChatMessage
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="Reject this"
        )
        
        # Create FakeLLMClient with high confidence but disabled intent
        fake_llm = FakeLLMClient({
            "intent": "reject_step",
            "confidence": 0.9,
            "raw": {}
        })
        
        # Create config with reject_step not in enabled_intents
        config = {
            "confidence_threshold": 0.7,
            "enabled_intents": ["approve_step"]  # reject_step not allowed
        }
        
        # Import orchestrator
        from ai_agent.orchestrator import run_orchestrator
        
        # Act: Call orchestrator
        result = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=latest_message,
            llm_client=fake_llm,
            config=config
        )
        
        # Assert: Should map to unknown
        assert result.final_intent == "unknown"
        assert result.handler_name == "unknown_intent_handler"
        assert result.handler_result == {"action": "unknown_intent"}
        
        # Assert: Debug info should contain original intent
        assert "original_intent" in result.debug
        assert result.debug["original_intent"] == "reject_step"


@pytest.mark.django_db
class TestHandlerReceivesResolvedContextAndReturnsStructuredResult:
    """TEST 4: Handler receives resolved context and returns structured result"""
    
    def test_handler_receives_resolved_context_and_returns_structured_result(self, db):
        """Test that handlers receive context and return structured results"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Create minimal PRS data for handler to work
        from classifications.models import LookupType, Lookup
        from teams.models import Team
        from prs_forms.models import FormTemplate, FormField
        from purchase_requests.models import PurchaseRequest
        
        status_type = LookupType.objects.create(code="REQUEST_STATUS", title="Request Status")
        status = Lookup.objects.create(
            type=status_type,
            code="DRAFT",
            title="Draft",
            is_active=True
        )
        purchase_type_type = LookupType.objects.create(code="PURCHASE_TYPE", title="Purchase Type")
        purchase_type = Lookup.objects.create(
            type=purchase_type_type,
            code="SERVICE",
            title="Service",
            is_active=True
        )
        team = Team.objects.create(name="Test Team", is_active=True)
        form_template = FormTemplate.objects.create(
            name="Test Form",
            version_number=1,
            is_active=True,
            created_by=user
        )
        # Create a required field that will be missing
        FormField.objects.create(
            template=form_template,
            name="vendor_name",
            label="Vendor Name",
            field_type=FormField.TEXT,
            required=True,
            is_active=True
        )
        request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            status=status,
            vendor_name="",  # Empty to trigger missing field
            vendor_account="IBAN123",
            subject="Test Subject",
            description="Test Description",
            purchase_type=purchase_type,
        )
        
        # Create ChatThread linked to request
        thread = ChatThread.objects.create(title="Test Thread", request=request)
        thread.participants.add(user)
        
        # Create ChatMessage
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="I need to fill missing data"
        )
        
        # Create FakeLLMClient
        fake_llm = FakeLLMClient({
            "intent": "fill_missing_data",
            "confidence": 0.88,
            "raw": {}
        })
        
        # Create config with fill_missing_data enabled
        config = {
            "confidence_threshold": 0.7,
            "enabled_intents": ["approve_step", "fill_missing_data"]
        }
        
        # Import orchestrator
        from ai_agent.orchestrator import run_orchestrator
        
        # Act: Call orchestrator
        result = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=latest_message,
            llm_client=fake_llm,
            config=config
        )
        
        # Assert: Verify intent and handler
        assert result.final_intent == "fill_missing_data"
        assert result.handler_name == "fill_missing_data_handler"
        
        # Assert: Verify handler result structure
        assert "action" in result.handler_result
        assert result.handler_result["action"] == "ask_user_for_more_info"
        assert "missing_fields" in result.handler_result
        assert isinstance(result.handler_result["missing_fields"], list)
        # The handler now uses real validation which checks FormField values
        # Since we created a required field "vendor_name" but no RequestFieldValue, it should be missing
        assert "vendor_name" in result.handler_result["missing_fields"]
        assert "missing_attachments" in result.handler_result
        assert isinstance(result.handler_result["missing_attachments"], list)


@pytest.mark.django_db
class TestDetectIntentReceivesSanitizedPromptAndContextMessages:
    """TEST 5: Detect intent receives sanitized prompt and context messages"""
    
    def test_detect_intent_receives_sanitized_prompt_and_context_messages(self, db):
        """Test that detect_intent receives proper prompt and context"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Create ChatThread
        thread = ChatThread.objects.create(title="Test Thread")
        thread.participants.add(user)
        
        # Create multiple ChatMessages
        message1 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="First message"
        )
        message1.created_at = timezone.now() - timedelta(minutes=2)
        message1.save()
        
        message2 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.AI,
            content="AI response"
        )
        message2.created_at = timezone.now() - timedelta(minutes=1)
        message2.save()
        
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="Latest user message"
        )
        
        # Create FakeLLMClient
        fake_llm = FakeLLMClient({
            "intent": "approve_step",
            "confidence": 0.85,
            "raw": {}
        })
        
        # Create config
        config = {
            "confidence_threshold": 0.7,
            "enabled_intents": ["approve_step", "reject_step", "fill_missing_data"]
        }
        
        # Import orchestrator
        from ai_agent.orchestrator import run_orchestrator
        
        # Act: Call orchestrator
        result = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=latest_message,
            llm_client=fake_llm,
            config=config
        )
        
        # Assert: LLM was called exactly once
        assert fake_llm.call_count == 1
        
        # Assert: Prompt was provided and includes intent instructions
        assert fake_llm.last_prompt is not None
        assert isinstance(fake_llm.last_prompt, str)
        assert len(fake_llm.last_prompt) > 0
        
        # Check that prompt mentions intents (we check for at least one intent name)
        from ai_agent.intent_types import ALL_INTENTS
        intent_mentioned = any(intent in fake_llm.last_prompt for intent in ALL_INTENTS)
        assert intent_mentioned, "Prompt should mention at least one intent"
        
        # Assert: Messages were provided
        assert fake_llm.last_messages is not None
        assert isinstance(fake_llm.last_messages, list)
        assert len(fake_llm.last_messages) > 0
        
        # Assert: Latest message is in the context
        latest_found = False
        for msg in fake_llm.last_messages:
            if "content" in msg and msg["content"] == latest_message.content:
                latest_found = True
                # Check sender_type is included
                assert "sender_type" in msg
                assert msg["sender_type"] == latest_message.sender_type
                break
        assert latest_found, "Latest message should be in the context"

