"""
Tests for AI run endpoint following TDD approach.
"""
import pytest
from datetime import timedelta
from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from ai_agent.models import ChatThread, ChatMessage
from ai_agent.orchestrator import OrchestratorResult

User = get_user_model()


@pytest.mark.django_db
class TestRunEndpointRequiresParticipantMembership:
    """TEST 1: Non-participant cannot trigger AI on a thread"""
    
    def test_run_endpoint_requires_participant_membership(self, db):
        """Test that non-participants cannot trigger AI on a thread"""
        # Arrange: Create 2 users
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        u2 = User.objects.create_user(
            username="user2",
            password="testpass123",
            email="user2@example.com"
        )
        
        # Create thread with only u1 as participant
        thread = ChatThread.objects.create(title="Thread 1")
        thread.participants.add(u1)
        
        # Create at least one user message from u1
        ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="Hello"
        )
        
        # Login as u2
        client = APIClient()
        client.force_authenticate(user=u2)
        
        # Act: POST /api/ai/threads/{thread_id}/run/
        response = client.post(f"/api/ai/threads/{thread.id}/run/")
        
        # Assert: Expect 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestRunEndpointUsesLatestUserMessageAsOrchestratorInput:
    """TEST 2: Ensure it picks the last USER message as latest_message"""
    
    def test_run_endpoint_uses_latest_user_message_as_orchestrator_input(self, db, monkeypatch):
        """Test that the endpoint uses the latest USER message as input to orchestrator"""
        # Arrange: Create user
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        
        # Create thread with u1 as participant
        thread = ChatThread.objects.create(title="Thread 1")
        thread.participants.add(u1)
        
        # Create 2 user messages with different created_at
        now = timezone.now()
        msg1 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="first message"
        )
        msg1.created_at = now - timedelta(minutes=2)
        msg1.save()
        
        msg2 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="second / latest message"
        )
        msg2.created_at = now - timedelta(minutes=1)
        msg2.save()
        
        # Create spy for run_orchestrator
        orchestrator_spy = MagicMock()
        orchestrator_spy.return_value = OrchestratorResult(
            final_intent="unknown",
            confidence=0.5,
            handler_name="unknown_intent_handler",
            handler_result={"action": "unknown_intent"},
            debug={}
        )
        
        monkeypatch.setattr('ai_agent.views.run_orchestrator', orchestrator_spy)
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: POST /api/ai/threads/{thread_id}/run/
        response = client.post(f"/api/ai/threads/{thread.id}/run/")
        
        # Assert: run_orchestrator called exactly once
        assert orchestrator_spy.call_count == 1
        
        # Assert: The latest_message passed has content == "second / latest message"
        call_args = orchestrator_spy.call_args
        latest_message_arg = call_args.kwargs.get('latest_message')
        assert latest_message_arg is not None
        assert latest_message_arg.content == "second / latest message"


@pytest.mark.django_db
class TestRunEndpointCallsOrchestratorAndReturnsResultPayload:
    """TEST 3: Verify response JSON includes orchestrator result fields"""
    
    def test_run_endpoint_calls_orchestrator_and_returns_result_payload(self, db, monkeypatch):
        """Test that the endpoint returns orchestrator result in response"""
        # Arrange: Create user
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        
        # Create thread with u1 as participant
        thread = ChatThread.objects.create(title="Thread 1")
        thread.participants.add(u1)
        
        # Create one latest user message
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="Please approve"
        )
        
        # Patch run_orchestrator to return fixed result
        fixed_result = OrchestratorResult(
            final_intent="approve_step",
            confidence=0.91,
            handler_name="approve_step_handler",
            handler_result={"action": "approve_step", "new_status": "IN_REVIEW"},
            debug={"foo": "bar"}
        )
        
        monkeypatch.setattr('ai_agent.views.run_orchestrator', lambda **kwargs: fixed_result)
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: POST /api/ai/threads/{thread_id}/run/
        response = client.post(f"/api/ai/threads/{thread.id}/run/")
        
        # Assert: Status == 200
        assert response.status_code == status.HTTP_200_OK
        
        # Assert: Response JSON contains orchestrator result
        assert "orchestrator" in response.data
        orchestrator_data = response.data["orchestrator"]
        assert orchestrator_data["final_intent"] == "approve_step"
        assert orchestrator_data["confidence"] == 0.91
        assert orchestrator_data["handler_name"] == "approve_step_handler"
        assert orchestrator_data["handler_result"]["action"] == "approve_step"
        assert orchestrator_data["handler_result"]["new_status"] == "IN_REVIEW"
        assert orchestrator_data["debug"]["foo"] == "bar"


@pytest.mark.django_db
class TestRunEndpointCreatesAiMessageBasedOnHandlerResult:
    """TEST 4: Endpoint should persist an AI ChatMessage summarizing the result"""
    
    def test_run_endpoint_creates_ai_message_based_on_handler_result(self, db, monkeypatch):
        """Test that endpoint creates AI message based on handler result"""
        # Arrange: Create user
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        
        # Create thread with u1 as participant
        thread = ChatThread.objects.create(title="Thread 1")
        thread.participants.add(u1)
        
        # Create latest user message
        latest_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="I need help"
        )
        
        # Count AI messages before
        ai_message_count_before = ChatMessage.objects.filter(
            thread=thread,
            sender_type=ChatMessage.SenderType.AI
        ).count()
        
        # Patch run_orchestrator to return fill_missing_data result
        fixed_result = OrchestratorResult(
            final_intent="fill_missing_data",
            confidence=0.88,
            handler_name="fill_missing_data_handler",
            handler_result={
                "action": "ask_user_for_more_info",
                "missing_fields": ["vendor_name"],
                "missing_attachments": ["Invoice"],
            },
            debug={}
        )
        
        monkeypatch.setattr('ai_agent.views.run_orchestrator', lambda **kwargs: fixed_result)
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: POST /api/ai/threads/{thread_id}/run/
        response = client.post(f"/api/ai/threads/{thread.id}/run/")
        
        # Assert: Response status = 200
        assert response.status_code == status.HTTP_200_OK
        
        # Assert: AI message count increased by 1
        ai_message_count_after = ChatMessage.objects.filter(
            thread=thread,
            sender_type=ChatMessage.SenderType.AI
        ).count()
        assert ai_message_count_after == ai_message_count_before + 1
        
        # Assert: The new AI message has correct properties
        ai_message = ChatMessage.objects.filter(
            thread=thread,
            sender_type=ChatMessage.SenderType.AI
        ).latest('created_at')
        
        assert ai_message.sender_type == ChatMessage.SenderType.AI
        assert ai_message.thread == thread
        assert ai_message.sender_user is None
        # Content should contain some part of handler_result
        assert "vendor_name" in ai_message.content or "missing_fields" in ai_message.content.lower()
        
        # Assert: Response JSON includes AI message
        assert "ai_message" in response.data
        assert response.data["ai_message"]["id"] == str(ai_message.id)
        assert response.data["ai_message"]["sender_type"] == "AI"


@pytest.mark.django_db
class TestRunEndpointReturns400IfNoUserMessageFound:
    """TEST 5: Safety behavior when thread has no user messages"""
    
    def test_run_endpoint_returns_400_if_no_user_message_found(self, db, monkeypatch):
        """Test that endpoint returns 400 when no user message exists"""
        # Arrange: Create user
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        
        # Create thread with u1 as participant
        thread = ChatThread.objects.create(title="Thread 1")
        thread.participants.add(u1)
        
        # Ensure there are no messages with sender_type="USER" in that thread
        # (thread is empty)
        
        # Create spy for run_orchestrator (should never be called)
        orchestrator_spy = MagicMock()
        monkeypatch.setattr('ai_agent.views.run_orchestrator', orchestrator_spy)
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: POST /api/ai/threads/{thread_id}/run/
        response = client.post(f"/api/ai/threads/{thread.id}/run/")
        
        # Assert: Status == 400
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        # Assert: JSON includes "detail" with error message
        assert "detail" in response.data
        assert "user message" in response.data["detail"].lower() or "no user message" in response.data["detail"].lower()
        
        # Assert: run_orchestrator spy confirms not called
        assert orchestrator_spy.call_count == 0



