# Services & Business Logic

## Overview

Business logic is separated into service modules for reusability, testability, and separation of concerns. The main service module is `purchase_requests/services.py`.

## Service Functions

### Status Lookup Helpers

#### `get_request_status_lookup(code: str) -> Lookup`

Get a REQUEST_STATUS lookup by code.

**Parameters**:
- `code`: Status code (e.g., "DRAFT", "PENDING_APPROVAL")

**Returns**: Lookup instance

**Example**:
```python
status = get_request_status_lookup("DRAFT")
```

#### `get_purchase_type_lookup(code: str) -> Lookup`

Get a PURCHASE_TYPE lookup by code.

**Parameters**:
- `code`: Purchase type code (e.g., "GOODS", "SERVICE")

**Returns**: Lookup instance

#### Status Convenience Functions

- `get_draft_status()`: Returns DRAFT status lookup
- `get_pending_approval_status()`: Returns PENDING_APPROVAL status lookup
- `get_in_review_status()`: Returns IN_REVIEW status lookup
- `get_fully_approved_status()`: Returns FULLY_APPROVED status lookup
- `get_finance_review_status()`: Returns FINANCE_REVIEW status lookup
- `get_rejected_status()`: Returns REJECTED status lookup
- `get_completed_status()`: Returns COMPLETED status lookup

### Workflow Step Functions

#### `get_first_workflow_template_step(workflow_template: WorkflowTemplate) -> Optional[WorkflowTemplateStep]`

Get the first step in a workflow template.

**Parameters**:
- `workflow_template`: WorkflowTemplate instance

**Returns**: First WorkflowTemplateStep or None

#### `get_first_workflow_step_for_request(request: PurchaseRequest) -> Optional[WorkflowTemplateStep]`

Get the first workflow step for a purchase request.

**Parameters**:
- `request`: PurchaseRequest instance

**Returns**: First WorkflowTemplateStep or None

**Usage**:
```python
first_step = get_first_workflow_step_for_request(request)
if first_step:
    request.current_template_step = first_step
```

#### `get_next_workflow_template_step(current_step: WorkflowTemplateStep) -> Optional[WorkflowTemplateStep]`

Get the next step in a workflow template.

**Parameters**:
- `current_step`: Current WorkflowTemplateStep

**Returns**: Next WorkflowTemplateStep or None (if at last step)

**Usage**:
```python
next_step = get_next_workflow_template_step(current_step)
if next_step:
    request.current_template_step = next_step
```

#### `get_current_step(request: PurchaseRequest) -> Optional[Union[WorkflowStep, WorkflowTemplateStep]]`

Get the current step for a purchase request (works with both legacy and new models).

**Parameters**:
- `request`: PurchaseRequest instance

**Returns**: Current step (WorkflowTemplateStep or WorkflowStep) or None

**Usage**:
```python
current_step = get_current_step(request)
if current_step:
    step_name = current_step.step_name
```

#### `set_current_step(request: PurchaseRequest, step: Optional[Union[WorkflowStep, WorkflowTemplateStep]])`

Set the current step for a purchase request.

**Parameters**:
- `request`: PurchaseRequest instance
- `step`: Step to set (WorkflowTemplateStep, WorkflowStep, or None)

**Usage**:
```python
set_current_step(request, next_step)
```

### Permission Functions

#### `ensure_user_is_step_approver(user, request: PurchaseRequest)`

Ensure the user is configured as an approver for the request's current step.

**Parameters**:
- `user`: User instance
- `request`: PurchaseRequest instance

**Raises**: `PermissionDenied` if user is not an approver

**Usage**:
```python
try:
    ensure_user_is_step_approver(user, request)
    # User can approve
except PermissionDenied:
    # User cannot approve
```

**Logic**:
1. Gets current step (template-based or legacy)
2. Retrieves required roles for the step
3. Checks if user has any of those roles via AccessScope
4. Raises PermissionDenied if not

#### `have_all_approvers_approved(request: PurchaseRequest) -> bool`

Check if all approvers at the current step have approved.

**Parameters**:
- `request`: PurchaseRequest instance

**Returns**: True if all approvers have approved, False otherwise

**Usage**:
```python
if have_all_approvers_approved(request):
    # Move to next step
    next_step = get_next_workflow_template_step(request.current_template_step)
```

**Logic**:
1. Gets current step
2. Retrieves all required roles for the step
3. Checks ApprovalHistory for approvals from users with those roles
4. Returns True if all roles have at least one approval

### Validation Functions

#### `validate_required_fields(request: PurchaseRequest, form_template: FormTemplate) -> List[str]`

Validate that all required fields are filled.

**Parameters**:
- `request`: PurchaseRequest instance
- `form_template`: FormTemplate instance

**Returns**: List of missing field names (empty if all valid)

**Usage**:
```python
missing_fields = validate_required_fields(request, form_template)
if missing_fields:
    raise ValidationError(f"Missing required fields: {', '.join(missing_fields)}")
```

**Logic**:
1. Gets all required fields from form template
2. Checks RequestFieldValue for each required field
3. Returns list of missing field names

#### `validate_required_attachments(request: PurchaseRequest, team: Team) -> List[str]`

Validate that all required attachment categories have at least one attachment.

**Parameters**:
- `request`: PurchaseRequest instance
- `team`: Team instance

**Returns**: List of missing category names (empty if all valid)

**Usage**:
```python
missing_categories = validate_required_attachments(request, team)
if missing_categories:
    raise ValidationError(f"Missing required attachments: {', '.join(missing_categories)}")
```

**Logic**:
1. Gets all required AttachmentCategory for the team
2. Checks Attachment records for each required category
3. Returns list of missing category names

### Workflow Progression Functions

#### `progress_workflow_after_approval(request: PurchaseRequest) -> PurchaseRequest`

Progress workflow after an approval action.

**Parameters**:
- `request`: PurchaseRequest instance

**Returns**: Updated PurchaseRequest instance

**Usage**:
```python
request = progress_workflow_after_approval(request)
```

**Logic**:
1. Checks if all approvers have approved at current step
2. If yes:
   - Gets next step
   - If next step exists:
     - Updates current_template_step
     - Sets status to IN_REVIEW
   - If next step is finance review:
     - Sets status to FINANCE_REVIEW
   - If no next step (shouldn't happen):
     - Sets status to FULLY_APPROVED
3. Returns updated request

#### `handle_request_submission(request: PurchaseRequest) -> PurchaseRequest`

Handle request submission (DRAFT → PENDING_APPROVAL).

**Parameters**:
- `request`: PurchaseRequest instance

**Returns**: Updated PurchaseRequest instance

**Usage**:
```python
request = handle_request_submission(request)
```

**Logic**:
1. Validates required fields
2. Validates required attachments
3. Gets first workflow step
4. Sets current_template_step
5. Sets status to PENDING_APPROVAL
6. Sets submitted_at timestamp
7. Returns updated request

#### `handle_request_rejection(request: PurchaseRequest, comment: str, approver: User) -> PurchaseRequest`

Handle request rejection.

**Parameters**:
- `request`: PurchaseRequest instance
- `comment`: Rejection comment (minimum 10 characters)
- `approver`: User who rejected

**Returns**: Updated PurchaseRequest instance

**Usage**:
```python
request = handle_request_rejection(request, "Budget too high", approver)
```

**Logic**:
1. Validates comment length (minimum 10 characters)
2. Creates ApprovalHistory entry with REJECT action
3. Sets status to REJECTED
4. Sets rejection_comment
5. Clears current step
6. Creates audit event
7. Returns updated request

#### `handle_request_completion(request: PurchaseRequest, finance_user: User, comment: Optional[str] = None) -> PurchaseRequest`

Handle request completion by finance.

**Parameters**:
- `request`: PurchaseRequest instance
- `finance_user`: Finance reviewer user
- `comment`: Optional completion comment

**Returns**: Updated PurchaseRequest instance

**Usage**:
```python
request = handle_request_completion(request, finance_user, "Payment processed")
```

**Logic**:
1. Validates request is in FINANCE_REVIEW status
2. Sets status to COMPLETED
3. Sets completed_at timestamp
4. Clears current step
5. Creates audit event
6. Sends completion email
7. Returns updated request

### Email Functions

#### `send_completion_email(request: PurchaseRequest) -> bool`

Send completion email when request is marked complete.

**Parameters**:
- `request`: PurchaseRequest instance

**Returns**: True if email sent successfully, False otherwise

**Usage**:
```python
email_sent = send_completion_email(request)
if not email_sent:
    logger.warning(f"Failed to send completion email for request {request.id}")
```

**Logic**:
1. Gets completion email address from settings
2. Builds email content with:
   - Request ID
   - Team name
   - Requestor information
   - Vendor information
   - Subject and description
   - Purchase type
   - Attachments list
   - Approval history
   - Completion timestamp
3. Sends email via Django's send_mail
4. Returns success status

**Email Content Includes**:
- Request ID
- Team name
- Requestor name and email
- Vendor name and account
- Subject/Purpose
- Description
- Purchase Type
- Complete list of attachments
- Approval summary
- Completion timestamp

### Audit Functions

#### `create_audit_event(request: PurchaseRequest, user: User, event_type: str, metadata: Optional[Dict] = None) -> AuditEvent`

Create an audit event for a purchase request.

**Parameters**:
- `request`: PurchaseRequest instance
- `user`: User who performed the action
- `event_type`: Event type (e.g., "SUBMIT", "APPROVE", "REJECT")
- `metadata`: Optional metadata dictionary

**Returns**: Created AuditEvent instance

**Usage**:
```python
audit_event = create_audit_event(
    request,
    user,
    "APPROVE",
    {"step": "Manager Approval"}
)
```

#### `create_field_change(audit_event: AuditEvent, field_name: str, old_value: Any, new_value: Any) -> FieldChange`

Create a field change record for audit trail.

**Parameters**:
- `audit_event`: AuditEvent instance
- `field_name`: Name of the changed field
- `old_value`: Previous value
- `new_value`: New value

**Returns**: Created FieldChange instance

**Usage**:
```python
field_change = create_field_change(
    audit_event,
    "vendor_name",
    "Old Vendor",
    "New Vendor"
)
```

### Utility Functions

#### `get_active_team_config(team: Team, purchase_type: str) -> TeamPurchaseConfig`

Get active team purchase configuration.

**Parameters**:
- `team`: Team instance
- `purchase_type`: Purchase type code (e.g., "GOODS")

**Returns**: TeamPurchaseConfig instance

**Raises**: `TeamPurchaseConfig.DoesNotExist` if not found

**Usage**:
```python
config = get_active_team_config(team, "GOODS")
form_template = config.form_template
workflow_template = config.workflow_template
```

## Service Usage Patterns

### Creating a Request

```python
from purchase_requests import services
from purchase_requests.models import PurchaseRequest

# Get team config
config = services.get_active_team_config(team, "GOODS")

# Create request
request = PurchaseRequest.objects.create(
    requestor=user,
    team=team,
    form_template=config.form_template,
    workflow_template=config.workflow_template,
    status=services.get_draft_status(),
    purchase_type=services.get_purchase_type_lookup("GOODS"),
    vendor_name="Vendor Name",
    vendor_account="123456",
    subject="Subject",
    description="Description"
)

# Add field values
# ... add RequestFieldValue records ...

# Submit request
request = services.handle_request_submission(request)
request.save()
```

### Approving a Request

```python
from purchase_requests import services

# Check permission
services.ensure_user_is_step_approver(user, request)

# Create approval history
ApprovalHistory.objects.create(
    request=request,
    template_step=request.current_template_step,
    approver=user,
    action=ApprovalHistory.APPROVE,
    comment="Approved"
)

# Progress workflow
request = services.progress_workflow_after_approval(request)
request.save()
```

### Rejecting a Request

```python
from purchase_requests import services

# Check permission
services.ensure_user_is_step_approver(user, request)

# Reject request
request = services.handle_request_rejection(
    request,
    "Rejection reason (minimum 10 characters)",
    user
)
request.save()
```

### Completing a Request

```python
from purchase_requests import services

# Complete request
request = services.handle_request_completion(
    request,
    finance_user,
    "Payment processed"
)
request.save()
```

## Error Handling

Services raise standard Django/DRF exceptions:

- `PermissionDenied`: User lacks required permissions
- `ValidationError`: Validation failed
- `DoesNotExist`: Required object not found

**Example**:
```python
try:
    services.ensure_user_is_step_approver(user, request)
except PermissionDenied as e:
    # Handle permission error
    return Response({"error": str(e)}, status=403)
```

## Transaction Management

Critical operations use database transactions:

```python
from django.db import transaction

@transaction.atomic
def approve_request(request_id, user_id):
    request = PurchaseRequest.objects.get(id=request_id)
    user = User.objects.get(id=user_id)
    
    # All operations in transaction
    services.ensure_user_is_step_approver(user, request)
    # ... create approval history ...
    request = services.progress_workflow_after_approval(request)
    request.save()
```

## Related Documentation

- [API Endpoints](09-API-Endpoints.md) - API usage of services
- [Workflow System](14-Workflow-System.md) - Workflow logic
- [Request Lifecycle](16-Request-Lifecycle.md) - Lifecycle management
- [Backend Overview](07-Backend-Overview.md) - Backend structure







