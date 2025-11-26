"""
C. PurchaseRequest Behavior Tests
"""
import pytest
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.test import APIClient
from purchase_requests.models import PurchaseRequest, RequestFieldValue
from purchase_requests.serializers import PurchaseRequestCreateSerializer, PurchaseRequestUpdateSerializer
from purchase_requests.views import PurchaseRequestViewSet
from prs_forms.models import FormField
from .conftest import auth


@pytest.mark.django_db
@pytest.mark.P0
class TestDraftCreation:
    """C1: Draft creation - happy path"""
    
    def test_create_draft_request(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test creating a draft purchase request via serializer"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        data = {
            "team_id": str(team.id),
            "vendor_name": "ACME Vendor",
            "vendor_account": "123-456-789",
            "subject": "Test Request",
            "description": "Test description",
            "purchase_type": "SERVICE",
        }
        
        serializer = PurchaseRequestCreateSerializer(
            data=data,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        assert serializer.is_valid(), serializer.errors
        
        purchase_request = serializer.save()
        
        assert purchase_request.requestor == user_requestor
        assert purchase_request.team == team
        assert purchase_request.form_template == team_with_workflow["template"]
        assert purchase_request.status.code == "DRAFT"
        assert purchase_request.purchase_type.code == "SERVICE"


@pytest.mark.django_db
@pytest.mark.P0
class TestNoActiveTemplate:
    """C2: No active template - ValidationError"""
    
    def test_create_request_no_active_template(self, api_client, user_requestor, db, purchase_type_lookups):
        """Test that creating request for team with no active template fails"""
        from teams.models import Team
        
        # Create team without active template
        team = Team.objects.create(name="No Template Team", is_active=True)
        
        auth(api_client, user_requestor)
        
        data = {
            "team_id": str(team.id),
            "vendor_name": "ACME Vendor",
            "vendor_account": "123-456-789",
            "subject": "Test Request",
            "description": "Test description",
            "purchase_type": "SERVICE",
        }
        
        serializer = PurchaseRequestCreateSerializer(
            data=data,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        
        # Validation happens in create(), not is_valid()
        serializer.is_valid(raise_exception=True)
        with pytest.raises(DRFValidationError) as exc_info:
            serializer.save()
        assert "No active form template" in str(exc_info.value)


@pytest.mark.django_db
@pytest.mark.P0
class TestInvalidPurchaseType:
    """C3: Invalid purchase_type - rejected"""
    
    def test_invalid_purchase_type(self, api_client, user_requestor, team_with_workflow):
        """Test that invalid purchase type is rejected"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        data = {
            "team_id": str(team.id),
            "vendor_name": "ACME Vendor",
            "vendor_account": "123-456-789",
            "subject": "Test Request",
            "description": "Test description",
            "purchase_type": "NONEXISTENT",
        }
        
        serializer = PurchaseRequestCreateSerializer(
            data=data,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        
        assert not serializer.is_valid()
        assert "not found" in str(serializer.errors["purchase_type"][0])


@pytest.mark.django_db
@pytest.mark.P0
class TestEditPermissionsAndStatuses:
    """C4: Edit permissions & statuses"""
    
    def test_only_requestor_can_update(self, api_client, user_requestor, user_manager, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that only requestor can PATCH"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        # Create request
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
        
        # Try to update as manager (not requestor)
        auth(api_client, user_manager)
        response = api_client.patch(
            f"/api/prs/requests/{pr.id}/",
            {"subject": "Updated"},
            format="json"
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_editable_statuses_allowed(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that DRAFT, REJECTED, RESUBMITTED statuses allow editing"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        editable_statuses = ["DRAFT", "REJECTED", "RESUBMITTED"]
        
        for status_code in editable_statuses:
            pr = PurchaseRequest.objects.create(
                requestor=user_requestor,
                team=team,
                form_template=team_with_workflow["template"],
                status=request_status_lookups[status_code],
                purchase_type=purchase_type_lookups["SERVICE"],
                vendor_name="ACME",
                vendor_account="123",
                subject="Test",
                description="Test"
            )
            
            # Should be able to update
            response = api_client.patch(
                f"/api/prs/requests/{pr.id}/",
                {"subject": "Updated"},
                format="json"
            )
            
            assert response.status_code == status.HTTP_200_OK
    
    def test_non_editable_statuses_rejected(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that PENDING_APPROVAL, IN_REVIEW, FINANCE_REVIEW, COMPLETED reject editing"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        non_editable_statuses = ["PENDING_APPROVAL", "IN_REVIEW", "FINANCE_REVIEW", "COMPLETED"]
        
        for status_code in non_editable_statuses:
            pr = PurchaseRequest.objects.create(
                requestor=user_requestor,
                team=team,
                form_template=team_with_workflow["template"],
                status=request_status_lookups[status_code],
                purchase_type=purchase_type_lookups["SERVICE"],
                vendor_name="ACME",
                vendor_account="123",
                subject="Test",
                description="Test"
            )
            
            # Should not be able to update
            response = api_client.patch(
                f"/api/prs/requests/{pr.id}/",
                {"subject": "Updated"},
                format="json"
            )
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "cannot be edited" in str(response.data)


@pytest.mark.django_db
@pytest.mark.P0
class TestFieldValuesCorrectness:
    """C5: Field values correctness"""
    
    def test_text_field_value(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test TEXT field uses value_text"""
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
        
        rfv = RequestFieldValue.objects.get(request=pr, field=field_text)
        assert rfv.value_text == "Test value"
        assert rfv.value_number is None
        assert rfv.value_bool is None
        assert rfv.value_date is None
        assert rfv.value_dropdown is None
    
    def test_number_field_value(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test NUMBER field uses value_number"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_number = team_with_workflow["field_number"]
        
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
        
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(field_number.id),
                    "value_number": "1000.50"
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        rfv = RequestFieldValue.objects.get(request=pr, field=field_number)
        assert rfv.value_number == 1000.50
        assert rfv.value_text is None
        assert rfv.value_bool is None
    
    def test_boolean_field_value(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test BOOLEAN field uses value_bool"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_bool = team_with_workflow["field_bool"]
        
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
        
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(field_bool.id),
                    "value_bool": True
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        rfv = RequestFieldValue.objects.get(request=pr, field=field_bool)
        assert rfv.value_bool is True
        assert rfv.value_text is None
        assert rfv.value_number is None
    
    def test_date_field_value(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test DATE field uses value_date"""
        from datetime import date
        
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_date = team_with_workflow["field_date"]
        
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
        
        test_date = date(2024, 12, 31)
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(field_date.id),
                    "value_date": str(test_date)
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        rfv = RequestFieldValue.objects.get(request=pr, field=field_date)
        assert rfv.value_date == test_date
        assert rfv.value_text is None
    
    def test_dropdown_field_value(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test DROPDOWN field uses value_dropdown"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_dropdown = team_with_workflow["field_dropdown"]
        
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
        
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(field_dropdown.id),
                    "value_dropdown": "High"
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        rfv = RequestFieldValue.objects.get(request=pr, field=field_dropdown)
        assert rfv.value_dropdown == "High"
        assert rfv.value_text is None


@pytest.mark.django_db
@pytest.mark.P0
class TestFieldOwnership:
    """C6: Field ownership - only fields from request's form_template"""
    
    def test_field_must_belong_to_template(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups, db):
        """Test that field_id must belong to request's form_template"""
        from teams.models import Team
        from prs_forms.models import FormTemplate, FormField
        
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        
        # Create another team with its own template
        other_team = Team.objects.create(name="Other Team", is_active=True)
        other_template = FormTemplate.objects.create(
            team=other_team,
            version_number=1,
            is_active=True,
            created_by=user_requestor
        )
        other_field = FormField.objects.create(
            template=other_template,
            field_id="OTHER_FIELD",
            name="other_field",
            label="Other Field",
            field_type=FormField.TEXT,
            order=1
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
        
        # Try to use field from different template
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [{
                    "field_id": str(other_field.id),
                    "value_text": "Test"
                }]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        
        assert not serializer.is_valid()
        assert "do not belong to this request's form template" in str(serializer.errors)


@pytest.mark.django_db
@pytest.mark.P1
class TestFileUploadFieldsExcluded:
    """C7: FILE_UPLOAD fields excluded from RequestFieldValue"""
    
    def test_file_upload_field_ignored(self, api_client, user_requestor, team_with_workflow, purchase_type_lookups, request_status_lookups):
        """Test that FILE_UPLOAD fields are ignored by RequestFieldValue upsert"""
        auth(api_client, user_requestor)
        team = team_with_workflow["team"]
        field_file = team_with_workflow["field_file"]
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
        
        # Try to include FILE_UPLOAD field in field_values
        serializer = PurchaseRequestUpdateSerializer(
            pr,
            data={
                "field_values": [
                    {
                        "field_id": str(field_text.id),
                        "value_text": "Test"
                    },
                    {
                        "field_id": str(field_file.id),
                        "value_text": "Should be ignored"
                    }
                ]
            },
            partial=True,
            context={"request": type('obj', (object,), {'user': user_requestor})()}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # FILE_UPLOAD field should not create RequestFieldValue
        assert not RequestFieldValue.objects.filter(request=pr, field=field_file).exists()
        
        # TEXT field should create RequestFieldValue
        assert RequestFieldValue.objects.filter(request=pr, field=field_text).exists()


@pytest.mark.django_db
@pytest.mark.P0
class TestStatusTransitions:
    """C8: Status transition rules"""
    
    def test_valid_transitions(self, team_with_workflow, purchase_type_lookups, request_status_lookups, user_requestor):
        """Test that valid status transitions are allowed"""
        team = team_with_workflow["team"]
        
        # DRAFT → PENDING_APPROVAL
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
        
        pr.status = request_status_lookups["PENDING_APPROVAL"]
        pr.full_clean()  # Should not raise
        pr.save()  # Save to update the database state
        
        # PENDING_APPROVAL → IN_REVIEW
        pr.status = request_status_lookups["IN_REVIEW"]
        pr.full_clean()
        pr.save()
        
        # IN_REVIEW → REJECTED
        pr.status = request_status_lookups["REJECTED"]
        pr.full_clean()
        pr.save()
        
        # REJECTED → RESUBMITTED
        pr.status = request_status_lookups["RESUBMITTED"]
        pr.full_clean()
        pr.save()
        
        # RESUBMITTED → PENDING_APPROVAL
        pr.status = request_status_lookups["PENDING_APPROVAL"]
        pr.full_clean()
        pr.save()
    
    def test_invalid_transitions(self, team_with_workflow, purchase_type_lookups, request_status_lookups, user_requestor):
        """Test that invalid status transitions are rejected"""
        team = team_with_workflow["team"]
        
        # DRAFT → COMPLETED (invalid)
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
        
        pr.status = request_status_lookups["COMPLETED"]
        with pytest.raises(ValidationError) as exc_info:
            pr.full_clean()
        assert "Invalid status transition" in str(exc_info.value)
        
        # COMPLETED → DRAFT (invalid - terminal state)
        pr.status = request_status_lookups["COMPLETED"]
        pr.save()  # Save to get it in COMPLETED state
        
        pr.status = request_status_lookups["DRAFT"]
        with pytest.raises(ValidationError) as exc_info:
            pr.full_clean()
        assert "cannot change status" in str(exc_info.value)

