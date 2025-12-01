"""
Tests for ai_agent API endpoints following TDD approach.
"""
import pytest
from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from ai_agent.models import ChatThread, ChatMessage

User = get_user_model()


@pytest.mark.django_db
class TestListThreadsOnlyReturnsUserThreads:
    """TEST 1: List threads only returns threads user participates in"""
    
    def test_list_threads_only_returns_user_threads(self, db):
        """Test that GET /api/ai/threads/ returns only threads where user is a participant"""
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
        
        # Create 2 ChatThreads
        thread1 = ChatThread.objects.create(title="Thread 1")
        thread1.participants.add(u1)
        
        thread2 = ChatThread.objects.create(title="Thread 2")
        thread2.participants.add(u2)
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: GET /api/ai/threads/
        response = client.get("/api/ai/threads/")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["id"] == str(thread1.id)


@pytest.mark.django_db
class TestThreadDetailRequiresParticipantMembership:
    """TEST 2: Thread detail requires participant membership"""
    
    def test_thread_detail_requires_participant_membership(self, db):
        """Test that non-participants cannot access thread detail"""
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
        
        # Login as u2
        client = APIClient()
        client.force_authenticate(user=u2)
        
        # Act: GET /api/ai/threads/{id}/
        response = client.get(f"/api/ai/threads/{thread.id}/")
        
        # Assert: Expect 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestListMessagesSortedByCreatedAt:
    """TEST 3: List messages sorted by created_at"""
    
    def test_list_messages_sorted_by_created_at(self, db):
        """Test that messages are returned sorted by created_at (oldest to newest)"""
        # Arrange: Create user
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        
        # Create thread with u1
        thread = ChatThread.objects.create(title="Thread 1")
        thread.participants.add(u1)
        
        # Create 3 ChatMessage entries with different created_at timestamps
        now = timezone.now()
        message1 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="First message"
        )
        message1.created_at = now - timedelta(minutes=2)
        message1.save()
        
        message2 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="Second message"
        )
        message2.created_at = now - timedelta(minutes=1)
        message2.save()
        
        message3 = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=u1,
            content="Third message"
        )
        message3.created_at = now
        message3.save()
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: GET /api/ai/threads/{id}/messages/
        response = client.get(f"/api/ai/threads/{thread.id}/messages/")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 3
        
        # Messages should be sorted oldest → newest
        assert response.data[0]["id"] == str(message1.id)
        assert response.data[1]["id"] == str(message2.id)
        assert response.data[2]["id"] == str(message3.id)


@pytest.mark.django_db
class TestPostMessageCreatesChatMessageAndUpdatesLastMessageAt:
    """TEST 4: Post message creates ChatMessage and updates last_message_at"""
    
    def test_post_message_creates_chatmessage_and_updates_last_message_at(self, db):
        """Test that creating a message updates thread.last_message_at"""
        # Arrange: Create user
        u1 = User.objects.create_user(
            username="user1",
            password="testpass123",
            email="user1@example.com"
        )
        
        # Create thread with u1 as participant
        old_last_message_at = timezone.now() - timedelta(hours=1)
        thread = ChatThread.objects.create(
            title="Thread 1",
            last_message_at=old_last_message_at
        )
        thread.participants.add(u1)
        
        # Record old_last_message_at
        old_timestamp = thread.last_message_at
        
        # Login as u1
        client = APIClient()
        client.force_authenticate(user=u1)
        
        # Act: POST /api/ai/threads/{id}/messages/
        response = client.post(
            f"/api/ai/threads/{thread.id}/messages/",
            {"content": "Hello world"},
            format="json"
        )
        
        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        assert ChatMessage.objects.count() == 1
        
        message = ChatMessage.objects.first()
        assert message.sender_user == u1
        assert message.sender_type == "USER"
        assert message.content == "Hello world"
        
        # Refresh thread from DB
        thread.refresh_from_db()
        assert thread.last_message_at is not None
        assert thread.last_message_at > old_timestamp


@pytest.mark.django_db
class TestNonParticipantCannotPostMessage:
    """TEST 5: Non-participant cannot post message"""
    
    def test_non_participant_cannot_post_message(self, db):
        """Test that non-participants cannot post messages"""
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
        
        # Login as u2
        client = APIClient()
        client.force_authenticate(user=u2)
        
        # Act: POST /api/ai/threads/{id}/messages/
        response = client.post(
            f"/api/ai/threads/{thread.id}/messages/",
            {"content": "Hello world"},
            format="json"
        )
        
        # Assert: Expect 403 Forbidden
        assert response.status_code == status.HTTP_403_FORBIDDEN





