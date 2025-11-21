from django.contrib import admin
from submissions.models import Submission, SubmissionFieldValue, ReportSubmissionGroup


class SubmissionFieldValueInline(admin.TabularInline):
    model = SubmissionFieldValue
    extra = 0


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('report', 'company', 'financial_period', 'status', 'is_active')
    list_filter = ('status', 'financial_period', 'is_active')
    search_fields = ('report__code', 'company__name')
    inlines = [SubmissionFieldValueInline]
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SubmissionFieldValue)
class SubmissionFieldValueAdmin(admin.ModelAdmin):
    list_display = ('submission', 'field', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('submission__report__code', 'field__field_id')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(ReportSubmissionGroup)
class ReportSubmissionGroupAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'financial_period', 'reporting_period', 'status', 'is_active')
    list_filter = ('status', 'financial_period', 'is_active')
    search_fields = ('title', 'company__name')
    readonly_fields = ('created_at', 'updated_at')
