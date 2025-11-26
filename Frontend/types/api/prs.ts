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

// Form Template types
export interface FormTemplate {
  id: string;
  version_number: number;
  is_active: boolean;
  fields: FormField[];
}

export interface TeamMinimal {
  id: string;
  name: string;
}

export interface FormTemplateResponse {
  team: TeamMinimal;
  template: FormTemplate;
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

// Purchase Request types
export interface PurchaseRequest {
  id: string;
  requestor: string; // User ID or username
  requestor_name?: string | null; // Display name (full name or username)
  team: Team;
  form_template_id: string;
  status: Lookup;
  current_step_id: string | null;
  current_step_name: string | null;
  vendor_name: string;
  vendor_account: string;
  subject: string;
  description: string;
  purchase_type: Lookup;
  submitted_at: string | null; // ISO datetime string
  completed_at: string | null; // ISO datetime string
  rejection_comment: string | null;
  field_values: RequestFieldValue[];
  attachments_count: number;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

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
}

export interface RejectRequestRequest {
  comment: string; // Required, minimum 10 characters
}

export interface CompleteRequestRequest {
  comment?: string | null;
}

// My Requests filter and response types
export interface PrsMyRequestsFilters {
  status?: string;
  teamId?: string;
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
  action: 'APPROVE' | 'REJECT';
  comment: string | null;
  timestamp: string; // ISO datetime string
}

// Inbox filter types
export interface PrsInboxFilters {
  status?: string;
  teamId?: string;
  createdFrom?: string;
  createdTo?: string;
  vendor?: string;
  page?: number;
}

export interface PrsFinanceInboxFilters {
  teamId?: string;
  createdFrom?: string;
  createdTo?: string;
  vendor?: string;
  page?: number;
}

