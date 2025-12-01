"""
LLM Client interface for AI orchestrator.

Defines the protocol for LLM clients that can detect user intents.
"""
from typing import Protocol, Dict, Any, List


class LLMClient(Protocol):
    """
    Protocol for LLM clients that detect user intents.
    
    Implementations should provide a detect_intent method that takes
    a prompt and list of messages, and returns intent detection results.
    """
    
    def detect_intent(self, *, prompt: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Detect intent from a prompt and message history.
        
        Args:
            prompt: The system prompt instructing the LLM on how to detect intents
            messages: List of message dictionaries with content, sender_type, etc.
        
        Returns:
            Dictionary with the following structure:
            {
                "intent": "<str>",      # The detected intent string
                "confidence": <float>,  # Confidence score between 0.0 and 1.0
                "raw": <any>            # Any additional raw response data
            }
        """
        ...


class EchoLLMClient:
    """
    Simple echo LLM client for fallback/default use.
    
    This is a temporary naive implementation, mostly for manual testing.
    In tests this will usually be monkeypatched.
    """
    
    def detect_intent(self, *, prompt: str, messages: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Temporary naive implementation, mostly for manual testing."""
        return {
            "intent": "unknown",
            "confidence": 0.0,
            "raw": {"note": "echo client fallback"},
        }


def get_default_llm_client() -> LLMClient:
    """
    Get the default LLM client instance.
    
    Returns:
        An LLMClient implementation (currently EchoLLMClient)
    """
    return EchoLLMClient()

