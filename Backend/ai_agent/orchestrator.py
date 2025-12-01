"""
AI Orchestrator - LangGraph-style execution pipeline.

This module implements a pure-Python orchestration layer that drives AI actions
in the messenger. It follows a pipeline pattern with dependency injection for
testability.
"""
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple
from django.utils import timezone
from ai_agent.models import ChatThread, ChatMessage
from ai_agent.intent_types import Intent, ALL_INTENTS
from ai_agent.llm_client import LLMClient
from ai_agent import handlers


@dataclass
class OrchestratorResult:
    """Result of orchestrator execution."""
    final_intent: str
    confidence: float
    handler_name: str
    handler_result: Dict[str, Any]
    debug: Dict[str, Any]


def run_orchestrator(
    *,
    user,
    thread: ChatThread,
    latest_message: ChatMessage,
    llm_client: LLMClient,
    config: Dict[str, Any]
) -> OrchestratorResult:
    """
    Run the orchestrator pipeline.
    
    Pipeline steps:
    1. load_config -> returns config object (thresholds, flags)
    2. load_context -> returns context object (recent messages, thread metadata)
    3. detect_intent -> uses LLM client, returns {intent, confidence, raw}
    4. apply_threshold -> if confidence < threshold -> intent = "unknown"
    5. route_to_handler -> calls appropriate handler based on intent
    
    Args:
        user: User instance
        thread: ChatThread instance
        latest_message: ChatMessage instance (the latest message to process)
        llm_client: LLMClient implementation
        config: Configuration dictionary with confidence_threshold and enabled_intents
    
    Returns:
        OrchestratorResult with final_intent, confidence, handler_name, handler_result, and debug info
    """
    call_order = []  # Track call order for test assertions
    
    # 1. Load config (already passed in, but still treat as node)
    call_order.append("load_config")
    effective_config = _load_config(config)
    
    # 2. Load context
    call_order.append("load_context")
    context = _load_context(
        user=user,
        thread=thread,
        latest_message=latest_message,
        config=effective_config
    )
    
    # 3. Detect intent
    call_order.append("detect_intent")
    intent_response = _detect_intent(llm_client=llm_client, context=context)
    
    # 4. Apply threshold and enabled_intents
    call_order.append("apply_threshold")
    final_intent, final_confidence, debug_info = _apply_threshold_and_filter(
        intent_response,
        effective_config
    )
    
    # 5. Route to handler
    call_order.append("route_to_handler")
    handler_name, handler_result = _route_to_handler(final_intent, context)
    
    # Add call_order to debug info
    debug_info["call_order"] = call_order
    
    return OrchestratorResult(
        final_intent=final_intent,
        confidence=final_confidence,
        handler_name=handler_name,
        handler_result=handler_result,
        debug=debug_info,
    )


def _load_config(config_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Load and validate configuration, filling defaults.
    
    Args:
        config_dict: Configuration dictionary
    
    Returns:
        Effective configuration with defaults filled
    """
    effective_config = config_dict.copy()
    
    # Default confidence threshold
    if "confidence_threshold" not in effective_config:
        effective_config["confidence_threshold"] = 0.7
    
    # Default enabled_intents (all intents if not specified)
    if "enabled_intents" not in effective_config:
        effective_config["enabled_intents"] = ALL_INTENTS
    
    return effective_config


def _load_context(
    user,
    thread: ChatThread,
    latest_message: ChatMessage,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Load context from thread and messages.
    
    Args:
        user: User instance
        thread: ChatThread instance
        latest_message: Latest ChatMessage instance
        config: Configuration dict (may contain context_limit)
    
    Returns:
        Context dictionary with user_id, thread_id, latest_message, and messages
    """
    # Get context limit from config (default 10)
    context_limit = config.get("context_limit", 10)
    
    # Query last N messages from thread (including latest_message)
    messages = list(
        thread.messages.all()
        .order_by("-created_at")[:context_limit]
    )
    
    # Reverse to get chronological order (oldest first)
    messages.reverse()
    
    # Build messages list for context
    messages_list = [
        {
            "content": m.content,
            "sender_type": m.sender_type,
            "created_at": m.created_at.isoformat()
        }
        for m in messages
    ]
    
    # Build context dict
    context = {
        "user": user,
        "user_id": user.id,
        "thread": thread,
        "thread_id": str(thread.id),
        "latest_message": {
            "content": latest_message.content,
            "sender_type": latest_message.sender_type
        },
        "messages": messages_list
    }
    
    # Add PRS objects if thread is linked to a request
    if thread.request:
        context["request"] = thread.request
        context["team"] = thread.request.team
        context["form_template"] = thread.request.form_template
    
    return context


def _detect_intent(
    llm_client: LLMClient,
    context: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Detect intent using LLM client.
    
    Args:
        llm_client: LLMClient implementation
        context: Context dictionary with messages
    
    Returns:
        Intent response dict with "intent", "confidence", and "raw" keys
    """
    # Build prompt mentioning all intents
    intent_list = ", ".join(ALL_INTENTS)
    prompt = f"""You are an AI assistant that detects user intent in purchase request conversations.

Available intents: {intent_list}

Analyze the conversation and determine the user's intent. Return the intent name and a confidence score between 0.0 and 1.0."""
    
    # Call LLM client
    intent_response = llm_client.detect_intent(
        prompt=prompt,
        messages=context["messages"]
    )
    
    return intent_response


def _apply_threshold_and_filter(
    intent_response: Dict[str, Any],
    config: Dict[str, Any]
) -> Tuple[str, float, Dict[str, Any]]:
    """
    Apply confidence threshold and enabled_intents filter.
    
    Args:
        intent_response: Intent response from LLM with "intent", "confidence", "raw"
        config: Configuration with "confidence_threshold" and "enabled_intents"
    
    Returns:
        Tuple of (final_intent, final_confidence, debug_info)
    """
    original_intent = intent_response.get("intent", "unknown")
    original_confidence = intent_response.get("confidence", 0.0)
    confidence_threshold = config.get("confidence_threshold", 0.7)
    enabled_intents = config.get("enabled_intents", ALL_INTENTS)
    
    debug_info = {
        "original_intent": original_intent,
        "original_confidence": original_confidence,
        "raw_intent_response": intent_response.get("raw", {})
    }
    
    # Check if confidence is below threshold
    if original_confidence < confidence_threshold:
        return (Intent.UNKNOWN.value, original_confidence, debug_info)
    
    # Check if intent is in enabled_intents
    if original_intent not in enabled_intents:
        return (Intent.UNKNOWN.value, original_confidence, debug_info)
    
    # Intent passes both checks
    return (original_intent, original_confidence, debug_info)


def _route_to_handler(
    intent: str,
    context: Dict[str, Any]
) -> Tuple[str, Dict[str, Any]]:
    """
    Route intent to appropriate handler.
    
    Args:
        intent: Intent string
        context: Context dictionary
    
    Returns:
        Tuple of (handler_name, handler_result)
    """
    # Map intent to handler function
    handler_map = {
        Intent.APPROVE_STEP.value: handlers.approve_step_handler,
        Intent.REJECT_STEP.value: handlers.reject_step_handler,
        Intent.FILL_MISSING_DATA.value: handlers.fill_missing_data_handler,
        Intent.SUMMARIZE_REQUEST.value: handlers.summarize_request_handler,
        Intent.CREATE_SYSTEM_NOTE.value: handlers.create_system_note_handler,
    }
    
    # Get handler function (default to unknown_intent_handler)
    handler_func = handler_map.get(intent, handlers.unknown_intent_handler)
    
    # Call handler with context
    handler_result = handler_func(context)
    
    # Return handler name and result
    handler_name = handler_func.__name__
    return (handler_name, handler_result)

