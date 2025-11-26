from rest_framework import serializers
from approvals.models import ApprovalHistory


class ApprovalHistorySerializer(serializers.ModelSerializer):
    """Serializer for approval history records"""
    step_name = serializers.CharField(source='step.step_name', read_only=True)
    approver_name = serializers.SerializerMethodField()
    action = serializers.ChoiceField(choices=ApprovalHistory.ACTION_CHOICES, read_only=True)
    comment = serializers.CharField(read_only=True, allow_null=True)
    timestamp = serializers.DateTimeField(read_only=True)

    class Meta:
        model = ApprovalHistory
        fields = [
            'id',
            'step_name',
            'approver_name',
            'action',
            'comment',
            'timestamp',
        ]
        read_only_fields = ['id', 'step_name', 'approver_name', 'action', 'comment', 'timestamp']

    def get_approver_name(self, obj):
        """Get approver's full name or username"""
        if obj.approver:
            full_name = f"{obj.approver.first_name or ''} {obj.approver.last_name or ''}".strip()
            return full_name if full_name else obj.approver.username
        return 'Unknown'


