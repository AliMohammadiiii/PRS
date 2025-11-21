import { apiRequest } from 'src/libs/apiRequest';
import {
  LookupType,
  LookupTypeCreateRequest,
  LookupTypeUpdateRequest,
  Lookup,
  LookupCreateRequest,
  LookupUpdateRequest,
} from 'src/types/api/lookups';

// Lookup Types
export async function getLookupTypes(): Promise<LookupType[]> {
  const response = await apiRequest.get<LookupType[]>('/api/lookup-types/');
  return response.data;
}

export async function getLookupType(id: string): Promise<LookupType> {
  const response = await apiRequest.get<LookupType>(`/api/lookup-types/${id}/`);
  return response.data;
}

export async function createLookupType(data: LookupTypeCreateRequest): Promise<LookupType> {
  const response = await apiRequest.post<LookupType>('/api/lookup-types/', data);
  return response.data;
}

export async function updateLookupType(id: string, data: LookupTypeUpdateRequest): Promise<LookupType> {
  const response = await apiRequest.patch<LookupType>(`/api/lookup-types/${id}/`, data);
  return response.data;
}

export async function deleteLookupType(id: string): Promise<void> {
  await apiRequest.delete(`/api/lookup-types/${id}/`);
}

// Lookups
export async function getLookups(): Promise<Lookup[]> {
  const response = await apiRequest.get<Lookup[]>('/api/lookups/');
  return response.data;
}

export async function getLookup(id: string): Promise<Lookup> {
  const response = await apiRequest.get<Lookup>(`/api/lookups/${id}/`);
  return response.data;
}

export async function createLookup(data: LookupCreateRequest): Promise<Lookup> {
  const response = await apiRequest.post<Lookup>('/api/lookups/', data);
  return response.data;
}

export async function updateLookup(id: string, data: LookupUpdateRequest): Promise<Lookup> {
  const response = await apiRequest.patch<Lookup>(`/api/lookups/${id}/`, data);
  return response.data;
}

export async function deleteLookup(id: string): Promise<void> {
  await apiRequest.delete(`/api/lookups/${id}/`);
}






