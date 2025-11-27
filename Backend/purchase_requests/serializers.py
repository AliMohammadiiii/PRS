from typing import List, Dict, Any
from django.db import transaction
from rest_framework import serializers
from purchase_requests.models import PurchaseRequest, RequestFieldValue
from prs_forms.models import FormField
from teams.models import Team
from teams.serializers import TeamSerializer
from prs_forms.serializers import FormFieldSerializer
from classifications.models import Lookup
from classifications.serializers import LookupSerializer
from workflows.models import WorkflowStep, WorkflowTemplateStep
from purchase_requests import services


class PurchaseRequestFieldValueWriteSerializer(serializers.Serializer):
    """Serializer for writing field values in purchase requests"""
    field_id = serializers.UUIDField()
    value_number = serializers.DecimalField(required=False, max_digits=20, decimal_places=4, allow_null=True)
    value_text = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    value_bool = serializers.BooleanField(required=False, allow_null=True)
    value_date = serializers.DateField(required=False, allow_null=True)
    value_dropdown = serializers.JSONField(required=False, allow_null=True)

    def validate(self, attrs):
        # Normalize empty strings to None for value_text
        if 'value_text' in attrs:
            if attrs['value_text'] == '' or attrs['value_text'] is None:
                attrs['value_text'] = None
        
        # Ensure exactly one value is provided (excluding FILE_UPLOAD which uses Attachment)
        value_keys = ['value_number', 'value_text', 'value_bool', 'value_date', 'value_dropdown']
        provided = []
        for key in value_keys:
            val = attrs.get(key)
            # For boolean, False is a valid value, so check is not None
            # For text, we've normalized empty strings to None above
            # For others, check is not None
            if val is not None:
                # Double-check for empty strings that might have slipped through
                if key == 'value_text' and val == '':
                    attrs['value_text'] = None
                else:
                    provided.append(key)
        
        if len(provided) != 1:
            raise serializers.ValidationError(
                f'Exactly one value must be provided for each field. Found: {provided}'
            )
        return attrs


class PurchaseRequestFieldValueReadSerializer(serializers.ModelSerializer):
    """Serializer for reading field values in purchase requests"""
    field = FormFieldSerializer(read_only=True)
    field_id = serializers.UUIDField(source='field.id', read_only=True)

    class Meta:
        model = RequestFieldValue
        fields = [
            'id',
            'field_id',
            'field',
            'value_number',
            'value_text',
            'value_bool',
            'value_date',
            'value_dropdown',
        ]
        read_only_fields = ['id', 'field_id', 'field']


class PurchaseRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating draft purchase requests"""
    team_id = serializers.UUIDField(write_only=True)
    purchase_type = serializers.CharField(write_only=True, help_text='Purchase type code (e.g., "SERVICE")')

    class Meta:
        model = PurchaseRequest
        fields = [
            'id',
            'team_id',
            'vendor_name',
            'vendor_account',
            'subject',
            'description',
            'purchase_type',
        ]
        read_only_fields = ['id']

    def validate_team_id(self, value):
        """Validate that team exists and is active"""
        try:
            team = Team.objects.get(id=value, is_active=True)
        except Team.DoesNotExist:
            raise serializers.ValidationError('Team not found or is not active.')
        return value

    def validate_purchase_type(self, value):
        """Validate that purchase type lookup exists"""
        try:
            Lookup.objects.get(type__code='PURCHASE_TYPE', code=value, is_active=True)
        except Lookup.DoesNotExist:
            raise serializers.ValidationError(f'Purchase type "{value}" not found.')
        return value

    def _get_lookup(self, type_code: str, code: str) -> Lookup:
        """Helper to get lookup by type and code"""
        return Lookup.objects.get(type__code=type_code, code=code, is_active=True)

    @transaction.atomic
    def create(self, validated_data):
        """
        Create a draft purchase request.
        
        Uses TeamPurchaseConfig to resolve the form_template and workflow_template
        based on the team + purchase_type combination.
        """
        team_id = validated_data.pop('team_id')
        purchase_type_code = validated_data.pop('purchase_type')
        
        # Get team
        team = Team.objects.get(id=team_id)
        
        # Get purchase type lookup
        purchase_type = self._get_lookup('PURCHASE_TYPE', purchase_type_code)
        
        # Try to get active TeamPurchaseConfig for this team + purchase_type
        from prs_team_config.models import TeamPurchaseConfig
        try:
            config = TeamPurchaseConfig.objects.get(
                team=team,
                purchase_type=purchase_type,
                is_active=True
            )
            form_template = config.form_template
            workflow_template = config.workflow_template
        except TeamPurchaseConfig.DoesNotExist:
            # Fallback: try to get any active form template for the team
            # and no workflow template (legacy behavior)
            from prs_forms.models import FormTemplate
            try:
                form_template = FormTemplate.objects.filter(
                    team=team,
                    is_active=True
                ).first()
                if not form_template:
                    raise serializers.ValidationError(
                        f'No active procurement configuration found for team "{team.name}" and '
                        f'purchase type "{purchase_type_code}". '
                        'Please contact an administrator to configure this team.'
                    )
                workflow_template = None  # Legacy mode: workflow resolved at submit time
            except FormTemplate.DoesNotExist:
                raise serializers.ValidationError(
                    f'No active procurement configuration found for team "{team.name}" and '
                    f'purchase type "{purchase_type_code}". '
                    'Please contact an administrator to configure this team.'
                )
        
        # Get status lookup
        status = self._get_lookup('REQUEST_STATUS', 'DRAFT')
        
        # Create purchase request
        purchase_request = PurchaseRequest.objects.create(
            requestor=self.context['request'].user,
            team=team,
            form_template=form_template,
            workflow_template=workflow_template,
            status=status,
            purchase_type=purchase_type,
            **validated_data
        )
        
        # Note: Audit event creation is handled in the view
        return purchase_request


class PurchaseRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating purchase requests (top-level fields + field values)"""
    field_values = PurchaseRequestFieldValueWriteSerializer(many=True, required=False, write_only=True)
    purchase_type = serializers.CharField(required=False, help_text='Purchase type code')

    class Meta:
        model = PurchaseRequest
        fields = [
            'vendor_name',
            'vendor_account',
            'subject',
            'description',
            'purchase_type',
            'field_values',
        ]

    def validate_purchase_type(self, value):
        """Validate that purchase type lookup exists"""
        if value:
            try:
                Lookup.objects.get(type__code='PURCHASE_TYPE', code=value, is_active=True)
            except Lookup.DoesNotExist:
                raise serializers.ValidationError(f'Purchase type "{value}" not found.')
        return value

    def _get_lookup(self, type_code: str, code: str) -> Lookup:
        """Helper to get lookup by type and code"""
        return Lookup.objects.get(type__code=type_code, code=code, is_active=True)

    def validate(self, attrs):
        """
        Object-level validation.

        - If field_values are provided, ensure all referenced fields
          belong to the request's form_template and are active.
        """
        # NOTE: instance is required for this validation to work correctly.
        # In our usage (partial_update on an existing PurchaseRequest),
        # instance will always be present.
        instance: PurchaseRequest = getattr(self, 'instance', None)
        field_values_data = attrs.get('field_values') or []

        if instance and field_values_data:
            # Collect field_ids from payload
            field_ids = [fv['field_id'] for fv in field_values_data]

            # Map of valid form fields for this request's template
            valid_fields = {
                f.id: f
                for f in FormField.objects.filter(
                    template=instance.form_template,
                    id__in=field_ids,
                    is_active=True,
                )
            }

            missing_fields = set(field_ids) - set(valid_fields.keys())
            if missing_fields:
                # Raise a DRF ValidationError so callers see the problem at
                # serializer validation time (before touching the database).
                raise serializers.ValidationError(
                    f'Fields {list(missing_fields)} do not belong to this request\'s form template.'
                )

        return super().validate(attrs)

    @transaction.atomic
    def update(self, instance: PurchaseRequest, validated_data):
        """Update purchase request top-level fields and field values"""
        field_values_data = validated_data.pop('field_values', [])
        purchase_type_code = validated_data.pop('purchase_type', None)
        request = self.context.get('request')
        skip_audit = self.context.get('skip_audit', False)
        top_level_changes = []
        field_value_changes = []

        # Track changes for audit BEFORE applying updates (only if we are
        # responsible for audit logging in this call).
        if not skip_audit:
            top_level_fields = ['vendor_name', 'vendor_account', 'subject', 'description', 'purchase_type']
            top_level_changes = services.track_top_level_field_changes(
                instance=instance,
                validated_data=validated_data,
                top_level_fields=top_level_fields,
            )

            if field_values_data:
                field_value_changes = services.track_field_value_changes(
                    request=instance,
                    fields_data=field_values_data,
                )
        
        # Update purchase type if provided
        if purchase_type_code:
            purchase_type = self._get_lookup('PURCHASE_TYPE', purchase_type_code)
            validated_data['purchase_type'] = purchase_type
        
        # Update top-level fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Upsert field values (tracking changes for audit)
        if field_values_data:
            self._upsert_field_values(instance, field_values_data)

        # Create audit event if there were changes and we are not skipping
        if not skip_audit and (top_level_changes or field_value_changes) and request is not None:
            services.create_audit_event_for_request_updated(
                purchase_request=instance,
                actor=request.user,
                top_level_changes=top_level_changes,
                field_value_changes=field_value_changes,
            )

        return instance

    def _upsert_field_values(self, request: PurchaseRequest, fields_data: List[Dict[str, Any]]):
        """Create or update RequestFieldValue entries"""
        # At this point validate() has already ensured that all field_ids
        # belong to the request's form_template and are active, so we can
        # safely fetch them without re-validating.
        form_fields = {
            f.id: f
            for f in FormField.objects.filter(
                template=request.form_template,
                id__in=[fv['field_id'] for fv in fields_data],
                is_active=True,
            )
        }

        for field_data in fields_data:
            field_id = field_data['field_id']
            field = form_fields[field_id]
            
            # Skip FILE_UPLOAD fields (handled via Attachment)
            if field.field_type == FormField.FILE_UPLOAD:
                continue
            
            # Get value based on field type
            value_text = field_data.get('value_text')
            value_number = field_data.get('value_number')
            value_bool = field_data.get('value_bool')
            value_date = field_data.get('value_date')
            value_dropdown = field_data.get('value_dropdown')
            
            # Normalize value_text empty strings
            if value_text == '':
                value_text = None
            
            # Try to get existing RequestFieldValue
            try:
                obj = RequestFieldValue.objects.get(request=request, field=field)
                
                # Track changes
                old_value_str = None
                new_value_str = None
                
                if field.field_type == FormField.TEXT:
                    old_value = obj.value_text
                    obj.value_text = value_text
                    old_value_str = str(old_value) if old_value else None
                    new_value_str = str(value_text) if value_text else None
                elif field.field_type == FormField.NUMBER:
                    old_value = obj.value_number
                    obj.value_number = value_number
                    old_value_str = str(old_value) if old_value else None
                    new_value_str = str(value_number) if value_number else None
                elif field.field_type == FormField.BOOLEAN:
                    old_value = obj.value_bool
                    obj.value_bool = value_bool
                    old_value_str = str(old_value) if old_value is not None else None
                    new_value_str = str(value_bool) if value_bool is not None else None
                elif field.field_type == FormField.DATE:
                    old_value = obj.value_date
                    obj.value_date = value_date
                    old_value_str = str(old_value) if old_value else None
                    new_value_str = str(value_date) if value_date else None
                elif field.field_type == FormField.DROPDOWN:
                    old_value = obj.value_dropdown
                    obj.value_dropdown = value_dropdown
                    old_value_str = str(old_value) if old_value else None
                    new_value_str = str(value_dropdown) if value_dropdown else None
                
                # Only update if value changed
                if old_value_str != new_value_str:
                    obj.save()
                    
            except RequestFieldValue.DoesNotExist:
                # Create new RequestFieldValue
                obj = RequestFieldValue(
                    request=request,
                    field=field,
                )
                
                # Explicitly set all value fields to None first
                obj.value_number = None
                obj.value_text = None
                obj.value_bool = None
                obj.value_date = None
                obj.value_dropdown = None
                
                # Set the appropriate value based on field type
                if field.field_type == FormField.TEXT:
                    obj.value_text = value_text
                    new_value_str = str(value_text) if value_text else None
                elif field.field_type == FormField.NUMBER:
                    obj.value_number = value_number
                    new_value_str = str(value_number) if value_number else None
                elif field.field_type == FormField.BOOLEAN:
                    obj.value_bool = value_bool
                    new_value_str = str(value_bool) if value_bool is not None else None
                elif field.field_type == FormField.DATE:
                    obj.value_date = value_date
                    new_value_str = str(value_date) if value_date else None
                elif field.field_type == FormField.DROPDOWN:
                    obj.value_dropdown = value_dropdown
                    new_value_str = str(value_dropdown) if value_dropdown else None
                
                obj.save()


class PurchaseRequestReadSerializer(serializers.ModelSerializer):
    """Serializer for reading purchase requests"""
    team = TeamSerializer(read_only=True)
    form_template_id = serializers.UUIDField(source='form_template.id', read_only=True)
    workflow_template_id = serializers.UUIDField(source='workflow_template.id', read_only=True, allow_null=True)
    status = LookupSerializer(read_only=True)
    purchase_type = LookupSerializer(read_only=True)
    # Legacy step fields (for backward compatibility)
    current_step_id = serializers.UUIDField(source='current_step.id', read_only=True, allow_null=True)
    current_step_name = serializers.CharField(source='current_step.step_name', read_only=True, allow_null=True)
    # Template step fields (for new requests)
    current_template_step_id = serializers.UUIDField(source='current_template_step.id', read_only=True, allow_null=True)
    current_template_step_name = serializers.CharField(source='current_template_step.step_name', read_only=True, allow_null=True)
    # Unified current step fields (returns whichever is set)
    effective_step_id = serializers.SerializerMethodField()
    effective_step_name = serializers.SerializerMethodField()
    field_values = PurchaseRequestFieldValueReadSerializer(many=True, read_only=True)
    attachments_count = serializers.SerializerMethodField()
    requestor_name = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = [
            'id',
            'requestor',
            'requestor_name',
            'team',
            'form_template_id',
            'workflow_template_id',
            'status',
            'current_step_id',
            'current_step_name',
            'current_template_step_id',
            'current_template_step_name',
            'effective_step_id',
            'effective_step_name',
            'vendor_name',
            'vendor_account',
            'subject',
            'description',
            'purchase_type',
            'submitted_at',
            'completed_at',
            'rejection_comment',
            'field_values',
            'attachments_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_attachments_count(self, obj):
        """Get count of attachments for this request"""
        return obj.attachments.filter(is_active=True).count()

    def get_requestor_name(self, obj):
        """Get requestor's display name (full name or username)"""
        if obj.requestor:
            if obj.requestor.first_name or obj.requestor.last_name:
                full_name = f"{obj.requestor.first_name or ''} {obj.requestor.last_name or ''}".strip()
                return full_name if full_name else obj.requestor.username
            return obj.requestor.username
        return None

    def get_effective_step_id(self, obj):
        """Get the effective current step ID (template or legacy)"""
        if obj.current_template_step:
            return str(obj.current_template_step.id)
        if obj.current_step:
            return str(obj.current_step.id)
        return None

    def get_effective_step_name(self, obj):
        """Get the effective current step name (template or legacy)"""
        if obj.current_template_step:
            return obj.current_template_step.step_name
        if obj.current_step:
            return obj.current_step.step_name
        return None

