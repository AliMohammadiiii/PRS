"""
Views for ai_agent API endpoints.
"""
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, NotFound
from django.db.models import Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from ai_agent.models import ChatThread, ChatMessage
from ai_agent.serializers import (
    ChatThreadSerializer,
    ChatMessageSerializer,
    ChatMessageCreateSerializer,
    OrchestratorResultSerializer,
)
from ai_agent.orchestrator import run_orchestrator, OrchestratorResult
from ai_agent.llm_client import get_default_llm_client


class ChatThreadListView(APIView):
    """GET /api/ai/threads/ - List threads user participates in
       POST /api/ai/threads/ - Create a new thread"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Return threads where request.user is in participants"""
        user = request.user
        
        # Get threads where user is a participant
        threads = ChatThread.objects.filter(
            participants=user,
            is_active=True
        ).prefetch_related('participants', 'messages').annotate(
            message_count=Count('messages')
        ).order_by('-last_message_at', '-created_at')
        
        serializer = ChatThreadSerializer(threads, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request):
        """Create a new thread with the current user as a participant"""
        user = request.user
        
        # Get optional title from request
        title = request.data.get('title', '').strip()
        
        # Create new thread
        thread = ChatThread.objects.create(
            title=title,  # Empty string is allowed (blank=True in model)
            request_id=request.data.get('request'),  # Optional purchase request link
        )
        
        # Add current user as participant
        thread.participants.add(user)
        
        # Serialize and return
        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatThreadDetailView(APIView):
    """GET /api/ai/threads/{thread_id}/ - Get thread detail"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, thread_id):
        """Return thread detail if user is a participant"""
        try:
            thread = ChatThread.objects.prefetch_related('participants', 'messages').annotate(
                message_count=Count('messages')
            ).get(id=thread_id, is_active=True)
        except ChatThread.DoesNotExist:
            raise NotFound("Thread not found")
        
        # Check if user is a participant
        if request.user not in thread.participants.all():
            raise PermissionDenied("You do not have permission to access this thread")
        
        serializer = ChatThreadSerializer(thread, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ChatMessageListView(APIView):
    """GET/POST /api/ai/threads/{thread_id}/messages/ - List messages or create new message"""
    permission_classes = [IsAuthenticated]
    
    def get_thread(self, thread_id):
        """Get thread and check permissions"""
        try:
            thread = ChatThread.objects.get(id=thread_id, is_active=True)
        except ChatThread.DoesNotExist:
            raise NotFound("Thread not found")
        
        # Check if user is a participant
        if self.request.user not in thread.participants.all():
            raise PermissionDenied("You do not have permission to access this thread")
        
        return thread
    
    def get(self, request, thread_id):
        """Return messages sorted by created_at (oldest to newest)"""
        thread = self.get_thread(thread_id)
        
        # Get messages ordered by created_at (ascending - oldest first)
        messages = thread.messages.all().order_by('created_at').select_related('sender_user')
        
        serializer = ChatMessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def post(self, request, thread_id):
        """Create a new message and update thread.last_message_at"""
        thread = self.get_thread(thread_id)
        
        # Create serializer with thread and request context
        serializer = ChatMessageCreateSerializer(
            data=request.data,
            context={'thread': thread, 'request': request}
        )
        
        if serializer.is_valid():
            message = serializer.save()
            response_serializer = ChatMessageSerializer(message, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def build_ai_message_content_from_result(result: OrchestratorResult) -> str:
    """
    Build AI message content from orchestrator result.
    
    Very simple v1 implementation, can be improved later.
    
    Args:
        result: OrchestratorResult instance
    
    Returns:
        String content for the AI message
    """
    intent = result.final_intent
    action = result.handler_result.get("action")
    handler_result = result.handler_result
    
    # Handle fill_missing_data intent
    if intent == "fill_missing_data" and action == "ask_user_for_more_info":
        missing_fields = handler_result.get("missing_fields") or []
        missing_attachments = handler_result.get("missing_attachments") or []
        parts = []
        
        if missing_fields:
            parts.append(f"Please provide values for: {', '.join(missing_fields)}.")
        
        if missing_attachments:
            parts.append(f"Please upload attachments for: {', '.join(missing_attachments)}.")
        
        return " ".join(parts) if parts else "I need some more information to continue."
    
    # Handle summarize_request intent
    if intent == "summarize_request" and action == "summary":
        return handler_result.get("summary_text", "Summary not available.")
    
    # Handle approve_step intent
    if intent == "approve_step" and action == "approve_step":
        if "error" in handler_result:
            error = handler_result.get("error")
            if error == "no_request_linked":
                return "I cannot approve a step because no purchase request is linked to this conversation."
            elif error == "no_user_in_context":
                return "I cannot determine who is approving this step."
            elif error == "no_current_step":
                return handler_result.get("message", "Request does not have a current workflow step.")
            return f"Error approving step: {error}"
        
        moved = handler_result.get("moved_to_next_step", False)
        status = handler_result.get("new_status", "unknown")
        if moved:
            return f"Step approved successfully! The request has moved to the next step. New status: {status}"
        return f"Step approved successfully! Status: {status}"
    
    # Handle reject_step intent
    if intent == "reject_step" and action == "reject_step":
        if "error" in handler_result:
            error = handler_result.get("error")
            if error == "no_request_linked":
                return "I cannot reject a step because no purchase request is linked to this conversation."
            elif error == "rejection_comment_required":
                return handler_result.get("message", "Rejection requires a comment with at least 10 characters.")
            return f"Error rejecting step: {error}"
        
        status = handler_result.get("new_status", "unknown")
        return f"Step rejected. Status: {status}"
    
    # Handle unknown_intent with helpful message
    if action == "unknown_intent":
        # Use the helpful message from the handler if available
        if "message" in handler_result:
            return handler_result["message"]
        # Fallback to generic helpful message
        return (
            "I'm not sure how to help with that. "
            "I can assist with purchase request workflows, approvals, and checking request details. "
            "Could you rephrase your question or tell me what you'd like to do?"
        )
    
    # Fallback for other actions
    if action:
        return f"Action completed: {action}"
    
    return f"I processed your request with intent: {intent}"


class RunOrchestratorView(APIView):
    """POST /api/ai/threads/{thread_id}/run/ - Run AI orchestrator on latest user message"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, thread_id: str):
        """Run orchestrator on the latest user message in the thread"""
        user = request.user
        
        # Get thread and check it exists
        thread = get_object_or_404(ChatThread, id=thread_id, is_active=True)
        
        # Permission: user must be participant
        if not thread.participants.filter(id=user.id).exists():
            return Response(
                {"detail": "You are not a participant in this thread."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Find latest USER message
        latest_message = (
            ChatMessage.objects
            .filter(thread=thread, sender_type=ChatMessage.SenderType.USER, is_active=True)
            .order_by("-created_at")
            .first()
        )
        
        if not latest_message:
            return Response(
                {"detail": "No user message found to run AI on."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prepare config (for now static; later use SystemConfig)
        config = {
            "confidence_threshold": 0.7,
            "enabled_intents": None,  # let _load_config default to ALL_INTENTS
        }
        
        # Obtain LLM client (for now, a stub / simple injected client)
        llm_client = get_default_llm_client()
        
        # Run orchestrator
        result: OrchestratorResult = run_orchestrator(
            user=user,
            thread=thread,
            latest_message=latest_message,
            llm_client=llm_client,
            config=config,
        )
        
        # Create AI ChatMessage (simple v1: textified handler_result)
        ai_content = build_ai_message_content_from_result(result)
        ai_message = ChatMessage.objects.create(
            thread=thread,
            sender_type=ChatMessage.SenderType.AI,
            sender_user=None,
            content=ai_content,
            metadata={"orchestrator_result": result.handler_result},
        )
        
        # Update thread.last_message_at
        thread.last_message_at = timezone.now()
        thread.save(update_fields=['last_message_at'])
        
        # Serialize response
        result_data = OrchestratorResultSerializer(result).data
        ai_message_data = ChatMessageSerializer(ai_message, context={'request': request}).data
        
        return Response(
            {
                "orchestrator": result_data,
                "ai_message": ai_message_data,
            },
            status=status.HTTP_200_OK,
        )

