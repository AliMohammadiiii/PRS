"""
F. Inbox APIs Tests
"""
import pytest
from datetime import datetime, timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from purchase_requests.models import PurchaseRequest
from approvals.models import ApprovalHistory
from .conftest import auth


@pytest.mark.django_db
@pytest.mark.P1
class TestMyRequests:
    """F1: My Requests endpoint"""
    
    def test_my_requests_returns_only_current_user_requests(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that /prs/requests/my/ returns only current user's requests"""
        team = team_with_workflow["team"]
        
        # Create requests for different users
        pr1 = PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Requestor Request",
            description="Test"
        )
        
        pr2 = PurchaseRequest.objects.create(
            requestor=user_manager,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Manager Request",
            description="Test"
        )
        
        # Get my requests as requestor
        auth(api_client, user_requestor)
        resp = api_client.get("/api/prs/requests/my/")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests_list = data["results"]
        else:
            requests_list = data if isinstance(data, list) else []
        request_ids = [r["id"] for r in requests_list]
        assert str(pr1.id) in request_ids
        assert str(pr2.id) not in request_ids
    
    def test_my_requests_status_filter(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test status filter on my requests"""
        team = team_with_workflow["team"]
        
        PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Draft Request",
            description="Test"
        )
        
        PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["COMPLETED"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Completed Request",
            description="Test"
        )
        
        auth(api_client, user_requestor)
        resp = api_client.get("/api/prs/requests/my/?status=DRAFT")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert all(r["status"]["code"] == "DRAFT" for r in requests)
    
    def test_my_requests_team_filter(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
        db,
    ):
        """Test team_id filter on my requests"""
        from teams.models import Team
        from prs_forms.models import FormTemplate
        
        team1 = team_with_workflow["team"]
        team2 = Team.objects.create(name="Team 2", is_active=True)
        template2 = FormTemplate.objects.create(
            team=team2,
            version_number=1,
            is_active=True,
            created_by=user_requestor
        )
        
        PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team1,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Team 1 Request",
            description="Test"
        )
        
        PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team2,
            form_template=template2,
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME",
            vendor_account="123",
            subject="Team 2 Request",
            description="Test"
        )
        
        auth(api_client, user_requestor)
        resp = api_client.get(f"/api/prs/requests/my/?team_id={team1.id}")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert all(r["team"]["id"] == str(team1.id) for r in requests)
    
    def test_my_requests_vendor_filter(
        self,
        api_client,
        user_requestor,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test vendor filter on my requests"""
        team = team_with_workflow["team"]
        
        PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="ACME Corp",
            vendor_account="123",
            subject="ACME Request",
            description="Test"
        )
        
        PurchaseRequest.objects.create(
            requestor=user_requestor,
            team=team,
            form_template=team_with_workflow["template"],
            status=request_status_lookups["DRAFT"],
            purchase_type=purchase_type_lookups["SERVICE"],
            vendor_name="XYZ Inc",
            vendor_account="456",
            subject="XYZ Request",
            description="Test"
        )
        
        auth(api_client, user_requestor)
        resp = api_client.get("/api/prs/requests/my/?vendor=ACME")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert all("ACME" in r["vendor_name"] for r in requests)


@pytest.mark.django_db
@pytest.mark.P1
class TestMyApprovals:
    """F2: My Approvals endpoint"""
    
    def test_my_approvals_returns_pending_approvals(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that /prs/requests/my-approvals/ returns requests pending approval"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        step1 = team_with_workflow["step1"]
        
        # Create and submit request
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
        
        # Check manager's approval inbox
        auth(api_client, user_manager)
        resp = api_client.get("/api/prs/requests/my-approvals/")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert len(requests) >= 1
        assert any(r["id"] == str(pr_id) for r in requests)
    
    def test_my_approvals_excludes_already_approved(
        self,
        api_client,
        user_requestor,
        user_manager,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that already-approved requests don't appear in my-approvals"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create and submit request
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
        
        # Manager approves
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Request should no longer appear in my-approvals
        resp = api_client.get("/api/prs/requests/my-approvals/")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert not any(r["id"] == str(pr_id) for r in requests)


@pytest.mark.django_db
@pytest.mark.P1
class TestFinanceInbox:
    """F3: Finance Inbox endpoint"""
    
    def test_finance_inbox_returns_finance_review_requests(
        self,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that /prs/requests/finance-inbox/ returns FINANCE_REVIEW requests"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create, submit, and approve to get to finance review
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
        
        # Manager approves
        auth(api_client, user_manager)
        api_client.post(f"/api/prs/requests/{pr_id}/approve/", {}, format="json")
        
        # Check finance inbox
        auth(api_client, user_finance)
        resp = api_client.get("/api/prs/requests/finance-inbox/")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert len(requests) >= 1
        assert any(r["id"] == str(pr_id) for r in requests)
        assert all(r["status"]["code"] == "FINANCE_REVIEW" for r in requests)
    
    def test_finance_inbox_excludes_after_completion(
        self,
        api_client,
        user_requestor,
        user_manager,
        user_finance,
        team_with_workflow,
        request_status_lookups,
        purchase_type_lookups,
    ):
        """Test that completed requests don't appear in finance inbox"""
        team = team_with_workflow["team"]
        field_text = team_with_workflow["field_text"]
        invoice_cat = team_with_workflow["invoice_cat"]
        
        # Create, submit, approve, and complete
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
        
        auth(api_client, user_finance)
        api_client.post(f"/api/prs/requests/{pr_id}/complete/", {}, format="json")
        
        # Request should no longer appear in finance inbox
        resp = api_client.get("/api/prs/requests/finance-inbox/")
        assert resp.status_code == status.HTTP_200_OK
        
        # Handle both paginated and non-paginated responses
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            requests = data["results"]
        else:
            requests = data if isinstance(data, list) else []
        assert not any(r["id"] == str(pr_id) for r in requests)

