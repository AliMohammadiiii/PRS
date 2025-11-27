from django.contrib import admin
from prs_team_config.models import TeamPurchaseConfig


@admin.register(TeamPurchaseConfig)
class TeamPurchaseConfigAdmin(admin.ModelAdmin):
    """Admin for TeamPurchaseConfig - mapping team + purchase type to templates"""
    
    list_display = (
        'team',
        'get_purchase_type_code',
        'get_form_template_name',
        'get_workflow_template_name',
        'is_active',
        'created_at',
    )
    list_filter = ('team', 'purchase_type', 'is_active')
    search_fields = (
        'team__name',
        'purchase_type__code',
        'purchase_type__title',
        'form_template__name',
        'workflow_template__name',
    )
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    fieldsets = (
        (None, {
            'fields': ('id', 'team', 'purchase_type')
        }),
        ('Templates', {
            'fields': ('form_template', 'workflow_template'),
            'description': 'Select the form and workflow templates to use for this team and purchase type combination.'
        }),
        ('Status', {
            'fields': ('is_active',),
            'description': 'Only one active configuration is allowed per team + purchase type.'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_purchase_type_code(self, obj):
        return obj.purchase_type.code if obj.purchase_type else '-'
    get_purchase_type_code.short_description = 'Purchase Type'
    get_purchase_type_code.admin_order_field = 'purchase_type__code'
    
    def get_form_template_name(self, obj):
        if obj.form_template:
            name = obj.form_template.name or f'v{obj.form_template.version_number}'
            return name
        return '-'
    get_form_template_name.short_description = 'Form Template'
    
    def get_workflow_template_name(self, obj):
        if obj.workflow_template:
            return obj.workflow_template.name
        return '-'
    get_workflow_template_name.short_description = 'Workflow Template'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter form_template and workflow_template to show only templates for the selected team"""
        # Note: This doesn't dynamically filter based on team selection in the form
        # Full dynamic filtering would require custom JavaScript
        # The clean() validation on the model will catch mismatches
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def save_model(self, request, obj, form, change):
        # Ensure clean() is called to validate constraints
        obj.full_clean()
        super().save_model(request, obj, form, change)
