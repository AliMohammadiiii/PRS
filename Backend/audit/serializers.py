from rest_framework import serializers
from audit.models import AuditEvent, FieldChange
from reports.serializers import ReportFieldSerializer


class FieldChangeSerializer(serializers.ModelSerializer):
    field = ReportFieldSerializer(read_only=True, allow_null=True)
    form_field = serializers.SerializerMethodField()
    field_name = serializers.CharField(read_only=True)

    class Meta:
        model = FieldChange
        fields = [
            'id',
            'field',
            'form_field',
            'field_name',
            'old_value',
            'new_value',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_form_field(self, obj):
        """Return form field information if exists"""
        if obj.form_field:
            from prs_forms.serializers import FormFieldSerializer
            return FormFieldSerializer(obj.form_field).data
        return None


class AuditActorSerializer(serializers.Serializer):
    """Simple serializer for actor information in audit events"""
    id = serializers.UUIDField(read_only=True)
    username = serializers.CharField(read_only=True)
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class AuditEventSerializer(serializers.ModelSerializer):
    actor = AuditActorSerializer(read_only=True)
    field_changes = FieldChangeSerializer(many=True, read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            'id',
            'event_type',
            'actor',
            'submission',
            'request',
            'metadata',
            'field_changes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

