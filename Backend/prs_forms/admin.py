from django.contrib import admin
from prs_forms.models import FormTemplate, FormField


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 0
    fields = ('field_id', 'name', 'label', 'field_type', 'required', 'order', 'default_value', 'is_active')
    ordering = ('order',)


@admin.register(FormTemplate)
class FormTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'version_number', 'is_active', 'created_by', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    fields = ('id', 'name', 'version_number', 'is_active', 'created_by', 'created_at', 'updated_at')
    inlines = [FormFieldInline]
    
    def save_model(self, request, obj, form, change):
        # Ensure clean() is called for validation
        # Note: Multiple active templates per name are allowed
        # The effective template is determined by TeamPurchaseConfig
        obj.full_clean()
        super().save_model(request, obj, form, change)


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = ('template', 'field_id', 'name', 'label', 'field_type', 'required', 'order', 'is_active')
    list_filter = ('field_type', 'required', 'is_active')
    search_fields = ('field_id', 'name', 'label', 'template__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('template', 'order')
