from django.db.models import Max
from prs_forms.models import FormTemplate, FormField


def clone_form_template(old_template, new_name=None, created_by=None):
    """
    Creates a new version of a form template by cloning it with all fields.
    
    Args:
        old_template: FormTemplate instance to clone
        new_name: Optional name for the new template (defaults to old template name)
        created_by: Optional User instance to set as created_by (defaults to old template's created_by)
    
    Returns:
        New FormTemplate instance with incremented version_number
    
    Note:
        - The new template will have is_active=True
        - All fields are copied from the old template
        - The old template should be deactivated separately if needed
    """
    # Get the next version number for this template name
    name = new_name or old_template.name
    max_version = FormTemplate.objects.filter(name=name).aggregate(
        max_ver=Max('version_number')
    )['max_ver'] or 0
    version_number = max_version + 1
    
    # Create new template
    new_template = FormTemplate.objects.create(
        name=name,
        version_number=version_number,
        created_by=created_by or old_template.created_by,
        is_active=True
    )
    
    # Get all active fields from the old template, ordered by order
    old_fields = FormField.objects.filter(
        template=old_template,
        is_active=True
    ).order_by('order')
    
    # Copy each field
    for old_field in old_fields:
        FormField.objects.create(
            template=new_template,
            field_id=old_field.field_id,
            name=old_field.name,
            label=old_field.label,
            field_type=old_field.field_type,
            required=old_field.required,
            order=old_field.order,
            default_value=old_field.default_value,
            validation_rules=old_field.validation_rules.copy() if old_field.validation_rules else {},
            help_text=old_field.help_text,
            dropdown_options=old_field.dropdown_options.copy() if old_field.dropdown_options else None,
            is_active=True
        )
    
    return new_template


def detect_form_changes(old_template, new_fields_data):
    """
    Detects if there are any changes between an existing form template and new fields data.
    
    Args:
        old_template: FormTemplate instance to compare against
        new_fields_data: List of dicts containing field data (from request.data)
    
    Returns:
        bool: True if changes detected, False otherwise
    
    Changes detected:
        - Different number of fields
        - Modified field properties (field_id, name, label, field_type, required, order, etc.)
    """
    # Get current fields
    old_fields = FormField.objects.filter(
        template=old_template,
        is_active=True
    ).order_by('order')
    
    old_fields_list = list(old_fields)
    
    # Compare field count
    if len(old_fields_list) != len(new_fields_data):
        return True
    
    # Create a mapping of field_id to field for easy lookup
    old_fields_by_id = {field.field_id: field for field in old_fields_list}
    
    # Compare each field
    for new_field_data in new_fields_data:
        field_id = new_field_data.get('field_id')
        old_field = old_fields_by_id.get(field_id)
        
        if not old_field:
            # New field_id not found in old template
            return True
        
        # Compare field properties
        if (old_field.name != new_field_data.get('name') or
            old_field.label != new_field_data.get('label') or
            old_field.field_type != new_field_data.get('field_type') or
            old_field.required != new_field_data.get('required', False) or
            old_field.order != new_field_data.get('order', 0) or
            old_field.default_value != new_field_data.get('default_value') or
            old_field.help_text != new_field_data.get('help_text')):
            return True
        
        # Compare validation_rules (JSON field)
        old_validation = old_field.validation_rules or {}
        new_validation = new_field_data.get('validation_rules', {}) or {}
        if old_validation != new_validation:
            return True
        
        # Compare dropdown_options (for DROPDOWN fields)
        if old_field.field_type == FormField.DROPDOWN:
            old_dropdown = old_field.dropdown_options or []
            new_dropdown = new_field_data.get('dropdown_options', []) or []
            if old_dropdown != new_dropdown:
                return True
    
    return False

