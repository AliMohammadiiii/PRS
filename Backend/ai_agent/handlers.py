"""
Handler functions for AI orchestrator intents.

Each handler receives a context dictionary and returns a structured result.
These handlers integrate with PRS services to perform real business logic.
"""
from typing import Dict, Any
from purchase_requests import services as prs_services
from approvals.models import ApprovalHistory
from workflows.models import WorkflowTemplateStep


def approve_step_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for approve_step intent."""
    user = context.get("user")
    request = context.get("request")
    
    if not request:
        return {"action": "approve_step", "error": "no_request_linked"}
    
    if not user:
        return {"action": "approve_step", "error": "no_user_in_context"}
    
    # 1. Permission check
    prs_services.ensure_user_is_step_approver(user, request)
    
    # 2. Get current step
    current_step = prs_services.get_current_step(request)
    
    if not current_step:
        return {
            "action": "approve_step",
            "error": "no_current_step",
            "message": "Request does not have a current workflow step."
        }
    
    # 3. Get comment from latest message
    comment = context.get("latest_message", {}).get("content", "").strip() or None
    
    # 4. Create approval history
    if isinstance(current_step, WorkflowTemplateStep):
        approval_history = ApprovalHistory.objects.create(
            request=request,
            template_step=current_step,
            approver=user,
            action=ApprovalHistory.APPROVE,
            comment=comment or "",
        )
    else:
        approval_history = ApprovalHistory.objects.create(
            request=request,
            step=current_step,
            approver=user,
            action=ApprovalHistory.APPROVE,
            comment=comment or "",
        )
    
    # 5. Progress workflow
    updated_request = prs_services.progress_workflow_after_approval(request)
    
    # 6. Determine if moved to next step
    new_current_step = prs_services.get_current_step(updated_request)
    moved_to_next_step = new_current_step is not None
    
    return {
        "action": "approve_step",
        "request_id": str(updated_request.id),
        "new_status": updated_request.status.code if updated_request.status else None,
        "moved_to_next_step": moved_to_next_step,
    }


def reject_step_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for reject_step intent."""
    user = context.get("user")
    request = context.get("request")
    
    if not request:
        return {"action": "reject_step", "error": "no_request_linked"}
    
    if not user:
        return {"action": "reject_step", "error": "no_user_in_context"}
    
    # 1. Permission check
    prs_services.ensure_user_is_step_approver(user, request)
    
    # 2. Extract comment from latest message
    comment = context.get("latest_message", {}).get("content", "").strip()
    
    if not comment or len(comment) < 10:
        return {
            "action": "reject_step",
            "error": "rejection_comment_required",
            "message": "Rejection requires a comment with at least 10 characters."
        }
    
    # 3. Handle rejection
    updated_request = prs_services.handle_request_rejection(request, comment, user)
    
    return {
        "action": "reject_step",
        "request_id": str(updated_request.id),
        "new_status": updated_request.status.code if updated_request.status else None,
        "comment": comment,
    }


def fill_missing_data_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handler for fill_missing_data intent.
    
    Validates required fields and attachments using PRS services.
    """
    request = context.get("request")
    
    if not request:
        return {
            "action": "ask_user_for_more_info",
            "missing_fields": [],
            "missing_attachments": [],
            "error": "no_request_linked"
        }
    
    # Validate required fields
    field_errors = prs_services.validate_required_fields(request)
    missing_fields = [error.get("field_name") for error in field_errors if "field_name" in error]
    
    # Validate required attachments
    attachment_errors = prs_services.validate_required_attachments(request)
    missing_attachments = [error.get("category_name") for error in attachment_errors if "category_name" in error]
    
    return {
        "action": "ask_user_for_more_info",
        "missing_fields": missing_fields,
        "missing_attachments": missing_attachments,
    }


def summarize_request_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for summarize_request intent."""
    request = context.get("request")
    
    if not request:
        return {
            "action": "summary",
            "summary_text": "No request linked to this conversation.",
        }
    
    # Build summary from request fields
    summary_parts = []
    
    if request.vendor_name:
        summary_parts.append(f"Vendor: {request.vendor_name}")
    
    if request.subject:
        summary_parts.append(f"Subject: {request.subject}")
    
    if request.description:
        summary_parts.append(f"Description: {request.description}")
    
    if request.purchase_type:
        summary_parts.append(f"Purchase Type: {request.purchase_type.title}")
    
    if request.team:
        summary_parts.append(f"Team: {request.team.name}")
    
    if request.status:
        summary_parts.append(f"Status: {request.status.title}")
    
    summary_text = "\n".join(summary_parts) if summary_parts else "No details available."
    
    return {
        "action": "summary",
        "summary_text": summary_text,
    }


def create_system_note_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """Handler for create_system_note intent."""
    return {"action": "system_note_stub"}


def unknown_intent_handler(context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Handler for unknown or unrecognized intents.
    
    Provides a helpful response when the AI cannot determine the user's intent.
    """
    latest_message_content = context.get("latest_message", {}).get("content", "").strip()
    request = context.get("request")
    
    # Build helpful message based on context
    message_parts = []
    
    # If there's a request linked, provide context-aware help
    if request:
        message_parts.append(
            f"I'm here to help you with purchase request #{request.id}. "
        )
        message_parts.append(
            "You can ask me to:\n"
            "• Approve or reject workflow steps\n"
            "• Check for missing information\n"
            "• Summarize the request details\n"
            "• Answer questions about the request"
        )
    else:
        # No request linked - general help
        message_parts.append(
            "Hello! I'm your AI assistant for purchase requests. "
        )
        message_parts.append(
            "I can help you with:\n"
            "• Managing purchase request workflows\n"
            "• Checking request status and details\n"
            "• Validating required information\n"
            "• Answering questions about requests"
        )
        message_parts.append(
            "\nTo get started, you can link this conversation to a purchase request, "
            "or ask me a question about purchase requests."
        )
    
    return {
        "action": "unknown_intent",
        "message": "".join(message_parts),
        "user_message": latest_message_content
    }

