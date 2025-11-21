## CFO Wise Phase 1 – Data Model Overview and Rationale

This document explains the backend data model implemented for CFO Wise Phase 1 and the rationale behind each design choice, mapped to the PRD requirements.


### Design Principles
- **Product-first, admin-first**: Optimize for fast delivery and clarity in Django Admin.
- **UUID primary keys**: All models inherit a UUID `id` for safer merges and future federation.
- **Soft deletes**: `is_active` on every model instead of physical deletes (FR-ORG-003).
- **Simplicity first**: Parent foreign key for organization tree (no tree library) to reduce cognitive load and keep queries transparent.
- **Strict typing of lookups**: A single `LookupType/Lookup` system to centrally manage all classifications (FR-CLASS).
- **Auditability**: Level-2 field-level history (NFR-AUDIT) via `AuditEvent` and `FieldChange` with signals.
- **JWT-ready API**: Minimal authentication endpoints for Phase 1 operations.


### App-by-App Model Summary

#### core
- `BaseModel`: UUID `id`, `created_at`, `updated_at`, `is_active`. All other models inherit this to uniformly enforce soft-deletes and timestamps.


#### accounts
- `User`: Extends `AbstractUser` + `BaseModel`. Adds `mobile_phone`, `national_code`. We keep `username` for login (your decision 1.a).
- `AccessScope`: Connects a user to a specific org node (holding or company) with a role from `Lookup(type=COMPANY_ROLE)` and an optional `position_title`. Unique per `(user, org_node, role)`. This satisfies FR-USER-002 (cross-company access).
- Minimal `/api/me/` endpoint returns the user profile and access scopes. JWT endpoints are configured (`/api/auth/token`, `/refresh`, `/verify`).


#### classifications
- `LookupType`: Typed buckets (e.g., COMPANY_ROLE, REPORT_STATUS, ORG_TYPE, INDUSTRY_TYPE, …).
- `Lookup`: Values within a type (e.g., APPROVED under REPORT_STATUS). Seed data migration bootstraps the essential sets listed in the PRD (FR-CLASS-001..008).
- Rationale: A generic, centralized classification system ensures admin flexibility and consistent validation via `limit_choices_to` and `clean()` in consuming models.


#### periods
- `FinancialPeriod`: Title and date range (FR-CLASS-002). Ordered descending by start date.


#### org
- `OrgNode`: Represents a Holding or a Company.
  - Simple tree via `parent -> OrgNode` (nullable).
  - `node_type` choices: HOLDING or COMPANY.
  - Company profile fields per UI: `registration_number`, `national_id`, `economic_code` (unique), `incorporation_date`, `website_url`.
  - Lookups (with type guards): `org_type` (ORG_TYPE), `legal_entity_type` (LEGAL_ENTITY_TYPE), `industry` (INDUSTRY_TYPE), `sub_industry` (SUB_INDUSTRY_TYPE).
  - `report_groups` M2M to `reports.ReportGroup` for “گروه گزارش” on companies.
  - Validations: company must have a holding parent, parent must be a HOLDING, companies must have `economic_code`.
  - Index: `(node_type, is_active)` for common filters.
- `CompanyClassification`: Connects a company to one or more `Lookup(type=COMPANY_CLASSIFICATION)` (FR-ORG-004). Unique per `(company, classification)`.
- Rationale: Keeps the structure intentionally simple while enforcing the business integrity rules highlighted in the PRD.


#### reports
- `ReportGroup`: Optional grouping for the Admin UI (“گروه گزارش”). Linked to companies via `OrgNode.report_groups` and to reports via `ReportBox.groups`.
- `ReportBox`: A “box” (form) with `code`, `name`, `description`, `intercompany`. M2M `classifications` to `Lookup(type=COMPANY_CLASSIFICATION)` defines which companies must submit (FR-REPORT-002 and FR-REPORT-003 additive logic).
- `ReportField`: Fields inside a box with `field_id` unique per report, `name`, `help_text`, `required`, and `data_type` in {NUMBER, TEXT, YES_NO, DATE, FILE, ENTITY_REF}. When `data_type=ENTITY_REF`, `entity_ref_type` must be set to one of {ORG_NODE, FINANCIAL_PERIOD}. Enforced via DB check constraints.
- Rationale: Focused “form builder” limited to the six supported types (FR-REPORT-006) with no conditional logic (FR-REPORT-007), keeping Phase 1 scope tight and predictable.


#### submissions
- `Submission`: A company’s response for a specific report, financial period, and reporting period.
  - FKs: `report`, `company`, `financial_period`, `reporting_period` (Lookup type REPORTING_PERIOD), `status` (Lookup type REPORT_STATUS).
  - `submitted_by` (who submitted), `rejection_comment` (for admin rejection flow).
  - Unique composite key `(report, company, financial_period, reporting_period)`.
  - Validations: `company` must be a COMPANY node; approved records are immutable with respect to status transitions.
  - Index: `(status, financial_period)` for dashboards and review queues.
- `SubmissionFieldValue`: Stores values per field with typed columns:
  - `value_number`, `value_text`, `value_bool`, `value_date`, `value_file`, `entity_ref_uuid`.
  - DB constraint enforces only one value column is non-null, matching the field’s `data_type`.
- Rationale: A column-per-type approach offers simple querying (NFR-FUTURE-001) and reliable audit logging, and plays well with future Rule Engine reads.


#### audit
- `AuditEvent`: Records SUBMIT/STATUS_CHANGE/FIELD_UPDATE events with `actor`, `submission`, and flexible `metadata`.
- `FieldChange`: Links to `AuditEvent` and stores `old_value` and `new_value` for each changed field.
- Signals:
  - On `Submission` status changes, an event is created capturing old/new status and rejection comment.
  - On `SubmissionFieldValue` changes, a field update event is created with the changed column and old/new values.
- Rationale: Satisfies Level-2 field-level history (NFR-AUDIT) and status-change logging, while keeping write paths simple and automatic.


### Why This Structure Meets the PRD
- **FR-ORG**: Full tree with types, company profile fields, and soft-deletes. Classifications assignable to companies.
- **FR-USER**: Custom `User` with multi-company roles via `AccessScope`, login by username (your decision), JWT-auth.
- **FR-CLASS**: Centralized classification system with seed data and type-guarded usage.
- **FR-REPORT**: Boxes (reports), fields limited to specified types, per-field unique IDs, link reports to company classifications. No computed/conditional fields.
- **CWF-FM / CWF-ADM**: Submissions model captures the entry and lifecycle; status transitions and rejection comments supported.
- **NFR-AUDIT**: Field-change and status-change audit trail with user and timestamp baked in via `BaseModel` + signals.
- **NFR-FUTURE**: Typed value columns and simple relationships are Rule-Engine-friendly; JWT + DRF provides a clean path for future integrations.


### Important Validations and Constraints
- Company must have a holding parent; parent must be HOLDING.
- `economic_code` is unique and required for companies (validated in model).
- Lookup FKs protected with `limit_choices_to` and `clean()` to ensure they point to correct `LookupType`.
- `Submission` uniqueness: `(report, company, financial_period, reporting_period)`.
- `SubmissionFieldValue` constraint ensures a single value column is used.
- `ReportField` constraints guard `entity_ref_type` semantics.


### Trade-offs and Alternatives Considered
- Tree libraries (e.g., MPTT) were skipped in favor of a simple parent FK for speed and transparency. If deep tree queries become complex in Phase 2, we can layer MPTT or CTE-based helpers without breaking the schema.
- EAV vs typed columns: Typed columns were chosen for performance, schema clarity, and query simplicity; they also simplify audit logging and future rule evaluations.
- Generic platformization was out of scope by plan; however, the `Lookup` system and the clean separation between `reports` and `submissions` keep us flexible.


### Diagrams
- Full: `models.png`
- Per app: `diagrams/apps/*.png`
- Per model: `diagrams/models/*.png`


### What’s Next (if needed)
- Add file-size validator and deployment storage configuration for uploads.
- Add reusable DRF permission classes to gate company-scoped endpoints by `AccessScope` (basic one included).
- Add admin list/actions for status transitions with guardrails.

This model provides a clear, auditable foundation matching Phase 1 scope with minimal complexity, while staying extensible for Phase 2 (rules, integrations, deeper analytics).









