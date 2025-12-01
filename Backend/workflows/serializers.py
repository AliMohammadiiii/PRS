from rest_framework import serializers
from workflows.models import (
    Workflow, WorkflowStep, WorkflowStepApprover,
    WorkflowTemplate, WorkflowTemplateStep, WorkflowTemplateStepApprover
)
from classifications.models import Lookup


class WorkflowStepApproverSerializer(serializers.ModelSerializer):
    """Serializer for workflow step approver roles"""
    role_code = serializers.CharField(source='role.code', read_only=True)
    role_title = serializers.CharField(source='role.title', read_only=True)
    
    class Meta:
        model = WorkflowStepApprover
        fields = [
            'id',
            'step',
            'role',
            'role_code',
            'role_title',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowStepSerializer(serializers.ModelSerializer):
    """Serializer for workflow steps with approvers"""
    approvers = WorkflowStepApproverSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowStep
        fields = [
            'id',
            'workflow',
            'step_name',
            'step_order',
            'is_finance_review',
            'approvers',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowStepCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflow steps"""
    role_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text='List of COMPANY_ROLE lookup IDs to assign as approver roles for this step'
    )
    
    class Meta:
        model = WorkflowStep
        fields = [
            'id',
            'step_name',
            'step_order',
            'is_finance_review',
            'role_ids',
        ]
        read_only_fields = ['id']
    
    def validate_step_order(self, value):
        """Ensure step order is positive"""
        if value < 1:
            raise serializers.ValidationError('Step order must be at least 1.')
        return value


class WorkflowStepUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating workflow steps"""
    role_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text='List of COMPANY_ROLE lookup IDs to assign as approver roles for this step'
    )
    
    class Meta:
        model = WorkflowStep
        fields = [
            'id',
            'step_name',
            'step_order',
            'is_finance_review',
            'role_ids',
        ]
        read_only_fields = ['id']


class WorkflowSerializer(serializers.ModelSerializer):
    """Base serializer for workflows"""
    class Meta:
        model = Workflow
        fields = [
            'id',
            'team',
            'name',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_active', 'created_at', 'updated_at']


class WorkflowCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflows"""
    steps = WorkflowStepCreateSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = Workflow
        fields = [
            'id',
            'team',
            'name',
            'steps',
        ]
        read_only_fields = ['id']
    
    def validate_team(self, value):
        """Ensure team is active and doesn't already have a workflow"""
        if not value.is_active:
            raise serializers.ValidationError('Team must be active.')
        
        # Check if team already has an active workflow
        existing = Workflow.objects.filter(team=value, is_active=True)
        if self.instance:
            existing = existing.exclude(id=self.instance.id)
        if existing.exists():
            raise serializers.ValidationError('Team already has an active workflow.')
        
        return value


class WorkflowUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating workflows"""
    steps = WorkflowStepCreateSerializer(many=True, required=False, write_only=True)
    
    class Meta:
        model = Workflow
        fields = [
            'id',
            'team',
            'name',
            'steps',
        ]
        read_only_fields = ['id', 'team']


class WorkflowDetailSerializer(serializers.ModelSerializer):
    """Serializer for reading workflows with nested steps"""
    steps = serializers.SerializerMethodField()
    team_name = serializers.CharField(source='team.name', read_only=True)
    
    class Meta:
        model = Workflow
        fields = [
            'id',
            'team',
            'team_name',
            'name',
            'steps',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_active', 'steps', 'created_at', 'updated_at']
    
    def get_steps(self, obj):
        """Get steps ordered by step_order"""
        steps = WorkflowStep.objects.filter(workflow=obj, is_active=True).order_by('step_order')
        return WorkflowStepSerializer(steps, many=True).data


# =============================================================================
# WORKFLOW TEMPLATE SERIALIZERS
# =============================================================================

class WorkflowTemplateStepApproverSerializer(serializers.ModelSerializer):
    """Serializer for workflow template step approver roles"""
    role_code = serializers.CharField(source='role.code', read_only=True)
    role_title = serializers.CharField(source='role.title', read_only=True)
    
    class Meta:
        model = WorkflowTemplateStepApprover
        fields = [
            'id',
            'step',
            'role',
            'role_code',
            'role_title',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowTemplateStepSerializer(serializers.ModelSerializer):
    """Serializer for workflow template steps with approvers"""
    approvers = WorkflowTemplateStepApproverSerializer(many=True, read_only=True)
    
    class Meta:
        model = WorkflowTemplateStep
        fields = [
            'id',
            'workflow_template',
            'step_name',
            'step_order',
            'is_finance_review',
            'approvers',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowTemplateStepMinimalSerializer(serializers.ModelSerializer):
    """Minimal serializer for workflow template steps (for list views)"""
    class Meta:
        model = WorkflowTemplateStep
        fields = [
            'id',
            'step_name',
            'step_order',
            'is_finance_review',
        ]


class WorkflowTemplateStepCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflow template steps"""
    role_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text='List of COMPANY_ROLE lookup IDs to assign as approver roles for this step'
    )
    
    class Meta:
        model = WorkflowTemplateStep
        fields = [
            'id',
            'step_name',
            'step_order',
            'is_finance_review',
            'role_ids',
        ]
        read_only_fields = ['id']
    
    def validate_step_order(self, value):
        """Ensure step order is positive"""
        if value < 1:
            raise serializers.ValidationError('Step order must be at least 1.')
        return value


class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """Base serializer for workflow templates"""
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id',
            'name',
            'version_number',
            'description',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'version_number', 'is_active', 'created_at', 'updated_at']


class WorkflowTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating workflow templates"""
    steps = WorkflowTemplateStepSerializer(many=True, required=False, read_only=True)
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id',
            'name',
            'description',
            'steps',
        ]
        read_only_fields = ['id']
    
    def validate_name(self, value):
        """Ensure name is provided and not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError('Template name is required.')
        return value.strip()


class WorkflowTemplateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating workflow templates"""
    steps = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        write_only=True,
        help_text='List of steps to update (validated separately in the view)'
    )
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id',
            'name',
            'description',
            'steps',
        ]
        read_only_fields = ['id', 'version_number']
    
    def validate(self, attrs):
        """Validate the serializer data"""
        # Steps are validated separately in the view, so remove them from attrs
        attrs.pop('steps', None)
        return attrs


class WorkflowTemplateListSerializer(serializers.ModelSerializer):
    """Serializer for listing workflow templates (minimal info)"""
    step_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id',
            'name',
            'version_number',
            'step_count',
            'is_active',
        ]
    
    def get_step_count(self, obj):
        return obj.steps.filter(is_active=True).count()


class WorkflowTemplateDetailSerializer(serializers.ModelSerializer):
    """Serializer for workflow template with nested steps"""
    steps = serializers.SerializerMethodField()
    
    class Meta:
        model = WorkflowTemplate
        fields = [
            'id',
            'name',
            'version_number',
            'description',
            'steps',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'is_active', 'steps', 'created_at', 'updated_at']
    
    def get_steps(self, obj):
        """Get steps ordered by step_order"""
        # The view prefetches steps with is_active=True filter and step_order ordering
        # When prefetched, obj.steps.all() returns the prefetched queryset
        # When not prefetched, we filter and order manually
        # Django will use the prefetched data if available, otherwise it queries
        steps = obj.steps.filter(is_active=True).order_by('step_order')
        return WorkflowTemplateStepSerializer(steps, many=True).data


