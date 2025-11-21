import { Lookup } from './lookups';

export interface OrgNodeParent {
  id: string;
  name: string;
}

export interface OrgNode {
  id: string;
  parent?: OrgNodeParent | null; // read-only nested (id and name only)
  parent_id?: string | null; // write-only UUID
  node_type: 'COMPANY' | 'HOLDING' | 'SUBSIDIARY';
  name: string;
  code: string;
  registration_number: string | null;
  national_id: string | null;
  economic_code: string | null;
  incorporation_date: string | null;
  website_url: string | null;
  org_type?: Lookup | null; // read-only nested
  org_type_id?: string | null; // write-only UUID
  legal_entity_type?: Lookup | null; // read-only nested
  legal_entity_type_id?: string | null; // write-only UUID
  industry?: Lookup | null; // read-only nested
  industry_id?: string | null; // write-only UUID
  sub_industry?: Lookup | null; // read-only nested
  sub_industry_id?: string | null; // write-only UUID
  company_classifications?: Lookup[]; // read-only nested
  company_classification_ids?: string[]; // write-only UUID array
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgNodeCreateRequest {
  parent_id?: string | null;
  node_type: 'COMPANY' | 'HOLDING' | 'SUBSIDIARY';
  name: string;
  code: string;
  registration_number?: string | null;
  national_id?: string | null;
  economic_code?: string | null;
  incorporation_date?: string | null;
  website_url?: string | null;
  org_type_id?: string | null;
  legal_entity_type_id?: string | null;
  industry_id?: string | null;
  sub_industry_id?: string | null;
  company_classification_ids?: string[] | null;
  is_active?: boolean;
}

export interface OrgNodeUpdateRequest {
  parent_id?: string | null;
  node_type?: 'COMPANY' | 'HOLDING' | 'SUBSIDIARY';
  name?: string;
  code?: string;
  registration_number?: string | null;
  national_id?: string | null;
  economic_code?: string | null;
  incorporation_date?: string | null;
  website_url?: string | null;
  org_type_id?: string | null;
  legal_entity_type_id?: string | null;
  industry_id?: string | null;
  sub_industry_id?: string | null;
  company_classification_ids?: string[] | null;
  is_active?: boolean;
}

export interface CompanyClassification {
  id: string;
  company: string; // UUID
  classification: string; // UUID
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyClassificationCreateRequest {
  company: string; // UUID
  classification: string; // UUID
  is_active?: boolean;
}

export interface CompanyClassificationUpdateRequest {
  company?: string; // UUID
  classification?: string; // UUID
  is_active?: boolean;
}


