import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import logger from "@/lib/logger";
import { Link as MuiLink } from '@mui/material';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { Box, Typography, Select, MenuItem } from 'injast-core/components';
import { useErrorHandler } from 'injast-core/hooks';
import { createQueryParams } from 'injast-core/utils';
import { FC, useEffect, useState } from 'react';
import { defaultColors } from 'injast-core/constants';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { getSubmissions } from 'src/services/api/submissions';
import { Submission } from 'src/types/api/workflow';
import { useCompany } from 'src/client/contexts/CompanyContext';
import { useAuth } from 'src/client/contexts/AuthContext';
import { getFinancialPeriods } from 'src/services/api/periods';
import { FinancialPeriod } from 'src/types/api/periods';
import { getLookups } from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';

const routeApi = getRouteApi('/(dashboard)/_dashboardLayout/reports/');

type SubmissionGroupRow = {
  id: string; // group ID
  groupTitle: string;
  companyName: string;
  financialPeriod: string;
  reportingPeriod: string;
  status: string; // Overall status of the group
  submissionDate: string; // Date of the group (created_at)
  submissionCount: number; // Number of submissions in this group
  groupId: string; // For navigation
  submissions: Array<{
    reportName: string;
    status: string;
    submissionId: string;
  }>; // Individual submissions with their statuses
};

const ReportsTable: FC = () => {
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'UNDER_REVIEW':
        return 'درانتظار تایید';
      case 'APPROVED':
        return 'تایید شده';
      case 'REJECTED':
        return 'نیازمند تغییرات';
      case 'DRAFT':
        return 'پیش نویس';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'UNDER_REVIEW':
        return defaultColors.orange?.main || '#F4BC28';
      case 'APPROVED':
        return defaultColors.success?.main || '#1DBF98';
      case 'REJECTED':
        return defaultColors.danger?.main || '#FF0000';
      case 'DRAFT':
        return defaultColors.neutral.light || '#91969f';
      default:
        return defaultColors.neutral.main;
    }
  };

  const createTableCols = (): GridColDef[] => {
    return [
      {
        field: 'groupTitle',
        headerName: 'گروه ارسال',
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<SubmissionGroupRow, string>) => (
          <Typography
            variant="body2"
            sx={{
              fontSize: '14px',
              fontWeight: 500,
              color: defaultColors.text?.primary || '#242933',
            }}
          >
            {params.value || 'بدون عنوان'}
          </Typography>
        ),
      },
      {
        field: 'companyName',
        headerName: 'نام شرکت',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'financialPeriod',
        headerName: 'دوره مالی',
        width: 180,
      },
      {
        field: 'reportingPeriod',
        headerName: 'بازه زمانی',
        width: 180,
      },
      {
        field: 'submissions',
        headerName: 'وضعیت گزارش‌ها',
        flex: 1,
        minWidth: 300,
        renderCell: (params: GridRenderCellParams<SubmissionGroupRow, Array<{ reportName: string; status: string; submissionId: string }>>) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, py: 1 }}>
            {params.value?.map((submission, index) => (
              <Box key={submission.submissionId || index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: defaultColors.text?.primary || '#242933',
                    minWidth: '150px',
                  }}
                >
                  {submission.reportName}:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: getStatusColor(submission.status),
                  }}
                >
                  {getStatusText(submission.status)}
                </Typography>
              </Box>
            ))}
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'وضعیت',
        width: 180,
        renderCell: (params: GridRenderCellParams<SubmissionGroupRow, string>) => (
          <Typography
            variant="body2"
            sx={{
              color: getStatusColor(params.value || ''),
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {getStatusText(params.value || '')}
          </Typography>
        ),
      },
      {
        field: 'submissionDate',
        headerName: 'تاریخ ارسال',
        width: 180,
      },
      {
        field: 'viewAction',
        headerName: 'مشاهده گزارش',
        width: 134,
        sortable: false,
        renderCell: (params: GridRenderCellParams<SubmissionGroupRow>) => (
          <MuiLink
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate({ to: '/reports/view/$groupId', params: { groupId: params.row.groupId } });
            }}
            sx={{
              color: '#1DBF98',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              cursor: 'pointer',
              '&:hover': {
                textDecoration: 'underline',
              },
            }}
          >
            مشاهده ←
          </MuiLink>
        ),
      },
    ];
  };

  const [tableColumns] = useState<GridColDef[]>(() => createTableCols());
  const [tableRows, setTableRows] = useState<SubmissionGroupRow[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [totalItemCount, setTotalItemCount] = useState(0);
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);
  const [selectedFinancialPeriodId, setSelectedFinancialPeriodId] = useState<string>('');
  const [reportingPeriods, setReportingPeriods] = useState<Lookup[]>([]);
  const [selectedReportingPeriodId, setSelectedReportingPeriodId] = useState<string>('');
  const { handleError } = useErrorHandler();
  const { page, limit, search } = routeApi.useSearch();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load financial periods and reporting periods
  useEffect(() => {
    const loadData = async () => {
      try {
        const [periods, lookups] = await Promise.all([
          getFinancialPeriods(),
          getLookups(),
        ]);
        const activePeriods = periods.filter(p => p.is_active);
        setFinancialPeriods(activePeriods);
        if (activePeriods.length > 0) {
          setSelectedFinancialPeriodId(activePeriods[0].id);
        }
        
        const reportingPeriodLookups = lookups.filter(
          l => l.type === 'REPORTING_PERIOD' && l.is_active
        );
        setReportingPeriods(reportingPeriodLookups);
      } catch (error) {
        logger.error('Error loading periods:',  error);
      }
    };
    loadData();
  }, []);

  const getSubmissionData = async () => {
    if (!selectedFinancialPeriodId) {
      setTableRows([]);
      setTotalItemCount(0);
      setTableLoading(false);
      return;
    }

    // For non-admin users, company is required
    const isAdmin = user?.is_admin ?? false;
    if (!isAdmin && !selectedCompany) {
      setTableRows([]);
      setTotalItemCount(0);
      setTableLoading(false);
      return;
    }

    setTableLoading(true);
    try {
      const params: any = {
        financial_period_id: selectedFinancialPeriodId,
      };
      
      // Only include company_id if selected or if not admin
      if (selectedCompany) {
        params.company_id = selectedCompany.id;
      }
      
      if (selectedReportingPeriodId) {
        params.reporting_period_id = selectedReportingPeriodId;
      }

      const submissions = await getSubmissions(params);
      
      // Filter by search if provided
      let filteredSubmissions = submissions;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredSubmissions = submissions.filter(sub => 
          sub.report?.name?.toLowerCase().includes(searchLower) ||
          sub.company?.name?.toLowerCase().includes(searchLower) ||
          sub.group?.title?.toLowerCase().includes(searchLower)
        );
      }

      // Group submissions by group ID
      const groupMap = new Map<string, Submission[]>();
      
      for (const sub of filteredSubmissions) {
        // Only include submissions that have a group
        if (sub.group?.id) {
          const groupId = sub.group.id;
          if (!groupMap.has(groupId)) {
            groupMap.set(groupId, []);
          }
          groupMap.get(groupId)!.push(sub);
        }
      }

      // Convert groups to rows with date for sorting
      const rowsWithDate: Array<{ row: SubmissionGroupRow; sortDate: string }> = Array.from(groupMap.entries()).map(([groupId, groupSubmissions]) => {
        // Get the first submission to extract common data
        const firstSub = groupSubmissions[0];
        
        // Use group status as the primary source of truth
        // If group status is not available, calculate from submissions as fallback
        let groupStatus = firstSub.group?.status?.code;
        
        if (!groupStatus) {
          // Fallback: Determine overall status from submissions: prioritize APPROVED > UNDER_REVIEW > REJECTED > DRAFT
          const statusPriority: Record<string, number> = {
            'APPROVED': 4,
            'UNDER_REVIEW': 3,
            'REJECTED': 2,
            'DRAFT': 1,
          };
          
          const overallStatus = groupSubmissions.reduce((prev, curr) => {
            const prevPriority = statusPriority[prev.status?.code || ''] || 0;
            const currPriority = statusPriority[curr.status?.code || ''] || 0;
            return currPriority > prevPriority ? curr.status : prev.status;
          }, firstSub.status);
          
          groupStatus = overallStatus?.code;
        }

        const dateString = firstSub.group?.created_at || firstSub.created_at;
        const submissionDate = dateString
          ? new Date(dateString).toLocaleDateString('fa-IR')
          : 'نامشخص';

        return {
          row: {
            id: groupId,
            groupId: groupId,
            groupTitle: firstSub.group?.title || 'بدون عنوان',
            companyName: firstSub.company?.name || 'نامشخص',
            financialPeriod: firstSub.financial_period?.title || 'نامشخص',
            reportingPeriod: firstSub.reporting_period?.title || 'نامشخص',
            status: groupStatus || 'نامشخص',
            submissionDate: submissionDate,
            submissionCount: groupSubmissions.length,
            submissions: groupSubmissions.map(sub => ({
              reportName: sub.report?.name || 'بدون عنوان',
              status: sub.status?.code || 'نامشخص',
              submissionId: sub.id,
            })),
          },
          sortDate: dateString || '',
        };
      });

      // Sort by submission date (newest first)
      rowsWithDate.sort((a, b) => {
        return new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime();
      });

      // Extract just the rows
      const rows: SubmissionGroupRow[] = rowsWithDate.map(item => item.row);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedRows = rows.slice(startIndex, endIndex);

      setTableRows(paginatedRows);
      setTotalItemCount(rows.length);
    } catch (error) {
      logger.error('Error fetching submissions:',  error);
      try {
        handleError(error);
      } catch (e) {
        logger.error('Error handler failed:',  e);
      }
      setTableRows([]);
      setTotalItemCount(0);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    getSubmissionData();
  }, [page, limit, search, selectedCompany, selectedFinancialPeriodId, selectedReportingPeriodId]);

  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 2.5,
        py: 10,
      }}
    >
      <Box
        component="img"
        src="https://www.figma.com/api/mcp/asset/43cda013-ab5a-427c-af5c-77ae0a518f5e"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'neutral.main',
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        هنوز مدرکی بارگذاری نشده
      </Typography>
    </Box>
  );

  return (
    <ContentBox>
      <Box
        display="flex"
        flexDirection="column"
        dir="rtl"
        gap={2}
        minHeight={DATAGRID_WRAPPER_MIN_HIGHT}
      >
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Select
            value={selectedFinancialPeriodId}
            size="small"
            onChange={(e) => setSelectedFinancialPeriodId(e.target.value as string)}
            displayEmpty
            height={48}
            sx={{
              minWidth: '200px',
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="" disabled>
              <em>انتخاب دوره مالی</em>
            </MenuItem>
            {financialPeriods.map((period) => (
              <MenuItem key={period.id} value={period.id}>
                {period.title}
              </MenuItem>
            ))}
          </Select>
          
          <Select
            value={selectedReportingPeriodId}
            size="small"
            onChange={(e) => setSelectedReportingPeriodId(e.target.value as string)}
            displayEmpty
            height={48}
            sx={{
              minWidth: '200px',
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="">
              <em>همه بازه‌های زمانی</em>
            </MenuItem>
            {reportingPeriods.map((period) => (
              <MenuItem key={period.id} value={period.id}>
                {period.title}
              </MenuItem>
            ))}
          </Select>
        </Box>

        <DataGrid
          rows={tableRows}
          columns={tableColumns}
          loading={tableLoading}
          getRowHeight={() => 'auto'}
          slots={{
            loadingOverlay: DataGridLoading,
            noRowsOverlay: EmptyState,
            noResultsOverlay: EmptyState,
            pagination: () => (
              <DataGridPagination
                count={Math.ceil(totalItemCount / limit)}
                page={page}
                limit={limit}
              />
            ),
          }}
          sx={{
            '& .MuiDataGrid-cell': {
              textAlign: 'right',
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              borderBottom: '1px solid #e5e7ea',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f4f6fa',
              borderBottom: '1px solid #d6d9df',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 500,
              fontSize: '14px',
            },
            '& .MuiDataGrid-row': {
              minHeight: '56px !important',
              '&:nth-of-type(even)': {
                backgroundColor: '#fafbfc',
              },
              '&:hover': {
                backgroundColor: '#f4f6fa',
              },
            },
          }}
        />
      </Box>
    </ContentBox>
  );
};

export default ReportsTable;

