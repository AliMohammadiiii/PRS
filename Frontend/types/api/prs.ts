import { Lookup } from './lookups';

// Field type enums matching backend
export type FormFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DROPDOWN' | 'FILE_UPLOAD';

// Team types
export interface Team {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

// Form Field types
export interface FormField {
  id: string;
  field_id: string;
  name: string;
  label: string;
  field_type: FormFieldType;
  required: boolean;
  order: number;
  default_value: string | null;
  help_text: string | null;
  dropdown_options: string[] | null;
  validation_rules?: Record<string, any>;
}

// Form Template types (PrsFormTemplate)
export interface FormTemplate {
  id: string;
  name?: string; // Template name/title
  team?: string; // Team ID
  version_number: number;
  is_active: boolean;
  fields: FormField[];
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Alias for spec compatibility
export type PrsFormTemplate = FormTemplate;
export type PrsFormField = FormField;

export interface TeamMinimal {
  id: string;
  name: string;
}

export interface FormTemplateResponse {
  team: TeamMinimal;
  template: FormTemplate & {
    team?: string; // Team ID for compatibility
  };
}

// Extended FormTemplate for API responses with full details
export interface FormTemplateWithDetails extends FormTemplate {
  team: string | Team;
  team_name?: string;
}

// Request Field Value types
export interface RequestFieldValue {
  id: string;
  field_id: string;
  field: FormField;
  value_number: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  value_date: string | null; // ISO date string
  value_dropdown: any | null; // JSON value for dropdown
}

// Purchase Request types (PrsPurchaseRequest)
export interface PurchaseRequest {
  id: string;
  requestor: string; // User ID or username
  requestor_name?: string | null; // Display name (full name or username)
  team: Team;
  form_template_id: string;
  form_template_name?: string | null; // Form template name for display
  workflow_template_id: string | null; // Workflow template used for this request (nullable for legacy)
  workflow_template_name?: string | null; // Workflow template name for display
  status: Lookup;
  // Legacy step fields (for backward compatibility)
  current_step_id: string | null;
  current_step_name: string | null;
  // Template step fields (for new requests)
  current_template_step_id: string | null;
  current_template_step_name: string | null;
  current_template_step_order?: number | null; // Current step order in workflow
  total_workflow_steps?: number | null; // Total number of steps in workflow
  // Unified current step fields (returns whichever is set)
  effective_step_id: string | null;
  effective_step_name: string | null;
  is_at_finance_step?: boolean; // Indicates if current step is finance review
  vendor_name: string;
  vendor_account: string;
  subject: string;
  description: string;
  purchase_type: Lookup; // Full lookup object with code/title
  submitted_at: string | null; // ISO datetime string
  completed_at: string | null; // ISO datetime string
  rejection_comment: string | null;
  field_values: RequestFieldValue[];
  attachments_count: number;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

// Alias for spec compatibility
export type PrsPurchaseRequest = PurchaseRequest;

// Purchase Request Create/Update types
export interface PurchaseRequestCreateRequest {
  team_id: string;
  vendor_name: string;
  vendor_account: string;
  subject: string;
  description: string;
  purchase_type: string; // Purchase type code (e.g., "SERVICE")
}

export interface PurchaseRequestFieldValueWrite {
  field_id: string;
  value_number?: number | null;
  value_text?: string | null;
  value_bool?: boolean | null;
  value_date?: string | null; // ISO date string
  value_dropdown?: any | null;
}

export interface PurchaseRequestUpdateRequest {
  vendor_name?: string;
  vendor_account?: string;
  subject?: string;
  description?: string;
  purchase_type?: string; // Purchase type code
  field_values?: PurchaseRequestFieldValueWrite[];
}

// Attachment types
export interface AttachmentCategory {
  id: string;
  name: string;
  required: boolean;
}

export interface UserMinimal {
  id: string;
  full_name: string | null;
}

export interface Attachment {
  id: string;
  category: AttachmentCategory | null;
  filename: string;
  file_type: string;
  file_size: number;
  upload_date: string; // ISO datetime string
  uploaded_by: UserMinimal;
}

export interface AttachmentUploadRequest {
  file: File;
  category_id?: string | null;
}

// Approval/Rejection types
export interface ApproveRequestRequest {
  comment?: string | null;
  files?: File[]; // Optional file attachments
}

export interface RejectRequestRequest {
  comment: string; // Required, minimum 10 characters
  files?: File[]; // Optional file attachments
}

export interface CompleteRequestRequest {
  comment?: string | null;
  files?: File[]; // Optional file attachments
}

export interface SubmitRequestRequest {
  comment?: string | null;
  files?: File[]; // Optional file attachments
}

// My Requests filter and response types
export interface PrsMyRequestsFilters {
  status?: string;
  teamId?: string;
  purchaseType?: string; // Purchase type code filter (e.g., "GOODS", "SERVICE")
  createdFrom?: string;
  createdTo?: string;
  vendor?: string;
  page?: number;
}

export interface PrsMyRequestsResponse {
  results: PurchaseRequest[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Approval History types
export interface ApprovalHistory {
  id: string;
  step_name: string;
  approver_name: string;
  role_code: string | null;
  role_title: string | null;
  action: 'APPROVE' | 'REJECT';
  comment: string | null;
  timestamp: string; // ISO datetime string
  attachments?: Attachment[]; // Attachments linked to this approval history entry
}

// Inbox filter types
export interface PrsInboxFilters {
  status?: string;
  teamId?: string;
  purchaseType?: string; // Purchase type code filter
  createdFrom?: string;
  createdTo?: string;
  vendor?: string;
  page?: number;
}

export interface PrsFinanceInboxFilters {
  teamId?: string;
  purchaseType?: string; // Purchase type code filter
  createdFrom?: string;
  createdTo?: string;
  vendor?: string;
  page?: number;
}

// =============================================================================
// MULTI-TEMPLATE SUPPORT
// =============================================================================

// Workflow Template types (PrsWorkflowTemplate)
export interface WorkflowTemplate {
  id: string;
  team: string;
  team_name: string;
  name: string;
  version_number: number;
  description?: string | null;
  step_count?: number;
  is_active: boolean;
  steps?: WorkflowTemplateStep[];
  created_at: string;
  updated_at: string;
}

// Alias for spec compatibility
export type PrsWorkflowTemplate = WorkflowTemplate;

// Workflow Template Step (PrsWorkflowStep)
export interface WorkflowTemplateStep {
  id: string;
  workflow_template: string;
  step_name: string;
  step_order: number;
  is_finance_review: boolean;
  is_active: boolean;
  approvers?: WorkflowTemplateStepApprover[];
}

// Alias for spec compatibility
export type PrsWorkflowStep = WorkflowTemplateStep;

export interface WorkflowTemplateStepApprover {
  id: string;
  role: string;
  role_code: string;
  role_title: string;
  is_active: boolean;
}

// Team Purchase Config types (PrsTeamPurchaseConfig)
export interface TeamPurchaseConfig {
  id: string;
  team?: string | TeamMinimal; // Team reference
  purchase_type: {
    id: string;
    code: string;
    title: string;
    type: {
      id: string;
      code: string;
      title: string;
    };
  };
  form_template: {
    id: string;
    name: string;
    version_number: number;
  };
  workflow_template: {
    id: string;
    name: string;
    version_number: number;
  };
  is_active: boolean;
}

// Alias for spec compatibility
export type PrsTeamPurchaseConfig = TeamPurchaseConfig;

// Effective Template Response (for team + purchase type lookup)
// PrsEffectiveTemplateResponse
export interface EffectiveTemplateResponse {
  team: {
    id: string;
    name: string;
  };
  purchase_type: {
    id: string;
    code: string;
    title: string;
    type: {
      id: string;
      code: string;
      title: string;
    };
  };
  form_template: {
    id: string;
    name: string;
    version_number: number;
    is_active?: boolean;
    fields: FormField[];
  };
  workflow_template: {
    id: string;
    name: string;
    version_number: number;
    is_active?: boolean;
    steps: WorkflowTemplateStepSummary[];
  };
}

// Alias for spec compatibility
export type PrsEffectiveTemplateResponse = EffectiveTemplateResponse;

export interface WorkflowTemplateStepSummary {
  order: number;
  name: string;
  is_finance_review: boolean;
}

