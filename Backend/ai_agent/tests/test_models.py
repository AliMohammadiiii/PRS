"""
Tests for ai_agent models following TDD approach.
"""
import pytest
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from accounts.models import User
from purchase_requests.models import PurchaseRequest
from teams.models import Team
from prs_forms.models import FormTemplate
from classifications.models import LookupType, Lookup

User = get_user_model()


@pytest.mark.django_db
class TestChatThreadCreationAndStr:
    """Test ChatThread creation and __str__ method"""
    
    def test_chat_thread_creation_and_str(self, db):
        """Test creating a ChatThread with request and participants"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Arrange: Create minimal PurchaseRequest
        # First create required dependencies
        team = Team.objects.create(name="Test Team", is_active=True)
        
        form_template = FormTemplate.objects.create(
            name="Test Template",
            version_number=1,
            is_active=True,
            created_by=user
        )
        
        # Create lookup types and lookups
        status_type, _ = LookupType.objects.get_or_create(
            code="REQUEST_STATUS",
            defaults={"title": "Request Status", "description": "Purchase request status codes"}
        )
        status_lookup, _ = Lookup.objects.get_or_create(
            type=status_type,
            code="DRAFT",
            defaults={"title": "Draft", "is_active": True}
        )
        
        purchase_type_type, _ = LookupType.objects.get_or_create(
            code="PURCHASE_TYPE",
            defaults={"title": "Purchase Type", "description": "Types of purchases"}
        )
        purchase_type_lookup, _ = Lookup.objects.get_or_create(
            type=purchase_type_type,
            code="SERVICE",
            defaults={"title": "Service", "is_active": True}
        )
        
        purchase_request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            status=status_lookup,
            purchase_type=purchase_type_lookup,
            vendor_name="ACME Corp",
            vendor_account="123456",
            subject="Test Request",
            description="Test Description"
        )
        
        # Import here to avoid circular imports (models don't exist yet)
        from ai_agent.models import ChatThread
        
        # Create ChatThread with request and participants
        last_message_time = timezone.now()
        thread = ChatThread.objects.create(
            request=purchase_request,
            title="Test Thread",
            last_message_at=last_message_time
        )
        thread.participants.add(user)
        
        # Act: Fetch from DB
        fetched_thread = ChatThread.objects.get(id=thread.id)
        
        # Assert
        assert fetched_thread.request == purchase_request
        assert fetched_thread.request_id == purchase_request.id
        assert fetched_thread.participants.count() == 1
        assert user in fetched_thread.participants.all()
        assert str(fetched_thread) == f"Thread {fetched_thread.id} – PR {purchase_request.id}"
        assert fetched_thread.is_active is True
        assert fetched_thread.last_message_at == last_message_time


@pytest.mark.django_db
class TestChatThreadOrdering:
    """Test ChatThread ordering by last_message_at"""
    
    def test_chat_thread_ordering_by_last_message_at(self, db):
        """Test that threads are ordered by last_message_at descending"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        from ai_agent.models import ChatThread
        
        # Create two threads with different last_message_at
        now = timezone.now()
        older_time = now - timedelta(hours=1)
        newer_time = now
        
        thread_older = ChatThread.objects.create(
            title="Older Thread",
            last_message_at=older_time
        )
        thread_older.participants.add(user)
        
        thread_newer = ChatThread.objects.create(
            title="Newer Thread",
            last_message_at=newer_time
        )
        thread_newer.participants.add(user)
        
        # Act: Query all threads
        threads = list(ChatThread.objects.all())
        
        # Assert: Newer thread comes first
        assert len(threads) >= 2
        # Find our threads in the list
        thread_ids = [t.id for t in threads]
        older_idx = thread_ids.index(thread_older.id)
        newer_idx = thread_ids.index(thread_newer.id)
        assert newer_idx < older_idx, "Newer thread should come before older thread"


@pytest.mark.django_db
class TestChatMessageCreationAndRelationships:
    """Test ChatMessage creation and relationships"""
    
    def test_chat_message_creation_and_relationships(self, db):
        """Test creating ChatMessages and their relationships"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        from ai_agent.models import ChatThread, ChatMessage
        
        # Create ChatThread
        thread = ChatThread.objects.create(title="Test Thread")
        thread.participants.add(user)
        
        # Create 2 ChatMessage records with different created_at
        # We'll create them with a small delay to ensure different timestamps
        message1 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content="First message"
        )
        
        # Small delay to ensure different created_at
        import time
        time.sleep(0.01)
        
        message2 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.AI,
            content="Second message"
        )
        
        # Act: Fetch thread and access messages
        fetched_thread = ChatThread.objects.get(id=thread.id)
        messages = list(fetched_thread.messages.all())
        
        # Assert
        assert len(messages) == 2
        # Messages should be ordered by created_at ascending
        assert messages[0].created_at <= messages[1].created_at
        # Verify relationships
        assert messages[0].thread == thread
        assert messages[1].thread == thread
        # Verify sender_user for USER type
        user_message = [m for m in messages if m.sender_type == ChatMessage.SenderType.USER][0]
        assert user_message.sender_user == user
        # AI message should have null sender_user
        ai_message = [m for m in messages if m.sender_type == ChatMessage.SenderType.AI][0]
        assert ai_message.sender_user is None


@pytest.mark.django_db
class TestChatMessageStrPreview:
    """Test ChatMessage __str__ method truncation"""
    
    def test_chat_message_str_preview_truncates_long_content(self, db):
        """Test that __str__ truncates content longer than 30 characters"""
        # Arrange: Create User and Thread
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        from ai_agent.models import ChatThread, ChatMessage
        
        thread = ChatThread.objects.create(title="Test Thread")
        thread.participants.add(user)
        
        # Create message with long content (> 30 chars)
        long_content = "This is a very long message that exceeds thirty characters"
        message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content=long_content
        )
        
        # Act: Call __str__
        message_str = str(message)
        
        # Assert: Should be truncated to 30 chars + "..."
        assert len(message_str) == 33  # 30 + "..."
        assert message_str.endswith("...")
        assert message_str == long_content[:30] + "..."


@pytest.mark.django_db
class TestAIExecutionTraceBasicFieldsAndOrdering:
    """Test AIExecutionTrace basic fields and ordering"""
    
    def test_ai_execution_trace_basic_fields_and_ordering(self, db):
        """Test AIExecutionTrace creation, fields, and ordering"""
        # Arrange: Create User and Thread
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        from ai_agent.models import ChatThread, AIExecutionTrace
        
        thread = ChatThread.objects.create(title="Test Thread")
        thread.participants.add(user)
        
        # Create two AIExecutionTrace entries with different step_names
        trace1 = AIExecutionTrace.objects.create(
            thread=thread,
            step_name="detect_intent",
            input_payload={"message": "test"},
            output_payload={"intent": "create_request"}
        )
        
        # Small delay to ensure different created_at
        import time
        time.sleep(0.01)
        
        trace2 = AIExecutionTrace.objects.create(
            thread=thread,
            step_name="route_intent",
            confidence=0.95
        )
        
        # Act: Fetch traces
        fetched_thread = ChatThread.objects.get(id=thread.id)
        traces = list(fetched_thread.ai_traces.all())
        
        # Assert
        assert len(traces) == 2
        # Traces should be ordered by created_at ascending
        assert traces[0].created_at <= traces[1].created_at
        # Verify step_name is stored correctly
        step_names = [t.step_name for t in traces]
        assert "detect_intent" in step_names
        assert "route_intent" in step_names
        # Verify input_payload and output_payload default to {} when not set
        trace_without_payloads = [t for t in traces if t.step_name == "route_intent"][0]
        assert trace_without_payloads.input_payload == {}
        assert trace_without_payloads.output_payload == {}
        # Verify trace with explicit payloads
        trace_with_payloads = [t for t in traces if t.step_name == "detect_intent"][0]
        assert trace_with_payloads.input_payload == {"message": "test"}
        assert trace_with_payloads.output_payload == {"intent": "create_request"}

