import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Box, Typography } from '@mui/material';
import { FC, useMemo, useState } from 'react';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT, INITIAL_LIMIT } from 'src/shared/constants';
import { ReviewGroup } from 'src/types/api/review';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';
import { Button } from '@/components/ui/button';
import { SetStatusModal } from '@/components/SetStatusModal';
import * as reviewApi from 'src/services/api/review';

type AdminReviewGroupsTableProps = {
  data: ReviewGroup[];
  onViewGroup: (groupId: string) => void;
  onStatusChange?: () => void;
};

export function AdminReviewGroupsTable({ data, onViewGroup, onStatusChange }: AdminReviewGroupsTableProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(INITIAL_LIMIT);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepare rows with id
  const rows = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        id: item.id,
      })),
    [data]
  );

  const createTableCols = (): GridColDef[] => {
    return [
      {
        field: 'title',
        headerName: 'عنوان گروه',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'company',
        headerName: 'شرکت',
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<ReviewGroup>) => {
          const company = typeof params.row.company === 'string' 
            ? params.row.company 
            : params.row.company?.name || '-';
          return <Typography variant="body2">{company}</Typography>;
        },
      },
      {
        field: 'financial_period',
        headerName: 'دوره مالی',
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<ReviewGroup>) => {
          const period = typeof params.row.financial_period === 'string'
            ? params.row.financial_period
            : params.row.financial_period?.title || '-';
          return <Typography variant="body2">{period}</Typography>;
        },
      },
      {
        field: 'reporting_period',
        headerName: 'دوره گزارش‌دهی',
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<ReviewGroup>) => {
          const period = typeof params.row.reporting_period === 'string'
            ? params.row.reporting_period
            : params.row.reporting_period?.title || '-';
          return <Typography variant="body2">{period}</Typography>;
        },
      },
      {
        field: 'status',
        headerName: 'وضعیت',
        width: 155,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params: GridRenderCellParams<ReviewGroup>) => {
          const status = typeof params.row.status === 'string'
            ? params.row.status
            : params.row.status?.code || null;
          return (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
              <StatusBadge 
                status={status === 'UNDER_REVIEW' ? 'active' : status === 'APPROVED' ? 'active' : 'inactive'} 
              />
            </Box>
          );
        },
      },
      {
        field: 'submissions_count',
        headerName: 'تعداد گزارش‌ها',
        width: 120,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<ReviewGroup>) => {
          const count = params.row.submissions?.length || 0;
          return <Typography variant="body2">{count}</Typography>;
        },
      },
      {
        field: 'actions',
        headerName: 'عملیات',
        width: 220,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params: GridRenderCellParams<ReviewGroup>) => {
          const statusObj = params.row.status;
          const status = typeof statusObj === 'string'
            ? statusObj
            : statusObj?.code || null;
          // Check that status is REPORT_STATUS:UNDER_REVIEW
          const isUnderReview = status === 'UNDER_REVIEW' && 
            (typeof statusObj === 'string' || 
             (typeof statusObj === 'object' && (!statusObj.type || statusObj.type.code === 'REPORT_STATUS')));
          
          return (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%', flexWrap: 'wrap' }}>
              <Button
                variant="default"
                size="sm"
                disabled={!isUnderReview || isSubmitting}
                onClick={() => {
                  if (isUnderReview) {
                    setSelectedGroupId(params.row.id);
                    setIsModalOpen(true);
                  }
                }}
                style={{
                  opacity: !isUnderReview ? 0.6 : 1,
                  cursor: !isUnderReview ? 'not-allowed' : 'pointer',
                }}
              >
                تعیین وضعیت
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewGroup(params.row.id)}
              >
                مشاهده
              </Button>
            </Box>
          );
        },
      },
    ];
  };

  const [tableColumns] = useState<GridColDef[]>(() => createTableCols());
  const totalItemCount = data.length;

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED', comment?: string) => {
    if (!selectedGroupId) return;
    
    setIsSubmitting(true);
    try {
      if (status === 'APPROVED') {
        await reviewApi.approveGroup(selectedGroupId);
      } else {
        await reviewApi.rejectGroup(selectedGroupId, { comment: comment || '' });
      }
      // Close modal and refresh data
      setIsModalOpen(false);
      setSelectedGroupId(null);
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (err: any) {
      throw err; // Let modal handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paginate data
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return rows.slice(start, end);
  }, [rows, page, limit]);

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
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        هیچ گروه ارسالی برای بررسی وجود ندارد
      </Typography>
    </Box>
  );

  return (
    <ContentBox>
      <Box
        display="flex"
        flexDirection="column"
        dir="rtl"
        minHeight={DATAGRID_WRAPPER_MIN_HIGHT}
      >
        <DataGrid
          rows={paginatedRows}
          columns={tableColumns}
          loading={false}
          slots={{
            loadingOverlay: DataGridLoading,
            noRowsOverlay: EmptyState,
            noResultsOverlay: EmptyState,
            pagination: () => (
              <DataGridPagination
                count={Math.ceil(totalItemCount / limit)}
                page={page}
                limit={limit}
                onPageChange={setPage}
                onLimitChange={setLimit}
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
      
      <SetStatusModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedGroupId(null);
          }
        }}
        onConfirm={handleStatusChange}
        isLoading={isSubmitting}
      />
    </ContentBox>
  );
}

