"""
E. Workflow Tests: Submit → Approve → Complete
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from purchase_requests.models import PurchaseRequest
from approvals.models import ApprovalHistory
from audit.models import AuditEvent
from .conftest import auth


@pytest.mark.django_db
@pytest.mark.P0
class TestFullHappyPath:
    """E1: Full happy path end-to-end"""
    
    def test_full_workflow_happy_path(
        self,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test complete workflow: create → fill → upload → submit → approve → complete"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        step1 = team_with_workflow["step1"]
        finance_step = team_with_workflow["finance_step"]
        
        # 1) Requestor: create DRAFT
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
                "subject": "Marketing campaign",
                "description": "Q1 campaign",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        pr_id = resp.data["id"]
        pr = PurchaseRequest.objects.get(id=pr_id)
        assert pr.status.code == "DRAFT"
        assert pr.requestor == user_requestor
        
        # 2) PATCH with field_values (required text)
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [
                    {
                        "field_id": str(field_text.id),
                        "value_text": "Campaign description",
                    }
                ]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # 3) Upload required attachment
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        resp = api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        
        # 4) Submit
        resp = api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        pr.refresh_from_db()
        assert pr.status.code in ["PENDING_APPROVAL", "IN_REVIEW"]
        assert pr.submitted_at is not None
        assert pr.current_step == step1
        
        # 5) Manager approves
        auth(api_client, user_manager)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        pr.refresh_from_db()
        
        # After manager approval, should move to finance step
        assert pr.current_step == finance_step
        assert pr.status.code == "FINANCE_REVIEW"
        
        # 6) Finance completes
        auth(api_client, user_finance)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        pr.refresh_from_db()
        assert pr.status.code == "COMPLETED"
        assert pr.completed_at is not None
        assert pr.current_step is None
        
        # 7) Check ApprovalHistory & AuditEvent exist
        assert ApprovalHistory.objects.filter(request=pr).exists()
        assert AuditEvent.objects.filter(request=pr).exists()
        
        # Check approval history entries
        approvals = ApprovalHistory.objects.filter(request=pr)
        assert approvals.count() >= 2  # Manager approval + finance completion
        
        # Check audit events
        audit_events = AuditEvent.objects.filter(request=pr)
        event_types = [e.event_type for e in audit_events]
        assert AuditEvent.REQUEST_CREATED in event_types
        assert AuditEvent.REQUEST_SUBMITTED in event_types
        assert AuditEvent.APPROVAL in event_types
        assert AuditEvent.REQUEST_COMPLETED in event_types


@pytest.mark.django_db
@pytest.mark.P0
class TestRejectionPath:
    """E2: Rejection path"""
    
    def test_reject_and_resubmit(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test rejection and resubmission flow"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        step1 = team_with_workflow["step1"]
        
        # Create + submit
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
                "subject": "Rejection test",
                "description": "Test",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        # Set required field
        pr = PurchaseRequest.objects.get(id=pr_id)
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{"field_id": str(field_text.id), "value_text": "Something"}]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Upload attachment
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        
        # Submit
        api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        
        # Manager rejects
        auth(api_client, user_manager)
        resp = api_client.post(
            f"/api/prs/requests/{pr_id}/reject/",
            {"comment": "Not enough details, please update."},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        
        pr.refresh_from_db()
        assert pr.status.code == "REJECTED"
        assert pr.current_step is None
        assert "Not enough details" in (pr.rejection_comment or "")
        
        # Requestor can now edit and resubmit
        auth(api_client, user_requestor)
        resp = api_client.patch(
            f"/api/prs/requests/{pr_id}/",
            {"description": "Updated after rejection"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        
        resp = api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        pr.refresh_from_db()
        assert pr.status.code in ["PENDING_APPROVAL", "IN_REVIEW"]
        assert pr.current_step is not None


@pytest.mark.django_db
@pytest.mark.P0
class TestRequiredFieldsValidation:
    """E3: Required fields validation on submit"""
    
    def test_cannot_submit_without_required_field(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that submit fails without required fields"""
        team = team_with_workflow["team"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
                "subject": "Missing field test",
                "description": "Test description",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        # Upload attachment but no required field
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        
        # Try to submit without required field
        resp = api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "required_fields" in resp.data


@pytest.mark.django_db
@pytest.mark.P0
class TestPermissionsOnActions:
    """E4: Permissions on actions"""
    
    def test_only_requestor_can_submit(self, api_client, user_requestor, user_manager, team_with_workflow, request_status_lookups, purchase_type_lookups):
        """Test that only requestor can submit"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create as requestor
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
                "subject": "Test",
                "description": "Test",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        
        # Set required field and upload attachment
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
        
        # Try to submit as manager (not requestor)
        auth(api_client, user_manager)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/submit/", {}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
    
    def test_only_step_approver_can_approve(self, api_client, user_requestor, user_manager, user_finance, team_with_workflow, request_status_lookups, purchase_type_lookups):
        """Test that only current step approver can approve"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create and submit as requestor
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
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
        
        # Try to approve as finance (not approver for current step)
        auth(api_client, user_finance)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        
        # Manager (correct approver) can approve
        auth(api_client, user_manager)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK
    
    def test_only_finance_approver_can_complete(self, api_client, user_requestor, user_manager, user_finance, team_with_workflow, request_status_lookups, purchase_type_lookups):
        """Test that only finance approver can complete"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create, submit, and get to finance review
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME Vendor",
                "vendor_account": "123-456-789",
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
        
        # Manager approves to move to finance
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Try to complete as manager (not finance approver)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN
        
        # Finance (correct approver) can complete
        auth(api_client, user_finance)
        resp = api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        assert resp.status_code == status.HTTP_200_OK

