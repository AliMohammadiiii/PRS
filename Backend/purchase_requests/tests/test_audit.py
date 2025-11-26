"""
G. Audit & History Tests
"""
import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from purchase_requests.models import PurchaseRequest
from approvals.models import ApprovalHistory
from audit.models import AuditEvent, FieldChange
from .conftest import auth


@pytest.mark.django_db
@pytest.mark.P1
class TestAuditEventCorrectness:
    """G1: AuditEvent correctness"""
    
    def test_request_created_audit_event(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that REQUEST_CREATED event is created on request creation"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
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
        
        # Check audit event created
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.REQUEST_CREATED)
        assert events.exists()
        event = events.first()
        assert event.actor == user_requestor
        assert event.request == pr
    
    def test_request_submitted_audit_event(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that REQUEST_SUBMITTED event is created on submission"""
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
        
        # Check audit event
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.REQUEST_SUBMITTED)
        assert events.exists()
        event = events.first()
        assert event.actor == user_requestor
    
    def test_approval_audit_event(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that APPROVAL event is created on approval"""
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
        
        # Check audit event
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.APPROVAL)
        assert events.exists()
        event = events.first()
        assert event.actor == user_manager
    
    def test_rejection_audit_event(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that REJECTION event is created on rejection"""
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
        api_client.post(
            f"/api/prs/requests/{pr_id}/reject/",
            {"comment": "Not sufficient details provided"},
            format="json"
        )
        
        # Check audit event
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.REJECTION)
        assert events.exists()
        event = events.first()
        assert event.actor == user_manager
    
    def test_attachment_upload_audit_event(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that ATTACHMENT_UPLOAD event is created on attachment upload"""
        team = team_with_workflow["team"]
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
        
        pdf_file = SimpleUploadedFile("invoice.pdf", b"%PDF-1.4\nfake pdf", content_type="application/pdf")
        resp = api_client.post(
            f"/api/prs/requests/{pr_id}/upload-attachment/",
            {"file": pdf_file, "category_id": str(invoice_cat.id)},
            format="multipart",
        )
        attachment_id = resp.data["id"]
        
        # Check audit event
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.ATTACHMENT_UPLOAD)
        assert events.exists()
        event = events.first()
        assert event.actor == user_requestor
        assert str(attachment_id) in str(event.metadata.get("attachment_id", ""))


@pytest.mark.django_db
@pytest.mark.P1
class TestFieldChangeCorrectness:
    """G2: FieldChange correctness"""
    
    def test_top_level_field_changes_tracked(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that top-level field changes are tracked"""
        team = team_with_workflow["team"]
        
        auth(api_client, user_requestor)
        resp = api_client.post(
            "/api/prs/requests/",
            {
                "team_id": str(team.id),
                "vendor_name": "ACME",
                "vendor_account": "123",
                "subject": "Original Subject",
                "description": "Test",
                "purchase_type": "SERVICE",
            },
            format="json",
        )
        pr_id = resp.data["id"]
        pr = PurchaseRequest.objects.get(id=pr_id)
        
        # Update subject
        api_client.patch(
            f"/api/prs/requests/{pr_id}/",
            {"subject": "Updated Subject"},
            format="json"
        )
        
        # Check field change
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.FIELD_UPDATE)
        assert events.exists()
        event = events.first()
        field_changes = FieldChange.objects.filter(audit_event=event, field_name="subject")
        assert field_changes.exists()
        change = field_changes.first()
        assert change.old_value == "Original Subject"
        assert change.new_value == "Updated Subject"
    
    def test_form_field_changes_tracked(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that dynamic FormField changes are tracked"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        
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
        
        # Update field value
        from purchase_requests.serializers import PurchaseRequestUpdateSerializer
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{"field_id": str(field_text.id), "value_text": "New value"}]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Check field change
        events = AuditEvent.objects.filter(request=pr, event_type=AuditEvent.FIELD_UPDATE)
        assert events.exists()
        event = events.first()
        field_changes = FieldChange.objects.filter(audit_event=event, form_field=field_text)
        assert field_changes.exists()
        change = field_changes.first()
        assert change.old_value is None or change.old_value == ""
        assert change.new_value == "New value"


@pytest.mark.django_db
@pytest.mark.P1
class TestApprovalHistoryCorrectness:
    """G3: ApprovalHistory correctness"""
    
    def test_approval_history_recorded(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that approval actions are recorded in ApprovalHistory"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        step1 = team_with_workflow["step1"]
        
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
        
        # Manager approves with comment
        auth(api_client, user_manager)
        api_client.post(
            f"/api/prs/requests/{pr_id}/approve/",
            {"comment": "Looks good"},
            format="json"
        )
        
        # Check approval history
        history = ApprovalHistory.objects.filter(request=pr, step=step1, approver=user_manager)
        assert history.exists()
        record = history.first()
        assert record.action == ApprovalHistory.APPROVE
        assert record.comment == "Looks good"
        assert record.approver == user_manager
        assert record.step == step1
        assert record.timestamp is not None
    
    def test_rejection_history_recorded(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that rejection actions are recorded in ApprovalHistory"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        step1 = team_with_workflow["step1"]
        
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
        
        # Manager rejects with comment
        auth(api_client, user_manager)
        api_client.post(
            f"/api/prs/requests/{pr_id}/reject/",
            {"comment": "Needs more information"},
            format="json"
        )
        
        # Check approval history
        history = ApprovalHistory.objects.filter(request=pr, step=step1, approver=user_manager)
        assert history.exists()
        record = history.first()
        assert record.action == ApprovalHistory.REJECT
        assert record.comment == "Needs more information"
        assert record.approver == user_manager
        assert record.step == step1




