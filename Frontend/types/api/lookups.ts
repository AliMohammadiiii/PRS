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

// =============================================================================
// PURCHASE TYPE SUPPORT
// =============================================================================

/**
 * Purchase type code union type.
 * GOODS and SERVICE are the primary types, but others may exist in the system.
 * Use string union to allow dynamic types from backend.
 */
export type PurchaseTypeCode = 'GOODS' | 'SERVICE' | string;

/**
 * Purchase type lookup item (extends Lookup with code typed as PurchaseTypeCode)
 */
export interface PurchaseTypeLookup extends Omit<Lookup, 'code' | 'type'> {
  type: 'PURCHASE_TYPE';
  code: PurchaseTypeCode;
}

/**
 * Type guard to check if a Lookup is a PurchaseTypeLookup
 */
export function isPurchaseTypeLookup(lookup: Lookup): lookup is PurchaseTypeLookup {
  return lookup.type === 'PURCHASE_TYPE';
}






