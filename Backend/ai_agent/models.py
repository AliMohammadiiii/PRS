from django.db import models
from core.models import BaseModel
from accounts.models import User
from purchase_requests.models import PurchaseRequest


class ChatThread(BaseModel):
    """
    Chat thread model for AI agent conversations.
    
    Links conversations to purchase requests (optional) and tracks participants.
    """
    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="chat_threads"
    )
    participants = models.ManyToManyField(
        User,
        related_name="chat_threads"
    )
    title = models.CharField(max_length=255, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-last_message_at', '-created_at']
    
    def __str__(self):
        if self.request:
            return f"Thread {self.id} – PR {self.request_id}"
        return f"Thread {self.id}"


class ChatMessage(BaseModel):
    """
    Chat message model for AI agent conversations.
    
    Stores messages from users, AI, or system with optional metadata.
    """
    class SenderType(models.TextChoices):
        USER = "USER", "User"
        AI = "AI", "AI"
        SYSTEM = "SYSTEM", "System"
    
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        related_name="messages"
    )
    sender_type = models.CharField(max_length=16, choices=SenderType.choices)
    sender_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    content = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        if len(self.content) > 30:
            return self.content[:30] + "..."
        return self.content


class AIExecutionTrace(BaseModel):
    """
    AI execution trace model for tracking AI agent processing steps.
    
    Stores input/output payloads and confidence scores for debugging and analysis.
    """
    thread = models.ForeignKey(
        ChatThread,
        on_delete=models.CASCADE,
        related_name="ai_traces"
    )
    step_name = models.CharField(max_length=128)
    input_payload = models.JSONField(default=dict, blank=True)
    output_payload = models.JSONField(default=dict, blank=True)
    confidence = models.FloatField(null=True, blank=True)
    
    class Meta:
        ordering = ['created_at']
