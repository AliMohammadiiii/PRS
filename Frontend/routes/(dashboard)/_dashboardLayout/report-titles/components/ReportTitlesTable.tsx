import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { getRouteApi } from '@tanstack/react-router';
import { Box, Typography, Chip } from '@mui/material';
import { FC, useEffect, useState, useMemo } from 'react';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { ReportTitleItem } from 'src/types/reportTitles';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';
import { Settings } from 'lucide-react';
import { IconButton } from 'injast-core/components';

const routeApi = getRouteApi('/(dashboard)/_dashboardLayout/report-titles/');

type ReportTitlesTableProps = {
  data: ReportTitleItem[];
  onEdit?: (id: string) => void;
  onDefineField?: (id: string) => void;
};

export function ReportTitlesTable({
  data,
  onEdit,
  onDefineField,
}: ReportTitlesTableProps) {
  const { page, limit, search } = routeApi.useSearch();

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search) return data;
    const searchLower = search.toLowerCase();
    return data.filter(
      (item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.code.toLowerCase().includes(searchLower) ||
        item.groups.some((g) => g.toLowerCase().includes(searchLower)) ||
        item.fields.some((f) => f.label.toLowerCase().includes(searchLower))
    );
  }, [data, search]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredData.slice(start, end);
  }, [filteredData, page, limit]);

  // Prepare rows with id
  const rows = useMemo(
    () =>
      paginatedData.map((item) => ({
        ...item,
        id: item.id,
      })),
    [paginatedData]
  );

  const createTableCols = (): GridColDef[] => {
    return [
      {
        field: 'title',
        headerName: 'عنوان گزارش',
        flex: 1,
        minWidth: 214,
      },
      {
        field: 'code',
        headerName: 'کد عنوان',
        flex: 1,
        minWidth: 109,
      },
      {
        field: 'groups',
        headerName: 'گروه‌ها',
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ReportTitleItem, string[]>) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
            {params.value && params.value.length > 0 ? (
              params.value.map((group, index) => (
                <Chip
                  key={index}
                  label={group}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    height: 24,
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                -
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'fields',
        headerName: 'فیلدها',
        flex: 1,
        minWidth: 150,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ReportTitleItem, any[]>) => (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
            {params.value && params.value.length > 0 ? (
              params.value.map((field) => (
                <Chip
                  key={field.id}
                  label={field.label}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    height: 24,
                  }}
                />
              ))
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '14px' }}>
                -
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'status',
        headerName: 'وضعیت عنوان',
        width: 126,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<ReportTitleItem, 'active' | 'inactive'>) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <StatusBadge status={params.value || 'inactive'} />
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: 'تعریف فیلد',
        width: 150,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params: GridRenderCellParams<ReportTitleItem>) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, width: '100%' }}>
            <ActionButton variant="edit" onClick={() => onEdit?.(params.row.id)} />
            <IconButton
              onClick={() => onDefineField?.(params.row.id)}
              color="primary"
              size="small"
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
              }}
              aria-label="تعریف فیلد"
            >
              <Settings className="w-4 h-4" />
            </IconButton>
          </Box>
        ),
      },
    ];
  };

  const [tableColumns] = useState<GridColDef[]>(() => createTableCols());
  const totalItemCount = filteredData.length;

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
        src="https://www.figma.com/api/mcp/asset/513c6153-8482-42c7-81dd-fb3343206772"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'neutral.main',
          fontSize: '14px',
          textAlign: 'center',
          fontWeight: 500,
        }}
      >
        هنوز عنوانی تعریف نشده
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
          rows={rows}
          columns={tableColumns}
          loading={false}
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
}
