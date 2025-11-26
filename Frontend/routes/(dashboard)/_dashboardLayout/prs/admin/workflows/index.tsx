import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Autocomplete,
  Checkbox,
} from '@mui/material';
import { Add, Edit, Delete, ArrowUp, ArrowDown, TickCircle } from 'iconsax-react';
import PageHeader from '../../../../components/PageHeader';
import { Team, Workflow, WorkflowStep, WorkflowStepApprover } from 'src/types/api/prs';
import { User } from 'src/types/api/users';
import * as prsApi from 'src/services/api/prs';
import * as userApi from 'src/services/api/users';
import logger from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/admin/workflows/')({
  component: WorkflowsAdminPage,
});

function WorkflowsAdminPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepFormData, setStepFormData] = useState({
    step_name: '',
    step_order: 1,
    is_finance_review: false,
    approver_ids: [] as string[],
  });

  const loadTeams = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await prsApi.getTeams();
      setTeams(data.filter(t => t.is_active));
      if (data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0].id);
      }
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
  }, [selectedTeam]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await userApi.getUsers();
      setUsers(data.filter(u => u.is_active));
    } catch (err: any) {
      logger.error('Error loading users:', err);
    }
  }, []);

  const loadWorkflow = useCallback(async () => {
    if (!selectedTeam) {
      setWorkflow(null);
      return;
    }

    try {
      setIsLoading(true);
      const data = await prsApi.getWorkflowByTeam(selectedTeam);
      setWorkflow(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setWorkflow(null);
      } else {
        const errorMessage = extractErrorMessage(err);
        toast({
          title: 'خطا در بارگذاری گردش کار',
          description: errorMessage,
          variant: 'destructive',
        });
        logger.error('Error loading workflow:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, [loadTeams, loadUsers]);

  useEffect(() => {
    if (selectedTeam) {
      loadWorkflow();
    }
  }, [selectedTeam, loadWorkflow]);

  const handleCreateWorkflow = async () => {
    if (!selectedTeam) return;

    try {
      setIsSubmitting(true);
      await prsApi.createWorkflow({
        team: selectedTeam,
        name: `Workflow for ${teams.find(t => t.id === selectedTeam)?.name}`,
        steps: [],
      });
      toast({
        title: 'موفق',
        description: 'گردش کار با موفقیت ایجاد شد. حالا می‌توانید مراحل را اضافه کنید.',
      });
      await loadWorkflow();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در ایجاد گردش کار',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error creating workflow:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStep = () => {
    if (!workflow) return;
    
    const nextOrder = workflow.steps.length > 0 
      ? Math.max(...workflow.steps.map(s => s.step_order)) + 1 
      : 1;
    
    setStepFormData({
      step_name: '',
      step_order: nextOrder,
      is_finance_review: false,
      approver_ids: [],
    });
    setEditingStep(null);
    setStepDialogOpen(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setStepFormData({
      step_name: step.step_name,
      step_order: step.step_order,
      is_finance_review: step.is_finance_review,
      approver_ids: step.approvers.map(a => a.approver),
    });
    setEditingStep(step);
    setStepDialogOpen(true);
  };

  const handleSaveWorkflow = async () => {
    if (!workflow) return;

    try {
      setIsSubmitting(true);
      
      const sortedSteps = [...workflow.steps].sort((a, b) => a.step_order - b.step_order);
      const updatedSteps = editingStep
        ? sortedSteps.map(s => 
            s.id === editingStep.id
              ? {
                  step_name: stepFormData.step_name,
                  step_order: stepFormData.step_order,
                  is_finance_review: stepFormData.is_finance_review,
                  approver_ids: stepFormData.approver_ids,
                }
              : {
                  step_name: s.step_name,
                  step_order: s.step_order,
                  is_finance_review: s.is_finance_review,
                  approver_ids: s.approvers.map(a => a.approver),
                }
          )
        : [
            ...sortedSteps.map(s => ({
              step_name: s.step_name,
              step_order: s.step_order,
              is_finance_review: s.is_finance_review,
              approver_ids: s.approvers.map(a => a.approver),
            })),
            {
              step_name: stepFormData.step_name,
              step_order: stepFormData.step_order,
              is_finance_review: stepFormData.is_finance_review,
              approver_ids: stepFormData.approver_ids,
            },
          ];

      await prsApi.updateWorkflow(workflow.id, {
        team: typeof workflow.team === 'string' ? workflow.team : workflow.team.id,
        name: workflow.name,
        steps: updatedSteps,
      });

      toast({
        title: 'موفق',
        description: editingStep ? 'مرحله با موفقیت به‌روزرسانی شد' : 'مرحله با موفقیت اضافه شد',
      });
      setStepDialogOpen(false);
      await loadWorkflow();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error saving workflow:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedSteps = workflow ? [...workflow.steps].sort((a, b) => a.step_order - b.step_order) : [];
  const hasFinanceStep = sortedSteps.some(s => s.is_finance_review);

  return (
    <>
      <PageHeader title="مدیریت گردش‌های کار" breadcrumb={['مدیریت', 'گردش‌های کار']} />

      {/* Team Selector */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>تیم</InputLabel>
          <Select
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(e.target.value)}
            label="تیم"
          >
            {teams.map((team) => (
              <MenuItem key={team.id} value={team.id}>
                {team.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : !workflow ? (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            این تیم هنوز گردش کار ندارد
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add size={20} />}
            onClick={handleCreateWorkflow}
            disabled={isSubmitting || !selectedTeam}
          >
            ایجاد گردش کار
          </Button>
        </Box>
      ) : (
        <>
          {/* Workflow Info */}
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              p: 3,
              mb: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">{workflow.name}</Typography>
              <Chip
                label={workflow.is_active ? 'فعال' : 'غیرفعال'}
                color={workflow.is_active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {/* Steps List */}
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">مراحل گردش کار</Typography>
              <Button
                variant="contained"
                startIcon={<Add size={20} />}
                onClick={handleAddStep}
              >
                افزودن مرحله
              </Button>
            </Box>

            {sortedSteps.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                هنوز مرحله‌ای اضافه نشده است
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sortedSteps.map((step, index) => (
                  <Box
                    key={step.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
                          <Typography sx={{ minWidth: 40, textAlign: 'center', fontWeight: 'bold' }}>
                            {step.step_order}
                          </Typography>
                          <Typography variant="subtitle1">{step.step_name}</Typography>
                          {step.is_finance_review && (
                            <Chip
                              label="مرحله مالی"
                              size="small"
                              color="primary"
                              icon={<TickCircle size={16} />}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mr: 6 }}>
                          تأییدکنندگان: {step.approvers.length > 0
                            ? step.approvers.map(a => a.approver_username).join(', ')
                            : 'هیچ‌کدام'}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        startIcon={<Edit size={16} />}
                        onClick={() => handleEditStep(step)}
                      >
                        ویرایش
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {!hasFinanceStep && sortedSteps.length > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
                <Typography variant="body2" color="warning.dark">
                  هشدار: باید حداقل یک مرحله مالی تعریف شود
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Step Dialog */}
      <Dialog open={stepDialogOpen} onClose={() => setStepDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingStep ? 'ویرایش مرحله' : 'افزودن مرحله جدید'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام مرحله *"
            value={stepFormData.step_name}
            onChange={(e) => setStepFormData({ ...stepFormData, step_name: e.target.value })}
            sx={{ mb: 2, mt: 2 }}
            required
          />
          <TextField
            fullWidth
            label="ترتیب *"
            type="number"
            value={stepFormData.step_order}
            onChange={(e) => setStepFormData({ ...stepFormData, step_order: parseInt(e.target.value) || 1 })}
            sx={{ mb: 2 }}
            required
            inputProps={{ min: 1 }}
          />
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={stepFormData.is_finance_review}
              onChange={(e) => setStepFormData({ ...stepFormData, is_finance_review: e.target.checked })}
            />
            <Typography>مرحله مالی</Typography>
          </Box>
          <Autocomplete
            multiple
            options={users}
            getOptionLabel={(option) => `${option.first_name || ''} ${option.last_name || ''}`.trim() || option.username}
            value={users.filter(u => stepFormData.approver_ids.includes(u.id))}
            onChange={(_, newValue) => {
              setStepFormData({ ...stepFormData, approver_ids: newValue.map(u => u.id) });
            }}
            renderInput={(params) => (
              <TextField {...params} label="تأییدکنندگان" placeholder="تأییدکنندگان را انتخاب کنید" />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={`${option.first_name || ''} ${option.last_name || ''}`.trim() || option.username}
                />
              ))
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStepDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleSaveWorkflow} variant="contained" disabled={isSubmitting}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

