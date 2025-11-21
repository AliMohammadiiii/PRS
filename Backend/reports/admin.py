from django.contrib import admin
from reports.models import ReportGroup, ReportBox, ReportField


@admin.register(ReportGroup)
class ReportGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    search_fields = ('name',)
    list_filter = ('is_active',)
    readonly_fields = ('created_at', 'updated_at')


class ReportFieldInline(admin.TabularInline):
    model = ReportField
    extra = 0


@admin.register(ReportBox)
class ReportBoxAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'intercompany', 'is_active')
    search_fields = ('code', 'name')
    list_filter = ('intercompany', 'is_active')
    inlines = [ReportFieldInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ReportField)
class ReportFieldAdmin(admin.ModelAdmin):
    list_display = ('report', 'field_id', 'name', 'data_type', 'required', 'is_active')
    search_fields = ('field_id', 'name', 'report__code')
    list_filter = ('data_type', 'required', 'is_active')
    readonly_fields = ('created_at', 'updated_at')

from django.contrib import admin

# Register your models here.
