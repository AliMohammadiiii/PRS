import { ApiResponse } from 'injast-core/types';
import { apiRequest } from 'src/libs/apiRequest';
import { FetchReportsResponse, ReportRow } from 'src/types/reports/report';
import * as workflowApi from 'src/services/api/workflow';

export interface ReportBoxByClassification {
  classification: {
    id: string;
    code: string;
    title: string;
    description: string | null;
  };
  report_boxes: Array<{
    report_box: any; // ReportBox type
    has_submission: boolean;
    submission_status: string | null;
  }>;
}

export const fetchReports = async (params: string) => {
  try {
    // Parse query params
    const urlParams = new URLSearchParams(params);
    const page = parseInt(urlParams.get('page') || '1');
    const limit = parseInt(urlParams.get('limit') || '10');
    const search = urlParams.get('search') || undefined;
    const companyId = urlParams.get('company_id') || undefined;
    const periodId = urlParams.get('period_id') || undefined;
    const reportingPeriodId = urlParams.get('reporting_period_id') || undefined;

    // Fetch from workflow dashboard API
    const dashboardItems = await workflowApi.getWorkflowDashboard({
      company_id: companyId,
      period_id: periodId,
      reporting_period_id: reportingPeriodId,
    });

    // Map to ReportRow format
    const rows: ReportRow[] = dashboardItems
      .filter((item) => {
        // Apply search filter if provided
        if (search) {
          const searchLower = search.toLowerCase();
          return (
            item.report.name?.toLowerCase().includes(searchLower) ||
            item.company?.name?.toLowerCase().includes(searchLower)
          );
        }
        return true;
      })
      .map((item, index) => ({
        id: item.submission_id || `report-${index}`,
        companyName: item.company?.name || 'نامشخص',
        title: item.report.name || 'بدون عنوان',
        fiscalYear: periodId ? 'تعریف شده' : 'نامشخص',
        timeRange: reportingPeriodId ? 'تعریف شده' : 'نامشخص',
        status: item.status === 'APPROVED' ? 'approved' : item.status === 'UNDER_REVIEW' ? 'pending_approval' : 'pending_approval',
      }));

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRows = rows.slice(startIndex, endIndex);

    return {
      data: {
        columns: [],
        rows: paginatedRows,
      },
    } as ApiResponse<FetchReportsResponse>;
  } catch (error: any) {
    // If the API endpoint doesn't exist or returns an error, return empty data structure
    // This allows the UI to show the empty state gracefully
    if (
      error?.response?.status === 404 ||
      error?.message?.includes('JSON') ||
      error?.message?.includes('parse')
    ) {
      // Return the expected structure: ApiResponse<FetchReportsResponse>
      return {
        data: {
          columns: [],
          rows: [],
        },
      } as ApiResponse<FetchReportsResponse>;
    }
    // Re-throw other errors to be handled by the error handler
    throw error;
  }
};

export const getReportBoxesByClassification = async (params: {
  company_id: string;
  financial_period_id?: string;
  reporting_period_id?: string;
}): Promise<ReportBoxByClassification[]> => {
  const response = await apiRequest.get<ReportBoxByClassification[]>('/api/report-boxes/by_classification/', { params });
  return response.data;
};

