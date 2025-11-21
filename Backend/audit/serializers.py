from rest_framework import serializers
from audit.models import AuditEvent, FieldChange
from reports.serializers import ReportFieldSerializer


class FieldChangeSerializer(serializers.ModelSerializer):
    field = ReportFieldSerializer(read_only=True)

    class Meta:
        model = FieldChange
        fields = [
            'id',
            'field',
            'old_value',
            'new_value',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


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
            'metadata',
            'field_changes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

