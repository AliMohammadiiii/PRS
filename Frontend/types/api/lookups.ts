export interface LookupType {
  id: string;
  code: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LookupTypeCreateRequest {
  code: string;
  title: string;
  description?: string | null;
  is_active?: boolean;
}

export interface LookupTypeUpdateRequest {
  code?: string;
  title?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface Lookup {
  id: string;
  type: string; // LookupType code (slug field)
  code: string;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LookupCreateRequest {
  type: string; // LookupType code
  code: string;
  title: string;
  description?: string | null;
  is_active?: boolean;
}

export interface LookupUpdateRequest {
  type?: string; // LookupType code
  code?: string;
  title?: string;
  description?: string | null;
  is_active?: boolean;
}






