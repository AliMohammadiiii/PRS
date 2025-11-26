from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from teams.models import Team


class TeamSerializer(serializers.ModelSerializer):
    """Base serializer for reading teams"""
    class Meta:
        model = Team
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']


class TeamCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating teams"""
    class Meta:
        model = Team
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']
    
    def validate_name(self, value):
        """Ensure team name is unique and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('Team name cannot be empty.')
        # Check for duplicate active teams
        existing = Team.objects.filter(name__iexact=value.strip(), is_active=True)
        if existing.exists():
            raise serializers.ValidationError(f'A team with name "{value}" already exists.')
        return value.strip()


class TeamUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating teams"""
    class Meta:
        model = Team
        fields = ['id', 'name', 'description']
        read_only_fields = ['id']
    
    def validate_name(self, value):
        """Ensure team name is unique and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('Team name cannot be empty.')
        # Check for duplicate active teams (excluding current instance)
        existing = Team.objects.filter(name__iexact=value.strip(), is_active=True)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        if existing.exists():
            raise serializers.ValidationError(f'A team with name "{value}" already exists.')
        return value.strip()

