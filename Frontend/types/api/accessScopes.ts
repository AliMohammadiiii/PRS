export interface AccessScope {
  id: string;
  user: string; // UUID
  org_node: string | null; // UUID
  org_name?: string; // read-only
  org_code?: string; // read-only
  team?: string | null; // UUID (for PRS team assignments)
  team_name?: string; // read-only
  role: string; // UUID
  role_code?: string; // read-only
  role_title?: string; // read-only
  position_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccessScopeCreateRequest {
  user: string; // UUID
  org_node?: string | null; // UUID
  team?: string | null; // UUID (for PRS team assignments)
  role: string; // UUID
  position_title?: string | null;
  is_active?: boolean;
}

export interface AccessScopeUpdateRequest {
  user?: string; // UUID
  org_node?: string | null; // UUID
  team?: string | null; // UUID
  role?: string; // UUID
  position_title?: string | null;
  is_active?: boolean;
}






