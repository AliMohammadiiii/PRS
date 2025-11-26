from rest_framework import serializers
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
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


