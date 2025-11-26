from django.contrib import admin
from approvals.models import ApprovalHistory


@admin.register(ApprovalHistory)
class ApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ('request', 'step', 'approver', 'action', 'timestamp')
    list_filter = ('action', 'timestamp', 'approver', 'step__workflow__team')
    search_fields = ('request__subject', 'approver__username', 'step__step_name', 'request__id')
    readonly_fields = (
        'id', 'request', 'step', 'approver', 'action', 'comment', 
        'timestamp', 'created_at', 'updated_at', 'is_active'
    )
    fields = (
        'id', 'request', 'step', 'approver', 'action', 'comment', 
        'timestamp', 'is_active', 'created_at', 'updated_at'
    )
    
    def has_add_permission(self, request):
        # Completely read-only - no add/change/delete
        return False
    
    def has_change_permission(self, request, obj=None):
        # Read-only
        return request.user.is_staff
    
    def has_delete_permission(self, request, obj=None):
        # Disable deletion
        return False


