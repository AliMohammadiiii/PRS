import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { getRouteApi } from '@tanstack/react-router';
import { Box } from '@mui/material';
import { useMemo, useState } from 'react';
import ContentBox from 'src/shared/components/ContentBox';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { User } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import { ActionButton } from '@/components/FieldTable/ActionButton';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';

const routeApi = getRouteApi('/(dashboard)/_dashboardLayout/operations/');

type UsersTableProps = {
  users: User[];
  roles: BasicInfoItem[];
  teams: Array<{ id: string; name: string }>;
  onEdit: (id: string) => void;
};

export function UsersTable({
  users,
  roles,
  teams,
  onEdit,
}: UsersTableProps) {
  const { page, limit, search } = routeApi.useSearch();

  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId);
    return role?.title || roleId;
  };

  const getUserAssignmentsSummary = (user: User): string => {
    if (!user.assignments || user.assignments.length === 0) {
      // Fallback to legacy single role/team fields
      const roleTitle = user.role ? getRoleName(user.role) : '';
      const teamName = user.teamName || '';
      if (!roleTitle && !teamName) return '';
      if (!teamName) return roleTitle;
      if (!roleTitle) return teamName;
      return `${teamName} - ${roleTitle}`;
    }

    // Check if user has the same role in ALL teams (not just multiple teams)
    const uniqueRoles = new Set(user.assignments.map(a => a.roleId));
    const uniqueTeamIds = new Set(user.assignments.map(a => a.teamId).filter(Boolean));
    const allTeamIds = new Set(teams.map(t => t.id));
    
    // Only show "همه تیم‌ها" if:
    // 1. User has only one unique role
    // 2. User has assignments for ALL teams
    // 3. Number of assignments equals number of teams
    if (
      uniqueRoles.size === 1 && 
      uniqueTeamIds.size === allTeamIds.size &&
      user.assignments.length === teams.length &&
      teams.length > 1
    ) {
      // Same role across ALL teams - show "all teams"
      const roleTitle = user.assignments[0].roleTitle || getRoleName(user.assignments[0].roleId);
      if (roleTitle) {
        return `همه تیم‌ها - ${roleTitle}`;
      }
    }

    // Otherwise, show individual team/role assignments
    return user.assignments
      .map((a) => {
        const roleTitle = a.roleTitle || getRoleName(a.roleId);
        const teamName = a.teamName || 'ـــ';
        if (!roleTitle) return teamName;
        return `${teamName} - ${roleTitle}`;
      })
      .join('، ');
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!search) return users;
    const searchLower = search.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(searchLower) ||
        (user.username || '').toLowerCase().includes(searchLower) ||
        user.nationalId.toLowerCase().includes(searchLower) ||
        // Match against any role/team assignment text
        getUserAssignmentsSummary(user).toLowerCase().includes(searchLower)
    );
  }, [users, search, roles]);

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
        minWidth: 100,
      },
      {
        field: 'username',
        headerName: 'نام کاربری',
        flex: 1,
        minWidth: 100,
      },
      {
        field: 'nationalId',
        headerName: 'شناسه ملی',
        flex: 1,
        minWidth: 20,
      },
      {
        field: 'role',
        headerName: 'تیم / سمت‌ها',
        flex: 2,
        minWidth: 600,
        align: 'left',
        headerAlign: 'left',
        renderCell: (params: GridRenderCellParams<User, string>) => {
          const user = params.row;
          const assignments = user.assignments || [];
          
          if (assignments.length === 0) {
            // Fallback to legacy single role/team fields
            const roleTitle = user.role ? getRoleName(user.role) : '';
            const teamName = user.teamName || '';
            if (!roleTitle && !teamName) return <Box sx={{ fontSize: '14px', color: 'neutral.light' }}>ـــ</Box>;
            return (
              <Box
                sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  wordBreak: 'break-word',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.5,
                }}
              >
                {teamName && roleTitle ? `${teamName} - ${roleTitle}` : roleTitle || teamName}
              </Box>
            );
          }

          const summary = getUserAssignmentsSummary(user);

          return (
            <Box
              sx={{
                fontSize: '14px',
                fontWeight: 500,
                wordBreak: 'break-word',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                lineHeight: 1.5,
                maxHeight: '4.5em',
                width: '100%',
              }}
            >
              {summary}
            </Box>
          );
        },
      },
      {
        field: 'isActive',
        headerName: 'وضعیت',
        width: 100,
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
              overflow: 'visible',
              whiteSpace: 'normal',
              wordWrap: 'break-word',
            },
            '& .MuiDataGrid-cell[data-field="role"]': {
              alignItems: 'flex-start',
              paddingTop: '12px',
              paddingBottom: '12px',
              textAlign: 'left',
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
