import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Checkbox,
} from '@mui/material';
import { SearchNormal1, Add, Edit, Delete, ArrowUp, ArrowDown } from 'iconsax-react';
import PageHeader from '../../../../components/PageHeader';
import { Team, FormField, FormTemplate } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import * as lookupApi from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';
import logger from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/admin/form-templates/')({
  component: FormTemplatesAdminPage,
});

const FORM_FIELD_TYPES: FormField['field_type'][] = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'DROPDOWN'];

function FormTemplatesAdminPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [fieldFormData, setFieldFormData] = useState({
    field_id: '',
    name: '',
    label: '',
    field_type: 'TEXT' as FormField['field_type'],
    required: false,
    order: 0,
    default_value: '',
    help_text: '',
    dropdown_options: [] as string[],
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

  const loadTemplate = useCallback(async () => {
    if (!selectedTeam) {
      setTemplate(null);
      return;
    }

    try {
      setIsLoading(true);
      const response = await prsApi.getTeamFormTemplate(selectedTeam);
      setTemplate(response.template);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setTemplate(null);
      } else {
        const errorMessage = extractErrorMessage(err);
        toast({
          title: 'خطا در بارگذاری قالب فرم',
          description: errorMessage,
          variant: 'destructive',
        });
        logger.error('Error loading template:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (selectedTeam) {
      loadTemplate();
    }
  }, [selectedTeam, loadTemplate]);

  const handleCreateTemplate = async () => {
    if (!selectedTeam) return;

    try {
      setIsSubmitting(true);
      await prsApi.createFormTemplate({
        team: selectedTeam,
        fields: [],
      });
      toast({
        title: 'موفق',
        description: 'قالب فرم با موفقیت ایجاد شد',
      });
      await loadTemplate();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در ایجاد قالب فرم',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error creating template:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddField = () => {
    if (!template) return;
    
    const nextOrder = template.fields.length > 0 
      ? Math.max(...template.fields.map(f => f.order)) + 1 
      : 1;
    
    setFieldFormData({
      field_id: '',
      name: '',
      label: '',
      field_type: 'TEXT',
      required: false,
      order: nextOrder,
      default_value: '',
      help_text: '',
      dropdown_options: [],
    });
    setEditingField(null);
    setFieldDialogOpen(true);
  };

  const handleEditField = (field: FormField) => {
    setFieldFormData({
      field_id: field.field_id,
      name: field.name,
      label: field.label,
      field_type: field.field_type,
      required: field.required,
      order: field.order,
      default_value: field.default_value || '',
      help_text: field.help_text || '',
      dropdown_options: field.dropdown_options || [],
    });
    setEditingField(field);
    setFieldDialogOpen(true);
  };

  const handleSaveField = async () => {
    if (!template || !fieldFormData.field_id || !fieldFormData.name || !fieldFormData.label) {
      toast({
        title: 'خطا',
        description: 'فیلدهای الزامی را پر کنید',
        variant: 'destructive',
      });
      return;
    }

    if (fieldFormData.field_type === 'DROPDOWN' && fieldFormData.dropdown_options.length === 0) {
      toast({
        title: 'خطا',
        description: 'برای فیلد نوع Dropdown باید حداقل یک گزینه تعریف کنید',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const fields = editingField
        ? template.fields.map(f => 
            f.id === editingField.id
              ? {
                  field_id: fieldFormData.field_id,
                  name: fieldFormData.name,
                  label: fieldFormData.label,
                  field_type: fieldFormData.field_type,
                  required: fieldFormData.required,
                  order: fieldFormData.order,
                  default_value: fieldFormData.default_value || null,
                  help_text: fieldFormData.help_text || null,
                  dropdown_options: fieldFormData.field_type === 'DROPDOWN' 
                    ? fieldFormData.dropdown_options 
                    : null,
                }
              : {
                  field_id: f.field_id,
                  name: f.name,
                  label: f.label,
                  field_type: f.field_type,
                  required: f.required,
                  order: f.order,
                  default_value: f.default_value || null,
                  help_text: f.help_text || null,
                  dropdown_options: f.dropdown_options || null,
                }
          )
        : [
            ...template.fields.map(f => ({
              field_id: f.field_id,
              name: f.name,
              label: f.label,
              field_type: f.field_type,
              required: f.required,
              order: f.order,
              default_value: f.default_value || null,
              help_text: f.help_text || null,
              dropdown_options: f.dropdown_options || null,
            })),
            {
              field_id: fieldFormData.field_id,
              name: fieldFormData.name,
              label: fieldFormData.label,
              field_type: fieldFormData.field_type,
              required: fieldFormData.required,
              order: fieldFormData.order,
              default_value: fieldFormData.default_value || null,
              help_text: fieldFormData.help_text || null,
              dropdown_options: fieldFormData.field_type === 'DROPDOWN' 
                ? fieldFormData.dropdown_options 
                : null,
            },
          ];

      await prsApi.updateFormTemplate(template.id, {
        team: typeof template.team === 'string' ? template.team : template.team.id,
        fields,
      });

      toast({
        title: 'موفق',
        description: editingField ? 'فیلد با موفقیت به‌روزرسانی شد' : 'فیلد با موفقیت اضافه شد',
      });
      setFieldDialogOpen(false);
      await loadTemplate();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error saving field:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveField = async (fieldId: string, direction: 'up' | 'down') => {
    if (!template) return;

    const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);
    const index = sortedFields.findIndex(f => f.id === fieldId);
    
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sortedFields.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    [sortedFields[index], sortedFields[newIndex]] = [sortedFields[newIndex], sortedFields[index]];

    try {
      setIsSubmitting(true);
      const fieldOrders = sortedFields.map((f, i) => ({
        field_id: f.id,
        order: i + 1,
      }));
      await prsApi.reorderFormFields(template.id, fieldOrders);
      await loadTemplate();
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error reordering fields:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedFields = template ? [...template.fields].sort((a, b) => a.order - b.order) : [];

  return (
    <>
      <PageHeader title="مدیریت قالب‌های فرم" breadcrumb={['مدیریت', 'قالب‌های فرم']} />

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
      ) : !template ? (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            این تیم هنوز قالب فرم ندارد
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add size={20} />}
            onClick={handleCreateTemplate}
            disabled={isSubmitting || !selectedTeam}
          >
            ایجاد قالب فرم
          </Button>
        </Box>
      ) : (
        <>
          {/* Template Info */}
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
                قالب فرم - نسخه {template.version_number}
              </Typography>
              <Chip
                label={template.is_active ? 'فعال' : 'غیرفعال'}
                color={template.is_active ? 'success' : 'default'}
                size="small"
              />
            </Box>
          </Box>

          {/* Fields List */}
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: 2,
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">فیلدهای فرم</Typography>
              <Button
                variant="contained"
                startIcon={<Add size={20} />}
                onClick={handleAddField}
              >
                افزودن فیلد
              </Button>
            </Box>

            {sortedFields.length === 0 ? (
              <Typography sx={{ textAlign: 'center', color: 'text.secondary', py: 4 }}>
                هنوز فیلدی اضافه نشده است
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sortedFields.map((field, index) => (
                  <Box
                    key={field.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
                      <Typography sx={{ minWidth: 40, textAlign: 'center' }}>
                        {field.order}
                      </Typography>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1">{field.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {field.field_id} ({field.field_type})
                          {field.required && <Chip label="الزامی" size="small" color="error" sx={{ ml: 1 }} />}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveField(field.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp size={20} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveField(field.id, 'down')}
                        disabled={index === sortedFields.length - 1}
                      >
                        <ArrowDown size={20} />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditField(field)}
                      >
                        <Edit size={20} />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </>
      )}

      {/* Field Dialog */}
      <Dialog open={fieldDialogOpen} onClose={() => setFieldDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingField ? 'ویرایش فیلد' : 'افزودن فیلد جدید'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="شناسه فیلد *"
            value={fieldFormData.field_id}
            onChange={(e) => setFieldFormData({ ...fieldFormData, field_id: e.target.value.toUpperCase() })}
            sx={{ mb: 2, mt: 2 }}
            required
            helperText="مثال: BUDGET_AMOUNT"
          />
          <TextField
            fullWidth
            label="نام *"
            value={fieldFormData.name}
            onChange={(e) => setFieldFormData({ ...fieldFormData, name: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="برچسب *"
            value={fieldFormData.label}
            onChange={(e) => setFieldFormData({ ...fieldFormData, label: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>نوع فیلد *</InputLabel>
            <Select
              value={fieldFormData.field_type}
              onChange={(e) => setFieldFormData({ ...fieldFormData, field_type: e.target.value as FormField['field_type'] })}
              label="نوع فیلد *"
            >
              {FORM_FIELD_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={fieldFormData.required}
              onChange={(e) => setFieldFormData({ ...fieldFormData, required: e.target.checked })}
            />
            <Typography>الزامی</Typography>
          </Box>
          <TextField
            fullWidth
            label="مقدار پیش‌فرض"
            value={fieldFormData.default_value}
            onChange={(e) => setFieldFormData({ ...fieldFormData, default_value: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="متن راهنما"
            value={fieldFormData.help_text}
            onChange={(e) => setFieldFormData({ ...fieldFormData, help_text: e.target.value })}
            sx={{ mb: 2 }}
            multiline
            rows={2}
          />
          {fieldFormData.field_type === 'DROPDOWN' && (
            <TextField
              fullWidth
              label="گزینه‌ها (هر خط یک گزینه)"
              value={fieldFormData.dropdown_options.join('\n')}
              onChange={(e) =>
                setFieldFormData({
                  ...fieldFormData,
                  dropdown_options: e.target.value.split('\n').filter(v => v.trim()),
                })
              }
              multiline
              rows={4}
              helperText="هر خط یک گزینه"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFieldDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleSaveField} variant="contained" disabled={isSubmitting}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

