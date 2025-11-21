export interface AuditEvent {
  id: string;
  actor: {
    id: string;
    username: string;
  };
  submission: {
    id: string;
  };
  event_type: 'SUBMIT' | 'STATUS_CHANGE' | 'FIELD_UPDATE';
  created_at: string;
  field_changes?: FieldChange[];
}

export interface FieldChange {
  id: string;
  audit_event: string; // UUID
  field: {
    id: string;
    name: string;
  };
  old_value: any;
  new_value: any;
  created_at: string;
}






