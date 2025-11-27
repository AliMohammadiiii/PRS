from rest_framework import serializers
from prs_forms.models import FormTemplate, FormField


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


class FormTemplateSerializer(serializers.ModelSerializer):
    """Base serializer for form template"""
    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'name',
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
            'name',
            'fields',
        ]
        read_only_fields = ['id']
    
    def validate_name(self, value):
        """Ensure name is provided and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('Template name is required.')
        return value.strip()


class FormTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating form templates"""
    fields = FormFieldSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'name',
            'fields',
        ]
        read_only_fields = ['id', 'name']


class FormTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for active form template with nested fields"""
    fields = FormFieldSerializer(many=True, read_only=True)

    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'name',
            'version_number',
            'is_active',
            'created_by',
            'fields',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'name', 'version_number', 'is_active', 'created_by', 'fields', 'created_at', 'updated_at']


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

