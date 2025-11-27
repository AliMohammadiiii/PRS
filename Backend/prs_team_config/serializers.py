from rest_framework import serializers
from prs_team_config.models import TeamPurchaseConfig
from teams.models import Team
from teams.serializers import TeamSerializer
from prs_forms.models import FormTemplate
from prs_forms.serializers import FormFieldSerializer, FormTemplateDetailSerializer
from workflows.models import WorkflowTemplate, WorkflowTemplateStep
from workflows.serializers import (
    WorkflowTemplateSerializer,
    WorkflowTemplateDetailSerializer,
    WorkflowTemplateStepMinimalSerializer
)
from classifications.models import Lookup
from classifications.serializers import LookupSerializer


class TeamPurchaseConfigSerializer(serializers.ModelSerializer):
    """Serializer for team purchase configuration"""
    purchase_type_detail = LookupSerializer(source='purchase_type', read_only=True)
    form_template_name = serializers.SerializerMethodField()
    workflow_template_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamPurchaseConfig
        fields = [
            'id',
            'team',
            'purchase_type',
            'purchase_type_detail',
            'form_template',
            'form_template_name',
            'workflow_template',
            'workflow_template_name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_form_template_name(self, obj):
        if obj.form_template:
            name = obj.form_template.name or f'v{obj.form_template.version_number}'
            return f'{name} (v{obj.form_template.version_number})'
        return None
    
    def get_workflow_template_name(self, obj):
        if obj.workflow_template:
            return obj.workflow_template.name
        return None


class TeamPurchaseConfigListSerializer(serializers.ModelSerializer):
    """Serializer for listing team purchase configurations"""
    purchase_type = LookupSerializer(read_only=True)
    form_template = serializers.SerializerMethodField()
    workflow_template = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamPurchaseConfig
        fields = [
            'id',
            'purchase_type',
            'form_template',
            'workflow_template',
            'is_active',
        ]
    
    def get_form_template(self, obj):
        if obj.form_template:
            return {
                'id': str(obj.form_template.id),
                'name': obj.form_template.name or f'v{obj.form_template.version_number}',
                'version_number': obj.form_template.version_number,
            }
        return None
    
    def get_workflow_template(self, obj):
        if obj.workflow_template:
            return {
                'id': str(obj.workflow_template.id),
                'name': obj.workflow_template.name,
                'version_number': obj.workflow_template.version_number,
            }
        return None


class TeamPurchaseConfigCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating team purchase configurations"""
    
    class Meta:
        model = TeamPurchaseConfig
        fields = [
            'id',
            'team',
            'purchase_type',
            'form_template',
            'workflow_template',
            'is_active',
        ]
        read_only_fields = ['id']
    
    def validate(self, attrs):
        """Validate the configuration"""
        team = attrs.get('team')
        purchase_type = attrs.get('purchase_type')
        form_template = attrs.get('form_template')
        workflow_template = attrs.get('workflow_template')
        is_active = attrs.get('is_active', True)
        
        # Templates are team-agnostic - no need to validate team matching
        
        # Check for existing active config (if creating an active one)
        if is_active:
            existing = TeamPurchaseConfig.objects.filter(
                team=team,
                purchase_type=purchase_type,
                is_active=True
            )
            if self.instance:
                existing = existing.exclude(pk=self.instance.pk)
            if existing.exists():
                raise serializers.ValidationError(
                    'An active configuration already exists for this team and purchase type. '
                    'Please deactivate the existing one first.'
                )
        
        return attrs


class FormTemplateMinimalSerializer(serializers.ModelSerializer):
    """Minimal form template serializer for effective template response"""
    fields = FormFieldSerializer(many=True, read_only=True)
    
    class Meta:
        model = FormTemplate
        fields = [
            'id',
            'name',
            'version_number',
            'fields',
        ]


class WorkflowTemplateMinimalSerializer(serializers.ModelSerializer):
    """Minimal workflow template serializer for effective template response"""
    steps = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id',
            'name',
            'version_number',
            'steps',
        ]
    
    def get_steps(self, obj):
        """Get steps ordered by step_order"""
        steps = WorkflowTemplateStep.objects.filter(
            workflow_template=obj,
            is_active=True
        ).order_by('step_order')
        return [{
            'order': step.step_order,
            'name': step.step_name,
            'is_finance_review': step.is_finance_review,
        } for step in steps]


class EffectiveTemplateSerializer(serializers.Serializer):
    """Serializer for effective template response"""
    team = serializers.SerializerMethodField()
    purchase_type = LookupSerializer()
    form_template = FormTemplateMinimalSerializer()
    workflow_template = WorkflowTemplateMinimalSerializer()
    
    def get_team(self, obj):
        return {
            'id': str(obj['team'].id),
            'name': obj['team'].name,
        }
