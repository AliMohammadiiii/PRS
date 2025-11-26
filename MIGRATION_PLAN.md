# CFO Wise → PRS Migration Plan

**Date:** November 2025  
**Purpose:** Analyze existing Django backend architecture and propose mapping from CFO Wise domain to Purchase Request System (PRS) domain

---

## Executive Summary

The current backend implements a CFO reporting system with the following core concepts:
- **Organizations**: Hierarchical structure (Holding → Company)
- **Reports**: Financial report templates (ReportBox) with fields (ReportField)
- **Submissions**: Company submissions of financial data for specific periods
- **Audit Trail**: Field-level change tracking for submissions

PRS requires:
- **Teams**: Flat organizational structure (Marketing, Tech, Product, Finance)
- **Forms**: Team-specific form templates with custom fields
- **Requests**: Purchase requests moving through approval workflows
- **Workflows**: Sequential approval steps per team
- **Audit Trail**: Field-level change tracking for requests

---

## 1. Reusable Components

These components are generic and can be reused with minimal or no changes:

### 1.1 Core Infrastructure

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `BaseModel` | `core/models.py` | ✅ **Fully Reusable** | Provides UUID primary key, timestamps, soft-delete (`is_active`) |
| `SoftDeleteModelViewSet` | `core/views.py` | ✅ **Fully Reusable** | Enforces soft-delete semantics, filters `is_active=True` |
| Django Settings | `Backend/cfowise/settings.py` | ✅ **Reusable** | Standard Django/DRF configuration, JWT auth, CORS, logging |

### 1.2 User Management

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `User` model | `accounts/models.py` | ✅ **Fully Reusable** | Extends `AbstractUser`, includes `national_code`, `mobile_phone` |
| `UserSerializer` | `accounts/serializers.py` | ✅ **Fully Reusable** | Standard CRUD operations, password handling |
| `UserViewSet` | `accounts/views.py` | ✅ **Fully Reusable** | Admin-only user management |
| `ChangePasswordSerializer` | `accounts/serializers.py` | ✅ **Fully Reusable** | Password change with validation |
| `change_password_view` | `accounts/views.py` | ✅ **Fully Reusable** | Rate-limited password change endpoint |

### 1.3 Lookup/Classification System

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `LookupType` | `classifications/models.py` | ✅ **Fully Reusable** | Generic lookup type system (e.g., "ORG_TYPE", "REPORT_STATUS") |
| `Lookup` | `classifications/models.py` | ✅ **Fully Reusable** | Generic lookup values with type constraints |
| Lookup Serializers/Views | `classifications/` | ✅ **Reusable** | Standard CRUD for lookups |

**Note:** Some lookup types are CFO-specific and should be deprecated (see section 2).

### 1.4 Audit Infrastructure (Architecture)

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `AuditEvent` model structure | `audit/models.py` | ⚠️ **Architecture Reusable** | Event-based audit logging pattern is reusable, but references need updating |
| `FieldChange` model structure | `audit/models.py` | ⚠️ **Architecture Reusable** | Field-level change tracking pattern is reusable |
| Audit signals pattern | `audit/signals.py` | ⚠️ **Pattern Reusable** | Signal-based audit logging pattern is reusable |

**Note:** These need adaptation to reference PRS entities instead of CFO entities (see section 3).

### 1.5 Permissions Framework

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| `HasCompanyAccess` | `accounts/permissions.py` | ⚠️ **Pattern Reusable** | Permission pattern is reusable, but needs to check Teams instead of Companies |
| `ReadOnlyOrAdmin` | `accounts/permissions.py` | ✅ **Fully Reusable** | Generic read-only or admin permission |
| `IsAdmin` | `accounts/permissions.py` | ✅ **Fully Reusable** | Simple admin check |

---

## 2. To Deprecate / Isolate

These components are CFO-specific and should be deprecated or isolated:

### 2.1 Reports Module

| Component | Location | Reason |
|-----------|----------|--------|
| `ReportBox` | `reports/models.py` | CFO-specific: Financial report templates (e.g., "Cash Flow Statement", "Balance Sheet") |
| `ReportField` | `reports/models.py` | CFO-specific: Fields for financial reports (numbers, dates, entity references) |
| `ReportGroup` | `reports/models.py` | CFO-specific: Grouping of reports for UI organization |
| `ReportBoxViewSet` | `reports/views.py` | CFO-specific: Endpoints for managing report templates |
| `ReportFieldViewSet` | `reports/views.py` | CFO-specific: Endpoints for managing report fields |
| `get_reports_for_company()` | `reports/services.py` | CFO-specific: Logic to determine which reports a company must complete based on classifications |

**Action:** Mark as deprecated, remove from INSTALLED_APPS, or move to `legacy/` directory if historical data needs to be preserved.

### 2.2 Submissions Module

| Component | Location | Reason |
|-----------|----------|--------|
| `Submission` | `submissions/models.py` | CFO-specific: Company submissions of financial data for specific periods |
| `SubmissionFieldValue` | `submissions/models.py` | CFO-specific: Values for report fields (number, text, date, file, entity_ref) |
| `ReportSubmissionGroup` | `submissions/models.py` | CFO-specific: Groups multiple submissions together for batch submission |
| `UserWorkflowViewSet` | `submissions/views.py` | CFO-specific: Endpoints for creating/editing submissions, dashboard view |
| `SubmissionViewSet` | `submissions/views.py` | CFO-specific: Read-only submission listing |
| `AdminReviewViewSet` | `submissions/views.py` | CFO-specific: Admin approval/rejection of submissions |
| `ReportSubmissionGroupViewSet` | `submissions/views.py` | CFO-specific: Group management endpoints |

**Action:** Mark as deprecated, remove from INSTALLED_APPS, or move to `legacy/` directory.

### 2.3 Organization Module (CFO-Specific Parts)

| Component | Location | Reason |
|-----------|----------|--------|
| `OrgNode` | `org/models.py` | CFO-specific: Hierarchical structure (HOLDING → COMPANY) with company profile fields (registration_number, national_id, economic_code, incorporation_date) |
| `CompanyClassification` | `org/models.py` | CFO-specific: Links companies to classifications to determine which reports they must complete |
| OrgNode serializers/views | `org/` | CFO-specific: Management of hierarchical organization structure |

**Action:** Deprecate. PRS uses flat Teams structure instead of hierarchical organizations.

### 2.4 Periods Module

| Component | Location | Reason |
|-----------|----------|--------|
| `FinancialPeriod` | `periods/models.py` | CFO-specific: Financial reporting periods (e.g., "Q1 2024", "FY 2024") with start/end dates |

**Action:** Deprecate. PRS does not use financial periods; requests are time-agnostic.

### 2.5 CFO-Specific Lookup Types

| Lookup Type | Current Usage | Action |
|-------------|---------------|--------|
| `REPORT_STATUS` | Submission statuses (DRAFT, UNDER_REVIEW, APPROVED, REJECTED) | **Deprecate** - PRS has different statuses |
| `REPORTING_PERIOD` | Reporting periods (Monthly, Quarterly, Annual) | **Deprecate** - Not used in PRS |
| `COMPANY_CLASSIFICATION` | Company classifications for report assignment | **Deprecate** - Not used in PRS |
| `ORG_TYPE` | Organization types | **Deprecate** - Not used in PRS |
| `LEGAL_ENTITY_TYPE` | Legal entity types | **Deprecate** - Not used in PRS |
| `INDUSTRY_TYPE` | Industry classifications | **Deprecate** - Not used in PRS |
| `SUB_INDUSTRY_TYPE` | Sub-industry classifications | **Deprecate** - Not used in PRS |

**Action:** Keep `LookupType` and `Lookup` models, but remove CFO-specific lookup types. PRS may introduce new lookup types (e.g., `PURCHASE_TYPE`, `REQUEST_STATUS`).

### 2.6 AccessScope Model (CFO-Specific References)

| Component | Location | Issue |
|-----------|----------|-------|
| `AccessScope` | `accounts/models.py` | References `org.OrgNode` which is CFO-specific. Needs to reference Teams instead. |

**Action:** Adapt to reference Teams (see section 3).

---

## 3. To Adapt

These components have reusable architecture but need modifications for PRS:

### 3.1 AccessScope → TeamMembership

| Current | New | Changes Required |
|---------|-----|------------------|
| `AccessScope` model | `TeamMembership` or adapt `AccessScope` | Change `org_node` FK to `team` FK (new Teams model) |
| `AccessScope.role` | Keep role concept | Role references may need updating (PRS roles: System Admin, Workflow Admin, Initiator, Approver, Finance Reviewer, Observer) |
| `AccessScope.position_title` | Keep or remove | Optional field, can be kept for future use |

**New Model Needed:**
- `Team` model (replaces OrgNode for team membership)

### 3.2 Audit System

| Current | New | Changes Required |
|---------|-----|------------------|
| `AuditEvent.submission` | `AuditEvent.request` | Change FK from `Submission` to `PurchaseRequest` |
| `FieldChange.field` | `FieldChange.field` | Change FK from `ReportField` to `FormField` (or `RequestField`) |
| Audit signals | Update signal receivers | Change from `Submission`/`SubmissionFieldValue` to `PurchaseRequest`/`RequestFieldValue` |
| Event types | Extend event types | Add PRS-specific events: `approval`, `rejection`, `resubmission`, `workflow_step_change`, `request_completed` |

**New Models Needed:**
- `PurchaseRequest` (replaces Submission)
- `RequestFieldValue` (replaces SubmissionFieldValue)
- `FormField` or `RequestField` (replaces ReportField)

### 3.3 Status Management

| Current | New | Changes Required |
|---------|-----|------------------|
| `Submission.status` (Lookup with `REPORT_STATUS`) | `PurchaseRequest.status` (enum or Lookup with `REQUEST_STATUS`) | PRS statuses: Draft, Pending Approval, In Review (Step X), Rejected, Resubmitted, Fully Approved, Finance Review, Completed, Archived |
| Status transition logic | Update validation | PRS has different state machine (see PRD section 2.6) |

**Action:** Create new `REQUEST_STATUS` lookup type or use enum field.

---

## 4. New Components Required

These components need to be created from scratch for PRS:

### 4.1 Teams Module

**New App:** `teams/`

| Model | Purpose |
|-------|---------|
| `Team` | Team definition (Marketing, Tech, Product, Finance). Fields: name, description, is_active, created_at, updated_at |

**Relationships:**
- `Team` → `User` (many-to-many via `TeamMembership` or adapted `AccessScope`)
- `Team` → `FormTemplate` (one-to-one)
- `Team` → `Workflow` (one-to-one)

### 4.2 Forms Module

**New App:** `forms/` or integrate into `requests/`

| Model | Purpose |
|-------|---------|
| `FormTemplate` | Team-specific form template. Fields: team (FK), version_number, is_active, created_at, created_by |
| `FormField` | Field definition within a template. Fields: template (FK), field_id, name, label, field_type, required, order, default_value, validation_rules |
| `FormFieldType` | Enum: TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN, FILE_UPLOAD |

**Relationships:**
- `FormTemplate` → `Team` (one-to-one)
- `FormTemplate` → `FormField` (one-to-many)
- `FormTemplate` → `PurchaseRequest` (one-to-many, via version)

### 4.3 Workflows Module

**New App:** `workflows/` or integrate into `requests/`

| Model | Purpose |
|-------|---------|
| `Workflow` | Workflow definition per team. Fields: team (FK), name, is_active, created_at, updated_at |
| `WorkflowStep` | Sequential step in workflow. Fields: workflow (FK), step_name, step_order, is_active |
| `WorkflowStepApprover` | Approver assignment to step. Fields: step (FK), approver (User FK), is_active |

**Relationships:**
- `Workflow` → `Team` (one-to-one)
- `Workflow` → `WorkflowStep` (one-to-many)
- `WorkflowStep` → `User` (many-to-many via `WorkflowStepApprover`)

### 4.4 Requests Module

**New App:** `requests/` (replaces `submissions/`)

| Model | Purpose |
|-------|---------|
| `PurchaseRequest` | Main request entity. Fields: requestor (User FK), team (Team FK), template_version (FormTemplate FK), status, vendor_name, vendor_account, subject, description, purchase_type, created_at, submitted_at, completed_at |
| `RequestFieldValue` | Field values for a request. Fields: request (FK), field (FormField FK), value_text, value_number, value_date, value_bool, value_file, value_dropdown |
| `RequestStatus` | Enum or Lookup: DRAFT, PENDING_APPROVAL, IN_REVIEW_STEP_X, REJECTED, RESUBMITTED, FULLY_APPROVED, FINANCE_REVIEW, COMPLETED, ARCHIVED |

**Relationships:**
- `PurchaseRequest` → `User` (requestor, FK)
- `PurchaseRequest` → `Team` (FK)
- `PurchaseRequest` → `FormTemplate` (template_version, FK)
- `PurchaseRequest` → `RequestFieldValue` (one-to-many)
- `PurchaseRequest` → `Attachment` (one-to-many)
- `PurchaseRequest` → `ApprovalHistory` (one-to-many)

### 4.5 Attachments Module

**New App:** `attachments/` or integrate into `requests/`

| Model | Purpose |
|-------|---------|
| `Attachment` | File attachment for a request. Fields: request (FK), filename, file_path, file_size, file_type, category, uploaded_by (User FK), upload_date |
| `AttachmentCategory` | Category definition per team. Fields: team (FK), name, required, is_active |

**Relationships:**
- `Attachment` → `PurchaseRequest` (many-to-one)
- `AttachmentCategory` → `Team` (many-to-one)

### 4.6 Approval History Module

**New App:** `approvals/` or integrate into `requests/`

| Model | Purpose |
|-------|---------|
| `ApprovalHistory` | Approval/rejection record. Fields: request (FK), step (WorkflowStep FK), approver (User FK), action (APPROVE/REJECT), comment, timestamp |

**Relationships:**
- `ApprovalHistory` → `PurchaseRequest` (many-to-one)
- `ApprovalHistory` → `WorkflowStep` (FK)
- `ApprovalHistory` → `User` (approver, FK)

---

## 5. Concept Mapping Table

| CFO Wise Concept | PRS Concept | Mapping Strategy | Notes |
|------------------|-------------|------------------|-------|
| **Organization** | | | |
| `OrgNode` (HOLDING) | ❌ Not used | N/A | PRS doesn't use hierarchical orgs |
| `OrgNode` (COMPANY) | `Team` | **Replace** | Flat team structure instead of hierarchical |
| `CompanyClassification` | ❌ Not used | N/A | Teams don't have classifications |
| **Reports** | | | |
| `ReportBox` | `FormTemplate` | **Replace** | Form templates per team instead of report boxes |
| `ReportField` | `FormField` | **Replace** | Form fields instead of report fields |
| `ReportGroup` | ❌ Not used | N/A | No grouping concept in PRS |
| **Submissions** | | | |
| `Submission` | `PurchaseRequest` | **Replace** | Purchase requests instead of submissions |
| `SubmissionFieldValue` | `RequestFieldValue` | **Replace** | Request field values instead of submission values |
| `ReportSubmissionGroup` | ❌ Not used | N/A | No grouping concept in PRS |
| **Periods** | | | |
| `FinancialPeriod` | ❌ Not used | N/A | PRS doesn't use financial periods |
| **Status** | | | |
| `Submission.status` (REPORT_STATUS) | `PurchaseRequest.status` (REQUEST_STATUS) | **Replace** | Different status lifecycle (see PRD 2.6) |
| **Access Control** | | | |
| `AccessScope` (org_node, role) | `AccessScope` or `TeamMembership` (team, role) | **Adapt** | Change org_node FK to team FK |
| **Audit** | | | |
| `AuditEvent` (references Submission) | `AuditEvent` (references PurchaseRequest) | **Adapt** | Change FK reference |
| `FieldChange` (references ReportField) | `FieldChange` (references FormField) | **Adapt** | Change FK reference |
| **Lookups** | | | |
| `REPORT_STATUS` | `REQUEST_STATUS` | **Replace** | New lookup type with PRS statuses |
| `REPORTING_PERIOD` | ❌ Not used | N/A | |
| `COMPANY_CLASSIFICATION` | ❌ Not used | N/A | |
| `ORG_TYPE` | ❌ Not used | N/A | |
| `LEGAL_ENTITY_TYPE` | ❌ Not used | N/A | |
| `INDUSTRY_TYPE` | ❌ Not used | N/A | |
| `SUB_INDUSTRY_TYPE` | ❌ Not used | N/A | |
| **New PRS Concepts** | | | |
| ❌ Not in CFO | `Workflow` | **New** | Sequential approval workflows per team |
| ❌ Not in CFO | `WorkflowStep` | **New** | Steps in approval workflow |
| ❌ Not in CFO | `WorkflowStepApprover` | **New** | Approver assignments to steps |
| ❌ Not in CFO | `Attachment` | **New** | File attachments with categories |
| ❌ Not in CFO | `AttachmentCategory` | **New** | Required/optional attachment categories per team |
| ❌ Not in CFO | `ApprovalHistory` | **New** | Approval/rejection history with comments |

---

## 6. Implementation Strategy

### Phase 1: Foundation (Reusable Components)
1. ✅ Keep `core`, `accounts` (User model), `classifications` (infrastructure)
2. ✅ Keep audit infrastructure (models, signals pattern)
3. ✅ Keep permission patterns

### Phase 2: Deprecation
1. ⚠️ Mark `reports`, `submissions`, `periods`, `org` apps as deprecated
2. ⚠️ Remove CFO-specific lookup types
3. ⚠️ Archive or isolate CFO-specific code

### Phase 3: Adaptation
1. 🔄 Adapt `AccessScope` to reference Teams instead of OrgNode
2. 🔄 Adapt audit system to reference PurchaseRequest instead of Submission
3. 🔄 Update permissions to check Teams instead of Companies

### Phase 4: New Development
1. 🆕 Create `teams` app with Team model
2. 🆕 Create `forms` app with FormTemplate and FormField models
3. 🆕 Create `workflows` app with Workflow, WorkflowStep, WorkflowStepApprover models
4. 🆕 Create `requests` app with PurchaseRequest and RequestFieldValue models
5. 🆕 Create `attachments` app with Attachment and AttachmentCategory models
6. 🆕 Create `approvals` app with ApprovalHistory model
7. 🆕 Update audit system to work with new models

### Phase 5: Migration & Testing
1. 🧪 Create data migration scripts if historical data needs to be preserved
2. 🧪 Update all serializers, views, and services
3. 🧪 Update frontend API calls
4. 🧪 Comprehensive testing of new workflow

---

## 7. Key Architectural Decisions

### 7.1 Team vs Organization
- **Decision:** Use flat `Team` model instead of hierarchical `OrgNode`
- **Rationale:** PRS requirements specify flat team structure (Marketing, Tech, Product, Finance)
- **Impact:** Simpler data model, no parent-child relationships

### 7.2 Form Template Versioning
- **Decision:** Implement template versioning (PRD FR-FORM-TEAM-005)
- **Rationale:** Active requests must use the template version that existed when they were created
- **Implementation:** `FormTemplate.version_number`, `PurchaseRequest.template_version` FK

### 7.3 Workflow Immutability
- **Decision:** Workflows cannot be edited if requests are in progress (PRD FR-WF-004)
- **Rationale:** Ensures consistency - requests use the workflow version that existed when created
- **Implementation:** Check for active requests before allowing workflow modifications

### 7.4 Status Management
- **Decision:** Use Lookup system for statuses (consistent with current architecture) OR use enum field
- **Rationale:** Lookup system provides flexibility but adds complexity. Enum is simpler but less flexible.
- **Recommendation:** Use enum field for status (simpler, type-safe) with Lookup for other classifications

### 7.5 Audit Trail
- **Decision:** Reuse audit infrastructure pattern but adapt to PRS entities
- **Rationale:** Field-level audit trail is a core requirement (PRD NFR-AUDIT)
- **Implementation:** Keep `AuditEvent` and `FieldChange` models, update FKs and event types

---

## 8. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Data Loss** | High | Preserve CFO data in `legacy/` apps, don't delete migrations |
| **Breaking Changes** | High | Comprehensive testing, staged rollout, feature flags |
| **Complexity** | Medium | Clear separation between deprecated and new code |
| **Migration Effort** | Medium | Phased approach, reuse as much as possible |
| **Team Learning Curve** | Low | Similar patterns, just different domain models |

---

## 9. Next Steps

1. **Review & Approve** this migration plan
2. **Create feature branch** for PRS development
3. **Phase 1:** Set up new apps structure (`teams`, `forms`, `workflows`, `requests`, `attachments`, `approvals`)
4. **Phase 2:** Implement core models following PRD requirements
5. **Phase 3:** Adapt reusable components (AccessScope, audit system)
6. **Phase 4:** Implement views, serializers, and business logic
7. **Phase 5:** Update frontend to use new APIs
8. **Phase 6:** Testing and deployment

---

## Appendix: File Structure Preview

```
Backend/
├── accounts/          # ✅ Keep (User management)
├── audit/            # ⚠️ Adapt (update FKs)
├── classifications/  # ✅ Keep (infrastructure)
├── core/             # ✅ Keep (BaseModel, views)
├── teams/            # 🆕 New (Team model)
├── forms/            # 🆕 New (FormTemplate, FormField)
├── workflows/        # 🆕 New (Workflow, WorkflowStep)
├── requests/         # 🆕 New (PurchaseRequest, RequestFieldValue)
├── attachments/      # 🆕 New (Attachment, AttachmentCategory)
├── approvals/        # 🆕 New (ApprovalHistory)
├── legacy/           # ⚠️ Deprecated (optional)
│   ├── reports/      # Deprecated
│   ├── submissions/  # Deprecated
│   ├── periods/      # Deprecated
│   └── org/          # Deprecated
└── Backend/
    └── cfowise/      # Rename to `prs` or keep as is
```

---

**End of Migration Plan**


