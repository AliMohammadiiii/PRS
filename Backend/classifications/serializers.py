from rest_framework import serializers
from classifications.models import LookupType, Lookup


class LookupTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LookupType
        fields = ['id', 'code', 'title', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LookupSerializer(serializers.ModelSerializer):
    # Represent type by its code on read/write
    type = serializers.SlugRelatedField(slug_field='code', queryset=LookupType.objects.all())

    class Meta:
        model = Lookup
        fields = ['id', 'type', 'code', 'title', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']









