import { apiRequest } from 'src/libs/apiRequest';
import { ReportSubmissionGroup } from 'src/types/api/workflow';

export async function getOrCreateReportSubmissionGroup(params: {
  company_id: string;
  financial_period_id: string;
  reporting_period_id: string;
  title?: string;
  description?: string;
}): Promise<ReportSubmissionGroup> {
  const { title, description, ...queryParams } = params;
  const response = await apiRequest.post<ReportSubmissionGroup>(
    '/api/report-submission-groups/get_or_create/',
    { title, description },
    { params: queryParams }
  );
  return response.data;
}

export async function updateReportSubmissionGroup(
  id: string,
  data: { title?: string; description?: string }
): Promise<ReportSubmissionGroup> {
  const response = await apiRequest.patch<ReportSubmissionGroup>(
    `/api/report-submission-groups/${id}/`,
    data
  );
  return response.data;
}

