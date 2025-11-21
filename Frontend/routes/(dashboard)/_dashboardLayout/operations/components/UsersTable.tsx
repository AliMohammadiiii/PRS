import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { getRouteApi } from '@tanstack/react-router';
import { Box } from '@mui/material';
import { FC, useMemo, useState } from 'react';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { User, Organization } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';

const routeApi = getRouteApi('/(dashboard)/_dashboardLayout/operations/');

type UsersTableProps = {
  users: User[];
  organizations: Organization[];
  roles: BasicInfoItem[];
  onEdit: (id: string) => void;
};

export function UsersTable({
  users,
  organizations,
  roles,
  onEdit,
}: UsersTableProps) {
  const { page, limit, search } = routeApi.useSearch();

  const getOrganizationName = (organizationId?: string) => {
    if (!organizationId) return 'ـــ';
    const org = organizations.find((o) => o.id === organizationId);
    return org?.name || 'ـــ';
  };

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.title || roleId;
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.nationalId.toLowerCase().includes(searchLower) ||
        getRoleName(user.role).toLowerCase().includes(searchLower) ||
        getOrganizationName(user.organizationId).toLowerCase().includes(searchLower)
    );
  }, [users, search, organizations, roles]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredData.slice(start, end);
  }, [filteredData, page, limit]);

  // Prepare rows with id
  const rows = useMemo(
    () =>
      paginatedData.map((user) => ({
        ...user,
        id: user.id,
      })),
    [paginatedData]
  );

  const createTableCols = (): GridColDef[] => {
    return [
      {
        field: 'name',
        headerName: 'نام و نام خانوادگی',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'nationalId',
        headerName: 'شناسه ملی',
        flex: 1,
        minWidth: 150,
      },
      {
        field: 'role',
        headerName: 'سمت',
        flex: 1,
        minWidth: 150,
        renderCell: (params: GridRenderCellParams<User, string>) => (
          <Box sx={{ fontSize: '14px', fontWeight: 500 }}>
            {getRoleName(params.value || '')}
          </Box>
        ),
      },
      {
        field: 'organizationId',
        headerName: 'نام سازمان',
        flex: 1,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<User, string | undefined>) => (
          <Box sx={{ fontSize: '14px', fontWeight: 500 }}>
            {getOrganizationName(params.value)}
          </Box>
        ),
      },
      {
        field: 'isActive',
        headerName: 'وضعیت',
        width: 120,
        align: 'center',
        headerAlign: 'center',
        renderCell: (params: GridRenderCellParams<User, boolean>) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <StatusBadge status={params.value ? 'active' : 'inactive'} />
          </Box>
        ),
      },
      {
        field: 'actions',
        headerName: 'ویرایش',
        width: 100,
        align: 'center',
        headerAlign: 'center',
        sortable: false,
        renderCell: (params: GridRenderCellParams<User>) => (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <ActionButton variant="edit" onClick={() => onEdit(params.row.id)} />
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
        src="https://www.figma.com/api/mcp/asset/43cda013-ab5a-427c-af5c-77ae0a518f5e"
        alt="Empty state"
        sx={{ width: 105, height: 58 }}
      />
      <Box
        component="p"
        sx={{
          color: 'neutral.main',
          fontSize: '14px',
          textAlign: 'center',
        }}
      >
        هیچ کاربری تعریف نشده است
      </Box>
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
  );
}
