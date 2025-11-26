import { apiRequest } from 'src/libs/apiRequest';
import {
  User,
  UserCreateRequest,
  UserUpdateRequest,
} from 'src/types/api/users';

export async function getUsers(): Promise<User[]> {
  const response = await apiRequest.get<any>('/api/users/');
  // Handle both paginated response (with results) and non-paginated array response
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.results)) {
    return response.data.results;
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






