from django.contrib import admin
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover


class WorkflowStepApproverInline(admin.TabularInline):
    model = WorkflowStepApprover
    extra = 0
    fields = ('approver', 'is_active')
    autocomplete_fields = ('approver',)


class WorkflowStepInline(admin.TabularInline):
    model = WorkflowStep
    extra = 0
    fields = ('step_name', 'step_order', 'is_finance_review', 'is_active')
    ordering = ('step_order',)


@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ('team', 'name', 'is_active', 'created_at')
    list_filter = ('team', 'is_active')
    search_fields = ('name', 'team__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fields = ('id', 'team', 'name', 'is_active', 'created_at', 'updated_at')
    inlines = [WorkflowStepInline]
    
    def save_model(self, request, obj, form, change):
        # Ensure clean() is called to validate team is active
        obj.full_clean()
        super().save_model(request, obj, form, change)


@admin.register(WorkflowStep)
class WorkflowStepAdmin(admin.ModelAdmin):
    list_display = ('workflow', 'step_name', 'step_order', 'is_finance_review', 'is_active')
    list_filter = ('workflow__team', 'is_finance_review', 'is_active')
    search_fields = ('step_name', 'workflow__name', 'workflow__team__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    ordering = ('workflow', 'step_order')
    inlines = [WorkflowStepApproverInline]
    
    def save_model(self, request, obj, form, change):
        # Ensure clean() is called to validate exactly one finance review step
        obj.full_clean()
        super().save_model(request, obj, form, change)


@admin.register(WorkflowStepApprover)
class WorkflowStepApproverAdmin(admin.ModelAdmin):
    list_display = ('step', 'approver', 'is_active')
    list_filter = ('step__workflow__team', 'step__workflow', 'is_active')
    search_fields = ('step__step_name', 'step__workflow__name', 'approver__username', 'approver__email')
    readonly_fields = ('id', 'created_at', 'updated_at')
    autocomplete_fields = ('approver',)

