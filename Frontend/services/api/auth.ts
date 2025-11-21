import { apiRequest } from 'src/libs/apiRequest';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  VerifyTokenRequest,
  UserMeResponse,
} from 'src/types/api/auth';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await apiRequest.post<LoginResponse>('/api/auth/token/', data);
  return response.data;
}

export async function refreshToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
  const response = await apiRequest.post<RefreshTokenResponse>('/api/auth/token/refresh/', data);
  return response.data;
}

export async function verifyToken(data: VerifyTokenRequest): Promise<void> {
  await apiRequest.post('/api/auth/token/verify/', data);
}

export async function getMe(): Promise<UserMeResponse> {
  const response = await apiRequest.get<UserMeResponse>('/api/me/');
  return response.data;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResponse {
  detail: string;
}

export async function changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  const response = await apiRequest.post<ChangePasswordResponse>('/api/auth/change-password/', data);
  return response.data;
}


