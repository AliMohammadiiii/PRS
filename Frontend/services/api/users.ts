import { apiRequest } from 'src/libs/apiRequest';
import {
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from 'src/types/api/users';

/**
 * Normalizes pagination URLs by removing the basepath prefix if present.
 * This prevents duplicate basepath in URLs (e.g., /PRS/PRS/api/...)
 */
function normalizePaginationUrl(url: string | null): string | null {
  if (!url) return null;
  
  // Extract path from full URL if it's an absolute URL
  let path = url.startsWith('http') 
    ? new URL(url).pathname + new URL(url).search
    : url;
  
  // Remove /PRS prefix if present (since apiRequest baseURL already includes it)
  if (path.startsWith('/PRS/')) {
    path = path.substring('/PRS'.length);
  }
  
  return path;
}

export async function getUsers(): Promise<User[]> {
  const response = await apiRequest.get<any>('/api/users/');
  
  // Support both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    // Non-paginated response - return directly
    return response.data;
  }
  
  if (response.data && Array.isArray(response.data.results)) {
    // Paginated response - fetch all pages
    const allResults: User[] = [...response.data.results];
    let nextUrl = response.data.next;
    
    // Follow pagination links until there are no more pages
    while (nextUrl) {
      // Normalize the URL to remove duplicate basepath
      const normalizedUrl = normalizePaginationUrl(nextUrl);
      if (!normalizedUrl) break;
      
      const pageResponse = await apiRequest.get<any>(normalizedUrl);
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

export async function getUser(id: string): Promise<User> {
  const response = await apiRequest.get<User>(`/api/users/${id}/`);
  return response.data;
}

export async function createUser(data: UserCreateRequest): Promise<User> {
  const response = await apiRequest.post<User>('/api/users/', data);
  return response.data;
}

export async function updateUser(id: string, data: UserUpdateRequest): Promise<User> {
  const response = await apiRequest.patch<User>(`/api/users/${id}/`, data);
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await apiRequest.delete(`/api/users/${id}/`);
}






