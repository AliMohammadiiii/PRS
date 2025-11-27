import { apiRequest } from 'src/libs/apiRequest';
import {
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from 'src/types/api/users';

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






