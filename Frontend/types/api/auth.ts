export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RefreshTokenRequest {
  refresh: string;
}

export interface RefreshTokenResponse {
  access: string;
}

export interface VerifyTokenRequest {
  token: string;
}

import { OrgNode } from './organizations';

export interface CompanyRole {
  id: string;
  title: string;
  code: string;
  position_title: string | null;
}

export interface UserMeResponse {
  id: string;
  username: string;
  is_admin: boolean;
  roles: string[];
  accessible_companies?: OrgNode[];
  company_roles?: Record<string, CompanyRole[]>; // Map of company_id -> list of roles
}

