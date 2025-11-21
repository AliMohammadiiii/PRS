import { apiRequest } from 'src/libs/apiRequest';
import {
  AccessScope,
  AccessScopeCreateRequest,
  AccessScopeUpdateRequest,
} from 'src/types/api/accessScopes';

export async function getAccessScopes(): Promise<AccessScope[]> {
  const response = await apiRequest.get<AccessScope[]>('/api/access-scopes/');
  return response.data;
}

export async function getAccessScope(id: string): Promise<AccessScope> {
  const response = await apiRequest.get<AccessScope>(`/api/access-scopes/${id}/`);
  return response.data;
}

export async function createAccessScope(data: AccessScopeCreateRequest): Promise<AccessScope> {
  const response = await apiRequest.post<AccessScope>('/api/access-scopes/', data);
  return response.data;
}

export async function updateAccessScope(id: string, data: AccessScopeUpdateRequest): Promise<AccessScope> {
  const response = await apiRequest.patch<AccessScope>(`/api/access-scopes/${id}/`, data);
  return response.data;
}

export async function deleteAccessScope(id: string): Promise<void> {
  await apiRequest.delete(`/api/access-scopes/${id}/`);
}






