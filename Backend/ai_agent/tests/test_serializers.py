"""
Tests for ai_agent serializers.
"""
import pytest
from django.contrib.auth import get_user_model
from ai_agent.models import ChatThread
from ai_agent.serializers import ChatThreadSerializer
from purchase_requests.models import PurchaseRequest
from teams.models import Team
from prs_forms.models import FormTemplate
from classifications.models import LookupType, Lookup

User = get_user_model()


@pytest.mark.django_db
class TestChatThreadSerializerPRFields:
    """Test ChatThreadSerializer includes PR metadata when thread is linked to PR"""
    
    def test_serializer_includes_pr_metadata_when_linked(self, db):
        """Test that serializer includes request_id, request_code, and request_status when thread is linked to PR"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Arrange: Create minimal PurchaseRequest
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
            code="IN_REVIEW",
            defaults={"title": "In Review", "is_active": True}
        )
        
        purchase_type_type, _ = LookupType.objects.get_or_create(
            code="PURCHASE_TYPE",
            defaults={"title": "Purchase Type", "description": "Purchase type codes"}
        )
        purchase_type_lookup, _ = Lookup.objects.get_or_create(
            type=purchase_type_type,
            code="SERVICE",
            defaults={"title": "Service", "is_active": True}
        )
        
        # Create PurchaseRequest
        purchase_request = PurchaseRequest.objects.create(
            requestor=user,
            team=team,
            form_template=form_template,
            status=status_lookup,
            purchase_type=purchase_type_lookup,
            vendor_name="Test Vendor",
            vendor_account="123456",
            subject="Test Request",
            description="Test Description"
        )
        
        # Create ChatThread linked to PurchaseRequest
        thread = ChatThread.objects.create(
            request=purchase_request,
            title="Test Thread"
        )
        thread.participants.add(user)
        
        # Act: Serialize thread
        serializer = ChatThreadSerializer(thread)
        data = serializer.data
        
        # Assert: PR metadata fields are present and correct
        assert data["request_id"] == str(purchase_request.id)
        assert data["request_code"] == str(purchase_request.id)
        assert data["request_status"] == "IN_REVIEW"
    
    def test_serializer_returns_none_when_not_linked(self, db):
        """Test that serializer returns None for PR fields when thread is not linked to PR"""
        # Arrange: Create User
        user = User.objects.create_user(
            username="test_user",
            password="testpass123",
            email="test@example.com"
        )
        
        # Create ChatThread without PurchaseRequest
        thread = ChatThread.objects.create(
            title="Test Thread"
        )
        thread.participants.add(user)
        
        # Act: Serialize thread
        serializer = ChatThreadSerializer(thread)
        data = serializer.data
        
        # Assert: PR metadata fields are None
        assert data["request_id"] is None
        assert data["request_code"] is None
        assert data["request_status"] is None


