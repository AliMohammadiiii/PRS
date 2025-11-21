import { Lookup } from './lookups';

export interface ReportGroup {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportGroupCreateRequest {
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface ReportGroupUpdateRequest {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface ReportField {
  id: string;
  report: string; // UUID of ReportBox
  field_id: string;
  name: string;
  help_text: string | null;
  required: boolean;
  data_type: string;
  entity_ref_type: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportFieldCreateRequest {
  report: string; // UUID of ReportBox
  field_id: string;
  name: string;
  help_text?: string | null;
  required?: boolean;
  data_type: string;
  entity_ref_type?: string | null;
  is_active?: boolean;
}

export interface ReportFieldUpdateRequest {
  report?: string; // UUID of ReportBox
  field_id?: string;
  name?: string;
  help_text?: string | null;
  required?: boolean;
  data_type?: string;
  entity_ref_type?: string | null;
  is_active?: boolean;
}

export interface ReportBox {
  id: string;
  code: string;
  name: string;
  description: string | null;
  intercompany: boolean;
  groups: string[]; // Array of ReportGroup UUIDs
  classifications?: Lookup[]; // read-only nested
  fields?: ReportField[]; // read-only nested
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReportBoxCreateRequest {
  code: string;
  name: string;
  description?: string | null;
  intercompany?: boolean;
  groups?: string[]; // Array of ReportGroup UUIDs
  is_active?: boolean;
}

export interface ReportBoxUpdateRequest {
  code?: string;
  name?: string;
  description?: string | null;
  intercompany?: boolean;
  groups?: string[]; // Array of ReportGroup UUIDs
  is_active?: boolean;
}






