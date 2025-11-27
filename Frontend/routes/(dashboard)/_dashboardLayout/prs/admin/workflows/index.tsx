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
  IconButton,
} from '@mui/material';
import { Add, ArrowUp, ArrowDown, TickCircle } from 'iconsax-react';
import { Edit2 } from 'lucide-react';
import PageHeader from '../../../../components/PageHeader';
import { WorkflowTemplate, WorkflowTemplateStep } from 'src/types/api/prs';
import { Lookup } from 'src/types/api/lookups';
import * as prsApi from 'src/services/api/prs';
import * as lookupsApi from 'src/services/api/lookups';
import logger from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/admin/workflows/')({
  component: WorkflowsAdminPage,
});

function WorkflowsAdminPage() {
  const navigate = useNavigate();
  const [workflowTemplates, setWorkflowTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [roles, setRoles] = useState<Lookup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createWorkflowDialogOpen, setCreateWorkflowDialogOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowTemplateStep | null>(null);
  const [stepFormData, setStepFormData] = useState({
    step_name: '',
    step_order: 1,
    is_finance_review: false,
    role_ids: [] as string[],
  });

  const loadRoles = useCallback(async () => {
    try {
      const data = await lookupsApi.getLookups();
      // Backend might ignore the type filter, so filter explicitly on the frontend
      setRoles(data.filter(r => r.is_active && r.type === 'COMPANY_ROLE'));
    } catch (err: any) {
      logger.error('Error loading PRS roles:', err);
    }
  }, []);

  const loadWorkflowTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load all workflow templates globally (no team filter)
      const data = await prsApi.getAllWorkflowTemplates();
      // Ensure data is an array
      if (!Array.isArray(data)) {
        logger.error('getAllWorkflowTemplates did not return an array:', data);
        setWorkflowTemplates([]);
        setSelectedWorkflow(null);
        return;
      }
      setWorkflowTemplates(data);
      // Auto-select first template if available
      if (data.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(data[0]);
      } else if (data.length === 0) {
        setSelectedWorkflow(null);
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری گردش‌های کار',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading workflow templates:', err);
      setWorkflowTemplates([]);
      setSelectedWorkflow(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkflow]);

  useEffect(() => {
    loadRoles();
    loadWorkflowTemplates();
  }, [loadRoles, loadWorkflowTemplates]);

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast({
        title: 'خطا',
        description: 'نام گردش کار الزامی است',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      // Create workflow template (team-agnostic)
      const created = await prsApi.createWorkflow({
        name: newWorkflowName.trim(),
        steps: [],
      });
      toast({
        title: 'موفق',
        description: 'گردش کار با موفقیت ایجاد شد. حالا می‌توانید مراحل را اضافه کنید.',
      });
      setCreateWorkflowDialogOpen(false);
      setNewWorkflowName('');
      await loadWorkflowTemplates();
      // Select the newly created workflow
      const updated = await prsApi.getAllWorkflowTemplates();
      if (!Array.isArray(updated)) {
        logger.error('getAllWorkflowTemplates did not return an array:', updated);
        return;
      }
      const newWorkflow = updated.find(w => w.id === created.id) || updated[updated.length - 1];
      if (newWorkflow) {
        setSelectedWorkflow(newWorkflow);
      }
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
    if (!selectedWorkflow) return;
    
    const nextOrder = selectedWorkflow.steps && selectedWorkflow.steps.length > 0 
      ? Math.max(...selectedWorkflow.steps.map(s => s.step_order)) + 1 
      : 1;
    
    setStepFormData({
      step_name: '',
      step_order: nextOrder,
      is_finance_review: false,
      role_ids: [],
    });
    setEditingStep(null);
    setStepDialogOpen(true);
  };

  const handleEditStep = (step: WorkflowTemplateStep) => {
    // WorkflowTemplateStep has approvers with role info
    const roleIds = step.approvers ? step.approvers.map(a => (a as any).role_id || (a as any).role).filter(Boolean) : [];
    setStepFormData({
      step_name: step.step_name,
      step_order: step.step_order,
      is_finance_review: step.is_finance_review,
      role_ids: roleIds,
    });
    setEditingStep(step);
    setStepDialogOpen(true);
  };

  const handleSaveWorkflow = async () => {
    if (!selectedWorkflow) return;

    try {
      setIsSubmitting(true);
      
      const sortedSteps = selectedWorkflow.steps ? [...selectedWorkflow.steps].sort((a, b) => a.step_order - b.step_order) : [];
      const updatedSteps = editingStep
        ? sortedSteps.map(s => 
            s.id === editingStep.id
              ? {
                  step_name: stepFormData.step_name,
                  step_order: stepFormData.step_order,
                  is_finance_review: stepFormData.is_finance_review,
                  role_ids: stepFormData.role_ids,
                }
              : {
                  step_name: s.step_name,
                  step_order: s.step_order,
                  is_finance_review: s.is_finance_review,
                  role_ids: s.approvers ? s.approvers.map(a => (a as any).role_id || (a as any).role).filter(Boolean) : [],
                }
          )
        : [
            ...sortedSteps.map(s => ({
              step_name: s.step_name,
              step_order: s.step_order,
              is_finance_review: s.is_finance_review,
              role_ids: s.approvers ? s.approvers.map(a => (a as any).role_id || (a as any).role).filter(Boolean) : [],
            })),
            {
              step_name: stepFormData.step_name,
              step_order: stepFormData.step_order,
              is_finance_review: stepFormData.is_finance_review,
              role_ids: stepFormData.role_ids,
            },
          ];

      // Use updateWorkflow which should work with WorkflowTemplate IDs
      await prsApi.updateWorkflow(selectedWorkflow.id, {
        name: selectedWorkflow.name,
        steps: updatedSteps,
      });

      toast({
        title: 'موفق',
        description: editingStep ? 'مرحله با موفقیت به‌روزرسانی شد' : 'مرحله با موفقیت اضافه شد',
      });
      setStepDialogOpen(false);
      await loadWorkflowTemplates();
      // Reload selected workflow
      const updated = await prsApi.getAllWorkflowTemplates();
      if (!Array.isArray(updated)) {
        logger.error('getAllWorkflowTemplates did not return an array:', updated);
        return;
      }
      const reloaded = updated.find(w => w.id === selectedWorkflow.id);
      if (reloaded) {
        setSelectedWorkflow(reloaded);
      }
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

  const sortedSteps = selectedWorkflow && selectedWorkflow.steps 
    ? [...selectedWorkflow.steps].sort((a, b) => a.step_order - b.step_order) 
    : [];
  const hasFinanceStep = sortedSteps.some(s => s.is_finance_review);

  return (
    <>
      <PageHeader title="مدیریت گردش‌های کار" breadcrumb={['مدیریت', 'گردش‌های کار']}>
        <Button
          variant="contained"
          startIcon={<Add size={20} />}
          onClick={() => {
            setNewWorkflowName('');
            setCreateWorkflowDialogOpen(true);
          }}
          disabled={isSubmitting}
        >
          گردش کار جدید
        </Button>
      </PageHeader>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : workflowTemplates.length === 0 ? (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            هنوز گردش کاری ایجاد نشده است
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            برای شروع، یک گردش کار جدید ایجاد کنید
          </Typography>
        </Box>
      ) : (
        <>
          {/* Workflow Template Selector */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>گردش کار</InputLabel>
              <Select
                value={selectedWorkflow?.id || ''}
                onChange={(e) => {
                  const workflow = workflowTemplates.find(w => w.id === e.target.value);
                  setSelectedWorkflow(workflow || null);
                }}
                label="گردش کار"
              >
                {workflowTemplates.map((workflow) => (
                  <MenuItem key={workflow.id} value={workflow.id}>
                    {workflow.name} (v{workflow.version_number})
                    {workflow.is_active && ' ✓'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedWorkflow && (
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
                  <Typography variant="h6">
                    {selectedWorkflow.name} - نسخه {selectedWorkflow.version_number}
                  </Typography>
                  <Chip
                    label={selectedWorkflow.is_active ? 'فعال' : 'غیرفعال'}
                    color={selectedWorkflow.is_active ? 'success' : 'default'}
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
                          تأییدکنندگان: {step.approvers && step.approvers.length > 0
                            ? step.approvers.map(a => a.role_title).join(', ')
                            : 'هیچ‌کدام'}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEditStep(step)}
                        color="warning"
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                        }}
                        aria-label="ویرایش"
                      >
                        <Edit2 size={16} />
                      </IconButton>
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
        </>
      )}

      {/* Create Workflow Dialog */}
      <Dialog open={createWorkflowDialogOpen} onClose={() => setCreateWorkflowDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ایجاد گردش کار جدید</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام گردش کار *"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            sx={{ mt: 2 }}
            required
            placeholder="مثال: گردش کار تأیید خرید کالا"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateWorkflowDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleCreateWorkflow} variant="contained" disabled={isSubmitting}>
            ایجاد
          </Button>
        </DialogActions>
      </Dialog>

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
            options={roles}
            getOptionLabel={(option) => option.title}
            value={roles.filter(r => stepFormData.role_ids.includes(r.id))}
            onChange={(_, newValue) => {
              setStepFormData({ ...stepFormData, role_ids: newValue.map(r => r.id) });
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="نقش‌های تأییدکننده"
                placeholder="نقش‌های تأییدکننده را انتخاب کنید"
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  label={option.title}
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

