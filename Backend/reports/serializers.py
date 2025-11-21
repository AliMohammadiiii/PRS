from rest_framework import serializers
from reports.models import ReportGroup, ReportBox, ReportField
from classifications.serializers import LookupSerializer


class ReportGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportGroup
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportField
        fields = [
            'id',
            'report',
            'field_id',
            'name',
            'help_text',
            'required',
            'data_type',
            'entity_ref_type',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportBoxSerializer(serializers.ModelSerializer):
    fields = ReportFieldSerializer(many=True, read_only=True)
    classifications = LookupSerializer(many=True, read_only=True)

    class Meta:
        model = ReportBox
        fields = [
            'id',
            'code',
            'name',
            'description',
            'intercompany',
            'groups',
            'classifications',
            'fields',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']









