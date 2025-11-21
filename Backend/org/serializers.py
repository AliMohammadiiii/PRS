from typing import List, Dict, Any
from rest_framework import serializers
from org.models import OrgNode, CompanyClassification
from classifications.serializers import LookupSerializer
from classifications.models import Lookup
from reports.models import ReportGroup


class OrgNodeParentSerializer(serializers.ModelSerializer):
    """Simple serializer for parent node - only returns id and name"""
    class Meta:
        model = OrgNode
        fields = ['id', 'name']
        read_only_fields = ['id', 'name']


class OrgNodeSerializer(serializers.ModelSerializer):
    parent = OrgNodeParentSerializer(read_only=True)
    parent_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    # Read-only nested representations for lookups
    org_type = LookupSerializer(read_only=True)
    legal_entity_type = LookupSerializer(read_only=True)
    industry = LookupSerializer(read_only=True)
    sub_industry = LookupSerializer(read_only=True)

    # Write-only fields for lookups by id
    org_type_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    legal_entity_type_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    industry_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    sub_industry_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    # Company classifications - read-only nested, write-only by ids
    company_classifications = serializers.SerializerMethodField()
    company_classification_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        allow_null=True
    )
    
    def get_company_classifications(self, obj) -> List[Dict[str, Any]]:
        """Return list of classification lookups for this company"""
        classifications = obj.company_classifications.filter(
            is_active=True,
            classification__is_active=True
        ).select_related('classification')
        return [LookupSerializer(cc.classification).data for cc in classifications]

    class Meta:
        model = OrgNode
        fields = [
            'id',
            'parent',
            'parent_id',
            'node_type',
            'name',
            'code',
            'registration_number',
            'national_id',
            'economic_code',
            'incorporation_date',
            'website_url',
            'org_type',
            'org_type_id',
            'legal_entity_type',
            'legal_entity_type_id',
            'industry',
            'industry_id',
            'sub_industry',
            'sub_industry_id',
            'company_classifications',
            'company_classification_ids',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'node_type', 'code', 'created_at', 'updated_at']

    def create(self, validated_data):
        parent_id = validated_data.pop('parent_id', None)
        classification_ids = validated_data.pop('company_classification_ids', []) or []
        lookup_ids = {
            'org_type_id': 'org_type',
            'legal_entity_type_id': 'legal_entity_type',
            'industry_id': 'industry',
            'sub_industry_id': 'sub_industry',
        }
        for write_key, field_name in lookup_ids.items():
            lookup_uuid = validated_data.pop(write_key, None)
            if lookup_uuid:
                validated_data[field_name] = Lookup.objects.get(id=lookup_uuid)
        if parent_id:
            validated_data['parent'] = OrgNode.objects.get(id=parent_id)
        instance = super().create(validated_data)
        
        # Create company classifications
        if classification_ids:
            for classification_id in classification_ids:
                CompanyClassification.objects.get_or_create(
                    company=instance,
                    classification_id=classification_id
                )
        
        return instance

    def update(self, instance, validated_data):
        parent_id = validated_data.pop('parent_id', None)
        classification_ids = validated_data.pop('company_classification_ids', None)
        lookup_ids = {
            'org_type_id': 'org_type',
            'legal_entity_type_id': 'legal_entity_type',
            'industry_id': 'industry',
            'sub_industry_id': 'sub_industry',
        }
        for write_key, field_name in lookup_ids.items():
            if write_key in validated_data:
                lookup_uuid = validated_data.pop(write_key)
                setattr(instance, field_name, Lookup.objects.get(id=lookup_uuid) if lookup_uuid else None)
        
        if parent_id is not None:
            instance.parent = OrgNode.objects.get(id=parent_id) if parent_id else None
        
        instance = super().update(instance, validated_data)
        
        # Update company classifications if provided
        if classification_ids is not None:
            # Remove existing classifications
            instance.company_classifications.all().delete()
            # Add new classifications
            for classification_id in classification_ids:
                CompanyClassification.objects.get_or_create(
                    company=instance,
                    classification_id=classification_id
                )
        
        return instance


class CompanyClassificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyClassification
        fields = ['id', 'company', 'classification', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']




