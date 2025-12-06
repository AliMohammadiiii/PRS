from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MaxValueValidator
from core.models import BaseModel


class AttachmentCategory(BaseModel):
    """
    Attachment category definition per team for Purchase Request System.
    
    Categories can be marked as required or optional.
    Required attachment categories (required=True) apply to all form templates of that team.
    Used to validate required attachments on request submission.
    
    TODO: Future version may introduce per-template attachment requirements.
    """
    team = models.ForeignKey('teams.Team', on_delete=models.CASCADE, related_name='attachment_categories')
    name = models.CharField(max_length=128)
    required = models.BooleanField(default=False, help_text='If True, at least one attachment of this category is required on submission')

    class Meta:
        unique_together = ('team', 'name')
        indexes = [
            models.Index(fields=['team', 'is_active']),
        ]
        ordering = ['team', 'name']

    def clean(self):
        # Team must be active
        if self.team and not self.team.is_active:
            raise ValidationError('Team must be active.')

    def __str__(self) -> str:
        return f'{self.team.name} - {self.name}'


class Attachment(BaseModel):
    """
    File attachment for a purchase request in Purchase Request System.
    
    Files are stored with versioning - new versions are added without removing old ones.
    Allowed file types: PDF, JPG, JPEG, PNG, DOC, DOCX, XLSX, XLS
    Maximum file size: 10 MB per file
    Used to satisfy FILE_UPLOAD form fields and team-defined attachment categories.
    Can also be linked to approval history entries (for attachments added during submit/approve/reject/complete actions).
    """
    request = models.ForeignKey('purchase_requests.PurchaseRequest', on_delete=models.CASCADE, related_name='attachments')
    category = models.ForeignKey(AttachmentCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='attachments')
    approval_history = models.ForeignKey(
        'approvals.ApprovalHistory',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attachments',
        help_text='Optional link to approval history entry if attachment was added during submit/approve/reject/complete action'
    )
    
    # File information
    filename = models.CharField(max_length=255, help_text='Original filename')
    file_path = models.FileField(upload_to='request_attachments/', validators=[
        FileExtensionValidator(allowed_extensions=['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xlsx', 'xls']),
    ])
    file_size = models.PositiveIntegerField(help_text='File size in bytes')
    file_type = models.CharField(max_length=32, help_text='MIME type or file extension')
    
    # Metadata
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='uploaded_attachments')
    upload_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['request', 'category']),
            models.Index(fields=['request', 'upload_date']),
            models.Index(fields=['approval_history']),
        ]
        ordering = ['request', '-upload_date']

    def clean(self):
        # Request must exist
        if self.request and not self.request.is_active:
            raise ValidationError('Request must be active.')
        # File size validation (10 MB = 10 * 1024 * 1024 bytes)
        max_size = 10 * 1024 * 1024
        if self.file_size and self.file_size > max_size:
            raise ValidationError(f'File size cannot exceed {max_size / (1024 * 1024)} MB.')
        # Category must belong to the request's team
        if self.category and self.request and self.category.team != self.request.team:
            raise ValidationError('Attachment category must belong to the request\'s team.')

    def __str__(self) -> str:
        return f'{self.request} - {self.filename}'

