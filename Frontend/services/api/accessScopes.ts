import { apiRequest } from 'src/libs/apiRequest';
import {
  AccessScope,
  AccessScopeCreateRequest,
  AccessScopeUpdateRequest,
} from 'src/types/api/accessScopes';

export async function getAccessScopes(): Promise<AccessScope[]> {
  const response = await apiRequest.get<any>('/api/access-scopes/');
  
  // Support both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    // Non-paginated response - return directly
    return response.data;
  }
  
  if (response.data && Array.isArray(response.data.results)) {
    // Paginated response - fetch all pages
    const allResults: AccessScope[] = [...response.data.results];
    let nextUrl = response.data.next;
    
    // Follow pagination links until there are no more pages
    while (nextUrl) {
      // Extract the path from the full URL (remove domain if present)
      const urlPath = nextUrl.startsWith('http') 
        ? new URL(nextUrl).pathname + new URL(nextUrl).search
        : nextUrl;
      
      const pageResponse = await apiRequest.get<any>(urlPath);
      if (pageResponse.data && Array.isArray(pageResponse.data.results)) {
        allResults.push(...pageResponse.data.results);
        nextUrl = pageResponse.data.next;
      } else {
        break;
      }
    }
    
    return allResults;
  }
  
  return [];
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






