import { apiRequest } from 'src/libs/apiRequest';
import {
  OrgNode,
  OrgNodeCreateRequest,
  OrgNodeUpdateRequest,
  CompanyClassification,
  CompanyClassificationCreateRequest,
  CompanyClassificationUpdateRequest,
} from 'src/types/api/organizations';

export async function getOrgNodes(): Promise<OrgNode[]> {
  // NOTE:
  // The legacy `/api/org-nodes/` endpoint is not exposed in the current PRS backend.
  // For PRS user management we now rely on teams + access scopes instead of org nodes,
  // so this function is intentionally a no-op to avoid calling a non-existent endpoint.
  return [];
}

export async function getOrgNode(id: string): Promise<OrgNode> {
  const response = await apiRequest.get<OrgNode>(`/api/org-nodes/${id}/`);
  return response.data;
}

export async function createOrgNode(data: OrgNodeCreateRequest): Promise<OrgNode> {
  const response = await apiRequest.post<OrgNode>('/api/org-nodes/', data);
  return response.data;
}

export async function updateOrgNode(id: string, data: OrgNodeUpdateRequest): Promise<OrgNode> {
  const response = await apiRequest.patch<OrgNode>(`/api/org-nodes/${id}/`, data);
  return response.data;
}

export async function deleteOrgNode(id: string): Promise<void> {
  await apiRequest.delete(`/api/org-nodes/${id}/`);
}

// Company Classifications
export async function getCompanyClassifications(): Promise<CompanyClassification[]> {
  const response = await apiRequest.get<CompanyClassification[]>('/api/company-classifications/');
  return response.data;
}

export async function getCompanyClassification(id: string): Promise<CompanyClassification> {
  const response = await apiRequest.get<CompanyClassification>(`/api/company-classifications/${id}/`);
  return response.data;
}

export async function createCompanyClassification(data: CompanyClassificationCreateRequest): Promise<CompanyClassification> {
  const response = await apiRequest.post<CompanyClassification>('/api/company-classifications/', data);
  return response.data;
}

export async function updateCompanyClassification(id: string, data: CompanyClassificationUpdateRequest): Promise<CompanyClassification> {
  const response = await apiRequest.patch<CompanyClassification>(`/api/company-classifications/${id}/`, data);
  return response.data;
}

export async function deleteCompanyClassification(id: string): Promise<void> {
  await apiRequest.delete(`/api/company-classifications/${id}/`);
}






