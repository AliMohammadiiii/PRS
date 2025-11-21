import { apiRequest } from 'src/libs/apiRequest';
import {
  WorkflowDashboardItem,
  SubmissionCreateRequest,
  SubmissionUpdateRequest,
  Submission,
} from 'src/types/api/workflow';

export async function getWorkflowDashboard(params?: {
  company_id?: string;
  period_id?: string;
  reporting_period_id?: string;
}): Promise<WorkflowDashboardItem[]> {
  const response = await apiRequest.get<WorkflowDashboardItem[]>('/api/workflow/dashboard/', { params });
  return response.data;
}

export async function createSubmission(data: SubmissionCreateRequest | FormData): Promise<Submission> {
  const response = await apiRequest.post<Submission>('/api/workflow/', data, {
    headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
  });
  return response.data;
}

export async function getSubmission(id: string): Promise<Submission> {
  const response = await apiRequest.get<Submission>(`/api/workflow/${id}/`);
  return response.data;
}

export async function updateSubmission(id: string, data: SubmissionUpdateRequest | FormData): Promise<Submission> {
  const response = await apiRequest.patch<Submission>(`/api/workflow/${id}/`, data, {
    headers: data instanceof FormData ? {} : { 'Content-Type': 'application/json' },
  });
  return response.data;
}

export async function submitAllDrafts(params: {
  company_id: string;
  financial_period_id: string;
  reporting_period_id: string;
  group_id?: string; // Optional: specific group to update
}): Promise<{ detail: string; count: number }> {
  const response = await apiRequest.post<{ detail: string; count: number }>('/api/workflow/submit_all/', null, {
    params,
  });
  return response.data;
}

