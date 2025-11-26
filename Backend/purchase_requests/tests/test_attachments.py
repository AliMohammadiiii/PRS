"""
D. Attachments Tests
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from purchase_requests.models import PurchaseRequest
from attachments.models import Attachment, AttachmentCategory
from .conftest import auth


@pytest.mark.django_db
@pytest.mark.P0
class TestAttachmentValidation:
    """D1: Attachment validation"""
    
    def test_allowed_file_types(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that only allowed file types are accepted"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Test PDF
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            data={"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_201_CREATED
        
        # Test PNG
        png_file = SimpleUploadedFile("test.png", b"fake png", content_type="image/png")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            data={"file": png_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_201_CREATED
        
        # Test JPG
        jpg_file = SimpleUploadedFile("test.jpg", b"fake jpg", content_type="image/jpeg")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            data={"file": jpg_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_201_CREATED
        
        # Test DOCX
        docx_file = SimpleUploadedFile("test.docx", b"fake docx", content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            data={"file": docx_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_201_CREATED
    
    def test_disallowed_file_type(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that disallowed file types are rejected"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Test TXT (not allowed)
        txt_file = SimpleUploadedFile("test.txt", b"fake txt", content_type="text/plain")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": txt_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_file_size_limit(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that files over 10MB are rejected"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Create file larger than 10MB (10 * 1024 * 1024 + 1 bytes)
        large_content = b"x" * (10 * 1024 * 1024 + 1)
        large_file = SimpleUploadedFile("large.pdf", large_content, content_type="application/pdf")
        
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": large_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_category_must_belong_to_team(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups, db):
        """Test that category must belong to same team as request"""
        from teams.models import Team
        
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        # Create another team with its own category
        other_team = Team.objects.create(name="Other Team", is_active=True)
        other_cat = AttachmentCategory.objects.create(
            team=other_team,
            name="Other Category",
            required=False,
            is_active=True
        )
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(other_cat.id)},
            format="multipart"
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
@pytest.mark.P0
class TestRequiredAttachments:
    """D2: Required attachments validation on submit"""
    
    def test_cannot_submit_without_required_attachment(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that submit fails if required attachments are missing"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Set required field
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(field_text.id),
                    "value_text": "Test value"
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Try to submit without required attachment
        response = api_client.post(f"/api/prs/requests/{pr.id}/submit/", {}, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "required_attachments" in response.data
    
    def test_can_submit_with_required_attachment(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that submit succeeds when required attachments are present"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Set required field
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(field_text.id),
                    "value_text": "Test value"
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Upload required attachment
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        
        # Submit should succeed
        response = api_client.post(f"/api/prs/requests/{pr.id}/submit/", {}, format="json")
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
@pytest.mark.P1
class TestAttachmentDeletion:
    """D3: Attachment deletion"""
    
    def test_requestor_can_delete_attachment(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that requestor can delete attachment from editable request"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Upload attachment
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        attachment_id = response.data["id"]
        
        # Delete attachment
        response = api_client.delete(f"/api/prs/requests/{pr.id}/attachments/{attachment_id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        # Attachment should be soft-deleted
        attachment = Attachment.objects.get(id=attachment_id)
        assert attachment.is_active is False
    
    def test_non_requestor_cannot_delete(self, api_client, user_requestor, user_manager, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that non-requestor cannot delete attachment"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Upload attachment
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        attachment_id = response.data["id"]
        
        # Try to delete as manager
        auth(api_client, user_manager)
        response = api_client.delete(f"/api/prs/requests/{pr.id}/attachments/{attachment_id}/")
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_cannot_delete_from_non_editable_request(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that attachments cannot be deleted from non-editable requests"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        pr = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["COMPLETED"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Test",
            description="Test"
        )
        
        # Upload attachment (before completion)
        pr.status = request_status_lookups["DRAFT"]
        pr.save()
        pdf_file = SimpleUploadedFile("test.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        response = api_client.post(
            f"/api/prs/requests/{pr.id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart"
        )
        attachment_id = response.data["id"]
        
        # Mark as completed
        pr.status = request_status_lookups["COMPLETED"]
        pr.save()
        
        # Try to delete from completed request
        response = api_client.delete(f"/api/prs/requests/{pr.id}/attachments/{attachment_id}/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

