"""
Intent types for AI orchestrator.

Defines the set of intents that the AI agent can detect and handle.
"""
from enum import Enum


class Intent(str, Enum):
    """Enumeration of possible intents."""
    APPROVE_STEP = "approve_step"
    REJECT_STEP = "reject_step"
    FILL_MISSING_DATA = "fill_missing_data"
    SUMMARIZE_REQUEST = "summarize_request"
    CREATE_SYSTEM_NOTE = "create_system_note"
    UNKNOWN = "unknown"


# List of all intents for use in prompts
ALL_INTENTS = [
    Intent.APPROVE_STEP.value,
    Intent.REJECT_STEP.value,
    Intent.FILL_MISSING_DATA.value,
    Intent.SUMMARIZE_REQUEST.value,
    Intent.CREATE_SYSTEM_NOTE.value,
    Intent.UNKNOWN.value,
]



