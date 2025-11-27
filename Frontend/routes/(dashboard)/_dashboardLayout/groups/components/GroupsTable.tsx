import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { getRouteApi } from '@tanstack/react-router';
import { Box, Typography } from '@mui/material';
import { FC, useMemo, useState } from 'react';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { Group } from 'src/types/groups';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';

const routeApi = getRouteApi('/(dashboard)/_dashboardLayout/groups/');

type GroupsTableProps = {
  data: Group[];
  onEdit?: (id: string) => void;
};

export function GroupsTable({ data, onEdit }: GroupsTableProps) {
  const { page, limit, search } = routeApi.useSearch();

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search) return data;
    const searchLower = search.toLowerCase();
    return data.filter(
      (item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.code.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
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
        headerName: 'عنوان گروه',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'code',
        headerName: 'کد گروه',
        flex: 1,
        minWidth: 124,
      },
      {
        field: 'description',
        headerName: 'توضیحات',
        flex: 2,
        minWidth: 472,
        renderCell: (params: GridRenderCellParams<Group, string>) => (
          <Typography
            variant="body2"
            sx={{
              fontSize: '14px',
              color: 'text.disabled',
            }}
          >
            {params.value || '-'}
          </Typography>
        ),
      },
      {
        field: 'status',
        headerName: 'وضعیت گروه',
        width: 155,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params: GridRenderCellParams<Group, 'active' | 'inactive'>) => (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <StatusBadge status={params.value || 'inactive'} />
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: 'عملیات',
        width: 128,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params: GridRenderCellParams<Group>) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <ActionButton variant="edit" onClick={() => onEdit?.(params.row.id)} />
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
        src="https://www.figma.com/api/mcp/asset/624b00c1-5f63-4745-aa84-5951dd7c4383"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
        }}
      >
        هنوز گروهی تعریف نشده
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
