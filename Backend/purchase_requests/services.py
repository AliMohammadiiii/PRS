"""
Helper functions for Purchase Request operations
"""
from typing import List, Dict, Any, Optional, Tuple
from django.db.models import Q, Exists, OuterRef, Prefetch
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied
import logging
from classifications.models import Lookup
from accounts.models import AccessScope
from purchase_requests.models import PurchaseRequest, RequestFieldValue
from prs_forms.models import FormField, FormTemplate
from attachments.models import AttachmentCategory, Attachment
from workflows.models import Workflow, WorkflowStep, WorkflowStepApprover
from approvals.models import ApprovalHistory
from audit.models import AuditEvent, FieldChange

logger = logging.getLogger(__name__)


def get_request_status_lookup(code: str) -> Lookup:
    """Get a REQUEST_STATUS lookup by code"""
    return Lookup.objects.get(type__code='REQUEST_STATUS', code=code, is_active=True)


def get_purchase_type_lookup(code: str) -> Lookup:
    """Get a PURCHASE_TYPE lookup by code"""
    return Lookup.objects.get(type__code='PURCHASE_TYPE', code=code, is_active=True)


def get_draft_status() -> Lookup:
    """Get DRAFT status lookup"""
    return get_request_status_lookup('DRAFT')


def get_pending_approval_status() -> Lookup:
    """Get PENDING_APPROVAL status lookup"""
    return get_request_status_lookup('PENDING_APPROVAL')


def get_in_review_status() -> Lookup:
    """Get IN_REVIEW status lookup"""
    return get_request_status_lookup('IN_REVIEW')


def get_fully_approved_status() -> Lookup:
    """Get FULLY_APPROVED status lookup"""
    return get_request_status_lookup('FULLY_APPROVED')


def get_finance_review_status() -> Lookup:
    """Get FINANCE_REVIEW status lookup"""
    return get_request_status_lookup('FINANCE_REVIEW')


def get_rejected_status() -> Lookup:
    """Get REJECTED status lookup"""
    return get_request_status_lookup('REJECTED')


def get_completed_status() -> Lookup:
    """Get COMPLETED status lookup"""
    return get_request_status_lookup('COMPLETED')


def get_first_workflow_step(team) -> Optional[WorkflowStep]:
    """Get the first workflow step for a team"""
    try:
        workflow = Workflow.objects.get(team=team, is_active=True)
        first_step = WorkflowStep.objects.filter(
            workflow=workflow,
            is_active=True
        ).order_by('step_order').first()
        return first_step
    except (Workflow.DoesNotExist, AttributeError):
        return None


def get_next_workflow_step(current_step: WorkflowStep) -> Optional[WorkflowStep]:
    """Get the next workflow step in the same workflow, ordered by step_order"""
    if not current_step:
        return None
    
    next_step = WorkflowStep.objects.filter(
        workflow=current_step.workflow,
        step_order__gt=current_step.step_order,
        is_active=True
    ).order_by('step_order').first()
    
    return next_step


def ensure_user_is_step_approver(user, request: PurchaseRequest):
    """
    Ensure the user is configured as an approver for the request's current step.
    Raises PermissionDenied if not.
    """
    if not request.current_step:
        raise PermissionDenied('Request does not have a current step.')

    # Get all active roles configured for this step
    step_role_ids = list(
        WorkflowStepApprover.objects.filter(
            step=request.current_step,
            is_active=True,
        ).values_list('role_id', flat=True)
    )

    if not step_role_ids:
        raise PermissionDenied(
            f'No approver roles are configured for step "{request.current_step.step_name}".'
        )

    # Check if user has at least one of the required roles for this team
    has_role = AccessScope.objects.filter(
        user=user,
        team=request.team,
        role_id__in=step_role_ids,
        is_active=True,
    ).exists()

    if not has_role:
        raise PermissionDenied(
            f'You are not authorized to approve requests at step "{request.current_step.step_name}".'
        )


def ensure_user_is_finance_reviewer(user, request: PurchaseRequest):
    """
    Ensure the user is a finance reviewer for the request's current finance review step.
    Raises PermissionDenied if not.
    """
    if not request.current_step:
        raise PermissionDenied('Request does not have a current step.')

    if not request.current_step.is_finance_review:
        raise PermissionDenied('Request is not at a finance review step.')

    # Get all active finance reviewer roles for this step
    step_role_ids = list(
        WorkflowStepApprover.objects.filter(
            step=request.current_step,
            is_active=True,
        ).values_list('role_id', flat=True)
    )

    if not step_role_ids:
        raise PermissionDenied(
            f'No finance reviewer roles are configured for step "{request.current_step.step_name}".'
        )

    has_role = AccessScope.objects.filter(
        user=user,
        team=request.team,
        role_id__in=step_role_ids,
        is_active=True,
    ).exists()

    if not has_role:
        raise PermissionDenied(
            f'You are not authorized to complete requests at finance review step "{request.current_step.step_name}".'
        )


def have_all_approvers_approved(request: PurchaseRequest, step: WorkflowStep) -> bool:
    """
    Check if all approvers for a step have approved the request.
    Returns True if all approvers have an ApprovalHistory with action=APPROVE.
    """
    # Get all active approver roles for this step
    step_role_ids_qs = WorkflowStepApprover.objects.filter(
        step=step,
        is_active=True,
    ).values_list('role_id', flat=True)

    if not step_role_ids_qs.exists():
        # No roles configured - cannot be fully approved
        return False

    step_role_ids = list(step_role_ids_qs)

    # Get all approvals for this request and step
    # IMPORTANT: Only consider approvals from the current submission cycle.
    # When a request is rejected and then resubmitted, older approvals (from
    # previous cycles) should not count towards the new cycle.
    approvals_qs = ApprovalHistory.objects.filter(
        request=request,
        step=step,
        action=ApprovalHistory.APPROVE,
    )
    if request.submitted_at:
        approvals_qs = approvals_qs.filter(timestamp__gte=request.submitted_at)

    # We consider a role satisfied if there is at least one approval record
    # where the recorded role matches the step role. This supports AND logic
    # across roles while allowing any user with that role to approve.
    approved_role_ids = set(
        approvals_qs.values_list('role_id', flat=True).distinct()
    )
    required_role_ids = set(step_role_ids)

    # All required roles must have at least one approval
    return required_role_ids.issubset(approved_role_ids)


def validate_required_fields(purchase_request: PurchaseRequest) -> List[Dict[str, Any]]:
    """
    Validate that all required form fields have values.
    Returns a list of validation errors (empty if validation passes).
    """
    errors = []
    form_template = purchase_request.form_template
    
    # Get all required fields for this template
    required_fields = FormField.objects.filter(
        template=form_template,
        required=True,
        is_active=True
    ).exclude(field_type=FormField.FILE_UPLOAD)  # FILE_UPLOAD handled via Attachment
    
    # Get all existing field values for this request
    existing_values = {
        rfv.field_id: rfv
        for rfv in RequestFieldValue.objects.filter(
            request=purchase_request,
            field__template=form_template
        )
    }
    
    for field in required_fields:
        if field.id not in existing_values:
            errors.append({
                'field_id': str(field.id),
                'field_name': field.name,
                'error': f'Required field "{field.label}" is missing.'
            })
            continue
        
        # Check if the appropriate value column has a value
        rfv = existing_values[field.id]
        has_value = False
        
        if field.field_type == FormField.TEXT and rfv.value_text:
            has_value = True
        elif field.field_type == FormField.NUMBER and rfv.value_number is not None:
            has_value = True
        elif field.field_type == FormField.BOOLEAN and rfv.value_bool is not None:
            has_value = True
        elif field.field_type == FormField.DATE and rfv.value_date:
            has_value = True
        elif field.field_type == FormField.DROPDOWN and rfv.value_dropdown:
            has_value = True
        
        if not has_value:
            errors.append({
                'field_id': str(field.id),
                'field_name': field.name,
                'error': f'Required field "{field.label}" has no value.'
            })
    
    return errors


def validate_required_attachments(purchase_request: PurchaseRequest) -> List[Dict[str, Any]]:
    """
    Validate that all required attachment categories have at least one attachment.
    Returns a list of validation errors (empty if validation passes).
    """
    errors = []
    team = purchase_request.team
    
    # Get all required attachment categories for this team
    required_categories = AttachmentCategory.objects.filter(
        team=team,
        required=True,
        is_active=True
    )
    
    # Get all attachments for this request
    existing_attachments = Attachment.objects.filter(
        request=purchase_request,
        is_active=True
    ).values_list('category_id', flat=True).distinct()
    
    for category in required_categories:
        if category.id not in existing_attachments:
            errors.append({
                'category_id': str(category.id),
                'category_name': category.name,
                'error': f'Required attachment category "{category.name}" has no attachments.'
            })
    
    return errors


def create_audit_event_for_request_created(
    purchase_request: PurchaseRequest,
    actor
) -> AuditEvent:
    """Create an audit event for request creation"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.REQUEST_CREATED,
        actor=actor,
        request=purchase_request,
        metadata={
            'team_id': str(purchase_request.team.id),
            'form_template_id': str(purchase_request.form_template.id),
            'status': purchase_request.status.code if purchase_request.status else None,
        }
    )


def create_audit_event_for_request_updated(
    purchase_request: PurchaseRequest,
    actor,
    top_level_changes: Optional[List[Dict[str, Any]]] = None,
    field_value_changes: Optional[List[Dict[str, Any]]] = None
) -> AuditEvent:
    """
    Create an audit event for request update with field changes.
    
    Args:
        purchase_request: The updated purchase request
        actor: User who made the changes
        top_level_changes: List of dicts with keys: field_name, old_value, new_value
        field_value_changes: List of dicts with keys: form_field (FormField object), old_value, new_value
    """
    # Use FIELD_UPDATE event type since REQUEST_UPDATED doesn't exist in the model
    # Alternatively, we could add REQUEST_UPDATED to the model, but for now use FIELD_UPDATE
    audit_event = AuditEvent.objects.create(
        event_type=AuditEvent.FIELD_UPDATE,
        actor=actor,
        request=purchase_request,
        metadata={
            'status': purchase_request.status.code if purchase_request.status else None,
        }
    )
    
    # Create FieldChange entries for top-level fields
    if top_level_changes:
        for change in top_level_changes:
            FieldChange.objects.create(
                audit_event=audit_event,
                field_name=change['field_name'],
                old_value=change.get('old_value'),
                new_value=change.get('new_value'),
            )
    
    # Create FieldChange entries for form field values
    if field_value_changes:
        for change in field_value_changes:
            FieldChange.objects.create(
                audit_event=audit_event,
                form_field=change.get('form_field'),
                field_name=change.get('field_name') or (change['form_field'].name if change.get('form_field') else None),
                old_value=change.get('old_value'),
                new_value=change.get('new_value'),
            )
    
    return audit_event


def create_audit_event_for_request_submitted(
    purchase_request: PurchaseRequest,
    actor,
    old_status_code: Optional[str] = None
) -> AuditEvent:
    """Create an audit event for request submission"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.REQUEST_SUBMITTED,
        actor=actor,
        request=purchase_request,
        metadata={
            'old_status': old_status_code,
            'new_status': purchase_request.status.code if purchase_request.status else None,
            'current_step_id': str(purchase_request.current_step.id) if purchase_request.current_step else None,
        }
    )


def track_top_level_field_changes(
    instance: PurchaseRequest,
    validated_data: Dict[str, Any],
    top_level_fields: List[str]
) -> List[Dict[str, Any]]:
    """
    Track changes to top-level fields.
    Returns a list of change dictionaries with keys: field_name, old_value, new_value
    """
    changes = []
    
    for field_name in top_level_fields:
        if field_name in validated_data:
            old_value = getattr(instance, field_name, None)
            new_value = validated_data[field_name]
            
            # Handle FK fields
            if field_name == 'purchase_type':
                old_value_str = str(old_value.id) if old_value else None
                new_value_str = str(new_value.id) if new_value else None
            else:
                old_value_str = str(old_value) if old_value else None
                new_value_str = str(new_value) if new_value else None
            
            if old_value_str != new_value_str:
                changes.append({
                    'field_name': field_name,
                    'old_value': old_value_str,
                    'new_value': new_value_str,
                })
    
    return changes


def track_field_value_changes(
    request: PurchaseRequest,
    fields_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Track changes to RequestFieldValue entries.
    Returns a list of change dictionaries with keys: form_field, old_value, new_value, field_name
    """
    changes = []
    
    # Validate all fields belong to the request's form template
    field_ids = [fv['field_id'] for fv in fields_data]
    form_fields = {f.id: f for f in FormField.objects.filter(
        template=request.form_template,
        id__in=field_ids,
        is_active=True
    )}
    
    for field_data in fields_data:
        field_id = field_data['field_id']
        if field_id not in form_fields:
            continue
            
        field = form_fields[field_id]
        
        # Skip FILE_UPLOAD fields (handled via Attachment)
        if field.field_type == FormField.FILE_UPLOAD:
            continue
        
        # Get value based on field type
        value_text = field_data.get('value_text')
        value_number = field_data.get('value_number')
        value_bool = field_data.get('value_bool')
        value_date = field_data.get('value_date')
        value_dropdown = field_data.get('value_dropdown')
        
        # Normalize value_text empty strings
        if value_text == '':
            value_text = None
        
        # Try to get existing RequestFieldValue
        try:
            obj = RequestFieldValue.objects.get(request=request, field=field)
            
            # Track old value
            old_value_str = None
            new_value_str = None
            
            if field.field_type == FormField.TEXT:
                old_value_str = str(obj.value_text) if obj.value_text else None
                new_value_str = str(value_text) if value_text else None
            elif field.field_type == FormField.NUMBER:
                old_value_str = str(obj.value_number) if obj.value_number is not None else None
                new_value_str = str(value_number) if value_number is not None else None
            elif field.field_type == FormField.BOOLEAN:
                old_value_str = str(obj.value_bool) if obj.value_bool is not None else None
                new_value_str = str(value_bool) if value_bool is not None else None
            elif field.field_type == FormField.DATE:
                old_value_str = str(obj.value_date) if obj.value_date else None
                new_value_str = str(value_date) if value_date else None
            elif field.field_type == FormField.DROPDOWN:
                old_value_str = str(obj.value_dropdown) if obj.value_dropdown else None
                new_value_str = str(value_dropdown) if value_dropdown else None
            
            # Only track if value changed
            if old_value_str != new_value_str:
                changes.append({
                    'form_field': field,
                    'field_name': field.name,
                    'old_value': old_value_str,
                    'new_value': new_value_str,
                })
                
        except RequestFieldValue.DoesNotExist:
            # New field value - track as addition
            if field.field_type == FormField.TEXT:
                new_value_str = str(value_text) if value_text else None
            elif field.field_type == FormField.NUMBER:
                new_value_str = str(value_number) if value_number is not None else None
            elif field.field_type == FormField.BOOLEAN:
                new_value_str = str(value_bool) if value_bool is not None else None
            elif field.field_type == FormField.DATE:
                new_value_str = str(value_date) if value_date else None
            elif field.field_type == FormField.DROPDOWN:
                new_value_str = str(value_dropdown) if value_dropdown else None
            
            if new_value_str:
                changes.append({
                    'form_field': field,
                    'field_name': field.name,
                    'old_value': None,
                    'new_value': new_value_str,
                })
    
    return changes


def create_audit_event_for_attachment_upload(
    purchase_request: PurchaseRequest,
    actor,
    attachment: Attachment
) -> AuditEvent:
    """Create an audit event for attachment upload"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.ATTACHMENT_UPLOAD,
        actor=actor,
        request=purchase_request,
        metadata={
            'attachment_id': str(attachment.id),
            'filename': attachment.filename,
            'category_id': str(attachment.category.id) if attachment.category else None,
            'file_size': attachment.file_size,
        }
    )


def create_audit_event_for_attachment_removed(
    purchase_request: PurchaseRequest,
    actor,
    attachment: Attachment
) -> AuditEvent:
    """Create an audit event for attachment removal"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.ATTACHMENT_REMOVED,
        actor=actor,
        request=purchase_request,
        metadata={
            'attachment_id': str(attachment.id),
            'filename': attachment.filename,
            'category_id': str(attachment.category.id) if attachment.category else None,
        }
    )


def create_audit_event_for_request_approved(
    purchase_request: PurchaseRequest,
    actor,
    step: WorkflowStep
) -> AuditEvent:
    """Create an audit event for request approval"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.APPROVAL,
        actor=actor,
        request=purchase_request,
        metadata={
            'step_id': str(step.id),
            'step_name': step.step_name,
            'step_order': step.step_order,
            'status': purchase_request.status.code if purchase_request.status else None,
            'current_step_id': str(purchase_request.current_step.id) if purchase_request.current_step else None,
        }
    )


def create_audit_event_for_request_rejected(
    purchase_request: PurchaseRequest,
    actor,
    step: WorkflowStep,
    comment: str,
    old_status_code: Optional[str] = None
) -> AuditEvent:
    """Create an audit event for request rejection"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.REJECTION,
        actor=actor,
        request=purchase_request,
        metadata={
            'step_id': str(step.id),
            'step_name': step.step_name,
            'step_order': step.step_order,
            'old_status': old_status_code,
            'new_status': purchase_request.status.code if purchase_request.status else None,
            'rejection_comment': comment,
        }
    )


def create_audit_event_for_request_completed(
    purchase_request: PurchaseRequest,
    actor,
    old_status_code: Optional[str] = None,
    step: Optional[WorkflowStep] = None
) -> AuditEvent:
    """Create an audit event for request completion"""
    return AuditEvent.objects.create(
        event_type=AuditEvent.REQUEST_COMPLETED,
        actor=actor,
        request=purchase_request,
        metadata={
            'old_status': old_status_code,
            'new_status': purchase_request.status.code if purchase_request.status else None,
            'completed_at': purchase_request.completed_at.isoformat() if purchase_request.completed_at else None,
            'step_id': str(step.id) if step else None,
            'step_name': step.step_name if step else None,
        }
    )


def send_completion_email(purchase_request: PurchaseRequest):
    """
    Send completion email notification for a completed purchase request.
    Email failures are logged but do not prevent completion.
    """
    completion_email = getattr(settings, 'PRS_COMPLETION_EMAIL', '')
    
    if not completion_email:
        logger.warning(
            f'PRS_COMPLETION_EMAIL not configured. Skipping completion email for request {purchase_request.id}.'
        )
        return
    
    try:
        # Get approval history for summary
        approval_history = ApprovalHistory.objects.filter(
            request=purchase_request
        ).select_related('step', 'approver').order_by('timestamp')
        
        # Build approval summary
        approval_summary_lines = []
        for approval in approval_history:
            action_label = 'Approved' if approval.action == ApprovalHistory.APPROVE else 'Rejected'
            approval_summary_lines.append(
                f"  - {approval.step.step_name}: {approval.approver.get_full_name() or approval.approver.username} "
                f"({action_label}) at {approval.timestamp.strftime('%Y-%m-%d %H:%M:%S')}"
            )
        approval_summary = '\n'.join(approval_summary_lines) if approval_summary_lines else '  No approvals recorded.'
        
        # Get attachments
        attachments = Attachment.objects.filter(
            request=purchase_request,
            is_active=True
        ).select_related('category')
        
        attachment_lines = []
        for attachment in attachments:
            category_name = attachment.category.name if attachment.category else 'Uncategorized'
            attachment_lines.append(f"  - {attachment.filename} ({category_name})")
        attachment_list = '\n'.join(attachment_lines) if attachment_lines else '  No attachments.'
        
        # Build email content
        subject = f'Purchase Request Completed - {purchase_request.subject}'
        
        # Get requestor info
        requestor_name = purchase_request.requestor.get_full_name() or purchase_request.requestor.username
        requestor_email = purchase_request.requestor.email or 'N/A'
        
        # Get purchase type label
        purchase_type_label = purchase_request.purchase_type.title if purchase_request.purchase_type else 'N/A'
        
        # Build request URL (if frontend URL pattern exists)
        # For now, just include the request ID
        request_url = f"Request ID: {purchase_request.id}"
        
        message = f"""Purchase Request has been completed.

Request Details:
- Request ID: {purchase_request.id}
- Team: {purchase_request.team.name}
- Requestor: {requestor_name} ({requestor_email})
- Vendor Name: {purchase_request.vendor_name}
- Vendor Account: {purchase_request.vendor_account}
- Subject: {purchase_request.subject}
- Description: {purchase_request.description}
- Purchase Type: {purchase_type_label}
- Status: {purchase_request.status.title if purchase_request.status else 'COMPLETED'}
- Completion Time: {purchase_request.completed_at.strftime('%Y-%m-%d %H:%M:%S') if purchase_request.completed_at else 'N/A'}

Attachments:
{attachment_list}

Approval Summary:
{approval_summary}

{request_url}
"""
        
        # Send email
        send_mail(
            subject=subject,
            message=message,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com'),
            recipient_list=[completion_email],
            fail_silently=False,  # We'll catch and log exceptions
        )
        
        logger.info(f'Completion email sent successfully for request {purchase_request.id} to {completion_email}')
        
    except Exception as e:
        # Log error but don't raise - email failure should not prevent completion
        logger.error(
            f'Failed to send completion email for request {purchase_request.id}: {str(e)}',
            exc_info=True
        )


def _get_base_purchase_request_queryset():
    """
    Get base queryset for purchase requests with optimized select_related and prefetch_related.
    Reused across inbox/listing helpers.
    """
    return PurchaseRequest.objects.select_related(
        'team',
        'form_template',
        'status',
        'status__type',  # For LookupSerializer
        'purchase_type',
        'purchase_type__type',  # For LookupSerializer
        'current_step',
        'requestor',
    ).prefetch_related(
        Prefetch(
            'field_values',
            queryset=RequestFieldValue.objects.select_related('field').all()
        ),
        'attachments',
    )


def get_my_requests_qs(user):
    """
    Get queryset of purchase requests initiated by the given user.
    
    Args:
        user: User instance (requestor)
    
    Returns:
        QuerySet of PurchaseRequest objects filtered by requestor and is_active=True
    """
    return _get_base_purchase_request_queryset().filter(
        requestor=user,
        is_active=True
    )


def get_approver_inbox_qs(user):
    """
    Get queryset of purchase requests pending approval by the given user.
    
    Returns requests where:
    - User is an approver for the current step
    - Request is active and has a current step
    - Status is PENDING_APPROVAL or IN_REVIEW (excludes FINANCE_REVIEW - handled separately)
    - User has not already approved the current step
    
    Args:
        user: User instance (approver)
    
    Returns:
        QuerySet of PurchaseRequest objects for the approver inbox
    """
    # Base queryset: active requests with current step in approval states
    # Base queryset: active requests with current step in approval states
    qs = _get_base_purchase_request_queryset().filter(
        is_active=True,
        current_step__isnull=False,
        status__code__in=['PENDING_APPROVAL', 'IN_REVIEW'],
    )

    # Restrict to requests where user has at least one of the roles configured
    # on the current step for that team.
    # Correlate on WorkflowStepApprover -> WorkflowStep -> Workflow -> Team so that
    # roles are matched for the correct team. We cannot reference `team` directly
    # on WorkflowStepApprover (it doesn't have that field), so we use the
    # step->workflow->team chain for the inner AccessScope subquery.
    step_role_exists = WorkflowStepApprover.objects.filter(
        step=OuterRef('current_step'),
        is_active=True,
        role_id__in=AccessScope.objects.filter(
            user=user,
            team=OuterRef('step__workflow__team'),
            is_active=True,
        ).values('role_id'),
    )

    qs = qs.filter(Exists(step_role_exists))
    
    # Exclude requests where user has already approved the current step
    # Use Exists subquery to check ApprovalHistory
    already_approved = ApprovalHistory.objects.filter(
        request=OuterRef('pk'),
        step=OuterRef('current_step'),
        approver=user,
        action=ApprovalHistory.APPROVE,
    ).filter(
        # Only consider approvals from the current submission cycle.
        # Older approvals (before the latest submitted_at) should not hide
        # resubmitted requests from the inbox.
        timestamp__gte=OuterRef('submitted_at')
    )
    
    qs = qs.exclude(Exists(already_approved))
    
    # Use distinct() to avoid duplicates from the join to WorkflowStepApprover
    return qs.distinct()


def get_finance_inbox_qs(user):
    """
    Get queryset of purchase requests in finance review for the given user.
    
    Returns requests where:
    - Request is active and in FINANCE_REVIEW status
    - Current step is a finance review step
    - User is a finance reviewer (approver) for the current step
    
    Args:
        user: User instance (finance reviewer)
    
    Returns:
        QuerySet of PurchaseRequest objects for the finance inbox
    """
    qs = _get_base_purchase_request_queryset().filter(
        is_active=True,
        status__code='FINANCE_REVIEW',
        current_step__is_finance_review=True,
    )

    # Restrict to requests where user has at least one of the finance roles
    # configured on the current step for that team.
    # Same team-correlation logic as in `get_approver_inbox_qs`.
    step_role_exists = WorkflowStepApprover.objects.filter(
        step=OuterRef('current_step'),
        is_active=True,
        role_id__in=AccessScope.objects.filter(
            user=user,
            team=OuterRef('step__workflow__team'),
            is_active=True,
        ).values('role_id'),
    )

    qs = qs.filter(Exists(step_role_exists))
    
    # Use distinct() to avoid duplicates from the join to WorkflowStepApprover
    return qs.distinct()

