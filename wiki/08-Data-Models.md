# Data Models

## Base Model

All models inherit from `BaseModel` which provides:

- **UUID Primary Key**: `id` (UUID4, non-editable)
- **Timestamps**: `created_at`, `updated_at` (auto-managed)
- **Soft Delete**: `is_active` (Boolean, default=True)

**Location**: `Backend/core/models.py`

```python
class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        abstract = True
```

## Core Models

### User

**Location**: `Backend/accounts/models.py`

**Purpose**: Custom user model extending Django's AbstractUser.

**Fields**:
- `id`: UUID (from BaseModel)
- `username`: String (required, unique)
- `email`: String (optional)
- `first_name`, `last_name`: String (optional)
- `national_code`: String (optional, max 32)
- `mobile_phone`: String (optional, max 32, indexed)
- `is_active`: Boolean (from BaseModel)
- `is_staff`: Boolean (Django admin access)
- `is_superuser`: Boolean (superuser access)
- `date_joined`: DateTime
- `created_at`, `updated_at`: DateTime (from BaseModel)

**Relationships**:
- One-to-many: `purchase_requests` (as requestor)
- One-to-many: `access_scopes`
- One-to-many: `approval_actions`
- One-to-many: `uploaded_attachments`

### AccessScope

**Location**: `Backend/accounts/models.py`

**Purpose**: Links users to teams or org nodes with specific roles.

**Fields**:
- `id`: UUID (from BaseModel)
- `user`: ForeignKey to User
- `org_node`: ForeignKey to OrgNode (nullable)
- `team`: ForeignKey to Team (nullable)
- `role`: ForeignKey to Lookup (COMPANY_ROLE type)
- `position_title`: String (optional, max 128)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Either `org_node` or `team` must be set (not both)
- Unique together: `(user, org_node, role)` or `(user, team, role)`

**Relationships**:
- Many-to-one: `user`
- Many-to-one: `org_node` (optional)
- Many-to-one: `team` (optional)
- Many-to-one: `role`

## Classification Models

### LookupType

**Location**: `Backend/classifications/models.py`

**Purpose**: Type definitions for lookups (e.g., REQUEST_STATUS, PURCHASE_TYPE).

**Fields**:
- `id`: UUID (from BaseModel)
- `code`: String (unique, e.g., "REQUEST_STATUS")
- `name`: String
- `description`: Text (optional)
- `is_active`: Boolean (from BaseModel)

**Relationships**:
- One-to-many: `lookups`

### Lookup

**Location**: `Backend/classifications/models.py`

**Purpose**: Individual lookup values within a type.

**Fields**:
- `id`: UUID (from BaseModel)
- `type`: ForeignKey to LookupType
- `code`: String (unique within type, e.g., "DRAFT")
- `name`: String
- `description`: Text (optional)
- `order`: Integer (optional, for sorting)
- `is_active`: Boolean (from BaseModel)

**Relationships**:
- Many-to-one: `type`
- Referenced by: PurchaseRequest.status, PurchaseRequest.purchase_type, etc.

## Team Models

### Team

**Location**: `Backend/teams/models.py`

**Purpose**: Organizational teams (Marketing, Tech, Product, etc.).

**Fields**:
- `id`: UUID (from BaseModel)
- `name`: String (unique, max 128)
- `description`: Text (optional)
- `is_active`: Boolean (from BaseModel)

**Relationships**:
- One-to-many: `purchase_requests`
- One-to-many: `user_access_scopes` (via AccessScope)
- One-to-many: `attachment_categories`
- One-to-many: `purchase_configs`

**Indexes**:
- `(is_active, name)`

## Workflow Models

### WorkflowTemplate

**Location**: `Backend/workflows/models.py`

**Purpose**: Team-agnostic workflow templates (reusable across teams).

**Fields**:
- `id`: UUID (from BaseModel)
- `name`: String (max 128)
- `version_number`: Integer (default=1)
- `description`: Text (optional)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(name, version_number)`

**Relationships**:
- One-to-many: `steps` (WorkflowTemplateStep)
- One-to-many: `purchase_requests`
- One-to-many: `team_purchase_configs`

**Indexes**:
- `(name, is_active)`
- `(name, version_number)`

### WorkflowTemplateStep

**Location**: `Backend/workflows/models.py`

**Purpose**: Sequential approval steps in a workflow template.

**Fields**:
- `id`: UUID (from BaseModel)
- `workflow_template`: ForeignKey to WorkflowTemplate
- `step_name`: String (max 128)
- `step_order`: Integer (1, 2, 3, ...)
- `is_finance_review`: Boolean (default=False)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(workflow_template, step_order)`
- Exactly one step per template must have `is_finance_review=True`

**Relationships**:
- Many-to-one: `workflow_template`
- One-to-many: `approvers` (WorkflowTemplateStepApprover)
- One-to-many: `current_requests` (PurchaseRequest)
- One-to-many: `approval_history`

**Indexes**:
- `(workflow_template, step_order)`

### WorkflowTemplateStepApprover

**Location**: `Backend/workflows/models.py`

**Purpose**: Role-based approver assignments to workflow steps.

**Fields**:
- `id`: UUID (from BaseModel)
- `step`: ForeignKey to WorkflowTemplateStep
- `role`: ForeignKey to Lookup (COMPANY_ROLE type)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(step, role)`
- Role must be of type COMPANY_ROLE

**Relationships**:
- Many-to-one: `step`
- Many-to-one: `role`

**Indexes**:
- `(step, is_active)`
- `(role, is_active)`

## Form Models

### FormTemplate

**Location**: `Backend/prs_forms/models.py`

**Purpose**: Team-agnostic form templates with versioning.

**Fields**:
- `id`: UUID (from BaseModel)
- `name`: String (max 128)
- `version_number`: Integer (default=1)
- `created_by`: ForeignKey to User (nullable)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(name, version_number)`

**Relationships**:
- One-to-many: `fields` (FormField)
- One-to-many: `purchase_requests`
- One-to-many: `team_purchase_configs`

**Indexes**:
- `(name, version_number)`
- `(name, is_active)`

### FormField

**Location**: `Backend/prs_forms/models.py`

**Purpose**: Field definitions within a form template.

**Fields**:
- `id`: UUID (from BaseModel)
- `template`: ForeignKey to FormTemplate
- `field_id`: String (max 64, unique within template)
- `name`: String (max 128)
- `label`: String (max 128)
- `field_type`: String (choices: TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN, FILE_UPLOAD)
- `required`: Boolean (default=False)
- `order`: Integer (default=0)
- `default_value`: Text (optional)
- `validation_rules`: JSONField (optional)
- `help_text`: Text (optional)
- `dropdown_options`: JSONField (optional, for DROPDOWN type)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(template, field_id)`
- If `field_type=DROPDOWN`, `dropdown_options` must be provided

**Relationships**:
- Many-to-one: `template`
- One-to-many: `request_values` (RequestFieldValue)

**Indexes**:
- `(template, field_id)`
- `(template, order)`

## Purchase Request Models

### PurchaseRequest

**Location**: `Backend/purchase_requests/models.py`

**Purpose**: Main purchase request entity.

**Fields**:
- `id`: UUID (from BaseModel)
- `requestor`: ForeignKey to User
- `team`: ForeignKey to Team
- `form_template`: ForeignKey to FormTemplate
- `workflow_template`: ForeignKey to WorkflowTemplate (nullable, for legacy)
- `status`: ForeignKey to Lookup (REQUEST_STATUS type)
- `current_step`: ForeignKey to WorkflowStep (nullable, legacy)
- `current_template_step`: ForeignKey to WorkflowTemplateStep (nullable)
- `vendor_name`: String (max 255)
- `vendor_account`: String (max 128)
- `subject`: String (max 200)
- `description`: Text (max 2000)
- `purchase_type`: ForeignKey to Lookup (PURCHASE_TYPE type)
- `submitted_at`: DateTime (nullable)
- `completed_at`: DateTime (nullable)
- `rejection_comment`: Text (optional, latest rejection)
- `is_active`: Boolean (from BaseModel)

**Relationships**:
- Many-to-one: `requestor`
- Many-to-one: `team`
- Many-to-one: `form_template`
- Many-to-one: `workflow_template` (optional)
- Many-to-one: `status`
- Many-to-one: `current_step` (optional, legacy)
- Many-to-one: `current_template_step` (optional)
- Many-to-one: `purchase_type`
- One-to-many: `field_values` (RequestFieldValue)
- One-to-many: `attachments`
- One-to-many: `approval_history`

**Indexes**:
- `(status, team)`
- `(requestor, created_at)`
- `(team, created_at)`
- `(status, created_at)`

**Methods**:
- `_validate_status_transition()`: Validates status transitions
- `clean()`: Model-level validation

### RequestFieldValue

**Location**: `Backend/purchase_requests/models.py`

**Purpose**: Field values for purchase requests (multi-column pattern).

**Fields**:
- `id`: UUID (from BaseModel)
- `request`: ForeignKey to PurchaseRequest
- `field`: ForeignKey to FormField
- `value_number`: Decimal (nullable)
- `value_text`: Text (nullable)
- `value_bool`: Boolean (nullable)
- `value_date`: Date (nullable)
- `value_dropdown`: JSONField (nullable)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(request, field)`
- Check constraint: Only one value column can be non-null

**Relationships**:
- Many-to-one: `request`
- Many-to-one: `field`

**Indexes**:
- `(request, field)`

## Attachment Models

### AttachmentCategory

**Location**: `Backend/attachments/models.py`

**Purpose**: Team-specific attachment categories.

**Fields**:
- `id`: UUID (from BaseModel)
- `team`: ForeignKey to Team
- `name`: String (max 128)
- `required`: Boolean (default=False)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Unique together: `(team, name)`

**Relationships**:
- Many-to-one: `team`
- One-to-many: `attachments`

**Indexes**:
- `(team, is_active)`

### Attachment

**Location**: `Backend/attachments/models.py`

**Purpose**: File attachments for purchase requests.

**Fields**:
- `id`: UUID (from BaseModel)
- `request`: ForeignKey to PurchaseRequest
- `category`: ForeignKey to AttachmentCategory (nullable)
- `approval_history`: ForeignKey to ApprovalHistory (nullable)
- `filename`: String (max 255)
- `file_path`: FileField (upload_to='request_attachments/')
- `file_size`: Integer (bytes)
- `file_type`: String (max 32)
- `uploaded_by`: ForeignKey to User (nullable)
- `upload_date`: DateTime (auto_now_add)
- `is_active`: Boolean (from BaseModel)

**Validators**:
- File extension: pdf, jpg, jpeg, png, docx, xlsx, xls
- File size: Max 10 MB

**Relationships**:
- Many-to-one: `request`
- Many-to-one: `category` (optional)
- Many-to-one: `approval_history` (optional)
- Many-to-one: `uploaded_by`

**Indexes**:
- `(request, category)`
- `(request, upload_date)`
- `(approval_history)`

## Approval Models

### ApprovalHistory

**Location**: `Backend/approvals/models.py`

**Purpose**: Approval/rejection history for requests.

**Fields**:
- `id`: UUID (from BaseModel)
- `request`: ForeignKey to PurchaseRequest
- `step`: ForeignKey to WorkflowStep (nullable, legacy)
- `template_step`: ForeignKey to WorkflowTemplateStep (nullable)
- `approver`: ForeignKey to User
- `role`: ForeignKey to Lookup (COMPANY_ROLE type, optional)
- `action`: String (choices: APPROVE, REJECT)
- `comment`: Text (optional, required for REJECT)
- `timestamp`: DateTime (auto_now_add)
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Either `step` or `template_step` must be set
- If `action=REJECT`, `comment` must be at least 10 characters

**Relationships**:
- Many-to-one: `request`
- Many-to-one: `step` (optional, legacy)
- Many-to-one: `template_step` (optional)
- Many-to-one: `approver`
- Many-to-one: `role` (optional)
- One-to-many: `attachments`

**Indexes**:
- `(request, step)`
- `(request, template_step)`
- `(request, timestamp)`
- `(approver, timestamp)`

## Configuration Models

### TeamPurchaseConfig

**Location**: `Backend/prs_team_config/models.py`

**Purpose**: Maps team + purchase type to form/workflow templates.

**Fields**:
- `id`: UUID (from BaseModel)
- `team`: ForeignKey to Team
- `purchase_type`: ForeignKey to Lookup (PURCHASE_TYPE type)
- `form_template`: ForeignKey to FormTemplate
- `workflow_template`: ForeignKey to WorkflowTemplate
- `is_active`: Boolean (from BaseModel)

**Constraints**:
- Only one active config per `(team, purchase_type)`
- All foreign keys must reference active records

**Relationships**:
- Many-to-one: `team`
- Many-to-one: `purchase_type`
- Many-to-one: `form_template`
- Many-to-one: `workflow_template`

**Indexes**:
- `(team, purchase_type, is_active)`
- `(team, is_active)`

**Class Methods**:
- `get_active_config(team, purchase_type)`: Get active configuration

## Audit Models

### AuditEvent

**Location**: `Backend/audit/models.py`

**Purpose**: Audit events for compliance tracking.

**Fields**:
- `id`: UUID (from BaseModel)
- `actor`: ForeignKey to User
- `submission`: ForeignKey to Submission (nullable, legacy)
- `request`: ForeignKey to PurchaseRequest (nullable)
- `event_type`: String (choices: SUBMIT, STATUS_CHANGE, FIELD_UPDATE, etc.)
- `metadata`: JSONField (optional)
- `timestamp`: DateTime (auto_now_add)
- `is_active`: Boolean (from BaseModel)

**Relationships**:
- Many-to-one: `actor`
- Many-to-one: `submission` (optional, legacy)
- Many-to-one: `request` (optional)
- One-to-many: `field_changes`

### FieldChange

**Location**: `Backend/audit/models.py`

**Purpose**: Field-level change tracking (Level 2 audit).

**Fields**:
- `id`: UUID (from BaseModel)
- `audit_event`: ForeignKey to AuditEvent
- `field_name`: String
- `old_value`: Text (nullable)
- `new_value`: Text (nullable)
- `is_active`: Boolean (from BaseModel)

**Relationships**:
- Many-to-one: `audit_event`

## Model Relationships Summary

### Key Relationships

1. **Team → PurchaseRequest**: One-to-many
2. **User → PurchaseRequest**: One-to-many (as requestor)
3. **FormTemplate → PurchaseRequest**: One-to-many
4. **WorkflowTemplate → PurchaseRequest**: One-to-many
5. **PurchaseRequest → RequestFieldValue**: One-to-many
6. **PurchaseRequest → Attachment**: One-to-many
7. **PurchaseRequest → ApprovalHistory**: One-to-many
8. **WorkflowTemplate → WorkflowTemplateStep**: One-to-many
9. **WorkflowTemplateStep → WorkflowTemplateStepApprover**: One-to-many
10. **FormTemplate → FormField**: One-to-many
11. **Team → TeamPurchaseConfig**: One-to-many
12. **User → AccessScope**: One-to-many

## Database Constraints

### Unique Constraints

- `Team.name`: Unique
- `FormTemplate(name, version_number)`: Unique together
- `WorkflowTemplate(name, version_number)`: Unique together
- `FormField(template, field_id)`: Unique together
- `WorkflowTemplateStep(workflow_template, step_order)`: Unique together
- `WorkflowTemplateStepApprover(step, role)`: Unique together
- `RequestFieldValue(request, field)`: Unique together
- `AttachmentCategory(team, name)`: Unique together
- `AccessScope(user, org_node, role)`: Unique together
- `AccessScope(user, team, role)`: Unique together

### Check Constraints

- `RequestFieldValue`: Only one value column can be non-null
- `WorkflowTemplateStep`: Exactly one step per template with `is_finance_review=True`

### Foreign Key Constraints

- All foreign keys use `on_delete=models.PROTECT` or `CASCADE` as appropriate
- Soft deletes prevent cascade deletion issues

## Related Documentation

- [Backend Overview](07-Backend-Overview.md) - Backend structure
- [Workflow System](14-Workflow-System.md) - Workflow models usage
- [Form System](15-Form-System.md) - Form models usage
- [API Endpoints](09-API-Endpoints.md) - API usage of models


