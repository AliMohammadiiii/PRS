from rest_framework import serializers
from prs_forms.models import FormTemplate, FormField
from teams.models import Team


class FormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormField
        fields = [
            'id',
            'field_id',
            'name',
            'label',
            'field_type',
            'required',
            'order',
            'default_value',
            'help_text',
            'dropdown_options',
        ]
        read_only_fields = ['id']


class TeamMinimalSerializer(serializers.ModelSerializer):
    """Minimal team representation for nested use in FormTemplateDetailSerializer"""
    class Meta:
        model = Team
        fields = ['id', 'name']
        read_only_fields = ['id', 'name']


class FormTemplateSerializer(serializers.ModelSerializer):
    """Base serializer for form template"""
    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'team',
            'version_number',
            'is_active',
            'created_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'version_number', 'is_active', 'created_by', 'created_at', 'updated_at']


class FormTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating form templates"""
    fields = FormFieldSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'team',
            'fields',
        ]
        read_only_fields = ['id']
    
    def validate_team(self, value):
        """Ensure team is active"""
        if not value.is_active:
            raise serializers.ValidationError('Team must be active.')
        return value


class FormTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating form templates"""
    fields = FormFieldSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'team',
            'fields',
        ]
        read_only_fields = ['id', 'team']


class FormTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for active form template with nested fields (team is handled separately in view)"""
    fields = FormFieldSerializer(many=True, read_only=True)

    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'team',
            'version_number',
            'is_active',
            'created_by',
            'fields',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'version_number', 'is_active', 'created_by', 'fields', 'created_at', 'updated_at']


class FormFieldCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating form fields"""
    class Meta:
        model = FormField
        fields = [
            'id',
            'field_id',
            'name',
            'label',
            'field_type',
            'required',
            'order',
            'default_value',
            'validation_rules',
            'help_text',
            'dropdown_options',
        ]
        read_only_fields = ['id']
    
    def validate_field_type(self, value):
        """Ensure field type is valid"""
        valid_types = [FormField.TEXT, FormField.NUMBER, FormField.DATE, FormField.BOOLEAN, 
                      FormField.DROPDOWN, FormField.FILE_UPLOAD]
        if value not in valid_types:
            raise serializers.ValidationError(f'Invalid field type. Must be one of: {valid_types}')
        return value
    
    def validate(self, attrs):
        """Validate dropdown options if field type is DROPDOWN"""
        if attrs.get('field_type') == FormField.DROPDOWN:
            dropdown_options = attrs.get('dropdown_options')
            if not dropdown_options or not isinstance(dropdown_options, list):
                raise serializers.ValidationError({
                    'dropdown_options': 'Dropdown fields must have dropdown_options as a list.'
                })
        return attrs


class FormFieldUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating form fields"""
    class Meta:
        model = FormField
        fields = [
            'id',
            'field_id',
            'name',
            'label',
            'field_type',
            'required',
            'order',
            'default_value',
            'validation_rules',
            'help_text',
            'dropdown_options',
        ]
        read_only_fields = ['id']
    
    def validate_field_type(self, value):
        """Ensure field type is valid"""
        valid_types = [FormField.TEXT, FormField.NUMBER, FormField.DATE, FormField.BOOLEAN, 
                      FormField.DROPDOWN, FormField.FILE_UPLOAD]
        if value not in valid_types:
            raise serializers.ValidationError(f'Invalid field type. Must be one of: {valid_types}')
        return value
    
    def validate(self, attrs):
        """Validate dropdown options if field type is DROPDOWN"""
        if attrs.get('field_type') == FormField.DROPDOWN:
            dropdown_options = attrs.get('dropdown_options')
            if not dropdown_options or not isinstance(dropdown_options, list):
                raise serializers.ValidationError({
                    'dropdown_options': 'Dropdown fields must have dropdown_options as a list.'
                })
        return attrs

