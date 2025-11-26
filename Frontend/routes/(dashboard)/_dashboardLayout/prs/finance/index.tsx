import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { SearchNormal1 } from 'iconsax-reactjs';
import PageHeader from '../../../components/PageHeader';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { PurchaseRequest, PrsFinanceInboxFilters, Team } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage, getPrsStatusColors } from 'src/shared/utils/prsUtils';
import { Chip } from '@mui/material';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/finance/')({
  component: FinanceInboxPage,
});

function FinanceInboxPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [filters, setFilters] = useState<PrsFinanceInboxFilters>({});
  const [vendorSearch, setVendorSearch] = useState('');

  // Load teams for filter
  useEffect(() => {
    const loadTeams = async () => {
      try {
        setIsLoadingTeams(true);
        const data = await prsApi.getTeams();
        setTeams(data.filter(team => team.is_active));
      } catch (err: any) {
        logger.error('Error loading teams:', err);
      } finally {
        setIsLoadingTeams(false);
      }
    };
    loadTeams();
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await prsApi.getFinanceInbox(filters);
      setRequests(data);
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری درخواست‌ها',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading finance inbox:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleFilterChange = (key: keyof PrsFinanceInboxFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleVendorSearch = () => {
    handleFilterChange('vendor', vendorSearch || undefined);
  };

  const handleResetFilters = () => {
    setFilters({});
    setVendorSearch('');
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'شناسه',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', textAlign: 'center', width: '100%' }}>
          {params.value.substring(0, 8)}
        </Typography>
      ),
    },
    {
      field: 'team',
      headerName: 'تیم',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => (
        <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>{params.row.team.name}</Typography>
      ),
    },
    {
      field: 'vendor_name',
      headerName: 'فروشنده',
      width: 200,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'subject',
      headerName: 'موضوع',
      width: 250,
      flex: 1,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'status',
      headerName: 'وضعیت',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => {
        const statusCode = params.row.status.code;
        const statusLabel = params.row.status.title;
        const colors = getPrsStatusColors(statusCode);
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Chip
              label={statusLabel}
              size="small"
              sx={{
                backgroundColor: colors.bg,
                color: colors.color,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          </Box>
        );
      },
    },
    {
      field: 'current_step_name',
      headerName: 'مرحله فعلی',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => (
        <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>
          {params.row.current_step_name || '-'}
        </Typography>
      ),
    },
    {
      field: 'submitted_at',
      headerName: 'تاریخ ارسال',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => (
        <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>
          {params.row.submitted_at
            ? new Date(params.row.submitted_at).toLocaleDateString('fa-IR')
            : '-'}
        </Typography>
      ),
    },
  ];

  const handleRowClick = (params: any) => {
    navigate({
      to: '/prs/requests/$requestId',
      params: { requestId: params.row.id },
      search: { from: 'finance' },
    });
  };

  // Refresh when page comes into focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadRequests();
      }
    };

    const handleFocus = () => {
      loadRequests();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadRequests]);

  if (isLoading && requests.length === 0) {
    return (
      <>
        <PageHeader
          title="صندوق ورودی مالی"
          breadcrumb={['درخواست‌های خرید', 'صندوق ورودی مالی']}
        />
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2,
            px: 3,
            py: 4,
            mt: 3,
            minHeight: DATAGRID_WRAPPER_MIN_HIGHT,
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </Box>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title="صندوق ورودی مالی"
        breadcrumb={['درخواست‌های خرید', 'صندوق ورودی مالی']}
      />
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 3,
          py: 4,
          mt: 3,
          minHeight: DATAGRID_WRAPPER_MIN_HIGHT,
        }}
      >
        {/* Filter Bar */}
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <Grid size={12} md={3}>
              <Select
                fullWidth
                height={48}
                value={filters.teamId || ''}
                onChange={(e) => handleFilterChange('teamId', e.target.value)}
                placeholder="انتخاب تیم"
                size="small"
                disabled={isLoadingTeams}
              >
                <MenuItem value="">همه تیم‌ها</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid size={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  height={48}
                  size="small"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleVendorSearch();
                    }
                  }}
                  placeholder="جستجوی فروشنده"
                  startAdornment={
                    <SearchNormal1
                      size={20}
                      color={defaultColors.neutral.light}
                    />
                  }
                />
                <Button
                  variant="contained"
                  color="primary"
                  buttonSize="M"
                  onClick={handleVendorSearch}
                >
                  جستجو
                </Button>
              </Box>
            </Grid>
            <Grid size={12} md={3}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  height={48}
                  size="small"
                  type="date"
                  value={filters.createdFrom || ''}
                  onChange={(e) => handleFilterChange('createdFrom', e.target.value || undefined)}
                  label="از تاریخ"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  fullWidth
                  height={48}
                  size="small"
                  type="date"
                  value={filters.createdTo || ''}
                  onChange={(e) => handleFilterChange('createdTo', e.target.value || undefined)}
                  label="تا تاریخ"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Grid>
            <Grid size={12} md={3}>
              <Button
                variant="outlined"
                color="primary"
                buttonSize="M"
                onClick={handleResetFilters}
              >
                پاک کردن فیلترها
              </Button>
            </Grid>
          </Grid>
        </Box>

        {requests.length === 0 && !isLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              در حال حاضر درخواستی برای بررسی مالی وجود ندارد
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={requests}
            columns={columns}
            getRowId={(row) => row.id}
            onRowClick={handleRowClick}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-row': {
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: defaultColors.neutral[50],
                },
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              },
              '& .MuiDataGrid-columnHeaders': {
                '& .MuiDataGrid-columnHeader': {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
              },
            }}
            slots={{
              loadingOverlay: DataGridLoading,
              pagination: DataGridPagination,
            }}
            loading={isLoading}
            autoHeight
            hideFooterSelectedRowCount
          />
        )}
      </Box>
    </>
  );
}

