import { apiRequest } from 'src/libs/apiRequest';
import {
  ReviewSubmission,
  ReviewRejectRequest,
  ReviewRejectResponse,
  ReviewApproveResponse,
  ReviewGroup,
  ReviewGroupRejectRequest,
  ReviewGroupRejectResponse,
  ReviewGroupApproveResponse,
} from 'src/types/api/review';

export async function getReviewSubmissions(): Promise<ReviewSubmission[]> {
  const response = await apiRequest.get<ReviewSubmission[]>('/api/review/');
  return response.data;
}

export async function approveSubmission(id: string): Promise<ReviewApproveResponse> {
  const response = await apiRequest.post<ReviewApproveResponse>(`/api/review/${id}/approve/`);
  return response.data;
}

export async function rejectSubmission(id: string, data: ReviewRejectRequest): Promise<ReviewRejectResponse> {
  const response = await apiRequest.post<ReviewRejectResponse>(`/api/review/${id}/reject/`, data);
  return response.data;
}

// Group review functions
export async function getReviewGroups(): Promise<ReviewGroup[]> {
  const response = await apiRequest.get<ReviewGroup[]>('/api/review/groups/');
  return response.data;
}

export async function approveGroup(groupId: string): Promise<ReviewGroupApproveResponse> {
  const response = await apiRequest.post<ReviewGroupApproveResponse>(`/api/review/groups/${groupId}/approve/`);
  return response.data;
}

export async function rejectGroup(groupId: string, data: ReviewGroupRejectRequest): Promise<ReviewGroupRejectResponse> {
  const response = await apiRequest.post<ReviewGroupRejectResponse>(`/api/review/groups/${groupId}/reject/`, data);
  return response.data;
}


