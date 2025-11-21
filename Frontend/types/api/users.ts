export interface User {
  id: string;
  username: string;
  password?: string; // write-only
  first_name: string;
  last_name: string;
  email: string;
  mobile_phone: string;
  national_code: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  last_login: string | null;
  date_joined: string;
  created_at: string;
  updated_at: string;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_phone?: string;
  national_code?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}

export interface UserUpdateRequest {
  username?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_phone?: string;
  national_code?: string;
  is_active?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}






