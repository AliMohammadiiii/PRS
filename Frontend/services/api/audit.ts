import { apiRequest } from 'src/libs/apiRequest';
import {
  AuditEvent,
  FieldChange,
} from 'src/types/api/audit';

export async function getAuditEvents(): Promise<AuditEvent[]> {
  const response = await apiRequest.get<AuditEvent[]>('/api/audit-events/');
  return response.data;
}

export async function getAuditEvent(id: string): Promise<AuditEvent> {
  const response = await apiRequest.get<AuditEvent>(`/api/audit-events/${id}/`);
  return response.data;
}

export async function getAuditEventsBySubmission(submissionId: string): Promise<AuditEvent[]> {
  const response = await apiRequest.get<AuditEvent[]>('/api/audit-events/by_submission/', {
    params: { submission_id: submissionId },
  });
  return response.data;
}

export async function getAuditEventsByType(eventType: 'SUBMIT' | 'STATUS_CHANGE' | 'FIELD_UPDATE'): Promise<AuditEvent[]> {
  const response = await apiRequest.get<AuditEvent[]>('/api/audit-events/by_type/', {
    params: { event_type: eventType },
  });
  return response.data;
}

export async function getFieldChanges(): Promise<FieldChange[]> {
  const response = await apiRequest.get<FieldChange[]>('/api/field-changes/');
  return response.data;
}

export async function getFieldChange(id: string): Promise<FieldChange> {
  const response = await apiRequest.get<FieldChange>(`/api/field-changes/${id}/`);
  return response.data;
}

export async function getFieldChangesByEvent(auditEventId: string): Promise<FieldChange[]> {
  const response = await apiRequest.get<FieldChange[]>('/api/field-changes/by_event/', {
    params: { audit_event_id: auditEventId },
  });
  return response.data;
}






