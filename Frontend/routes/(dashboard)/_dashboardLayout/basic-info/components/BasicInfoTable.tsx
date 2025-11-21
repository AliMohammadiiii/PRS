import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { getRouteApi } from '@tanstack/react-router';
import { Box, Typography } from '@mui/material';
import { FC, useMemo, useState } from 'react';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { BasicInfoItem } from 'src/types/basicInfo';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';

const routeApi = getRouteApi('/(dashboard)/_dashboardLayout/basic-info/');

type BasicInfoTableProps = {
  data: BasicInfoItem[];
  onEdit?: (id: string) => void;
  fourthColumnTitle: string;
  category: string;
};

export function BasicInfoTable({
  data,
  onEdit,
  fourthColumnTitle,
  category,
}: BasicInfoTableProps) {
  const { page, limit, search } = routeApi.useSearch();

  // Filter data based on search and category
  const filteredData = useMemo(() => {
    let filtered = data.filter((item) => item.category === category);
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchLower) ||
          item.code.toLowerCase().includes(searchLower)
      );
    }
    return filtered;
  }, [data, search, category]);

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

  const tableColumns = useMemo<GridColDef[]>(() => {
    return [
      {
        field: 'title',
        headerName: fourthColumnTitle,
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'code',
        headerName: 'کد عنوان',
        flex: 1,
        minWidth: 150,
      },
      {
        field: 'status',
        headerName: 'وضعیت',
        width: 120,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<BasicInfoItem, 'active' | 'inactive'>) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <StatusBadge status={params.value || 'inactive'} />
          </Box>
        ),
      },
      ...(onEdit
        ? [
            {
              field: 'actions',
              headerName: 'ویرایش',
              width: 100,
              align: 'center' as const,
              headerAlign: 'center' as const,
              sortable: false,
              renderCell: (params: GridRenderCellParams<BasicInfoItem>) => (
                <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <ActionButton variant="edit" onClick={() => onEdit?.(params.row.id)} />
                </Box>
              ),
            },
          ]
        : []),
    ];
  }, [fourthColumnTitle, onEdit]);
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
    <Box
      sx={{
        '& > div': {
          py: '8px !important',
          height: 'auto !important',
          minHeight: 'auto !important',
        },
      }}
    >
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
      </ContentBox>
    </Box>
  );
}
