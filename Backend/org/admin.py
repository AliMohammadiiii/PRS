from django.contrib import admin
from org.models import OrgNode, CompanyClassification


@admin.register(OrgNode)
class OrgNodeAdmin(admin.ModelAdmin):
    list_display = ('name', 'node_type', 'code', 'economic_code', 'is_active')
    list_filter = ('node_type', 'is_active')
    search_fields = ('name', 'code', 'economic_code', 'registration_number', 'national_id')
    readonly_fields = ('created_at', 'updated_at')
    filter_horizontal = ('report_groups',)


@admin.register(CompanyClassification)
class CompanyClassificationAdmin(admin.ModelAdmin):
    list_display = ('company', 'classification', 'is_active')
    list_filter = ('classification', 'is_active')
    search_fields = ('company__name',)
    readonly_fields = ('created_at', 'updated_at')

from django.contrib import admin

# Register your models here.
