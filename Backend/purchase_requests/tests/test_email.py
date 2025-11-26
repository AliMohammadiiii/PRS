"""
H. Email Tests (Completion)
"""
import pytest
from unittest.mock import patch, MagicMock
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core import mail
from rest_framework.test import APIClient
from purchase_requests.models import PurchaseRequest
from .conftest import auth


@pytest.mark.django_db
@pytest.mark.P1
class TestCompletionEmail:
    """H1: Completion email success"""
    
    # Patch the send_mail function used inside purchase_requests.services
    @patch('purchase_requests.services.send_mail')
    def test_completion_email_sent(
        self,
        mock_send_mail,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
        settings,
    ):
        """Test that completion email is sent on request completion"""
        # Set completion email in settings
        settings.PRS_COMPLETION_EMAIL = "completion@example.com"
        
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create, submit, approve, and complete
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
                "subject": "Test Request",
                "description": "Test description",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        pr = PurchaseRequest.objects.get(id=pr_id)
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{"field_id": str(field_text.id), "value_text": "OK"}]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        
        api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Complete request
        auth(api_client, user_finance)
        api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        
        # Verify email was sent
        assert mock_send_mail.called
        call_args = mock_send_mail.call_args
        # send_mail is called with keyword arguments: subject, message, from_email, recipient_list
        assert "completion@example.com" in call_args[1]["recipient_list"]
        email_body = call_args[1]["message"]
        assert "Test Request" in email_body
        assert "ACME Vendor" in email_body
    
    def test_completion_email_content(
        self,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
        settings,
    ):
        """Test that completion email has correct content"""
        settings.PRS_COMPLETION_EMAIL = "completion@example.com"
        
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "IBAN123456",
                "subject": "Marketing Campaign",
                "description": "Q1 campaign materials",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        pr = PurchaseRequest.objects.get(id=pr_id)
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{"field_id": str(field_text.id), "value_text": "OK"}]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        
        api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Clear mail outbox
        mail.outbox = []
        
        auth(api_client, user_finance)
        api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        
        # Check email was sent
        assert len(mail.outbox) == 1
        email = mail.outbox[0]
        assert "completion@example.com" in email.recipients()
        assert "Marketing Campaign" in email.subject
        assert "ACME Vendor" in email.body
        assert "IBAN123456" in email.body
        assert "Marketing" in email.body  # Team name


@pytest.mark.django_db
@pytest.mark.P1
class TestEmailFailureResilience:
    """H2: Email failure resilience"""
    
    @patch('django.core.mail.send_mail')
    def test_request_remains_completed_on_email_failure(
        self,
        mock_send_mail,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
        settings,
    ):
        """Test that request remains COMPLETED even if email fails"""
        settings.PRS_COMPLETION_EMAIL = "completion@example.com"
        
        # Make send_mail raise an exception
        mock_send_mail.side_effect = Exception("Email server error")
        
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME",
                "vendor_account": "123",
                "subject": "Test",
                "description": "Test",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        pr = PurchaseRequest.objects.get(id=pr_id)
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{"field_id": str(field_text.id), "value_text": "OK"}]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        
        api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Complete request (email will fail)
        auth(api_client, user_finance)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        
        # Request should still be completed despite email failure
        assert resp.status_code == 200
        pr.refresh_from_db()
        assert pr.status.code == "COMPLETED"
        assert pr.completed_at is not None
    
    def test_no_transaction_rollback_on_email_failure(
        self,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
        settings,
    ):
        """Test that email failure doesn't cause transaction rollback"""
        settings.PRS_COMPLETION_EMAIL = "completion@example.com"
        
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME",
                "vendor_account": "123",
                "subject": "Test",
                "description": "Test",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        pr = PurchaseRequest.objects.get(id=pr_id)
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{"field_id": str(field_text.id), "value_text": "OK"}]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        
        api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Mock email failure
        with patch('django.core.mail.send_mail', side_effect=Exception("Email error")):
            auth(api_client, user_finance)
            resp = api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
            
            # Should succeed despite email failure
            assert resp.status_code == 200
            
            # Verify request is completed and persisted
            pr.refresh_from_db()
            assert pr.status.code == "COMPLETED"
            
            # Verify audit event was created
            from audit.models import AuditEvent
            assert AuditEvent.objects.filter(
                request=pr,
                event_type=AuditEvent.REQUEST_COMPLETED
            ).exists()

