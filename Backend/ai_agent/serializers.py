"""
Serializers for ai_agent models.
"""
from rest_framework import serializers
from django.utils import timezone
from accounts.models import User
from ai_agent.models import ChatThread, ChatMessage


class ParticipantSerializer(serializers.ModelSerializer):
    """Basic user serializer for thread participants"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name']
        read_only_fields = ['id', 'username', 'first_name', 'last_name']


class ChatThreadSerializer(serializers.ModelSerializer):
    """Serializer for ChatThread with annotations"""
    request = serializers.UUIDField(source='request_id', read_only=True, allow_null=True)
    participants = ParticipantSerializer(many=True, read_only=True)
    message_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    request_id = serializers.SerializerMethodField()
    request_code = serializers.SerializerMethodField()
    request_status = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatThread
        fields = [
            'id',
            'title',
            'request',
            'last_message_at',
            'participants',
            'message_count',
            'last_message_preview',
            'request_id',
            'request_code',
            'request_status',
        ]
        read_only_fields = ['id', 'last_message_at']
    
    def get_message_count(self, obj):
        """Get message count - use annotation if available, otherwise query"""
        if hasattr(obj, 'message_count'):
            return obj.message_count
        return obj.messages.count()
    
    def get_last_message_preview(self, obj):
        """Get last message preview truncated to 40 characters"""
        last_message = obj.messages.order_by('-created_at').first()
        if last_message and last_message.content:
            content = last_message.content
            if len(content) > 40:
                return content[:40]
            return content
        return ""
    
    def get_request_id(self, obj):
        """Get request ID (UUID) as string if thread is linked to a PR"""
        if obj.request_id:
            return str(obj.request_id)
        return None
    
    def get_request_code(self, obj):
        """Get request code (same as request_id, UUID) for display"""
        if obj.request_id:
            return str(obj.request_id)
        return None
    
    def get_request_status(self, obj):
        """Get request status code if thread is linked to a PR"""
        if obj.request_id and obj.request and obj.request.status:
            return getattr(obj.request.status, 'code', str(obj.request.status))
        return None


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for ChatMessage"""
    sender_user = ParticipantSerializer(read_only=True, allow_null=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id',
            'sender_type',
            'sender_user',
            'content',
            'metadata',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ChatMessageCreateSerializer(serializers.Serializer):
    """Serializer for creating ChatMessage (POST only)"""
    sender_type = serializers.CharField(required=False, write_only=True)
    content = serializers.CharField(required=True)
    metadata = serializers.JSONField(required=False, allow_null=True, default=dict)
    
    def validate(self, attrs):
        """Force sender_type to USER for user-created messages"""
        # Ignore sender_type from request, always set to USER
        attrs['sender_type'] = ChatMessage.SenderType.USER
        return attrs
    
    def create(self, validated_data):
        """Create the ChatMessage and update thread.last_message_at"""
        thread = self.context['thread']
        user = self.context['request'].user
        
        validated_data.pop('sender_type', None)  # Already handled in validate
        
        message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.USER,
            sender_user=user,
            content=validated_data['content'],
            metadata=validated_data.get('metadata', {})
        )
        
        # Update thread.last_message_at
        thread.last_message_at = timezone.now()
        thread.save(update_fields=['last_message_at'])
        
        return message


class OrchestratorResultSerializer(serializers.Serializer):
    """Serializer for OrchestratorResult"""
    final_intent = serializers.CharField()
    confidence = serializers.FloatField()
    handler_name = serializers.CharField()
    handler_result = serializers.JSONField()
    debug = serializers.JSONField()

