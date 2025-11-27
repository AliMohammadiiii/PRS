import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { Grid, Toggle } from 'injast-core/components';
import { SearchNormal1, Add, Edit } from 'iconsax-react';
import PageHeader from '../../../../components/PageHeader';
import DataGridLoading from 'src/shared/components/DataGridLoading';
import DataGridPagination from 'src/shared/components/DataGridPagination';
import { DATAGRID_WRAPPER_MIN_HIGHT } from 'src/shared/constants';
import { Team, TeamPurchaseConfig, FormTemplate, WorkflowTemplate } from 'src/types/api/prs';
import { Lookup } from 'src/types/api/lookups';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';
import { Chip } from '@mui/material';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';
import { defaultColors } from 'injast-core/constants';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/admin/team-configs/')({
  component: TeamConfigsAdminPage,
});

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

interface ConfigWithTeam extends TeamPurchaseConfig {
  team_name?: string;
}

function TeamConfigsAdminPage() {
  const [configs, setConfigs] = useState<ConfigWithTeam[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [purchaseTypes, setPurchaseTypes] = useState<Lookup[]>([]);
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>([]);
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const [isLoadingPurchaseTypes, setIsLoadingPurchaseTypes] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ConfigWithTeam | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    team: '',
    purchase_type: '',
    form_template: '',
    workflow_template: '',
    is_active: true,
  });

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

  // Load configs
  const loadConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // If a team is selected, load configs for that team
      // Otherwise, load configs for all teams
      let allConfigs: ConfigWithTeam[] = [];
      
      if (selectedTeamId) {
        const teamConfigs = await prsApi.getTeamPurchaseConfigs(selectedTeamId);
        const team = teams.find(t => t.id === selectedTeamId);
        allConfigs = teamConfigs.map(c => ({
          ...c,
          team_name: team?.name || '',
        }));
      } else {
        // Load configs for all active teams
        const configPromises = teams.map(async (team) => {
          try {
            const teamConfigs = await prsApi.getTeamPurchaseConfigs(team.id);
            return teamConfigs.map(c => ({
              ...c,
              team_name: team.name,
            }));
          } catch {
            return [];
          }
        });
        const results = await Promise.all(configPromises);
        allConfigs = results.flat();
      }
      
      // Apply purchase type filter
      if (selectedPurchaseType) {
        allConfigs = allConfigs.filter(c => c.purchase_type.code === selectedPurchaseType);
      }
      
      setConfigs(allConfigs);
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری تنظیمات',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading configs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeamId, selectedPurchaseType, teams]);

  useEffect(() => {
    if (teams.length > 0) {
      loadConfigs();
    }
  }, [loadConfigs, teams.length]);

  // Load all templates globally (not team-specific)
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const [forms, workflows] = await Promise.all([
          prsApi.getAllFormTemplates(),
          prsApi.getAllWorkflowTemplates(), // Get all workflow templates globally
        ]);
        setFormTemplates(forms);
        setWorkflowTemplates(workflows);
      } catch (err: any) {
        logger.error('Error loading templates:', err);
        toast({
          title: 'خطا',
          description: 'خطا در بارگذاری قالب‌ها',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, []); // Load once on component mount, not dependent on team selection

  const handleResetFilters = () => {
    setSelectedTeamId('');
    setSelectedPurchaseType('');
  };

  const handleCreate = async () => {
    if (!formData.team || !formData.purchase_type || !formData.form_template || !formData.workflow_template) {
      toast({
        title: 'خطا',
        description: 'لطفا تمام فیلدهای الزامی را پر کنید',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await prsApi.createTeamPurchaseConfig({
        team: formData.team,
        purchase_type: formData.purchase_type,
        form_template: formData.form_template,
        workflow_template: formData.workflow_template,
        is_active: formData.is_active,
      });
      toast({
        title: 'موفق',
        description: 'تنظیمات با موفقیت ایجاد شد',
      });
      setCreateDialogOpen(false);
      setFormData({
        team: '',
        purchase_type: '',
        form_template: '',
        workflow_template: '',
        is_active: true,
      });
      await loadConfigs();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در ایجاد تنظیمات',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error creating config:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedConfig) return;

    try {
      setIsSubmitting(true);
      await prsApi.updateTeamPurchaseConfig(selectedConfig.id, {
        team: formData.team || undefined,
        purchase_type: formData.purchase_type || undefined,
        form_template: formData.form_template || undefined,
        workflow_template: formData.workflow_template || undefined,
        is_active: formData.is_active,
      });
      toast({
        title: 'موفق',
        description: 'تنظیمات با موفقیت به‌روزرسانی شد',
      });
      setEditDialogOpen(false);
      setSelectedConfig(null);
      setFormData({
        team: '',
        purchase_type: '',
        form_template: '',
        workflow_template: '',
        is_active: true,
      });
      await loadConfigs();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در به‌روزرسانی تنظیمات',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error updating config:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = async (config: ConfigWithTeam) => {
    setSelectedConfig(config);
    // Get team ID - it might be a string or a Team object
    const teamId = typeof config.team === 'string' ? config.team : (config.team as any)?.id || '';
    
    // Templates are already loaded globally, no need to reload

    // Find purchase type lookup ID - the config has purchase_type with id, code, title
    // We need to match by the id from the config's purchase_type object
    const purchaseTypeId = (config.purchase_type as any)?.id || '';
    
    setFormData({
      team: teamId,
      purchase_type: purchaseTypeId,
      form_template: config.form_template.id,
      workflow_template: config.workflow_template.id,
      is_active: config.is_active,
    });
    setEditDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'team_name',
      headerName: 'تیم',
      flex: 1,
      minWidth: 150,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ConfigWithTeam>) => (
        <Typography variant="body2" fontWeight={600}>
          {params.row.team_name || '-'}
        </Typography>
      ),
    },
    {
      field: 'purchase_type',
      headerName: 'نوع خرید',
      width: 140,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ConfigWithTeam>) => {
        const purchaseType = params.row.purchase_type;
        const colors = getPurchaseTypeColor(purchaseType.code);
        return (
          <Chip
            label={purchaseType.title}
            size="small"
            sx={{
              backgroundColor: colors.bg,
              color: colors.color,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        );
      },
    },
    {
      field: 'form_template',
      headerName: 'قالب فرم',
      flex: 1,
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ConfigWithTeam>) => {
        const template = params.row.form_template;
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" fontWeight={500}>
              {template.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{template.version_number}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'workflow_template',
      headerName: 'قالب گردش کار',
      flex: 1,
      minWidth: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ConfigWithTeam>) => {
        const template = params.row.workflow_template;
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" fontWeight={500}>
              {template.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              v{template.version_number}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'is_active',
      headerName: 'وضعیت',
      width: 100,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ConfigWithTeam>) => (
        <Chip
          label={params.row.is_active ? 'فعال' : 'غیرفعال'}
          color={params.row.is_active ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: 'عملیات',
      width: 100,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params: GridRenderCellParams<ConfigWithTeam>) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', width: '100%' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Edit size={16} />}
            onClick={() => openEditDialog(params.row)}
          >
            ویرایش
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="تنظیمات تیم‌ها" breadcrumb={['مدیریت', 'تنظیمات تیم‌ها']}>
        <Button
          variant="contained"
          startIcon={<Add size={20} />}
          onClick={() => {
            setFormData({
              team: '',
              purchase_type: '',
              form_template: '',
              workflow_template: '',
              is_active: true,
            });
            setCreateDialogOpen(true);
          }}
        >
          تنظیمات جدید
        </Button>
      </PageHeader>

      {/* Filters */}
      <Box sx={{ mb: 3, bgcolor: 'white', borderRadius: 2, p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>تیم</InputLabel>
              <Select
                value={selectedTeamId}
                label="تیم"
                onChange={(e) => setSelectedTeamId(e.target.value)}
                disabled={isLoadingTeams}
              >
                <MenuItem value="">همه تیم‌ها</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع خرید</InputLabel>
              <Select
                value={selectedPurchaseType}
                label="نوع خرید"
                onChange={(e) => setSelectedPurchaseType(e.target.value)}
                disabled={isLoadingPurchaseTypes}
              >
                <MenuItem value="">همه انواع</MenuItem>
                {purchaseTypes.map((type) => (
                  <MenuItem key={type.id} value={type.code}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', height: '100%' }}>
              <Typography
                variant="body2"
                color="primary"
                sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={handleResetFilters}
              >
                پاک کردن فیلترها
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Configs Table */}
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          minHeight: DATAGRID_WRAPPER_MIN_HIGHT,
        }}
      >
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <DataGridLoading />
          </Box>
        ) : configs.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">
              {selectedTeamId || selectedPurchaseType
                ? 'هیچ تنظیمی با فیلترهای انتخاب شده یافت نشد'
                : 'هیچ تنظیمی تعریف نشده است'}
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={configs}
            columns={columns}
            getRowId={(row) => row.id}
            getRowHeight={() => 'auto'}
            pageSizeOptions={[10, 25, 50, 100]}
            initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
            slots={{ pagination: DataGridPagination }}
            disableRowSelectionOnClick
            sx={{
              border: 'none',
              '& .MuiDataGrid-row': {
                minHeight: '56px !important',
              },
              '& .MuiDataGrid-cell:focus': { outline: 'none' },
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
          />
        )}
      </Box>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ایجاد تنظیمات جدید</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>تیم</InputLabel>
              <Select
                value={formData.team}
                label="تیم"
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                disabled={isSubmitting}
              >
                <MenuItem value="">انتخاب تیم</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>نوع خرید</InputLabel>
              <Select
                value={formData.purchase_type}
                label="نوع خرید"
                onChange={(e) => setFormData({ ...formData, purchase_type: e.target.value })}
                disabled={isSubmitting || isLoadingPurchaseTypes}
              >
                <MenuItem value="">انتخاب نوع خرید</MenuItem>
                {purchaseTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>قالب فرم</InputLabel>
              <Select
                value={formData.form_template}
                label="قالب فرم"
                onChange={(e) => setFormData({ ...formData, form_template: e.target.value })}
                disabled={isSubmitting || isLoadingTemplates}
              >
                <MenuItem value="">انتخاب قالب فرم</MenuItem>
                {formTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} (v{template.version_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>قالب گردش کار</InputLabel>
              <Select
                value={formData.workflow_template}
                label="قالب گردش کار"
                onChange={(e) => setFormData({ ...formData, workflow_template: e.target.value })}
                disabled={isSubmitting || isLoadingTemplates}
              >
                <MenuItem value="">انتخاب قالب گردش کار</MenuItem>
                {workflowTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} (v{template.version_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">فعال:</Typography>
              <Toggle
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                disabled={isSubmitting}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleCreate} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={20} /> : 'ایجاد'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ویرایش تنظیمات</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>تیم</InputLabel>
              <Select
                value={formData.team}
                label="تیم"
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                disabled={isSubmitting}
              >
                <MenuItem value="">انتخاب تیم</MenuItem>
                {teams.map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>نوع خرید</InputLabel>
              <Select
                value={formData.purchase_type}
                label="نوع خرید"
                onChange={(e) => setFormData({ ...formData, purchase_type: e.target.value })}
                disabled={isSubmitting || isLoadingPurchaseTypes}
              >
                <MenuItem value="">انتخاب نوع خرید</MenuItem>
                {purchaseTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>قالب فرم</InputLabel>
              <Select
                value={formData.form_template}
                label="قالب فرم"
                onChange={(e) => setFormData({ ...formData, form_template: e.target.value })}
                disabled={isSubmitting || isLoadingTemplates}
              >
                <MenuItem value="">انتخاب قالب فرم</MenuItem>
                {formTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} (v{template.version_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>قالب گردش کار</InputLabel>
              <Select
                value={formData.workflow_template}
                label="قالب گردش کار"
                onChange={(e) => setFormData({ ...formData, workflow_template: e.target.value })}
                disabled={isSubmitting || isLoadingTemplates}
              >
                <MenuItem value="">انتخاب قالب گردش کار</MenuItem>
                {workflowTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} (v{template.version_number})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2">فعال:</Typography>
              <Toggle
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
                disabled={isSubmitting}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleUpdate} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
