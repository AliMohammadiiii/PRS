import { apiRequest } from 'src/libs/apiRequest';
import {
  ReportGroup,
  ReportGroupCreateRequest,
  ReportGroupUpdateRequest,
  ReportBox,
  ReportBoxCreateRequest,
  ReportBoxUpdateRequest,
  ReportField,
  ReportFieldCreateRequest,
  ReportFieldUpdateRequest,
} from 'src/types/api/reports';

// Report Groups
export async function getReportGroups(): Promise<ReportGroup[]> {
  const response = await apiRequest.get<ReportGroup[]>('/api/report-groups/');
  return response.data;
}

export async function getReportGroup(id: string): Promise<ReportGroup> {
  const response = await apiRequest.get<ReportGroup>(`/api/report-groups/${id}/`);
  return response.data;
}

export async function createReportGroup(data: ReportGroupCreateRequest): Promise<ReportGroup> {
  const response = await apiRequest.post<ReportGroup>('/api/report-groups/', data);
  return response.data;
}

export async function updateReportGroup(id: string, data: ReportGroupUpdateRequest): Promise<ReportGroup> {
  const response = await apiRequest.patch<ReportGroup>(`/api/report-groups/${id}/`, data);
  return response.data;
}

export async function deleteReportGroup(id: string): Promise<void> {
  await apiRequest.delete(`/api/report-groups/${id}/`);
}

// Report Boxes
export async function getReportBoxes(): Promise<ReportBox[]> {
  const response = await apiRequest.get<ReportBox[]>('/api/report-boxes/');
  return response.data;
}

export async function getReportBox(id: string): Promise<ReportBox> {
  const response = await apiRequest.get<ReportBox>(`/api/report-boxes/${id}/`);
  return response.data;
}

export async function createReportBox(data: ReportBoxCreateRequest): Promise<ReportBox> {
  const response = await apiRequest.post<ReportBox>('/api/report-boxes/', data);
  return response.data;
}

export async function updateReportBox(id: string, data: ReportBoxUpdateRequest): Promise<ReportBox> {
  const response = await apiRequest.patch<ReportBox>(`/api/report-boxes/${id}/`, data);
  return response.data;
}

export async function deleteReportBox(id: string): Promise<void> {
  await apiRequest.delete(`/api/report-boxes/${id}/`);
}

// Report Fields
export async function getReportFields(): Promise<ReportField[]> {
  const response = await apiRequest.get<ReportField[]>('/api/report-fields/');
  return response.data;
}

export async function getReportField(id: string): Promise<ReportField> {
  const response = await apiRequest.get<ReportField>(`/api/report-fields/${id}/`);
  return response.data;
}

export async function createReportField(data: ReportFieldCreateRequest): Promise<ReportField> {
  const response = await apiRequest.post<ReportField>('/api/report-fields/', data);
  return response.data;
}

export async function updateReportField(id: string, data: ReportFieldUpdateRequest): Promise<ReportField> {
  const response = await apiRequest.patch<ReportField>(`/api/report-fields/${id}/`, data);
  return response.data;
}

export async function deleteReportField(id: string): Promise<void> {
  await apiRequest.delete(`/api/report-fields/${id}/`);
}






