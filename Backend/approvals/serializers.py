from rest_framework import serializers
from approvals.models import ApprovalHistory
from attachments.serializers import AttachmentSerializer


class ApprovalHistorySerializer(serializers.ModelSerializer):
    """Serializer for approval history records"""
    step_name = serializers.SerializerMethodField()
    approver_name = serializers.SerializerMethodField()
    role_code = serializers.CharField(source='role.code', read_only=True)
    role_title = serializers.CharField(source='role.title', read_only=True)
    action = serializers.ChoiceField(choices=ApprovalHistory.ACTION_CHOICES, read_only=True)
    comment = serializers.CharField(read_only=True, allow_null=True)
    timestamp = serializers.DateTimeField(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = ApprovalHistory
        fields = [
            'id',
            'step_name',
            'approver_name',
            'role_code',
            'role_title',
            'action',
            'comment',
            'timestamp',
            'attachments',
        ]
        read_only_fields = ['id', 'step_name', 'approver_name', 'role_code', 'role_title', 'action', 'comment', 'timestamp', 'attachments']

    def get_step_name(self, obj):
        """Get step name from either template_step or step"""
        if obj.template_step:
            return obj.template_step.step_name
        elif obj.step:
            return obj.step.step_name
        return 'Unknown'

    def get_approver_name(self, obj):
        """Get approver's full name or username"""
        if obj.approver:
            full_name = f"{obj.approver.first_name or ''} {obj.approver.last_name or ''}".strip()
            return full_name if full_name else obj.approver.username
        return 'Unknown'


