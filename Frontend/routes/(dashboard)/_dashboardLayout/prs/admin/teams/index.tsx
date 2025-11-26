import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { SearchNormal1, Add, Edit } from 'iconsax-react';
import { Power } from 'lucide-react';
import PageHeader from '../../../../components/PageHeader';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { Team } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';
import { Chip } from '@mui/material';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/admin/teams/')({
  component: TeamsAdminPage,
});

function TeamsAdminPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (searchValue) {
        params.search = searchValue;
      }
      const data = await prsApi.getTeams();
      setTeams(data.filter(t => !searchValue || t.name.toLowerCase().includes(searchValue.toLowerCase())));
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری تیم‌ها',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading teams:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchValue]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'خطا',
        description: 'نام تیم الزامی است',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await prsApi.createTeam({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      toast({
        title: 'موفق',
        description: 'تیم با موفقیت ایجاد شد',
      });
      setCreateDialogOpen(false);
      setFormData({ name: '', description: '' });
      await loadTeams();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در ایجاد تیم',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error creating team:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTeam || !formData.name.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await prsApi.updateTeam(selectedTeam.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
      toast({
        title: 'موفق',
        description: 'تیم با موفقیت به‌روزرسانی شد',
      });
      setEditDialogOpen(false);
      setSelectedTeam(null);
      setFormData({ name: '', description: '' });
      await loadTeams();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در به‌روزرسانی تیم',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error updating team:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedTeam) return;

    try {
      setIsSubmitting(true);
      if (selectedTeam.is_active) {
        await prsApi.deactivateTeam(selectedTeam.id);
        toast({
          title: 'موفق',
          description: 'تیم با موفقیت غیرفعال شد',
        });
      } else {
        await prsApi.activateTeam(selectedTeam.id);
        toast({
          title: 'موفق',
          description: 'تیم با موفقیت فعال شد',
        });
      }
      setDeactivateDialogOpen(false);
      setSelectedTeam(null);
      await loadTeams();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error deactivating team:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
    });
    setEditDialogOpen(true);
  };

  const openDeactivateDialog = (team: Team) => {
    setSelectedTeam(team);
    setDeactivateDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: 'نام تیم',
      flex: 1,
      minWidth: 200,
      align: 'center',
      headerAlign: 'center',
    },
    {
      field: 'description',
      headerName: 'توضیحات',
      flex: 2,
      minWidth: 300,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Team, string>) => (
        <Typography variant="body2" sx={{ color: params.value ? 'text.primary' : 'text.secondary', textAlign: 'center', width: '100%' }}>
          {params.value || 'ـــ'}
        </Typography>
      ),
    },
    {
      field: 'is_active',
      headerName: 'وضعیت',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Team, boolean>) => (
        <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <Chip
            label={params.value ? 'فعال' : 'غیرفعال'}
            color={params.value ? 'success' : 'default'}
            size="small"
          />
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'عملیات',
      width: 200,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<Team>) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', width: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit size={16} />}
            onClick={() => openEditDialog(params.row)}
          >
            ویرایش
          </Button>
          <Button
            size="small"
            variant="outlined"
            color={params.row.is_active ? 'warning' : 'success'}
            startIcon={<Power size={16} />}
            onClick={() => openDeactivateDialog(params.row)}
          >
            {params.row.is_active ? 'غیرفعال' : 'فعال'}
          </Button>
        </Box>
      ),
    },
  ];

  const rows = teams.map(team => ({ ...team, id: team.id }));

  return (
    <>
      <PageHeader title="مدیریت تیم‌ها" breadcrumb={['مدیریت', 'تیم‌ها']}>
        <Button
          variant="contained"
          startIcon={<Add size={20} />}
          onClick={() => {
            setFormData({ name: '', description: '' });
            setCreateDialogOpen(true);
          }}
        >
          تیم جدید
        </Button>
      </PageHeader>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="جستجوی تیم..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          InputProps={{
            startAdornment: <SearchNormal1 size={20} style={{ marginRight: 8 }} />,
          }}
        />
      </Box>

      {/* Teams Table */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          minHeight: DATAGRID_WRAPPER_MIN_HIGHT,
        }}
      >
        {isLoading ? (
          <DataGridLoading />
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            slots={{ pagination: DataGridPagination }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
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
          />
        )}
      </Box>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ایجاد تیم جدید</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام تیم *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 2 }}
            required
          />
          <TextField
            fullWidth
            label="توضیحات"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={isSubmitting}>
            ایجاد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ویرایش تیم</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام تیم *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2, mt: 2 }}
            required
          />
          <TextField
            fullWidth
            label="توضیحات"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleUpdate} variant="contained" disabled={isSubmitting}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={deactivateDialogOpen} onClose={() => setDeactivateDialogOpen(false)} maxWidth="sm">
        <DialogTitle>
          {selectedTeam?.is_active ? 'غیرفعال کردن تیم' : 'فعال کردن تیم'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            آیا مطمئن هستید که می‌خواهید تیم "{selectedTeam?.name}" را{' '}
            {selectedTeam?.is_active ? 'غیرفعال' : 'فعال'} کنید؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeactivateDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button
            onClick={handleDeactivate}
            variant="contained"
            color={selectedTeam?.is_active ? 'warning' : 'success'}
            disabled={isSubmitting}
          >
            {selectedTeam?.is_active ? 'غیرفعال' : 'فعال'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

