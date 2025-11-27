# Data Models for Seed Data

This document lists all data models in the PRS (Purchase Request System) application with their fields, relationships, and constraints. Use this as a reference when creating seed data.

## Base Model

All models inherit from `BaseModel` which provides:
- `id`: UUID (primary key, auto-generated)
- `created_at`: DateTime (auto-set on creation)
- `updated_at`: DateTime (auto-updated on modification)
- `is_active`: Boolean (default: True, for soft deletes)

---

## 1. Core App

### BaseModel (Abstract)
- `id`: UUIDField (primary key)
- `created_at`: DateTimeField (auto_now_add)
- `updated_at`: DateTimeField (auto_now)
- `is_active`: BooleanField (default=True)

---

## 2. Accounts App

### User
Extends Django's `AbstractUser` + `BaseModel`
- `id`: UUID (inherited from BaseModel)
- `username`: CharField (from AbstractUser, required, unique)
- `email`: EmailField (from AbstractUser)
- `password`: CharField (from AbstractUser, hashed)
- `first_name`: CharField (from AbstractUser)
- `last_name`: CharField (from AbstractUser)
- `is_staff`: BooleanField (from AbstractUser)
- `is_superuser`: BooleanField (from AbstractUser)
- `is_active`: BooleanField (from AbstractUser + BaseModel)
- `date_joined`: DateTimeField (from AbstractUser)
- `national_code`: CharField(max_length=32, null=True, blank=True)
- `mobile_phone`: CharField(max_length=32, null=True, blank=True, db_index=True)
- `created_at`: DateTimeField (inherited)
- `updated_at`: DateTimeField (inherited)

**Relationships:**
- One-to-many: `access_scopes` → AccessScope
- One-to-many: `purchase_requests` → PurchaseRequest
- One-to-many: `submitted_reports` → Submission
- One-to-many: `submitted_report_groups` → ReportSubmissionGroup
- One-to-many: `approval_actions` → ApprovalHistory
- One-to-many: `uploaded_attachments` → Attachment
- One-to-many: `created_form_templates` → FormTemplate
- One-to-many: `audit_events` → AuditEvent

### AccessScope
- `id`: UUID (inherited)
- `user`: ForeignKey → User (required)
- `org_node`: ForeignKey → OrgNode (optional, null=True)
- `team`: ForeignKey → Team (optional, null=True)
- `role`: ForeignKey → Lookup (required, type=COMPANY_ROLE)
- `position_title`: CharField(max_length=128, null=True, blank=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`user`, `org_node`, `role`) OR (`user`, `team`, `role`)
- Either `org_node` OR `team` must be set (not both, not neither)

---

## 3. Classifications App

### LookupType
- `id`: UUID (inherited)
- `code`: CharField(max_length=64, unique=True) - e.g., "COMPANY_ROLE", "REQUEST_STATUS"
- `title`: CharField(max_length=128)
- `description`: TextField(null=True, blank=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- One-to-many: `values` → Lookup

**Common LookupType codes:**
- `COMPANY_ROLE`: Roles for users in companies/teams
- `REQUEST_STATUS`: Purchase request statuses (DRAFT, PENDING_APPROVAL, etc.)
- `PURCHASE_TYPE`: Types of purchases (GOODS, SERVICE, etc.)
- `REPORT_STATUS`: Report submission statuses
- `REPORTING_PERIOD`: Reporting periods (MONTHLY, QUARTERLY, etc.)
- `ORG_TYPE`: Organization types
- `LEGAL_ENTITY_TYPE`: Legal entity types
- `INDUSTRY_TYPE`: Industry classifications
- `SUB_INDUSTRY_TYPE`: Sub-industry classifications
- `COMPANY_CLASSIFICATION`: Company classification categories

### Lookup
- `id`: UUID (inherited)
- `type`: ForeignKey → LookupType (required)
- `code`: CharField(max_length=64) - e.g., "DRAFT", "APPROVED"
- `title`: CharField(max_length=128) - Display name
- `description`: TextField(null=True, blank=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`type`, `code`)

**Relationships:**
- Many-to-one: `type` → LookupType
- Many-to-many: `access_scopes` → AccessScope
- Many-to-many: `purchase_requests` → PurchaseRequest (status)
- Many-to-many: `purchase_requests_by_type` → PurchaseRequest (purchase_type)
- Many-to-many: `org_type_nodes` → OrgNode
- Many-to-many: `legal_entity_nodes` → OrgNode
- Many-to-many: `industry_nodes` → OrgNode
- Many-to-many: `sub_industry_nodes` → OrgNode
- Many-to-many: `company_members` → CompanyClassification
- Many-to-many: `reports` → ReportBox (classifications)
- Many-to-many: `report_submission_groups_by_period` → ReportSubmissionGroup
- Many-to-many: `report_submission_groups_by_status` → ReportSubmissionGroup
- Many-to-many: `reporting_period_submissions` → Submission
- Many-to-many: `status_submissions` → Submission
- Many-to-many: `workflow_template_step_roles` → WorkflowTemplateStepApprover
- Many-to-many: `workflow_step_roles` → WorkflowStepApprover
- Many-to-many: `approval_history_roles` → ApprovalHistory
- Many-to-many: `team_purchase_configs` → TeamPurchaseConfig

---

## 4. Org App

### OrgNode
- `id`: UUID (inherited)
- `parent`: ForeignKey → OrgNode (self-reference, null=True)
- `node_type`: CharField - Choices: "HOLDING" or "COMPANY"
- `name`: CharField(max_length=255)
- `code`: CharField(max_length=64, unique=True)
- `registration_number`: CharField(max_length=64, null=True, blank=True, db_index=True)
- `national_id`: CharField(max_length=64, null=True, blank=True, db_index=True)
- `economic_code`: CharField(max_length=64, unique=True, null=True, blank=True) - Required for COMPANY
- `incorporation_date`: DateField(null=True, blank=True)
- `website_url`: URLField(null=True, blank=True)
- `org_type`: ForeignKey → Lookup (type=ORG_TYPE, null=True)
- `legal_entity_type`: ForeignKey → Lookup (type=LEGAL_ENTITY_TYPE, null=True)
- `industry`: ForeignKey → Lookup (type=INDUSTRY_TYPE, null=True)
- `sub_industry`: ForeignKey → Lookup (type=SUB_INDUSTRY_TYPE, null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- Self-referential: `parent` → OrgNode, `children` → OrgNode (reverse)
- Many-to-many: `report_groups` → ReportGroup
- One-to-many: `user_access_scopes` → AccessScope
- One-to-many: `company_classifications` → CompanyClassification
- One-to-many: `submissions` → Submission
- One-to-many: `report_submission_groups` → ReportSubmissionGroup

**Constraints:**
- COMPANY must have a HOLDING parent
- COMPANY must have `economic_code`
- Parent must be HOLDING if set

### CompanyClassification
- `id`: UUID (inherited)
- `company`: ForeignKey → OrgNode (required, node_type=COMPANY)
- `classification`: ForeignKey → Lookup (required, type=COMPANY_CLASSIFICATION)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`company`, `classification`)

---

## 5. Periods App

### FinancialPeriod
- `id`: UUID (inherited)
- `title`: CharField(max_length=64)
- `start_date`: DateField
- `end_date`: DateField
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- One-to-many: `submissions` → Submission
- One-to-many: `report_submission_groups` → ReportSubmissionGroup

**Ordering:** Descending by `start_date`

---

## 6. Reports App

### ReportGroup
- `id`: UUID (inherited)
- `name`: CharField(max_length=128)
- `description`: TextField(null=True, blank=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- Many-to-many: `companies` → OrgNode
- Many-to-many: `reports` → ReportBox

### ReportBox
- `id`: UUID (inherited)
- `code`: CharField(max_length=64, unique=True)
- `name`: CharField(max_length=128)
- `description`: TextField(null=True, blank=True)
- `intercompany`: BooleanField(default=False)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- Many-to-many: `groups` → ReportGroup
- Many-to-many: `classifications` → Lookup (type=COMPANY_CLASSIFICATION)
- One-to-many: `fields` → ReportField
- One-to-many: `submissions` → Submission

### ReportField
- `id`: UUID (inherited)
- `report`: ForeignKey → ReportBox (required)
- `field_id`: CharField(max_length=64)
- `name`: CharField(max_length=128)
- `help_text`: TextField(null=True, blank=True)
- `required`: BooleanField(default=False)
- `data_type`: CharField - Choices: "NUMBER", "TEXT", "YES_NO", "DATE", "FILE", "ENTITY_REF"
- `entity_ref_type`: CharField - Choices: "ORG_NODE", "FINANCIAL_PERIOD" (required if data_type=ENTITY_REF)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`report`, `field_id`)
- If `data_type` = "ENTITY_REF", then `entity_ref_type` must be set
- If `data_type` ≠ "ENTITY_REF", then `entity_ref_type` must be null

**Relationships:**
- Many-to-one: `report` → ReportBox
- One-to-many: `values` → SubmissionFieldValue
- One-to-many: `audit_field_changes` → FieldChange

---

## 7. Submissions App

### ReportSubmissionGroup
- `id`: UUID (inherited)
- `title`: CharField(max_length=255)
- `description`: TextField(null=True, blank=True)
- `company`: ForeignKey → OrgNode (required, node_type=COMPANY)
- `financial_period`: ForeignKey → FinancialPeriod (required)
- `reporting_period`: ForeignKey → Lookup (required, type=REPORTING_PERIOD)
- `status`: ForeignKey → Lookup (type=REPORT_STATUS, null=True)
- `submitted_by`: ForeignKey → User (null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- Many-to-one: `company` → OrgNode
- Many-to-one: `financial_period` → FinancialPeriod
- Many-to-one: `reporting_period` → Lookup
- Many-to-one: `status` → Lookup
- Many-to-one: `submitted_by` → User
- One-to-many: `submissions` → Submission

**Status Transitions:**
- DRAFT → UNDER_REVIEW
- UNDER_REVIEW → APPROVED or REJECTED
- REJECTED → UNDER_REVIEW
- APPROVED → (immutable)

### Submission
- `id`: UUID (inherited)
- `report`: ForeignKey → ReportBox (required)
- `company`: ForeignKey → OrgNode (required, node_type=COMPANY)
- `financial_period`: ForeignKey → FinancialPeriod (required)
- `reporting_period`: ForeignKey → Lookup (required, type=REPORTING_PERIOD)
- `status`: ForeignKey → Lookup (required, type=REPORT_STATUS)
- `submitted_by`: ForeignKey → User (null=True)
- `rejection_comment`: TextField(null=True, blank=True)
- `group`: ForeignKey → ReportSubmissionGroup (null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`report`, `company`, `financial_period`, `reporting_period`)
- Company must be of node_type COMPANY

**Relationships:**
- Many-to-one: `report` → ReportBox
- Many-to-one: `company` → OrgNode
- Many-to-one: `financial_period` → FinancialPeriod
- Many-to-one: `reporting_period` → Lookup
- Many-to-one: `status` → Lookup
- Many-to-one: `submitted_by` → User
- Many-to-one: `group` → ReportSubmissionGroup
- One-to-many: `values` → SubmissionFieldValue
- One-to-many: `audit_events` → AuditEvent

**Status Transitions:**
- DRAFT → UNDER_REVIEW
- UNDER_REVIEW → APPROVED or REJECTED
- REJECTED → UNDER_REVIEW
- APPROVED → (immutable)

### SubmissionFieldValue
- `id`: UUID (inherited)
- `submission`: ForeignKey → Submission (required)
- `field`: ForeignKey → ReportField (required)
- `value_number`: DecimalField(max_digits=20, decimal_places=4, null=True)
- `value_text`: TextField(null=True)
- `value_bool`: BooleanField(null=True)
- `value_date`: DateField(null=True)
- `value_file`: FileField(null=True, upload_to='report_files/')
- `entity_ref_uuid`: UUIDField(null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`submission`, `field`)
- Only one value column can be non-null (enforced by CheckConstraint)

**Relationships:**
- Many-to-one: `submission` → Submission
- Many-to-one: `field` → ReportField

---

## 8. Audit App

### AuditEvent
- `id`: UUID (inherited)
- `event_type`: CharField - Choices:
  - Legacy: "SUBMIT", "STATUS_CHANGE", "FIELD_UPDATE"
  - PRS: "REQUEST_CREATED", "REQUEST_SUBMITTED", "APPROVAL", "REJECTION", "RESUBMISSION", "WORKFLOW_STEP_CHANGE", "REQUEST_COMPLETED", "ATTACHMENT_UPLOAD", "ATTACHMENT_REMOVED"
- `actor`: ForeignKey → User (null=True)
- `submission`: ForeignKey → Submission (null=True, for CFO Wise)
- `request`: ForeignKey → PurchaseRequest (null=True, for PRS)
- `metadata`: JSONField(default=dict)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Either `submission` OR `request` must be set (not both, not neither)

**Relationships:**
- Many-to-one: `actor` → User
- Many-to-one: `submission` → Submission
- Many-to-one: `request` → PurchaseRequest
- One-to-many: `field_changes` → FieldChange

### FieldChange
- `id`: UUID (inherited)
- `audit_event`: ForeignKey → AuditEvent (required)
- `field`: ForeignKey → ReportField (null=True, for CFO Wise)
- `form_field`: ForeignKey → FormField (null=True, for PRS)
- `field_name`: CharField(max_length=128, null=True) - For non-field-model changes
- `old_value`: TextField(null=True)
- `new_value`: TextField(null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- At least one of `field`, `form_field`, or `field_name` must be set

**Relationships:**
- Many-to-one: `audit_event` → AuditEvent
- Many-to-one: `field` → ReportField
- Many-to-one: `form_field` → FormField

---

## 9. Teams App

### Team
- `id`: UUID (inherited)
- `name`: CharField(max_length=128, unique=True)
- `description`: TextField(null=True, blank=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- One-to-one: `workflow` → Workflow (legacy)
- One-to-many: `form_templates` → FormTemplate
- One-to-many: `workflow_templates` → WorkflowTemplate
- One-to-many: `purchase_requests` → PurchaseRequest
- One-to-many: `user_access_scopes` → AccessScope
- One-to-many: `attachment_categories` → AttachmentCategory
- One-to-many: `purchase_configs` → TeamPurchaseConfig

---

## 10. Forms App (Legacy)

**Note:** This is a legacy app. The `prs_forms` app (section 11) is the current version for Purchase Request System.

### FormTemplate
- `id`: UUID (inherited)
- `team`: ForeignKey → Team (required)
- `version_number`: PositiveIntegerField(default=1)
- `created_by`: ForeignKey → User (null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`team`, `version_number`)

**Relationships:**
- Many-to-one: `team` → Team
- Many-to-one: `created_by` → User
- One-to-many: `fields` → FormField

### FormField
- `id`: UUID (inherited)
- `template`: ForeignKey → FormTemplate (required)
- `field_id`: CharField(max_length=64)
- `name`: CharField(max_length=128)
- `label`: CharField(max_length=128)
- `field_type`: CharField - Choices: "TEXT", "NUMBER", "DATE", "BOOLEAN", "DROPDOWN", "FILE_UPLOAD"
- `required`: BooleanField(default=False)
- `order`: PositiveIntegerField(default=0)
- `default_value`: TextField(null=True)
- `validation_rules`: JSONField(default=dict)
- `help_text`: TextField(null=True)
- `dropdown_options`: JSONField(null=True) - Required if field_type=DROPDOWN
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`template`, `field_id`)
- If `field_type` = "DROPDOWN", `dropdown_options` must be a list

**Relationships:**
- Many-to-one: `template` → FormTemplate

---

## 11. PRS Forms App

### FormTemplate
- `id`: UUID (inherited)
- `team`: ForeignKey → Team (required)
- `name`: CharField(max_length=128, blank=True)
- `version_number`: PositiveIntegerField(default=1)
- `created_by`: ForeignKey → User (null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`team`, `version_number`)

**Relationships:**
- Many-to-one: `team` → Team
- Many-to-one: `created_by` → User
- One-to-many: `fields` → FormField
- One-to-many: `purchase_requests` → PurchaseRequest
- One-to-many: `team_purchase_configs` → TeamPurchaseConfig

### FormField
- `id`: UUID (inherited)
- `template`: ForeignKey → FormTemplate (required)
- `field_id`: CharField(max_length=64)
- `name`: CharField(max_length=128)
- `label`: CharField(max_length=128)
- `field_type`: CharField - Choices: "TEXT", "NUMBER", "DATE", "BOOLEAN", "DROPDOWN", "FILE_UPLOAD"
- `required`: BooleanField(default=False)
- `order`: PositiveIntegerField(default=0)
- `default_value`: TextField(null=True)
- `validation_rules`: JSONField(default=dict)
- `help_text`: TextField(null=True)
- `dropdown_options`: JSONField(null=True) - Required if field_type=DROPDOWN
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`template`, `field_id`)
- If `field_type` = "DROPDOWN", `dropdown_options` must be a list

**Relationships:**
- Many-to-one: `template` → FormTemplate
- One-to-many: `request_values` → RequestFieldValue
- One-to-many: `audit_field_changes` → FieldChange

---

## 12. Workflows App

### WorkflowTemplate (New)
- `id`: UUID (inherited)
- `team`: ForeignKey → Team (required)
- `name`: CharField(max_length=128)
- `version_number`: PositiveIntegerField(default=1)
- `description`: TextField(null=True, blank=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`team`, `version_number`)

**Relationships:**
- Many-to-one: `team` → Team
- One-to-many: `steps` → WorkflowTemplateStep
- One-to-many: `purchase_requests` → PurchaseRequest
- One-to-many: `team_purchase_configs` → TeamPurchaseConfig

### WorkflowTemplateStep (New)
- `id`: UUID (inherited)
- `workflow_template`: ForeignKey → WorkflowTemplate (required)
- `step_name`: CharField(max_length=128)
- `step_order`: PositiveIntegerField
- `is_finance_review`: BooleanField(default=False)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`workflow_template`, `step_order`)
- `step_order` must be >= 1
- Exactly one step per workflow template must have `is_finance_review=True`

**Relationships:**
- Many-to-one: `workflow_template` → WorkflowTemplate
- One-to-many: `approvers` → WorkflowTemplateStepApprover
- One-to-many: `current_requests` → PurchaseRequest
- One-to-many: `approval_history` → ApprovalHistory

### WorkflowTemplateStepApprover (New)
- `id`: UUID (inherited)
- `step`: ForeignKey → WorkflowTemplateStep (required)
- `role`: ForeignKey → Lookup (required, type=COMPANY_ROLE)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`step`, `role`)
- Role must be active and of type COMPANY_ROLE

**Relationships:**
- Many-to-one: `step` → WorkflowTemplateStep
- Many-to-one: `role` → Lookup

### Workflow (Legacy - Deprecated)
- `id`: UUID (inherited)
- `team`: OneToOneField → Team (required)
- `name`: CharField(max_length=128)
- `created_at`, `updated_at`, `is_active`: inherited

**Relationships:**
- One-to-one: `team` → Team
- One-to-many: `steps` → WorkflowStep

### WorkflowStep (Legacy - Deprecated)
- `id`: UUID (inherited)
- `workflow`: ForeignKey → Workflow (required)
- `step_name`: CharField(max_length=128)
- `step_order`: PositiveIntegerField
- `is_finance_review`: BooleanField(default=False)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`workflow`, `step_order`)
- `step_order` must be >= 1
- Exactly one step per workflow must have `is_finance_review=True`

**Relationships:**
- Many-to-one: `workflow` → Workflow
- One-to-many: `approvers` → WorkflowStepApprover
- One-to-many: `current_requests` → PurchaseRequest
- One-to-many: `approval_history` → ApprovalHistory

### WorkflowStepApprover (Legacy - Deprecated)
- `id`: UUID (inherited)
- `step`: ForeignKey → WorkflowStep (required)
- `role`: ForeignKey → Lookup (required, type=COMPANY_ROLE)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`step`, `role`)
- Role must be active and of type COMPANY_ROLE

**Relationships:**
- Many-to-one: `step` → WorkflowStep
- Many-to-one: `role` → Lookup

---

## 13. Purchase Requests App

**Note:** The `purchase_requests` app is the current/main app. There is also a legacy `requests` app with similar models but fewer features. Use `purchase_requests` for new development.

### PurchaseRequest
- `id`: UUID (inherited)
- `requestor`: ForeignKey → User (required)
- `team`: ForeignKey → Team (required)
- `form_template`: ForeignKey → FormTemplate (required)
- `workflow_template`: ForeignKey → WorkflowTemplate (null=True)
- `status`: ForeignKey → Lookup (required, type=REQUEST_STATUS)
- `current_step`: ForeignKey → WorkflowStep (null=True, legacy)
- `current_template_step`: ForeignKey → WorkflowTemplateStep (null=True, new)
- `vendor_name`: CharField(max_length=255)
- `vendor_account`: CharField(max_length=128)
- `subject`: CharField(max_length=200)
- `description`: TextField(max_length=2000)
- `purchase_type`: ForeignKey → Lookup (required, type=PURCHASE_TYPE)
- `submitted_at`: DateTimeField(null=True)
- `completed_at`: DateTimeField(null=True)
- `rejection_comment`: TextField(null=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Team must be active
- Form template must belong to the team
- Workflow template must belong to the team (if set)
- Status must be of type REQUEST_STATUS
- Purchase type must be of type PURCHASE_TYPE
- Status transitions validated (see model code for details)

**Status Values (REQUEST_STATUS):**
- DRAFT
- PENDING_APPROVAL
- IN_REVIEW
- REJECTED
- RESUBMITTED
- FULLY_APPROVED
- FINANCE_REVIEW
- COMPLETED
- ARCHIVED

**Status Transitions:**
- DRAFT → PENDING_APPROVAL
- REJECTED → RESUBMITTED
- RESUBMITTED → PENDING_APPROVAL
- PENDING_APPROVAL → IN_REVIEW
- IN_REVIEW → FINANCE_REVIEW or FULLY_APPROVED
- FULLY_APPROVED → FINANCE_REVIEW
- FINANCE_REVIEW → COMPLETED
- COMPLETED → ARCHIVED
- Any non-terminal → REJECTED
- COMPLETED and ARCHIVED are immutable

**Relationships:**
- Many-to-one: `requestor` → User
- Many-to-one: `team` → Team
- Many-to-one: `form_template` → FormTemplate
- Many-to-one: `workflow_template` → WorkflowTemplate
- Many-to-one: `status` → Lookup
- Many-to-one: `current_step` → WorkflowStep
- Many-to-one: `current_template_step` → WorkflowTemplateStep
- Many-to-one: `purchase_type` → Lookup
- One-to-many: `field_values` → RequestFieldValue
- One-to-many: `attachments` → Attachment
- One-to-many: `approval_history` → ApprovalHistory
- One-to-many: `audit_events` → AuditEvent

### RequestFieldValue
- `id`: UUID (inherited)
- `request`: ForeignKey → PurchaseRequest (required)
- `field`: ForeignKey → FormField (required)
- `value_number`: DecimalField(max_digits=20, decimal_places=4, null=True)
- `value_text`: TextField(null=True)
- `value_bool`: BooleanField(null=True)
- `value_date`: DateField(null=True)
- `value_dropdown`: JSONField(null=True) - For DROPDOWN fields
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`request`, `field`)
- Only one value column can be non-null (enforced by CheckConstraint)
- Note: FILE_UPLOAD fields use Attachment model instead

**Relationships:**
- Many-to-one: `request` → PurchaseRequest
- Many-to-one: `field` → FormField

---

## 14. Approvals App

### ApprovalHistory
- `id`: UUID (inherited)
- `request`: ForeignKey → PurchaseRequest (required)
- `step`: ForeignKey → WorkflowStep (null=True, legacy)
- `template_step`: ForeignKey → WorkflowTemplateStep (null=True, new)
- `approver`: ForeignKey → User (required)
- `role`: ForeignKey → Lookup (null=True, type=COMPANY_ROLE)
- `action`: CharField - Choices: "APPROVE" or "REJECT"
- `comment`: TextField(null=True) - Required for REJECT (min 10 chars)
- `timestamp`: DateTimeField(auto_now_add=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Either `step` OR `template_step` must be set
- Approver must be active
- Step must be active (if provided)
- Role must be active and of type COMPANY_ROLE (if provided)
- Rejection requires comment with at least 10 characters
- Step must belong to request's team's workflow

**Relationships:**
- Many-to-one: `request` → PurchaseRequest
- Many-to-one: `step` → WorkflowStep
- Many-to-one: `template_step` → WorkflowTemplateStep
- Many-to-one: `approver` → User
- Many-to-one: `role` → Lookup

---

## 15. Attachments App

### AttachmentCategory
- `id`: UUID (inherited)
- `team`: ForeignKey → Team (required)
- `name`: CharField(max_length=128)
- `required`: BooleanField(default=False)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Unique together: (`team`, `name`)
- Team must be active

**Relationships:**
- Many-to-one: `team` → Team
- One-to-many: `attachments` → Attachment

### Attachment
- `id`: UUID (inherited)
- `request`: ForeignKey → PurchaseRequest (required)
- `category`: ForeignKey → AttachmentCategory (null=True)
- `filename`: CharField(max_length=255)
- `file_path`: FileField(upload_to='request_attachments/')
- `file_size`: PositiveIntegerField
- `file_type`: CharField(max_length=32)
- `uploaded_by`: ForeignKey → User (null=True)
- `upload_date`: DateTimeField(auto_now_add=True)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Request must be active
- File size cannot exceed 10 MB
- Category must belong to request's team
- Allowed file extensions: pdf, jpg, jpeg, png, docx

**Relationships:**
- Many-to-one: `request` → PurchaseRequest
- Many-to-one: `category` → AttachmentCategory
- Many-to-one: `uploaded_by` → User

---

## 16. PRS Team Config App

### TeamPurchaseConfig
- `id`: UUID (inherited)
- `team`: ForeignKey → Team (required)
- `purchase_type`: ForeignKey → Lookup (required, type=PURCHASE_TYPE)
- `form_template`: ForeignKey → FormTemplate (required)
- `workflow_template`: ForeignKey → WorkflowTemplate (required)
- `created_at`, `updated_at`, `is_active`: inherited

**Constraints:**
- Team must be active
- Purchase type must be active and of type PURCHASE_TYPE
- Form template must belong to the same team and be active
- Workflow template must belong to the same team and be active
- Only one active config per (`team`, `purchase_type`)

**Relationships:**
- Many-to-one: `team` → Team
- Many-to-one: `purchase_type` → Lookup
- Many-to-one: `form_template` → FormTemplate
- Many-to-one: `workflow_template` → WorkflowTemplate

---

## 17. Requests App (Legacy - Deprecated)

**Note:** This is a legacy app. The `purchase_requests` app (section 13) is the current version. This app is kept for backward compatibility.

### PurchaseRequest (Legacy)
Similar to `purchase_requests.PurchaseRequest` but with:
- Uses `template_version` instead of `form_template`
- References `forms.FormTemplate` instead of `prs_forms.FormTemplate`
- Uses `forms.FormField` instead of `prs_forms.FormField`
- Different status transition logic (uses IN_REVIEW_STEP_1 through IN_REVIEW_STEP_10)
- Has `value_file` field in RequestFieldValue (removed in current version)

### RequestFieldValue (Legacy)
Similar to `purchase_requests.RequestFieldValue` but includes:
- `value_file`: FileField (removed in current version, uses Attachment model instead)

---

## Seed Data Creation Order

When creating seed data, follow this order to respect foreign key dependencies:

1. **BaseModel** (abstract, no seed needed)
2. **LookupType** - Create all lookup types first
3. **Lookup** - Create all lookup values
4. **User** - Create users
5. **Team** - Create teams
6. **OrgNode** - Create holdings first, then companies
7. **FinancialPeriod** - Create financial periods
8. **ReportGroup** - Create report groups
9. **ReportBox** - Create report boxes
10. **ReportField** - Create report fields
11. **FormTemplate** (prs_forms) - Create form templates
12. **FormField** (prs_forms) - Create form fields
13. **WorkflowTemplate** - Create workflow templates
14. **WorkflowTemplateStep** - Create workflow steps
15. **WorkflowTemplateStepApprover** - Assign approvers to steps
16. **TeamPurchaseConfig** - Link teams, purchase types, templates, and workflows
17. **AttachmentCategory** - Create attachment categories
18. **AccessScope** - Assign user access to org nodes/teams
19. **CompanyClassification** - Classify companies
20. **PurchaseRequest** - Create purchase requests
21. **RequestFieldValue** - Add field values to requests
22. **Attachment** - Add attachments to requests
23. **ApprovalHistory** - Record approval actions
24. **AuditEvent** - Create audit events
25. **FieldChange** - Record field changes
26. **ReportSubmissionGroup** - Create report submission groups (CFO Wise)
27. **Submission** - Create submissions (CFO Wise)
28. **SubmissionFieldValue** - Add field values to submissions (CFO Wise)

---

## Notes for Seed Data

1. **UUIDs**: All models use UUID primary keys. Generate UUIDs for seed data or let Django generate them automatically.

2. **Soft Deletes**: All models have `is_active` field. Set to `True` for active records, `False` for deleted records.

3. **Timestamps**: `created_at` and `updated_at` are auto-managed, but you can set them explicitly in seed data if needed.

4. **Lookup Types**: Ensure all required LookupType records exist before creating Lookup records.

5. **Status Transitions**: When creating PurchaseRequest or Submission records, ensure status transitions are valid.

6. **Unique Constraints**: Pay attention to unique_together constraints when creating seed data.

7. **File Fields**: For Attachment and SubmissionFieldValue with file fields, you'll need actual file paths or use Django's file handling.

8. **JSON Fields**: For JSON fields (validation_rules, dropdown_options, metadata, value_dropdown), provide valid JSON structures.

9. **Required Fields**: Check each model for required fields (non-nullable, non-blankable) before creating seed data.

10. **Foreign Key Relationships**: Ensure all referenced objects exist before creating records with foreign keys.

