from django.db import models
from django.core.exceptions import ValidationError
from core.models import BaseModel


class FormTemplate(BaseModel):
    """
    General form template with versioning for Purchase Request System.
    
    Form templates are team-agnostic and can be assigned to multiple teams
    via TeamPurchaseConfig. The effective template for a given (team, purchase_type)
    is selected via TeamPurchaseConfig.
    Changes create new versions; existing requests keep old template references.
    """
    name = models.CharField(max_length=128, help_text='Name for the template')
    version_number = models.PositiveIntegerField(default=1)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='created_form_templates')

    class Meta:
        unique_together = ('name', 'version_number')
        indexes = [
            models.Index(fields=['name', 'version_number']),
            models.Index(fields=['name', 'is_active']),
        ]
        ordering = ['name', '-version_number']

    def clean(self):
        # No team validation needed - templates are team-agnostic
        # NOTE: Multiple active templates per name are allowed.
        # The effective template is determined by TeamPurchaseConfig.
        pass

    def save(self, *args, **kwargs):
        # Ensure clean() is called for validation
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.name} - v{self.version_number}'


class FormField(BaseModel):
    """
    Field definition within a form template for Purchase Request System.
    
    Supports multiple field types: TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN, FILE_UPLOAD.
    Note: FILE_UPLOAD fields are satisfied via Attachment records, not stored in RequestFieldValue.
    """
    TEXT = 'TEXT'
    NUMBER = 'NUMBER'
    DATE = 'DATE'
    BOOLEAN = 'BOOLEAN'
    DROPDOWN = 'DROPDOWN'
    FILE_UPLOAD = 'FILE_UPLOAD'
    
    FIELD_TYPE_CHOICES = [
        (TEXT, 'Text'),
        (NUMBER, 'Number'),
        (DATE, 'Date'),
        (BOOLEAN, 'Boolean'),
        (DROPDOWN, 'Dropdown'),
        (FILE_UPLOAD, 'File Upload'),
    ]

    template = models.ForeignKey(FormTemplate, on_delete=models.CASCADE, related_name='fields')
    field_id = models.CharField(max_length=64)
    name = models.CharField(max_length=128)
    label = models.CharField(max_length=128)
    field_type = models.CharField(max_length=16, choices=FIELD_TYPE_CHOICES)
    required = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    default_value = models.TextField(null=True, blank=True)
    validation_rules = models.JSONField(default=dict, blank=True)
    help_text = models.TextField(null=True, blank=True)
    # For DROPDOWN type, store options as JSON
    dropdown_options = models.JSONField(default=list, blank=True, null=True)

    class Meta:
        unique_together = ('template', 'field_id')
        indexes = [
            models.Index(fields=['template', 'field_id']),
            models.Index(fields=['template', 'order']),
        ]
        ordering = ['template', 'order']

    def clean(self):
        # If field_type is DROPDOWN, dropdown_options must be provided
        if self.field_type == self.DROPDOWN:
            if not self.dropdown_options or not isinstance(self.dropdown_options, list):
                raise ValidationError('Dropdown fields must have dropdown_options as a list.')
        else:
            # Clear dropdown_options if not a dropdown field
            if self.dropdown_options:
                self.dropdown_options = None

    def __str__(self) -> str:
        return f'{self.template} - {self.field_id}'

