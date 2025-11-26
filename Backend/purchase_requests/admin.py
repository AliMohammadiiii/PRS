from django.contrib import admin
from purchase_requests.models import PurchaseRequest, RequestFieldValue


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'team', 'requestor', 'status', 'created_at', 'submitted_at', 'completed_at')
    list_filter = ('team', 'status', 'created_at', 'submitted_at')
    search_fields = ('subject', 'vendor_name', 'requestor__username', 'id')
    readonly_fields = (
        'id', 'requestor', 'team', 'form_template', 'status', 'current_step',
        'vendor_name', 'vendor_account', 'subject', 'description', 'purchase_type',
        'submitted_at', 'completed_at', 'rejection_comment', 'created_at', 'updated_at', 'is_active'
    )
    fields = (
        'id', 'requestor', 'team', 'form_template', 'status', 'current_step',
        'vendor_name', 'vendor_account', 'subject', 'description', 'purchase_type',
        'submitted_at', 'completed_at', 'rejection_comment', 'is_active',
        'created_at', 'updated_at'
    )
    
    def has_add_permission(self, request):
        # Disable adding new requests via admin (requests should be created via API)
        return False
    
    def has_change_permission(self, request, obj=None):
        # Allow viewing but not editing (read-only for history inspection)
        return request.user.is_staff
    
    def has_delete_permission(self, request, obj=None):
        # Disable deletion (soft-delete only)
        return False


@admin.register(RequestFieldValue)
class RequestFieldValueAdmin(admin.ModelAdmin):
    list_display = ('request', 'field', 'value_text', 'value_number', 'value_date', 'value_bool', 'value_dropdown')
    list_filter = ('request__team', 'field__field_type')
    search_fields = ('request__subject', 'field__name', 'field__field_id')
    readonly_fields = ('id', 'request', 'field', 'value_text', 'value_number', 'value_date', 'value_bool', 'value_dropdown', 'created_at', 'updated_at', 'is_active')
    fields = (
        'id', 'request', 'field', 'value_text', 'value_number', 'value_date', 
        'value_bool', 'value_dropdown', 'is_active', 'created_at', 'updated_at'
    )
    
    def has_add_permission(self, request):
        # Read-only for history inspection
        return False
    
    def has_change_permission(self, request, obj=None):
        # Read-only
        return request.user.is_staff
    
    def has_delete_permission(self, request, obj=None):
        # Disable deletion
        return False


