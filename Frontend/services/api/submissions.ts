import { apiRequest } from 'src/libs/apiRequest';
import { Submission, ReportSubmissionGroup } from 'src/types/api/workflow';

export interface GetSubmissionsParams {
  company_id?: string; // Optional for admins
  financial_period_id: string;
  reporting_period_id?: string;
  status?: string;
  group_id?: string;
}

export async function getSubmissions(params: GetSubmissionsParams): Promise<Submission[]> {
  const response = await apiRequest.get<Submission[]>('/api/submissions/', { params });
  return response.data;
}

export async function getSubmissionGroup(groupId: string): Promise<ReportSubmissionGroup> {
  const response = await apiRequest.get<ReportSubmissionGroup>(`/api/report-submission-groups/${groupId}/`);
  return response.data;
}

export async function getSubmissionsByGroup(group: ReportSubmissionGroup): Promise<Submission[]> {
  // Handle both ID strings and nested objects
  const companyId = typeof group.company === 'string' ? group.company : group.company.id;
  const financialPeriodId = typeof group.financial_period === 'string' ? group.financial_period : group.financial_period.id;
  const reportingPeriodId = typeof group.reporting_period === 'string' ? group.reporting_period : group.reporting_period.id;
  
  const response = await apiRequest.get<Submission[]>('/api/submissions/', { 
    params: { 
      company_id: companyId,
      financial_period_id: financialPeriodId,
      reporting_period_id: reportingPeriodId
    } 
  });
  
  // Filter by group_id to ensure we only get submissions for this specific group
  // This handles cases where there might be multiple groups with the same company/period combination
  const groupId = group.id;
  return response.data.filter(submission => submission.group?.id === groupId);
}

