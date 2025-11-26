from django.contrib import admin
from attachments.models import AttachmentCategory, Attachment


@admin.register(AttachmentCategory)
class AttachmentCategoryAdmin(admin.ModelAdmin):
    list_display = ('team', 'name', 'required', 'is_active')
    list_filter = ('team', 'required', 'is_active')
    search_fields = ('name', 'team__name')
    readonly_fields = ('id', 'created_at', 'updated_at')
    fields = ('id', 'team', 'name', 'required', 'is_active', 'created_at', 'updated_at')


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('request', 'category', 'filename', 'file_type', 'uploaded_by', 'upload_date')
    list_filter = ('request__team', 'category', 'file_type', 'upload_date')
    search_fields = ('filename', 'request__subject', 'request__id')
    readonly_fields = ('id', 'request', 'category', 'filename', 'file_path', 'file_size', 'file_type', 'uploaded_by', 'upload_date', 'created_at', 'updated_at', 'is_active')
    fields = (
        'id', 'request', 'category', 'filename', 'file_path', 'file_size', 
        'file_type', 'uploaded_by', 'upload_date', 'is_active', 
        'created_at', 'updated_at'
    )


