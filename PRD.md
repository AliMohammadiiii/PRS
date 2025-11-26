# Purchase Request System (PRS)

**Phase 1 – Product Requirements Document (PRD)**  
**Version:** 1.4 (Enhanced)  
**Date:** November 2025  
**Author:** Ali / Product Team

---

## 1. Executive Summary & Strategic Context

### 1.1 Project Objective

The Purchase Request System (PRS) standardizes and digitizes all internal procurement requests (goods or services). It enables all teams—including Marketing, Tech, Product, and Finance—to:

- Initiate purchase requests through team-specific forms
- Upload the necessary documentation
- Move requests through team-specific approval workflows
- Deliver fully approved requests to Finance for payment preparation
- Maintain a complete and auditable record of all purchase activities

The solution replaces manual, fragmented processes and ensures transparency, standardization, and accountability.

### 1.2 Strategic Decision: Product-First Architecture

Phase 1 focuses exclusively on delivering a high-quality purchase request workflow system. Any generic workflow engine or reusable architecture is deferred to later phases.

### 1.3 Go/No-Go Success Criteria

The project is a **Go** if:

1. Each team can create requests using their own unique form
2. Each team has a unique, linear workflow with multiple approval steps
3. Supporting documents can be uploaded and stored securely
4. Finance reliably receives fully approved requests
5. A Level 2 field-level audit trail exists for all requests
6. Final finance completion triggers the organization-wide confirmation email

---

## 2. Functional Requirements (FR)

### 2.1 Organizational Setup (FR-ORG)

| ID | Requirement | Detail |
|---|---|---|
| FR-ORG-001 | Team Definition | Admin can define organizational teams (Marketing, Tech, Product, Finance, etc.). Teams have: name, description, active status, creation date. |
| FR-ORG-002 | User Assignment | Users may belong to one or multiple teams. Assignment is managed by System Admin or Workflow Admin. |
| FR-ORG-003 | Status Management | Teams and users cannot be deleted, only deactivated. Deactivated teams cannot be selected for new requests. Deactivated users cannot be assigned as approvers. |
| FR-ORG-004 | Workflow Linkage | Each team must have its own workflow and its own unique request form. This linkage is mandatory and cannot be removed. |

**Business Rules:**
- At least one team must exist and be active
- A team cannot be deactivated if it has active requests in progress
- Users must belong to at least one team to create requests

---

### 2.2 User & Access Management (FR-USER)

**User Attributes:**
- Name (required)
- Username (required, unique)
- Email (required, unique, validated)
- Password (required, encrypted)
- Roles (one or multiple)
- Teams (one or multiple)
- Active status (default: active)
- Created date / Last modified date

**Roles & Permissions:**

| Role | Capabilities |
|---|---|
| **System Admin** | Full control over system configuration, all teams, all users, all workflows, all forms, system settings |
| **Workflow Admin** | Create/modify workflows & forms for assigned teams only; assign approvers to workflow steps |
| **Initiator** | Create & submit purchase requests for their assigned teams; edit own draft/rejected requests; view own requests |
| **Approver** | Approve/reject requests at assigned workflow step(s); view requests assigned to them; view attachments |
| **Finance Reviewer** | Final review and completion of fully approved requests; view all completed requests; mark requests as Complete |
| **Observer** (optional) | Read-only access to requests based on team membership; cannot modify any data |

**Authentication:**
- Username + password (required)
- Session-based authentication
- Password requirements: minimum 8 characters, complexity rules (Phase 1 basic, enhanced in Phase 2)

**Authorization Rules:**
- Users can only create requests for teams they belong to
- Approvers can only approve requests at steps where they are assigned
- Finance Reviewers can access all requests that have reached "Fully Approved" status

---

### 2.3 Team-Specific Purchase Request Forms (FR-FORM-TEAM)

**Central Rule:** Each team has its own form template. Each template defines its own fields, rules, and required attachments.

| ID | Requirement | Detail |
|---|---|---|
| FR-FORM-TEAM-001 | Form Template Per Team | Each team has a unique form template. Templates are independent and cannot be shared between teams. |
| FR-FORM-TEAM-002 | Template Editor | Workflow Admin can add, remove, and order fields inside each team's form. Field order determines display order. |
| FR-FORM-TEAM-003 | Field Types | Supported types: Text, Number, Date, Boolean, Dropdown (with predefined options), File Upload. Each field has: label, type, required flag, default value (optional), validation rules (optional). |
| FR-FORM-TEAM-004 | Required/Optional | Fields may be marked as required or optional per team. Required fields must be completed before submission. |
| FR-FORM-TEAM-005 | Template Versioning | Changes to templates create a new version; active requests use the version that existed when they were created. Version history is maintained. |
| FR-FORM-TEAM-006 | Attachment Rules | Teams may define required attachment categories (e.g., "Invoice", "Proposal", "Contract"). Each category can be marked as required or optional. |
| FR-FORM-TEAM-007 | Dynamic Form Loading | When initiator selects a team, the corresponding form template loads dynamically. Base fields + team-specific fields are displayed. |

**Field Configuration Details:**
- **Text fields**: Max length configurable (default: 500 characters)
- **Number fields**: Min/max values configurable, decimal precision
- **Date fields**: Date picker, min/max date validation
- **Boolean fields**: Checkbox or toggle
- **Dropdown fields**: Predefined list of options, single selection
- **File Upload fields**: Separate from attachment system; used for form-specific file inputs

**Template Management:**
- Templates cannot be deleted if they have associated requests
- Template changes require Workflow Admin or System Admin role
- Template version number increments automatically on save

---

### 2.4 Purchase Request Form – Base Fields (FR-FORM-BASE)

Regardless of team, the following core fields **always exist** and cannot be removed:

| Field | Type | Required | Auto-filled | Notes |
|---|---|---|---|---|
| Requestor | Text | Yes | Yes | Automatically set to current user |
| Team | Dropdown | Yes | No | User selects from their assigned teams |
| Vendor/Recipient Name | Text | Yes | No | Name of vendor or service provider |
| Vendor Account/IBAN | Text | Yes | No | Bank account details for payment |
| Subject/Purpose | Text | Yes | No | Brief summary of the purchase |
| Description | Text (long) | Yes | No | Detailed description of the request |
| Purchase Type | Dropdown | Yes | No | Options: "Good" or "Service" |
| Attachments | File Upload | No | No | Multiple files allowed (see section 2.7) |

**Validation Rules:**
- Vendor Account/IBAN: Basic format validation (IBAN format check)
- Subject/Purpose: Max 200 characters
- Description: Max 2000 characters
- All required base fields must be completed before submission

---

### 2.5 Workflow Definition (FR-WF)

Each team must have its own dedicated workflow.

| ID | Requirement | Detail |
|---|---|---|
| FR-WF-001 | Workflow Per Team | Every team has exactly one workflow, independent from others. Workflows cannot be shared or copied between teams. |
| FR-WF-002 | Sequential Steps | Workflow is strictly linear: Step 1 → Step 2 → … → Finance Review. Steps are executed in order; no parallel approvals, no skipping steps. |
| FR-WF-003 | Approver Assignment | Each step must have at least one approver assigned. Multiple approvers at a step require all to approve (AND logic). Approvers must be active users. |
| FR-WF-004 | Step Constraints | Workflows cannot be edited if any requests using that workflow are in progress (status: Pending Approval, In Review, or Fully Approved). Only workflows with no active requests can be modified. |
| FR-WF-005 | Final Step = Finance | Every workflow must end with Finance Review step. This step cannot be removed or reordered. Finance Reviewers are assigned to this step. |
| FR-WF-006 | Step Naming | Each step has a name (e.g., "Manager Approval", "Director Approval") and an order number. Steps are numbered sequentially starting from 1. |
| FR-WF-007 | Minimum Steps | Each workflow must have at least 2 steps: one approval step + Finance Review. Maximum steps: 10 (configurable limit). |

**Workflow Configuration:**
- Steps can be added, removed, or reordered (when no active requests exist)
- Step names are user-defined and descriptive
- Approvers can be assigned to multiple steps
- Workflow Admin can assign approvers to steps for their assigned teams

---

### 2.6 Request Status Lifecycle (FR-STATUS)

**Status Definitions:**

| Status | Description | Who Can Set | Next Possible Statuses |
|---|---|---|---|
| **Draft** | Request created but not submitted | Initiator | Pending Approval, (deleted/cancelled) |
| **Pending Approval** | Submitted, waiting for first approval step | System (on submit) | In Review (Step 1), Rejected |
| **In Review (Step X)** | Currently at workflow step X | System (on step transition) | In Review (Step X+1), Rejected, Fully Approved |
| **Rejected** | Rejected by an approver | Approver | Resubmitted, Draft |
| **Resubmitted** | Rejected request resubmitted by initiator | Initiator | Pending Approval, In Review (Step 1) |
| **Fully Approved** | All workflow steps approved, ready for Finance | System (on final approval) | Finance Review, Rejected (if Finance rejects) |
| **Finance Review** | Under final review by Finance | System (on reaching Finance step) | Completed, Rejected |
| **Completed** | Finance marked as complete, payment ready | Finance Reviewer | (final state, read-only) |
| **Archived** | Archived for long-term storage | System/Admin | (future phase) |

**Status Transition Rules:**

1. **Rejection Rules:**
   - Rejection requires mandatory comment (minimum 10 characters)
   - Rejection can occur at any approval step or Finance Review
   - Rejected requests return to Initiator for editing

2. **Editing Rules:**
   - Editing allowed only in **Draft** or **Rejected** state
   - When editing a Rejected request, all previous approvals are cleared
   - Resubmission restarts the workflow from Step 1

3. **Read-Only Rules:**
   - **Completed** requests become read-only for all users
   - Historical data (approval history, audit trail) remains viewable
   - Attachments remain downloadable for authorized users

4. **Approval Rules:**
   - Approvers can only approve/reject requests at their assigned step
   - Once approved, a step cannot be reversed (except by rejection at a later step)
   - All steps must be approved sequentially before reaching Finance Review

5. **Resubmission Rules:**
   - Initiator can resubmit rejected requests after making changes
   - Resubmission clears all previous approvals
   - Workflow restarts from Step 1

---

### 2.7 Attachments (FR-DOC)

| ID | Requirement | Detail |
|---|---|---|
| FR-DOC-001 | Multi-File Upload | Users may upload multiple attachments per request. Attachments can be added during creation (Draft) or when resubmitting (Rejected state). |
| FR-DOC-002 | Allowed File Types | PDF, JPG, JPEG, PNG, DOCX. File type validation is enforced on upload. Invalid file types are rejected with error message. |
| FR-DOC-003 | Required Attachments Per Team | Each team can define mandatory attachment categories (e.g., "Invoice", "Proposal", "Contract"). Each category can be required or optional. Validation occurs on submission. |
| FR-DOC-004 | Versioned Storage | Files must not be overwritten; every version is stored. When a request is edited and resubmitted, new attachments are added without removing old ones. All versions remain accessible. |
| FR-DOC-005 | Secure Access | Only users involved in the workflow can download attachments: Initiator, Approvers (at any step), Finance Reviewers, System Admin, Workflow Admin (for their teams). |
| FR-DOC-006 | File Size Limits | Maximum file size: 10 MB per file. Maximum total attachments per request: 50 MB. Validation occurs on upload. |
| FR-DOC-007 | File Naming | Original filenames are preserved. System generates unique storage identifiers to prevent conflicts. Display shows original filename + upload timestamp. |
| FR-DOC-008 | Attachment Metadata | Each attachment stores: original filename, file type, file size, upload timestamp, uploaded by (user), category (if assigned). |

**Attachment Categories:**
- Categories are defined per team (e.g., "Invoice", "Quote", "Contract", "Receipt")
- Categories can be marked as required or optional
- Multiple files can be assigned to the same category
- Categories are validated on request submission

---

### 2.8 Visibility & Tracking (FR-VISIBILITY)

**Request Detail View - Users must be able to see:**

| Information | Description | Visibility Rules |
|---|---|---|
| Current Status | Current status of the request | All authorized users |
| Workflow Step | Current step in the workflow (e.g., "Step 2 of 4") | All authorized users |
| Approver History | Complete history of approvals/rejections with timestamps | All authorized users |
| Timestamps | Created date, submitted date, last modified date, completed date | All authorized users |
| Attachments | List of all attachments with download links | Workflow participants only |
| Audit Trail | Complete field-level change history | All authorized users |
| Rejection Reasons | Comments provided when requests were rejected | All authorized users |
| Team Form Fields | All base fields + team-specific fields with values | All authorized users |
| Request ID | Unique identifier for the request | All authorized users |
| Requestor Information | Name, email of the person who created the request | All authorized users |
| Vendor Information | Vendor name, account details | All authorized users |

**Request List View - Filters:**

| Filter | Description | Options |
|---|---|---|
| Team | Filter by team | All teams user has access to |
| Date Range | Filter by creation or submission date | Date picker (from/to) |
| Status | Filter by current status | All statuses |
| Requestor | Filter by user who created the request | Search by name/email |
| Vendor | Filter by vendor name | Text search |
| Purchase Type | Filter by Good or Service | Dropdown |
| Workflow Step | Filter by current workflow step | Step names |

**Request List View - Sort Options:**
- Date created (newest first / oldest first)
- Date submitted (newest first / oldest first)
- Status
- Requestor name
- Vendor name

**Request List View - Columns:**
- Request ID
- Subject/Purpose
- Requestor
- Team
- Status
- Current Step
- Vendor
- Created Date
- Last Modified Date

---

### 2.9 End-to-End Submission Workflow (CWF)

**Complete Request Lifecycle:**

1. **Initiator selects team** → System validates user has access to selected team
2. **System loads the team's form** → Base fields + team-specific fields + required attachment categories displayed
3. **Initiator completes fields + uploads attachments** → Validation occurs in real-time for required fields
4. **Initiator saves as Draft** → Request saved, can be edited later
5. **Initiator submits request** → System validates all required fields and attachments are present
6. **Request status changes to "Pending Approval"** → First workflow step is activated
7. **Request moves to "In Review (Step 1)"** → Assigned approvers are notified (if notification system exists)
8. **Approvers review and approve/reject** → If approved, moves to next step; if rejected, returns to Initiator
9. **Request progresses through all workflow steps** → Each step must be approved before moving to next
10. **All steps approved → Status changes to "Fully Approved"** → Request is ready for Finance
11. **Request moves to "Finance Review"** → Finance Reviewers can access the request
12. **Finance performs final review** → Finance can view all details, attachments, approval history
13. **Finance marks request Complete** → Status changes to "Completed", completion email is triggered
14. **Request becomes read-only record** → No further edits allowed, all data preserved

**Error Handling:**
- If required fields are missing on submission → Error message, request remains in Draft
- If required attachments are missing → Error message, request remains in Draft
- If approver is deactivated → System Admin must reassign before request can proceed
- If workflow is modified while request is in progress → Request continues with original workflow version

---

## 3. Approval & Finance Logic (CWF-APPROVAL)

### 3.1 Approver Actions

Approvers assigned to a workflow step can:

| Action | Description | Constraints |
|---|---|---|
| **View Request** | View complete request details including all fields, attachments, and history | Only for requests at their assigned step |
| **View Attachments** | Download and view all attachments associated with the request | Same access as View Request |
| **Approve** | Approve the request at their step, moving it to the next step | Only at their assigned step; cannot approve own requests |
| **Reject** | Reject the request with mandatory comment, returning it to Initiator | Requires comment (min 10 characters); request returns to Draft/Rejected status |

**Approval Rules:**
- Approvers cannot approve requests they created (system prevents self-approval)
- If multiple approvers are assigned to a step, all must approve (AND logic)
- Approvals are logged in audit trail with timestamp and user ID
- Once approved, a step cannot be reversed (except by rejection at a later step)

### 3.2 Finance Actions

Finance Reviewers can:

| Action | Description | Constraints |
|---|---|---|
| **View Final Request** | View complete request with all approvals, attachments, and history | Only for requests in "Fully Approved" or "Finance Review" status |
| **Mark Complete** | Mark request as completed, triggering completion email | Only for requests in "Finance Review" status |
| **Reject to Initiator** | Reject request back to Initiator with comment (Admin-only override) | Requires System Admin role or special permission; requires mandatory comment |

**Finance Review Rules:**
- Finance Review is the final step in every workflow
- Finance Reviewers can access all requests that have reached "Fully Approved" status
- Completion triggers the organizational confirmation email
- Completed requests cannot be modified or rejected

### 3.3 Completion Email

**Email Configuration:**
- Email must be sent to a pre-defined organizational inbox (configured in system settings)
- Email is triggered automatically when Finance marks request as Complete
- Email sending failures are logged but do not prevent completion

**Email Content Must Include:**
- Request ID (unique identifier)
- Team name
- Requestor name and email
- Vendor/Recipient name
- Vendor Account/IBAN
- Subject/Purpose
- Description
- Purchase Type (Good/Service)
- Complete list of attachments (filenames and categories)
- Approval summary (all approvers, steps, timestamps)
- Completion timestamp
- Direct link to view request in system (if applicable)

**Email Format:**
- Professional, clear formatting
- All critical information visible
- Attachment list clearly presented
- Approval history in chronological order

---

## 4. Audit Trail Requirements (NFR-AUDIT)

### 4.1 Mandatory Level 2 Field-Level Logging

**Audit Log Entry Must Include:**

| Field | Description | Required |
|---|---|---|
| **Field Name** | Name of the field that was changed (e.g., "Vendor Name", "Description", "Status") | Yes |
| **Old Value** | Previous value before change (null/empty for new fields) | Yes |
| **New Value** | New value after change | Yes |
| **User ID** | ID of the user who made the change | Yes |
| **User Name** | Display name of the user (for readability) | Yes |
| **IP Address** | IP address of the user (optional Phase 2) | Phase 2 |
| **Timestamp** | Exact date and time of the change (UTC, millisecond precision) | Yes |
| **Action Type** | Type of action performed | Yes |
| **Request ID** | ID of the request being modified | Yes |
| **Additional Context** | Additional context (e.g., rejection comment, step name) | Conditional |

**Action Types Tracked:**
- `field_edit` - Field value changed
- `field_added` - New field value added
- `field_removed` - Field value removed
- `approval` - Request approved at a step
- `rejection` - Request rejected with comment
- `resubmission` - Request resubmitted after rejection
- `attachment_upload` - New attachment uploaded
- `attachment_removed` - Attachment removed (if allowed)
- `status_change` - Request status changed
- `workflow_step_change` - Request moved to different workflow step
- `request_created` - Request initially created
- `request_submitted` - Request submitted for approval
- `request_completed` - Request marked as complete by Finance

### 4.2 Audit Log Properties

**Immutability:**
- Audit log entries cannot be modified or deleted
- Log entries are append-only
- Historical accuracy is guaranteed

**Accessibility:**
- Audit log is viewable for every request
- All authorized users can view audit trail
- Audit log is displayed in chronological order
- Filtering and search capabilities (by user, date, action type)

**Performance:**
- Audit log queries must not significantly impact request loading time
- Pagination for requests with extensive audit history
- Efficient storage and indexing for fast retrieval

**Data Retention:**
- Audit logs are retained permanently (no deletion)
- Storage optimization may be needed for long-term retention

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance

| Requirement | Target | Measurement |
|---|---|---|
| Request List Load Time | < 2 seconds | Time to display first 50 requests in list view |
| Request Detail Load Time | < 2 seconds | Time to load complete request with all fields, attachments list, and audit trail |
| Form Template Load Time | < 1 second | Time to load team form template when team is selected |
| File Upload Time | < 5 seconds per file | Time to upload and process a 10 MB file |
| Search/Filter Response | < 1 second | Time to filter or search requests |
| Concurrent Users | 500 active users | System must support 500 simultaneous active users |
| Database Query Performance | < 500ms | Average query time for standard operations |

**Performance Optimization:**
- Pagination for large result sets
- Lazy loading for attachments
- Efficient database indexing
- Caching of form templates and workflow definitions

### 5.2 Security

| Requirement | Implementation |
|---|---|
| **Role-Based Access Control (RBAC)** | Strict enforcement of role-based permissions at API and UI level |
| **Encrypted File Storage** | All attachments encrypted at rest using industry-standard encryption |
| **Secure File Transfer** | HTTPS/TLS for all file uploads and downloads |
| **No Public Endpoints** | All endpoints require authentication; no anonymous access |
| **Password Security** | Passwords encrypted using secure hashing (bcrypt/argon2) |
| **Session Management** | Secure session handling with timeout and invalidation |
| **Input Validation** | All user inputs validated and sanitized to prevent injection attacks |
| **SQL Injection Prevention** | Parameterized queries, ORM usage |
| **XSS Prevention** | Output encoding, Content Security Policy |
| **CSRF Protection** | CSRF tokens for state-changing operations |

**Security Audit:**
- Regular security reviews
- Vulnerability scanning
- Penetration testing (Phase 2)

### 5.3 Reliability

| Requirement | Implementation |
|---|---|
| **No Deletions** | Records and attachments cannot be deleted; only deactivation allowed |
| **Permanent Accessibility** | All completed requests remain accessible indefinitely |
| **Data Integrity** | Database constraints and validation ensure data consistency |
| **Backup & Recovery** | Regular automated backups with tested recovery procedures |
| **Error Handling** | Graceful error handling with user-friendly error messages |
| **Transaction Management** | Database transactions ensure atomicity of operations |
| **File Storage Redundancy** | Attachments stored with redundancy to prevent data loss |

**Uptime Target:**
- System availability: 99.5% (Phase 1)
- Planned maintenance windows communicated in advance

### 5.4 Scalability

**Horizontal Scalability:**
- System architecture supports adding more application servers
- Database can be scaled independently
- File storage can be scaled (cloud storage or distributed file system)

**Vertical Scalability:**
- Support for more teams (target: 50+ teams)
- Support for more workflow steps (target: 10+ steps per workflow)
- Support for more attachment categories per team
- Support for larger file sizes (future: up to 50 MB per file)

**Integration Readiness:**
- RESTful API design for future integrations
- Webhook support for external systems (Phase 2)
- ERP/accounting integration ready (Phase 2)
- Export capabilities (CSV, JSON) for reporting

**Data Growth:**
- Efficient storage for large volumes of requests
- Archive strategy for old requests (Phase 2)
- Database partitioning strategy for large datasets (Phase 2)

---

## 6. Scope (Phase 1)

### 6.1 Inclusions

**Core Functionality:**
- ✅ Team-specific forms with custom field configuration
- ✅ Team-specific linear workflows with multiple approval steps
- ✅ Field configuration (add, remove, reorder, set required/optional)
- ✅ Attachment upload with required attachment category logic
- ✅ Multi-step approval workflow with sequential processing
- ✅ Rejection with mandatory comments
- ✅ Resubmission of rejected requests
- ✅ Finance finalization step (final review and completion)
- ✅ Completion email to organizational inbox
- ✅ Read-only view for completed requests
- ✅ Full Level 2 field-level audit trail
- ✅ User & role management (CRUD operations)
- ✅ Team management (create, edit, deactivate)
- ✅ Workflow configuration (create, edit steps, assign approvers)
- ✅ Form template versioning
- ✅ Request filtering and search
- ✅ Request detail view with complete history

**User Interface:**
- Request creation form (dynamic based on team selection)
- Request list view with filters
- Request detail view
- Approval/rejection interface
- Admin interfaces for teams, users, workflows, forms
- Audit trail viewer

**Technical:**
- Authentication and authorization
- File upload and storage
- Email sending (completion emails)
- Database schema and migrations
- API endpoints for all operations
- Basic error handling and validation

### 6.2 Exclusions (Future Phases)

**Not Included in Phase 1:**
- ❌ Budgeting module (budget allocation, tracking, limits)
- ❌ ERP/accounting system integration
- ❌ Real-time notifications for all workflow steps (email/SMS/push)
- ❌ Complex conditional field logic (show/hide fields based on other field values)
- ❌ Generic workflow engine (reusable across different use cases)
- ❌ Vendor management (vendor database, vendor profiles)
- ❌ Mobile app (native iOS/Android applications)
- ❌ SLA or approval-time tracking (deadlines, reminders, escalations)
- ❌ Advanced reporting and analytics dashboard
- ❌ Bulk operations (bulk approval, bulk export)
- ❌ Workflow templates or workflow library
- ❌ Parallel approval steps (multiple approvers at same step with OR logic)
- ❌ Delegation (approvers delegating to others)
- ❌ Approval chains with conditions (if/then logic)
- ❌ Integration with external authentication systems (SSO, LDAP)
- ❌ Multi-language support
- ❌ Advanced file preview (inline PDF/image viewing)
- ❌ File version comparison
- ❌ Request cloning or templates

---

## 7. Glossary

| Term | Definition |
|---|---|
| **Initiator** | User creating a purchase request. Must belong to the team for which they are creating the request. |
| **Approver** | User assigned to approve/reject requests at a specific workflow step. Can be assigned to multiple steps. |
| **Workflow** | Series of sequential approval stages per team. Each team has exactly one workflow. |
| **Workflow Step** | A single stage in a workflow where one or more approvers must approve before proceeding. Steps are executed in order. |
| **Form Template** | Team-specific purchase request form definition. Includes base fields + team-specific custom fields. |
| **Finance Reviewer** | User with Finance Reviewer role who performs final review and marks requests as Complete. |
| **Audit Trail** | Immutable history of all changes and actions performed on a request, including field-level changes. |
| **Request** | A purchase request created by an Initiator, moving through workflow steps until completion. |
| **Attachment** | File uploaded to a request (PDF, JPG, PNG, DOCX). Can be categorized and marked as required. |
| **Attachment Category** | Classification for attachments (e.g., "Invoice", "Proposal"). Teams can define required categories. |
| **Status** | Current state of a request (Draft, Pending Approval, In Review, Rejected, etc.). |
| **Resubmission** | Process of resubmitting a rejected request after making changes. Clears previous approvals. |
| **Template Versioning** | System that preserves form template versions so active requests use the template version that existed when they were created. |
| **Base Fields** | Core fields present in all purchase request forms regardless of team (Requestor, Team, Vendor, etc.). |
| **Team-Specific Fields** | Custom fields defined per team in addition to base fields. |
| **Completion Email** | Email sent to organizational inbox when Finance marks a request as Complete. |

---

## 8. Data Model Overview

### 8.1 Core Entities

**Teams**
- ID, name, description, active status, created date, modified date

**Users**
- ID, name, username, email, password (encrypted), active status, created date, modified date
- Many-to-many relationship with Teams
- Many-to-many relationship with Roles

**Roles**
- ID, name, description, permissions

**Form Templates**
- ID, team ID, version number, active status, created date, created by
- One-to-many relationship with Form Fields

**Form Fields**
- ID, template ID, field name, field type, label, required flag, order, default value, validation rules

**Workflows**
- ID, team ID, name, active status, created date, modified date
- One-to-many relationship with Workflow Steps

**Workflow Steps**
- ID, workflow ID, step name, step order, active status
- Many-to-many relationship with Users (approvers)

**Purchase Requests**
- ID, requestor ID, team ID, template version ID, status, vendor name, vendor account, subject, description, purchase type, created date, submitted date, completed date
- One-to-many relationship with Request Field Values
- One-to-many relationship with Attachments
- One-to-many relationship with Audit Log Entries
- One-to-many relationship with Approval History

**Request Field Values**
- ID, request ID, field ID, field value, created date, modified date

**Attachments**
- ID, request ID, filename, file path, file size, file type, category, uploaded by, upload date

**Approval History**
- ID, request ID, step ID, approver ID, action (approve/reject), comment, timestamp

**Audit Log Entries**
- ID, request ID, field name, old value, new value, user ID, action type, timestamp, additional context

### 8.2 Key Relationships

- Team → Form Template (one-to-one)
- Team → Workflow (one-to-one)
- Team → Users (many-to-many)
- User → Roles (many-to-many)
- Workflow → Workflow Steps (one-to-many)
- Workflow Step → Users/Approvers (many-to-many)
- Request → Team (many-to-one)
- Request → Requestor/User (many-to-one)
- Request → Form Template Version (many-to-one)

---

## 9. API Considerations

### 9.1 API Design Principles

- RESTful API design
- JSON request/response format
- Consistent error handling and status codes
- Authentication via session or token-based auth
- Versioning support (v1, v2, etc.)

### 9.2 Key API Endpoints (High-Level)

**Authentication:**
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

**Teams:**
- GET /api/teams
- POST /api/teams
- GET /api/teams/{id}
- PUT /api/teams/{id}
- PATCH /api/teams/{id}/deactivate

**Users:**
- GET /api/users
- POST /api/users
- GET /api/users/{id}
- PUT /api/users/{id}
- PATCH /api/users/{id}/deactivate

**Form Templates:**
- GET /api/teams/{teamId}/form-template
- POST /api/teams/{teamId}/form-template
- PUT /api/teams/{teamId}/form-template

**Workflows:**
- GET /api/teams/{teamId}/workflow
- POST /api/teams/{teamId}/workflow
- PUT /api/teams/{teamId}/workflow

**Requests:**
- GET /api/requests
- POST /api/requests
- GET /api/requests/{id}
- PUT /api/requests/{id}
- POST /api/requests/{id}/submit
- POST /api/requests/{id}/approve
- POST /api/requests/{id}/reject
- POST /api/requests/{id}/complete

**Attachments:**
- POST /api/requests/{id}/attachments
- GET /api/requests/{id}/attachments
- GET /api/attachments/{id}/download
- DELETE /api/attachments/{id} (if allowed)

**Audit Trail:**
- GET /api/requests/{id}/audit-trail

---

## 10. Testing Requirements

### 10.1 Test Coverage Areas

**Functional Testing:**
- Request creation and submission
- Workflow progression through all steps
- Approval and rejection flows
- Resubmission after rejection
- Finance completion
- Form template versioning
- Attachment upload and download
- Field validation
- Required field/attachment validation

**Security Testing:**
- Role-based access control
- Unauthorized access attempts
- File upload security (file type validation, size limits)
- SQL injection prevention
- XSS prevention
- CSRF protection

**Performance Testing:**
- Load testing (500 concurrent users)
- Response time testing
- File upload performance
- Database query performance

**Integration Testing:**
- Email sending (completion emails)
- File storage integration
- Authentication flow

**User Acceptance Testing (UAT):**
- End-to-end workflow testing
- User interface usability
- Error message clarity
- Edge case handling

---

## 11. Success Metrics

### 11.1 Phase 1 Success Criteria

- ✅ All 6 Go/No-Go criteria met (Section 1.3)
- ✅ System supports minimum 500 concurrent users
- ✅ Request load time < 2 seconds
- ✅ Zero data loss (all requests and attachments preserved)
- ✅ 100% audit trail coverage (all actions logged)
- ✅ Completion emails sent successfully for all completed requests
- ✅ All roles and permissions working as specified
- ✅ All workflow steps functioning correctly
- ✅ Form template versioning working correctly

### 11.2 User Adoption Metrics (Post-Launch)

- Number of requests created per week/month
- Average time from creation to completion
- Rejection rate and reasons
- User satisfaction scores
- System uptime percentage
