from django.contrib import admin
from audit.models import AuditEvent, FieldChange


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'submission', 'actor', 'created_at')
    list_filter = ('event_type',)
    search_fields = ('submission__id', 'actor__username')


@admin.register(FieldChange)
class FieldChangeAdmin(admin.ModelAdmin):
    list_display = ('audit_event', 'field', 'created_at')
    search_fields = ('audit_event__submission__id', 'field__field_id')

from django.contrib import admin

# Register your models here.
