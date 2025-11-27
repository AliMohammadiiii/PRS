import { apiRequest } from 'src/libs/apiRequest';
import {
  Team,
  FormTemplateResponse,
  PurchaseRequest,
  PurchaseRequestCreateRequest,
  PurchaseRequestUpdateRequest,
  Attachment,
  AttachmentCategory,
  AttachmentUploadRequest,
  ApproveRequestRequest,
  RejectRequestRequest,
  CompleteRequestRequest,
  SubmitRequestRequest,
  PrsMyRequestsFilters,
  PrsMyRequestsResponse,
  PrsInboxFilters,
  PrsFinanceInboxFilters,
  ApprovalHistory,
  WorkflowTemplate,
  TeamPurchaseConfig,
  EffectiveTemplateResponse,
  FormField,
} from 'src/types/api/prs';

// Teams
export async function getTeams(): Promise<Team[]> {
  const response = await apiRequest.get<any>('/api/prs/teams/');
  // Handle both paginated response (with results) and non-paginated array response
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  return [];
}

export async function getTeamFormTemplate(teamId: string): Promise<FormTemplateResponse> {
  const response = await apiRequest.get<FormTemplateResponse>(`/api/prs/teams/${teamId}/form-template/`);
  return response.data;
}

export async function getAttachmentCategories(teamId: string): Promise<AttachmentCategory[]> {
  const response = await apiRequest.get<AttachmentCategory[]>(`/api/prs/teams/${teamId}/attachment-categories/`);
  return response.data;
}

// Purchase Requests
export async function createPurchaseRequest(data: PurchaseRequestCreateRequest): Promise<PurchaseRequest> {
  const response = await apiRequest.post<PurchaseRequest>('/api/prs/requests/', data);
  return response.data;
}

export async function updatePurchaseRequest(
  id: string,
  data: PurchaseRequestUpdateRequest
): Promise<PurchaseRequest> {
  const response = await apiRequest.patch<PurchaseRequest>(`/api/prs/requests/${id}/`, data);
  return response.data;
}

export async function getPurchaseRequest(id: string): Promise<PurchaseRequest> {
  const response = await apiRequest.get<PurchaseRequest>(`/api/prs/requests/${id}/`);
  return response.data;
}

export async function submitPurchaseRequest(
  id: string,
  data?: SubmitRequestRequest
): Promise<PurchaseRequest> {
  if (data && (data.comment || (data.files && data.files.length > 0))) {
    // If comment or files are provided, use multipart/form-data
    const formData = new FormData();
    if (data.comment) {
      formData.append('comment', data.comment);
    }
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    const response = await apiRequest.post<PurchaseRequest>(
      `/api/prs/requests/${id}/submit/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } else {
    // No comment or files, use regular POST
    const response = await apiRequest.post<PurchaseRequest>(`/api/prs/requests/${id}/submit/`);
    return response.data;
  }
}

export async function getMyApprovals(params?: PrsInboxFilters): Promise<PurchaseRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.teamId) searchParams.set('team_id', params.teamId);
  if (params?.purchaseType) searchParams.set('purchase_type', params.purchaseType);
  if (params?.createdFrom) searchParams.set('created_from', params.createdFrom);
  if (params?.createdTo) searchParams.set('created_to', params.createdTo);
  if (params?.vendor) searchParams.set('vendor', params.vendor);
  if (params?.page) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  // Use trailing slash to match DRF route and avoid redirects
  const url = `/api/prs/requests/my-approvals/${query ? `?${query}` : ''}`;
  const response = await apiRequest.get<any>(url);
  // Handle both paginated response (with results) and non-paginated array response
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  return [];
}

export async function getFinanceInbox(params?: PrsFinanceInboxFilters): Promise<PurchaseRequest[]> {
  const searchParams = new URLSearchParams();
  if (params?.teamId) searchParams.set('team_id', params.teamId);
  if (params?.purchaseType) searchParams.set('purchase_type', params.purchaseType);
  if (params?.createdFrom) searchParams.set('created_from', params.createdFrom);
  if (params?.createdTo) searchParams.set('created_to', params.createdTo);
  if (params?.vendor) searchParams.set('vendor', params.vendor);
  if (params?.page) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  // Use trailing slash to match DRF route and avoid redirects
  const url = `/api/prs/requests/finance-inbox/${query ? `?${query}` : ''}`;
  const response = await apiRequest.get<any>(url);
  // Handle both paginated response (with results) and non-paginated array response
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  return [];
}

export async function fetchMyRequests(params?: PrsMyRequestsFilters): Promise<PrsMyRequestsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.teamId) searchParams.set('team_id', params.teamId);
  if (params?.purchaseType) searchParams.set('purchase_type', params.purchaseType);
  if (params?.createdFrom) searchParams.set('created_from', params.createdFrom);
  if (params?.createdTo) searchParams.set('created_to', params.createdTo);
  if (params?.vendor) searchParams.set('vendor', params.vendor);
  if (params?.page) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  const url = `/api/prs/requests/my/${query ? `?${query}` : ''}`;
  const response = await apiRequest.get<PrsMyRequestsResponse>(url);
  return response.data;
}

// Global Requests listing (Admin visibility)
export async function fetchAllRequests(params?: PrsMyRequestsFilters): Promise<PrsMyRequestsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) searchParams.set('status', params.status);
  if (params?.teamId) searchParams.set('team_id', params.teamId);
  if (params?.purchaseType) searchParams.set('purchase_type', params.purchaseType);
  if (params?.createdFrom) searchParams.set('created_from', params.createdFrom);
  if (params?.createdTo) searchParams.set('created_to', params.createdTo);
  if (params?.vendor) searchParams.set('vendor', params.vendor);
  if (params?.page) searchParams.set('page', String(params.page));

  const query = searchParams.toString();
  const url = `/api/prs/requests/${query ? `?${query}` : ''}`;
  const response = await apiRequest.get<PrsMyRequestsResponse>(url);
  return response.data;
}

// Attachments
export async function getRequestAttachments(requestId: string): Promise<Attachment[]> {
  const response = await apiRequest.get<Attachment[]>(`/api/prs/requests/${requestId}/attachments/`);
  return response.data;
}

export async function uploadAttachment(
  requestId: string,
  data: AttachmentUploadRequest
): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', data.file);
  if (data.category_id) {
    formData.append('category_id', data.category_id);
  }
  
  const response = await apiRequest.post<Attachment>(
    `/api/prs/requests/${requestId}/upload-attachment/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function deleteAttachment(requestId: string, attachmentId: string): Promise<void> {
  await apiRequest.delete(`/api/prs/requests/${requestId}/attachments/${attachmentId}/`);
}

// Approval Actions
export async function approveRequest(
  requestId: string,
  data?: ApproveRequestRequest
): Promise<PurchaseRequest> {
  if (data && (data.comment || (data.files && data.files.length > 0))) {
    // If comment or files are provided, use multipart/form-data
    const formData = new FormData();
    if (data.comment) {
      formData.append('comment', data.comment);
    }
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    const response = await apiRequest.post<PurchaseRequest>(
      `/api/prs/requests/${requestId}/approve/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } else {
    // No comment or files, use regular POST
    const response = await apiRequest.post<PurchaseRequest>(
      `/api/prs/requests/${requestId}/approve/`,
      {}
    );
    return response.data;
  }
}

export async function rejectRequest(
  requestId: string,
  data: RejectRequestRequest
): Promise<PurchaseRequest> {
  // Reject always requires comment, and may have files
  const formData = new FormData();
  formData.append('comment', data.comment);
  if (data.files && data.files.length > 0) {
    data.files.forEach((file) => {
      formData.append('files', file);
    });
  }
  const response = await apiRequest.post<PurchaseRequest>(
    `/api/prs/requests/${requestId}/reject/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

export async function completeRequest(
  requestId: string,
  data?: CompleteRequestRequest
): Promise<PurchaseRequest> {
  if (data && (data.comment || (data.files && data.files.length > 0))) {
    // If comment or files are provided, use multipart/form-data
    const formData = new FormData();
    if (data.comment) {
      formData.append('comment', data.comment);
    }
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('files', file);
      });
    }
    const response = await apiRequest.post<PurchaseRequest>(
      `/api/prs/requests/${requestId}/complete/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  } else {
    // No comment or files, use regular POST
    const response = await apiRequest.post<PurchaseRequest>(
      `/api/prs/requests/${requestId}/complete/`,
      {}
    );
    return response.data;
  }
}

// Approval History
export async function getRequestApprovalHistory(requestId: string): Promise<ApprovalHistory[]> {
  const response = await apiRequest.get<ApprovalHistory[]>(
    `/api/prs/requests/${requestId}/approvals/`
  );
  return response.data;
}

// Audit Trail
export interface AuditTrailEvent {
  id: string;
  event_type: string;
  actor: {
    id: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
  request: string; // Request ID
  metadata: Record<string, any>;
  field_changes: Array<{
    id: string;
    field_name: string | null;
    old_value: string | null;
    new_value: string | null;
    form_field: any | null;
  }>;
  created_at: string;
}

export async function getRequestAuditTrail(requestId: string): Promise<AuditTrailEvent[]> {
  const response = await apiRequest.get<AuditTrailEvent[]>(
    `/api/prs/requests/${requestId}/audit-trail/`
  );
  return response.data;
}

// Team Management (Admin)
export interface TeamCreateRequest {
  name: string;
  description?: string | null;
}

export async function createTeam(data: TeamCreateRequest): Promise<Team> {
  const response = await apiRequest.post<Team>('/api/prs/teams/', data);
  return response.data;
}

export async function updateTeam(id: string, data: Partial<TeamCreateRequest>): Promise<Team> {
  const response = await apiRequest.patch<Team>(`/api/prs/teams/${id}/`, data);
  return response.data;
}

export async function deactivateTeam(id: string): Promise<Team> {
  const response = await apiRequest.post<Team>(`/api/prs/teams/${id}/deactivate/`);
  return response.data;
}

export async function activateTeam(id: string): Promise<Team> {
  const response = await apiRequest.post<Team>(`/api/prs/teams/${id}/activate/`);
  return response.data;
}

// User Management (Admin)
export interface UserWithTeams {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  mobile_phone: string | null;
  national_code: string | null;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  teams: Team[];
  access_scopes: any[];
  created_at: string;
  updated_at: string;
}

export interface UserAssignTeamRequest {
  team_id: string;
  role_id: string;
  position_title?: string | null;
}

export interface UserRemoveTeamRequest {
  team_id: string;
  role_id: string;
}

export async function assignUserToTeam(
  userId: string,
  data: UserAssignTeamRequest
): Promise<any> {
  const response = await apiRequest.post(`/api/users/${userId}/assign-team/`, data);
  return response.data;
}

export async function removeUserFromTeam(
  userId: string,
  data: UserRemoveTeamRequest
): Promise<void> {
  await apiRequest.post(`/api/users/${userId}/remove-team/`, data);
}

export async function deactivateUser(userId: string): Promise<UserWithTeams> {
  const response = await apiRequest.post<UserWithTeams>(`/api/users/${userId}/deactivate/`);
  return response.data;
}

// Form Template Management (Admin)
export interface FormTemplate {
  id: string;
  team: string | Team;
  name?: string; // Optional name for the template
  version_number: number;
  is_active: boolean;
  created_by: string | null;
  fields: FormField[];
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  field_id: string;
  name: string;
  label: string;
  field_type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'DROPDOWN' | 'FILE_UPLOAD';
  required: boolean;
  order: number;
  default_value: string | null;
  validation_rules?: Record<string, any>;
  help_text: string | null;
  dropdown_options: string[] | null;
}

export interface FormTemplateCreateRequest {
  team: string; // Team ID
  name?: string; // Optional name for the template
  fields: Array<{
    field_id: string;
    name: string;
    label: string;
    field_type: FormField['field_type'];
    required: boolean;
    order: number;
    default_value?: string | null;
    validation_rules?: Record<string, any>;
    help_text?: string | null;
    dropdown_options?: string[] | null;
  }>;
}

export async function getFormTemplates(teamId?: string): Promise<FormTemplate[]> {
  try {
    const url = teamId ? `/api/prs/form-templates/?team_id=${teamId}` : '/api/prs/form-templates/';
    const response = await apiRequest.get<any>(url);
    // Handle both paginated response (with results) and non-paginated array response
    // Also handle error responses gracefully
    if (response.data && response.data.error) {
      // Error response - return empty array
      return [];
    }
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  } catch (error: any) {
    // If there's an error (CORS, network, etc.), return empty array
    console.error('Error fetching form templates:', error);
    return [];
  }
}

/**
 * Get all form templates globally (no team filter)
 * Form templates are team-independent, so we fetch all templates without team filter
 */
export async function getAllFormTemplates(): Promise<FormTemplate[]> {
  try {
    // Get all form templates without team filter
    const response = await apiRequest.get<any>('/api/prs/form-templates/');
    // Handle both paginated response (with results) and non-paginated array response
    // Also handle error responses gracefully
    if (response.data && response.data.error) {
      // Error response - return empty array
      return [];
    }
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  } catch (error: any) {
    // If there's an error (CORS, network, etc.), return empty array
    console.error('Error fetching all form templates:', error);
    return [];
  }
}

export async function createFormTemplate(data: FormTemplateCreateRequest): Promise<FormTemplate> {
  const response = await apiRequest.post<FormTemplate>('/api/prs/form-templates/', data);
  return response.data;
}

export async function updateFormTemplate(
  id: string,
  data: Partial<FormTemplateCreateRequest>
): Promise<FormTemplate> {
  const response = await apiRequest.patch<FormTemplate>(`/api/prs/form-templates/${id}/`, data);
  return response.data;
}

export async function reorderFormFields(
  templateId: string,
  fieldOrders: Array<{ field_id: string; order: number }>
): Promise<FormTemplate> {
  const response = await apiRequest.post<FormTemplate>(
    `/api/prs/form-templates/${templateId}/reorder-fields/`,
    { field_orders: fieldOrders }
  );
  return response.data;
}

// Workflow Management (Admin)
export interface Workflow {
  id: string;
  team: string | Team;
  team_name?: string;
  name: string;
  is_active: boolean;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  workflow: string;
  step_name: string;
  step_order: number;
  is_finance_review: boolean;
  is_active: boolean;
  approvers: WorkflowStepApprover[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowStepApprover {
  id: string;
  step: string;
  role_id: string;
  role_code: string;
  role_title: string;
  is_active: boolean;
}

export interface WorkflowCreateRequest {
  team?: string; // Team ID (optional, deprecated - WorkflowTemplate is team-agnostic)
  name: string;
  description?: string;
  steps?: Array<{
    step_name: string;
    step_order: number;
    is_finance_review: boolean;
    role_ids?: string[];
  }>;
}

export async function getWorkflows(teamId?: string): Promise<Workflow[]> {
  const url = teamId ? `/api/prs/workflows/?team_id=${teamId}` : '/api/prs/workflows/';
  const response = await apiRequest.get<any>(url);
  // Handle both paginated response (with results) and non-paginated array response
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  return [];
}

export async function getWorkflowByTeam(teamId: string): Promise<Workflow> {
  const response = await apiRequest.get<Workflow>(`/api/prs/teams/${teamId}/workflow/`);
  return response.data;
}

export async function createWorkflow(data: WorkflowCreateRequest): Promise<Workflow> {
  const response = await apiRequest.post<Workflow>('/api/prs/workflows/', data);
  return response.data;
}

export async function updateWorkflow(
  id: string,
  data: Partial<WorkflowCreateRequest>
): Promise<Workflow> {
  const response = await apiRequest.patch<Workflow>(`/api/prs/workflows/${id}/`, data);
  return response.data;
}

export async function addWorkflowStep(
  workflowId: string,
  data: {
    step_name: string;
    step_order: number;
    is_finance_review: boolean;
    role_ids?: string[];
  }
): Promise<WorkflowStep> {
  const response = await apiRequest.post<WorkflowStep>(
    `/api/prs/workflows/${workflowId}/steps/`,
    data
  );
  return response.data;
}

export async function assignStepApprovers(
  workflowId: string,
  stepId: string,
  approverIds: string[]
): Promise<WorkflowStep> {
  const response = await apiRequest.post<WorkflowStep>(
    `/api/prs/workflows/${workflowId}/steps/${stepId}/assign-approvers/`,
    { approver_ids: approverIds }
  );
  return response.data;
}

// Attachment Download
export async function downloadAttachment(
  requestId: string,
  attachmentId: string
): Promise<Blob> {
  const response = await apiRequest.get(
    `/api/prs/requests/${requestId}/attachments/${attachmentId}/download/`,
    { responseType: 'blob' }
  );
  return response.data;
}

// =============================================================================
// MULTI-TEMPLATE SUPPORT
// =============================================================================
// Types are imported from 'src/types/api/prs'
// Re-export them for convenience
export type { WorkflowTemplate, TeamPurchaseConfig, EffectiveTemplateResponse } from 'src/types/api/prs';

import { Lookup, PurchaseTypeLookup } from 'src/types/api/lookups';

/**
 * Fetch all active purchase types from backend
 * Returns list of { id, code, title, ... } for purchase types
 */
export async function fetchPurchaseTypes(): Promise<Lookup[]> {
  const response = await apiRequest.get<any>('/api/lookups/', {
    params: {
      is_active: true,
    },
  });
  // Handle both paginated response (with results) and non-paginated array response
  let allLookups: Lookup[] = [];
  if (Array.isArray(response.data)) {
    allLookups = response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    allLookups = response.data.results;
  }
  
  // Filter to only return PURCHASE_TYPE lookups
  return allLookups.filter((lookup) => lookup.type === 'PURCHASE_TYPE' && lookup.is_active);
}

/**
 * Get all form templates for a team
 */
export async function getTeamFormTemplates(teamId: string): Promise<FormTemplate[]> {
  const response = await apiRequest.get<FormTemplate[]>(`/api/prs/teams/${teamId}/form-templates/`);
  return response.data;
}

/**
 * Get all workflow templates for a team (if teamId provided) or all workflow templates globally
 */
export async function getTeamWorkflowTemplates(teamId?: string): Promise<WorkflowTemplate[]> {
  if (teamId) {
    const response = await apiRequest.get<WorkflowTemplate[]>(`/api/prs/teams/${teamId}/workflow-templates/`);
    return response.data;
  }
  // If no teamId, use the global getAllWorkflowTemplates function
  return getAllWorkflowTemplates();
}

/**
 * Get all workflow templates globally (no team filter)
 * Workflow templates are team-independent, so we fetch all templates without team filter
 */
export async function getAllWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  try {
    // Get all workflow templates directly from the endpoint
    const response = await apiRequest.get<any>('/api/prs/workflows/');
    // Handle both paginated response (with results) and non-paginated array response
    // Also handle error responses gracefully
    if (response.data && response.data.error) {
      // Error response - return empty array
      return [];
    }
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    return [];
  } catch (error: any) {
    // If there's an error (CORS, network, etc.), return empty array
    console.error('Error fetching all workflow templates:', error);
    return [];
  }
}

/**
 * Get all purchase configurations for a team
 */
export async function getTeamPurchaseConfigs(teamId: string): Promise<TeamPurchaseConfig[]> {
  const response = await apiRequest.get<TeamPurchaseConfig[]>(`/api/prs/teams/${teamId}/configs/`);
  return response.data;
}

/**
 * Get all purchase configurations (global - no team filter)
 * For admin views that need to see all configs across all teams
 */
export async function getAllPurchaseConfigs(): Promise<TeamPurchaseConfig[]> {
  const response = await apiRequest.get<any>('/api/prs/configs/');
  // Handle both paginated response (with results) and non-paginated array response
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
  }
  return [];
}

/**
 * Get the effective template pair (form + workflow) for a team + purchase type
 * This is called when creating a new purchase request to determine which templates to use
 */
export async function getEffectiveTemplate(
  teamId: string,
  purchaseType: string
): Promise<EffectiveTemplateResponse> {
  const response = await apiRequest.get<EffectiveTemplateResponse>(
    `/api/prs/teams/${teamId}/effective-template/?purchase_type=${encodeURIComponent(purchaseType)}`
  );
  return response.data;
}

/**
 * Create a new team purchase configuration
 * Note: Backend endpoint needs to be implemented at /api/prs/configs/ or /api/prs/teams/{id}/configs/
 */
export interface TeamPurchaseConfigCreateRequest {
  team: string; // Team ID
  purchase_type: string; // Purchase type lookup ID
  form_template: string; // Form template ID
  workflow_template: string; // Workflow template ID
  is_active?: boolean;
}

export async function createTeamPurchaseConfig(
  data: TeamPurchaseConfigCreateRequest
): Promise<TeamPurchaseConfig> {
  // TODO: Update this endpoint when backend implements it
  // Expected endpoint: POST /api/prs/configs/ or POST /api/prs/teams/{id}/configs/
  const response = await apiRequest.post<TeamPurchaseConfig>('/api/prs/configs/', data);
  return response.data;
}

/**
 * Update a team purchase configuration
 * Note: Backend endpoint needs to be implemented at /api/prs/configs/{id}/
 */
export interface TeamPurchaseConfigUpdateRequest {
  team?: string;
  purchase_type?: string;
  form_template?: string;
  workflow_template?: string;
  is_active?: boolean;
}

export async function updateTeamPurchaseConfig(
  id: string,
  data: TeamPurchaseConfigUpdateRequest
): Promise<TeamPurchaseConfig> {
  // TODO: Update this endpoint when backend implements it
  // Expected endpoint: PATCH /api/prs/configs/{id}/
  const response = await apiRequest.patch<TeamPurchaseConfig>(`/api/prs/configs/${id}/`, data);
  return response.data;
}

