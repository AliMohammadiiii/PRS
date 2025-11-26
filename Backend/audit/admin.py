from django.contrib import admin
from audit.models import AuditEvent, FieldChange


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'request', 'submission', 'actor', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('request__subject', 'request__id', 'submission__id', 'actor__username')
    readonly_fields = ('id', 'created_at', 'updated_at', 'is_active')


@admin.register(FieldChange)
class FieldChangeAdmin(admin.ModelAdmin):
    list_display = ('audit_event', 'form_field', 'field', 'field_name', 'old_value', 'new_value', 'created_at')
    list_filter = ('audit_event__event_type', 'created_at')
    search_fields = ('field_name', 'form_field__name', 'form_field__field_id', 'field__field_id', 'audit_event__request__subject', 'audit_event__submission__id')
    readonly_fields = ('id', 'created_at', 'updated_at', 'is_active')

from django.contrib import admin

# Register your models here.
