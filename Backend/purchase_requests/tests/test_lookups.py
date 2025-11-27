"""
A. Lookups & Configuration Tests
"""
import pytest
from django.core.exceptions import ObjectDoesNotExist
from classifications.models import LookupType, Lookup
from purchase_requests import services


@pytest.mark.django_db
@pytest.mark.P0
class TestLookupExistence:
    """A1: Verify all status codes exist and are active"""
    
    def test_all_status_codes_exist(self, request_status_lookups):
        """Test that all required status codes exist and are active"""
        required_codes = [
            "DRAFT",
            "PENDING_APPROVAL",
            "IN_REVIEW",
            "REJECTED",
            "RESUBMITTED",
            "FULLY_APPROVED",
            "FINANCE_REVIEW",
            "COMPLETED",
        ]
        
        for code in required_codes:
            assert code in request_status_lookups
            lookup = request_status_lookups[code]
            assert lookup.is_active is True
            assert lookup.type.code == "REQUEST_STATUS"
    
    def test_draft_status_helper(self, request_status_lookups):
        """Test get_draft_status() helper function"""
        status = services.get_draft_status()
        assert status.code == "DRAFT"
        assert status.is_active is True
    
    def test_pending_approval_status_helper(self, request_status_lookups):
        """Test get_pending_approval_status() helper function"""
        status = services.get_pending_approval_status()
        assert status.code == "PENDING_APPROVAL"
        assert status.is_active is True
    
    def test_in_review_status_helper(self, request_status_lookups):
        """Test get_in_review_status() helper function"""
        status = services.get_in_review_status()
        assert status.code == "IN_REVIEW"
        assert status.is_active is True
    
    def test_fully_approved_status_helper(self, request_status_lookups):
        """Test get_fully_approved_status() helper function"""
        status = services.get_fully_approved_status()
        assert status.code == "FULLY_APPROVED"
        assert status.is_active is True
    
    def test_finance_review_status_helper(self, request_status_lookups):
        """Test get_finance_review_status() helper function"""
        status = services.get_finance_review_status()
        assert status.code == "FINANCE_REVIEW"
        assert status.is_active is True
    
    def test_rejected_status_helper(self, request_status_lookups):
        """Test get_rejected_status() helper function"""
        status = services.get_rejected_status()
        assert status.code == "REJECTED"
        assert status.is_active is True
    
    def test_completed_status_helper(self, request_status_lookups):
        """Test get_completed_status() helper function"""
        status = services.get_completed_status()
        assert status.code == "COMPLETED"
        assert status.is_active is True
    
    def test_purchase_type_lookups_exist(self, purchase_type_lookups):
        """Test that purchase type lookups exist"""
        assert "SERVICE" in purchase_type_lookups
        assert "GOOD" in purchase_type_lookups
        for code, lookup in purchase_type_lookups.items():
            assert lookup.is_active is True
            assert lookup.type.code == "PURCHASE_TYPE"


@pytest.mark.django_db
@pytest.mark.P1
class TestMissingInactiveLookups:
    """A2: Missing / inactive lookup behavior"""
    
    def test_missing_status_raises_exception(self, db):
        """Test that missing status lookup raises clear exception"""
        # Ensure FINANCE_REVIEW doesn't exist
        Lookup.objects.filter(type__code="REQUEST_STATUS", code="FINANCE_REVIEW").delete()
        
        with pytest.raises(ObjectDoesNotExist):
            services.get_finance_review_status()
    
    def test_inactive_status_raises_exception(self, request_status_lookups):
        """Test that inactive status lookup raises exception"""
        # Deactivate FINANCE_REVIEW
        finance_review = request_status_lookups["FINANCE_REVIEW"]
        finance_review.is_active = False
        finance_review.save()
        
        with pytest.raises(ObjectDoesNotExist):
            services.get_finance_review_status()
    
    def test_missing_purchase_type_raises_exception(self, db):
        """Test that missing purchase type raises exception"""
        with pytest.raises(ObjectDoesNotExist):
            services.get_purchase_type_lookup("NONEXISTENT")
    
    def test_inactive_purchase_type_raises_exception(self, purchase_type_lookups):
        """Test that inactive purchase type raises exception"""
        # Deactivate SERVICE
        service = purchase_type_lookups["SERVICE"]
        service.is_active = False
        service.save()
        
        with pytest.raises(ObjectDoesNotExist):
            services.get_purchase_type_lookup("SERVICE")





