from typing import List, Dict, Any
from django.db import transaction
from rest_framework import serializers
from submissions.models import Submission, SubmissionFieldValue, ReportSubmissionGroup
from reports.models import ReportField, ReportBox
from org.models import OrgNode
from periods.models import FinancialPeriod
from classifications.models import Lookup
from reports.serializers import ReportFieldSerializer, ReportBoxSerializer
from org.serializers import OrgNodeSerializer
from periods.serializers import FinancialPeriodSerializer
from classifications.serializers import LookupSerializer


class SubmissionFieldValueWriteSerializer(serializers.Serializer):
    field_id = serializers.UUIDField()
    value_number = serializers.DecimalField(required=False, max_digits=20, decimal_places=4)
    value_text = serializers.CharField(required=False, allow_blank=True)
    value_bool = serializers.BooleanField(required=False)
    value_date = serializers.DateField(required=False)
    # File uploads handled by DRF parsers; include for completeness
    value_file = serializers.FileField(required=False, allow_empty_file=False)
    entity_ref_uuid = serializers.UUIDField(required=False)

    def validate(self, attrs):
        # Normalize empty strings to None for value_text
        # This is critical because empty strings are not NULL in the database
        if 'value_text' in attrs:
            if attrs['value_text'] == '' or attrs['value_text'] is None:
                attrs['value_text'] = None
        
        # Ensure exactly one value is provided
        # Check all possible value fields
        value_keys = ['value_number', 'value_text', 'value_bool', 'value_date', 'value_file', 'entity_ref_uuid']
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


class SubmissionWriteSerializer(serializers.ModelSerializer):
    fields = SubmissionFieldValueWriteSerializer(many=True, write_only=True)
    report = serializers.UUIDField()
    company = serializers.UUIDField()
    financial_period = serializers.UUIDField()
    reporting_period = serializers.UUIDField()
    group = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = Submission
        fields = [
            'id',
            'report',
            'company',
            'financial_period',
            'reporting_period',
            'group',
            'fields',
        ]
        read_only_fields = ['id']

    def _get_lookup(self, code: str) -> Lookup:
        return Lookup.objects.get(type__code='REPORT_STATUS', code=code)
    
    def _get_status(self, context: dict) -> Lookup:
        # If status is provided in context, use it, otherwise default to DRAFT for new submissions
        status_code = context.get('status', 'DRAFT')
        return self._get_lookup(status_code)

    def _resolve_fk(self, model, pk):
        return model.objects.get(id=pk)

    def validate_unique(self, attrs):
        """
        Override validate_unique to skip unique_together validation for create operations.
        We handle existing submissions in create() using get_or_create, so we don't
        need to raise a validation error here for unique constraint violations.
        """
        # For create operations (no instance), skip unique_together validation
        # The create() method uses get_or_create which handles duplicates gracefully
        if not self.instance:
            # Skip unique_together validation - let create() handle it with get_or_create
            # Run parent validation but exclude unique_together check
            return attrs
        
        # For updates, run normal validation
        return super().validate_unique(attrs)

    @transaction.atomic
    def create(self, validated_data):
        fields_data = validated_data.pop('fields', [])
        report = self._resolve_fk(ReportBox, validated_data.pop('report'))
        company = self._resolve_fk(OrgNode, validated_data.pop('company'))
        financial_period = self._resolve_fk(FinancialPeriod, validated_data.pop('financial_period'))
        reporting_period = self._resolve_fk(Lookup, validated_data.pop('reporting_period'))
        status = self._get_status(self.context)
        
        # Handle ReportSubmissionGroup
        # If group_id is provided, use that group; otherwise get or create one
        group_id = validated_data.pop('group', None)
        if group_id:
            group = ReportSubmissionGroup.objects.get(id=group_id)
            # Validate that the group matches the submission's company, financial_period, and reporting_period
            if group.company != company or group.financial_period != financial_period or group.reporting_period != reporting_period:
                raise serializers.ValidationError(
                    'The provided group does not match the submission\'s company, financial_period, or reporting_period.'
                )
        else:
            # Get or create a group for this submission to avoid duplicates
            # Try to find an existing group with the same company, financial_period, and reporting_period
            # Prefer groups with DRAFT status, then any status
            draft_status = self._get_lookup('DRAFT')
            existing_group = ReportSubmissionGroup.objects.filter(
                company=company,
                financial_period=financial_period,
                reporting_period=reporting_period,
                status=draft_status
            ).first()
            
            if existing_group:
                group = existing_group
            else:
                # Check for any group with the same combination (even if different status)
                existing_group = ReportSubmissionGroup.objects.filter(
                    company=company,
                    financial_period=financial_period,
                    reporting_period=reporting_period
                ).first()
                
                if existing_group:
                    group = existing_group
                else:
                    # Create a new group only if none exists
                    default_title = f'{company.name} - {financial_period.title} - {reporting_period.title}'
                    group = ReportSubmissionGroup.objects.create(
                        company=company,
                        financial_period=financial_period,
                        reporting_period=reporting_period,
                        title=default_title,
                        description='',
                        status=draft_status,
                    )
        
        # Get or create Submission - handle existing submissions gracefully
        # For new submissions, ALWAYS start with DRAFT status
        draft_status = self._get_lookup('DRAFT')
        submission, created = Submission.objects.get_or_create(
            report=report,
            company=company,
            financial_period=financial_period,
            reporting_period=reporting_period,
            defaults={
                'status': draft_status,  # New submissions MUST start as DRAFT
                'submitted_by': self.context.get('request').user if self.context.get('request') else None,
                'group': group,
            }
        )
        
        # If submission already exists, update fields but preserve status appropriately
        if not created:
            # Don't change status if submission is APPROVED (immutable)
            # Don't downgrade from UNDER_REVIEW to DRAFT (preserve submission status)
            # Only update status if it's DRAFT and we're upgrading to UNDER_REVIEW
            if submission.status.code != 'APPROVED':
                if submission.status.code == 'DRAFT' and status.code == 'UNDER_REVIEW':
                    # Upgrade from DRAFT to UNDER_REVIEW (explicit submission)
                    submission.status = status
                    submission.save(update_fields=['status', 'updated_at'])
                # Otherwise, preserve existing status (don't downgrade or change)
            # Ensure group is set (in case it wasn't set before)
            if not submission.group:
                submission.group = group
                submission.save(update_fields=['group', 'updated_at'])
        
        # Update field values (works for both new and existing submissions)
        self._upsert_values(submission, fields_data)
        return submission

    @transaction.atomic
    def update(self, instance: Submission, validated_data):
        # Update fields only, don't change status unless explicitly requested
        fields_data = validated_data.pop('fields', [])
        self._upsert_values(instance, fields_data)
        # Only update status if it was previously rejected (to allow resubmission)
        if instance.status.code == 'REJECTED':
            instance.status = self._get_lookup('UNDER_REVIEW')
            instance.rejection_comment = None
            instance.save(update_fields=['status', 'rejection_comment', 'updated_at'])
        else:
            instance.save(update_fields=['updated_at'])
        return instance

    def _upsert_values(self, submission: Submission, fields_data: List[Dict[str, Any]]):
        # Create/update each value by field_id
        for item in fields_data:
            field = ReportField.objects.get(id=item['field_id'])
            
            # Get the values directly - validation ensures exactly one is provided and not None
            value_number = item.get('value_number')
            value_text = item.get('value_text')
            value_bool = item.get('value_bool')
            value_date = item.get('value_date')
            value_file = item.get('value_file')
            entity_ref_uuid = item.get('entity_ref_uuid')
            
            # Normalize empty strings to None for value_text (to satisfy database constraint)
            # This is critical because empty strings are not NULL in the database
            if value_text == '' or value_text is None:
                value_text = None
            
            # Determine which field has a non-None value (validation ensures exactly one)
            # For boolean, False is a valid value, so we check is not None
            # For text, empty string is normalized to None above
            has_value_number = value_number is not None
            has_value_text = value_text is not None
            has_value_bool = value_bool is not None
            has_value_date = value_date is not None
            has_value_file = value_file is not None
            has_entity_ref = entity_ref_uuid is not None
            
            # Try to get existing object first
            try:
                obj = SubmissionFieldValue.objects.get(submission=submission, field=field)
                # Update existing: clear all value fields first, then set the new one
                obj.value_number = None
                obj.value_text = None
                obj.value_bool = None
                obj.value_date = None
                obj.value_file = None
                obj.entity_ref_uuid = None
                
                # Set only the provided value (validation ensures exactly one)
                # Only set the field if it has a non-None value
                # Ensure we don't set empty strings for value_text
                values_set = 0
                if has_value_number and value_number is not None:
                    obj.value_number = value_number
                    values_set = 1
                elif has_value_text and value_text is not None and value_text != '':
                    obj.value_text = value_text
                    values_set = 1
                elif has_value_bool and value_bool is not None:
                    obj.value_bool = value_bool
                    values_set = 1
                elif has_value_date and value_date is not None:
                    obj.value_date = value_date
                    values_set = 1
                elif has_value_file and value_file is not None:
                    obj.value_file = value_file
                    values_set = 1
                elif has_entity_ref and entity_ref_uuid is not None:
                    obj.entity_ref_uuid = entity_ref_uuid
                    values_set = 1
                
                # Final safety check: ensure exactly one value is set
                if values_set != 1:
                    raise ValueError(f'Expected exactly one value to be set, but {values_set} values were set. This indicates a validation error.')
                
                # CRITICAL: Before saving, explicitly ensure all other fields are None
                # This prevents any edge cases where multiple values might be set
                # Store which field we're setting
                field_to_set = None
                if has_value_number and value_number is not None:
                    field_to_set = 'value_number'
                elif has_value_text and value_text is not None and value_text != '':
                    field_to_set = 'value_text'
                elif has_value_bool and value_bool is not None:
                    field_to_set = 'value_bool'
                elif has_value_date and value_date is not None:
                    field_to_set = 'value_date'
                elif has_value_file and value_file is not None:
                    field_to_set = 'value_file'
                elif has_entity_ref and entity_ref_uuid is not None:
                    field_to_set = 'entity_ref_uuid'
                
                # Now explicitly set all fields to None, then set only the one we want
                obj.value_number = None
                obj.value_text = None
                obj.value_bool = None
                obj.value_date = None
                obj.value_file = None
                obj.entity_ref_uuid = None
                
                # Set only the field we identified
                if field_to_set == 'value_number':
                    obj.value_number = value_number
                elif field_to_set == 'value_text':
                    obj.value_text = value_text
                elif field_to_set == 'value_bool':
                    obj.value_bool = value_bool
                elif field_to_set == 'value_date':
                    obj.value_date = value_date
                elif field_to_set == 'value_file':
                    obj.value_file = value_file
                elif field_to_set == 'entity_ref_uuid':
                    obj.entity_ref_uuid = entity_ref_uuid
                
                obj.save()
            except SubmissionFieldValue.DoesNotExist:
                # Create new: explicitly set all value fields to None first
                # This ensures the CHECK constraint is satisfied
                obj = SubmissionFieldValue(
                    submission=submission,
                    field=field,
                )
                
                # Explicitly set all value fields to None to ensure constraint satisfaction
                obj.value_number = None
                obj.value_text = None
                obj.value_bool = None
                obj.value_date = None
                obj.value_file = None
                obj.entity_ref_uuid = None
                
                # Set only the provided value (validation ensures exactly one)
                # Use normalized values and ensure we don't set empty strings
                values_set = 0
                if has_value_number:
                    obj.value_number = value_number
                    values_set = 1
                elif has_value_text and value_text is not None and value_text != '':
                    obj.value_text = value_text
                    values_set = 1
                elif has_value_bool:
                    obj.value_bool = value_bool
                    values_set = 1
                elif has_value_date:
                    obj.value_date = value_date
                    values_set = 1
                elif has_value_file:
                    obj.value_file = value_file
                    values_set = 1
                elif has_entity_ref:
                    obj.entity_ref_uuid = entity_ref_uuid
                    values_set = 1
                
                # Final safety check: ensure exactly one value is set
                if values_set != 1:
                    raise ValueError(f'Expected exactly one value to be set, but {values_set} values were set. This indicates a validation error.')
                
                # CRITICAL: Before saving, explicitly ensure all other fields are None
                # This prevents any edge cases where multiple values might be set
                # Store which field we're setting
                field_to_set = None
                if has_value_number:
                    field_to_set = 'value_number'
                elif has_value_text and value_text is not None and value_text != '':
                    field_to_set = 'value_text'
                elif has_value_bool:
                    field_to_set = 'value_bool'
                elif has_value_date:
                    field_to_set = 'value_date'
                elif has_value_file:
                    field_to_set = 'value_file'
                elif has_entity_ref:
                    field_to_set = 'entity_ref_uuid'
                
                # Now explicitly set all fields to None, then set only the one we want
                obj.value_number = None
                obj.value_text = None
                obj.value_bool = None
                obj.value_date = None
                obj.value_file = None
                obj.entity_ref_uuid = None
                
                # Set only the field we identified
                if field_to_set == 'value_number':
                    obj.value_number = value_number
                elif field_to_set == 'value_text':
                    obj.value_text = value_text
                elif field_to_set == 'value_bool':
                    obj.value_bool = value_bool
                elif field_to_set == 'value_date':
                    obj.value_date = value_date
                elif field_to_set == 'value_file':
                    obj.value_file = value_file
                elif field_to_set == 'entity_ref_uuid':
                    obj.entity_ref_uuid = entity_ref_uuid
                
                obj.save()


class SubmissionFieldValueReadSerializer(serializers.ModelSerializer):
    field = ReportFieldSerializer(read_only=True)

    class Meta:
        model = SubmissionFieldValue
        fields = [
            'id',
            'field',
            'value_number',
            'value_text',
            'value_bool',
            'value_date',
            'value_file',
            'entity_ref_uuid',
        ]
        read_only_fields = ['id']


class ReportSubmissionGroupBasicSerializer(serializers.ModelSerializer):
    """
    Basic serializer for ReportSubmissionGroup that doesn't include submissions.
    Used to avoid circular serialization when included in SubmissionReadSerializer.
    """
    company = OrgNodeSerializer(read_only=True, allow_null=True)
    financial_period = FinancialPeriodSerializer(read_only=True, allow_null=True)
    reporting_period = LookupSerializer(read_only=True, allow_null=True)
    status = LookupSerializer(read_only=True, allow_null=True)
    
    class Meta:
        model = ReportSubmissionGroup
        fields = [
            'id',
            'title',
            'description',
            'company',
            'financial_period',
            'reporting_period',
            'status',
            'submitted_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportSubmissionGroupSerializer(serializers.ModelSerializer):
    submissions = serializers.SerializerMethodField()
    status = LookupSerializer(read_only=True)
    
    class Meta:
        model = ReportSubmissionGroup
        fields = [
            'id',
            'title',
            'description',
            'company',
            'financial_period',
            'reporting_period',
            'status',
            'submitted_by',
            'submissions',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set default status to DRAFT if not provided
        if 'status' not in validated_data or validated_data['status'] is None:
            try:
                draft_status = Lookup.objects.get(type__code='REPORT_STATUS', code='DRAFT')
                validated_data['status'] = draft_status
            except Lookup.DoesNotExist:
                # If DRAFT status doesn't exist, create without status (shouldn't happen in production)
                pass
        return super().create(validated_data)
    
    def get_submissions(self, obj) -> List[Dict[str, Any]]:
        # Lazy import to avoid circular dependency at class definition time
        # At runtime when this method is called, SubmissionReadSerializer is already defined
        submissions = obj.submissions.all()
        # Get the class from the current module's namespace
        import sys
        current_module = sys.modules[__name__]
        SubmissionReadSerializer = getattr(current_module, 'SubmissionReadSerializer')
        return SubmissionReadSerializer(submissions, many=True).data


class SubmissionReadSerializer(serializers.ModelSerializer):
    report = ReportBoxSerializer(read_only=True)
    company = OrgNodeSerializer(read_only=True)
    financial_period = FinancialPeriodSerializer(read_only=True)
    reporting_period = LookupSerializer(read_only=True)
    status = LookupSerializer(read_only=True)
    values = SubmissionFieldValueReadSerializer(many=True, read_only=True)
    group = ReportSubmissionGroupBasicSerializer(read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id',
            'report',
            'company',
            'financial_period',
            'reporting_period',
            'status',
            'rejection_comment',
            'values',
            'group',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


