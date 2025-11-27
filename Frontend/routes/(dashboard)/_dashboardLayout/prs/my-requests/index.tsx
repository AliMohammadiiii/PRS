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
import { SearchNormal1, Add } from 'iconsax-reactjs';
import PageHeader from '../../../components/PageHeader';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { PurchaseRequest, PrsMyRequestsFilters, Team } from 'src/types/api/prs';
import { Lookup } from 'src/types/api/lookups';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';
import { Chip } from '@mui/material';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage, hasRole } from 'src/shared/utils/prsUtils';
import { useAuth } from 'src/client/contexts/AuthContext';
import { PersianDatePicker } from '@/components/ui/persian-date-picker';

// Purchase type badge colors
const getPurchaseTypeColor = (code: string) => {
  switch (code) {
    case 'GOODS':
      return { bg: '#E3F2FD', color: '#1565C0' };
    case 'SERVICE':
      return { bg: '#FFF8E1', color: '#F57F17' };
    default:
      return { bg: '#F5F5F5', color: '#616161' };
  }
};

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/my-requests/')({
  component: MyRequestsPage,
});

// Status options with labels
const STATUS_OPTIONS = [
  { code: 'DRAFT', label: 'پیش‌نویس' },
  { code: 'PENDING_APPROVAL', label: 'در انتظار تایید' },
  { code: 'IN_REVIEW', label: 'در حال بررسی' },
  { code: 'REJECTED', label: 'رد شده' },
  { code: 'RESUBMITTED', label: 'ارسال مجدد' },
  { code: 'FINANCE_REVIEW', label: 'بررسی مالی' },
  { code: 'COMPLETED', label: 'تکمیل شده' },
];

// Status badge colors
const getStatusColor = (statusCode: string) => {
  switch (statusCode) {
    case 'DRAFT':
      return { bg: '#E3F2FD', color: '#1976D2' };
    case 'PENDING_APPROVAL':
      return { bg: '#FFF3E0', color: '#F57C00' };
    case 'IN_REVIEW':
      return { bg: '#E1F5FE', color: '#0288D1' };
    case 'REJECTED':
      return { bg: '#FFEBEE', color: '#D32F2F' };
    case 'RESUBMITTED':
      return { bg: '#F3E5F5', color: '#7B1FA2' };
    case 'FINANCE_REVIEW':
      return { bg: '#E8F5E9', color: '#388E3C' };
    case 'COMPLETED':
      return { bg: '#E8F5E9', color: '#2E7D32' };
    default:
      return { bg: '#F5F5F5', color: '#616161' };
  }
};

function MyRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [purchaseTypes, setPurchaseTypes] = useState<Lookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingPurchaseTypes, setIsLoadingPurchaseTypes] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<PrsMyRequestsFilters>({
    page: 1,
  });
  const [vendorSearch, setVendorSearch] = useState('');

  const isAdmin =
    (user?.is_admin ?? false) || (!!user && hasRole(user, 'ADMIN'));

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

  // Load purchase types for filter
  useEffect(() => {
    const loadPurchaseTypes = async () => {
      try {
        setIsLoadingPurchaseTypes(true);
        const data = await prsApi.fetchPurchaseTypes();
        setPurchaseTypes(data);
      } catch (err: any) {
        logger.error('Error loading purchase types:', err);
      } finally {
        setIsLoadingPurchaseTypes(false);
      }
    };
    loadPurchaseTypes();
  }, []);

  // Load requests
  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = isAdmin
        ? await prsApi.fetchAllRequests(filters)
        : await prsApi.fetchMyRequests(filters);
      // Handle both paginated response (with results/count) and non-paginated array response
      let safeResults: PurchaseRequest[] = [];
      let total = 0;
      
      if (Array.isArray(response)) {
        // Non-paginated response (array)
        safeResults = response;
        total = response.length;
      } else if (response && typeof response === 'object') {
        // Paginated response (object with results and count)
        safeResults = Array.isArray(response.results) ? response.results : [];
        total = typeof response.count === 'number' ? response.count : safeResults.length;
      }
      
      setRequests(safeResults);
      setTotalCount(total);
      
      // Log for debugging
      if (safeResults.length === 0) {
        logger.warn('No requests found for current user', { filters, response });
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری درخواست‌ها',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading my requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isAdmin]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleFilterChange = (key: keyof PrsMyRequestsFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handleVendorSearch = () => {
    handleFilterChange('vendor', vendorSearch || undefined);
  };

  const handleResetFilters = () => {
    setFilters({ page: 1 });
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
      field: 'purchase_type',
      headerName: 'نوع خرید',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => {
        const purchaseType = params.row.purchase_type;
        if (!purchaseType) return '-';
        const colors = getPurchaseTypeColor(purchaseType.code);
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <Chip
              label={purchaseType.title}
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
      field: 'status',
      headerName: 'وضعیت',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => {
        const statusCode = params.row.status.code;
        const statusLabel = params.row.status.title;
        const colors = getStatusColor(statusCode);
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
      field: 'effective_step_name',
      headerName: 'مرحله فعلی',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => (
        <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>
          {params.row.effective_step_name || params.row.current_step_name || params.row.current_template_step_name || '-'}
        </Typography>
      ),
    },
    {
      field: 'created_at',
      headerName: 'تاریخ ایجاد',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => (
        <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>
          {params.row.created_at
            ? new Date(params.row.created_at).toLocaleDateString('fa-IR')
            : '-'}
        </Typography>
      ),
    },
    {
      field: 'updated_at',
      headerName: 'آخرین بروزرسانی',
      width: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<PurchaseRequest>) => (
        <Typography variant="body2" sx={{ textAlign: 'center', width: '100%' }}>
          {params.row.updated_at
            ? new Date(params.row.updated_at).toLocaleDateString('fa-IR')
            : '-'}
        </Typography>
      ),
    },
  ];

  const handleRowClick = (params: any) => {
    navigate({
      to: '/prs/requests/$requestId',
      params: { requestId: params.row.id },
    });
  };

  if (isLoading && requests.length === 0) {
    return (
      <>
        <PageHeader
          title={isAdmin ? 'همه درخواست‌ها' : 'درخواست‌های من'}
          breadcrumb={[
            'درخواست‌های خرید',
            isAdmin ? 'همه درخواست‌ها' : 'درخواست‌های من',
          ]}
        >
          <Button
            variant="contained"
            color="primary"
            buttonSize="M"
            startIcon={<Add size={20} />}
            onClick={() => navigate({ to: '/prs/requests/new' })}
          >
            درخواست جدید
          </Button>
        </PageHeader>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400, mt: 3 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }


  return (
    <>
      <PageHeader
        title={isAdmin ? 'همه درخواست‌ها' : 'درخواست‌های من'}
        breadcrumb={[
          'درخواست‌های خرید',
          isAdmin ? 'همه درخواست‌ها' : 'درخواست‌های من',
        ]}
      >
        <Button
          variant="contained"
          color="primary"
          buttonSize="M"
          startIcon={<Add size={20} />}
          onClick={() => navigate({ to: '/prs/requests/new' })}
        >
          درخواست جدید
        </Button>
      </PageHeader>

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
            <Grid size={12} md={2}>
              <Select
                fullWidth
                height={48}
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                placeholder="انتخاب وضعیت"
                size="small"
              >
                <MenuItem value="">همه وضعیت‌ها</MenuItem>
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status.code} value={status.code}>
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid size={12} md={2}>
              <Select
                fullWidth
                height={48}
                value={filters.purchaseType || ''}
                onChange={(e) => handleFilterChange('purchaseType', e.target.value)}
                placeholder="نوع خرید"
                size="small"
                disabled={isLoadingPurchaseTypes}
              >
                <MenuItem value="">همه انواع</MenuItem>
                {purchaseTypes.map((type) => (
                  <MenuItem key={type.id} value={type.code}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid size={12} md={2}>
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
                <PersianDatePicker
                  fullWidth
                  height={48}
                  size="small"
                  value={filters.createdFrom || null}
                  onChange={(value) => handleFilterChange('createdFrom', value || undefined)}
                  label="از تاریخ"
                  InputLabelProps={{ shrink: true }}
                />
                <PersianDatePicker
                  fullWidth
                  height={48}
                  size="small"
                  value={filters.createdTo || null}
                  onChange={(value) => handleFilterChange('createdTo', value || undefined)}
                  label="تا تاریخ"
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Grid>
            <Grid size={12}>
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

        {/* Table */}
        {requests.length === 0 && !isLoading ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              هنوز هیچ درخواست خریدی ثبت نکرده‌اید
            </Typography>
            <Button
              variant="contained"
              color="primary"
              buttonSize="M"
              startIcon={<Add size={20} />}
              onClick={() => navigate({ to: '/prs/requests/new' })}
            >
              ثبت درخواست جدید
            </Button>
          </Box>
        ) : (
          <DataGrid
            rows={requests}
            columns={columns}
            getRowId={(row) => row.id}
            getRowHeight={() => 'auto'}
            onRowClick={handleRowClick}
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-row': {
                minHeight: '56px !important',
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
                whiteSpace: 'normal',
                wordWrap: 'break-word',
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
            rowCount={totalCount}
            paginationMode="server"
            page={filters.page ? filters.page - 1 : 0}
            onPaginationModelChange={(model) => {
              handleFilterChange('page', model.page + 1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 25 },
              },
            }}
          />
        )}
      </Box>
    </>
  );
}

