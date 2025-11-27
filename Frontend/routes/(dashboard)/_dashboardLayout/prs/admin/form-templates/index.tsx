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
import { SearchNormal1, Add, ArrowUp, ArrowDown } from 'iconsax-react';
import { Edit2, Trash2 } from 'lucide-react';
import PageHeader from '../../../../components/PageHeader';
import { FormField, FormTemplate } from 'src/types/api/prs';
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
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
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

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      // Load all form templates globally (no team filter)
      const data = await prsApi.getAllFormTemplates();
      // Ensure data is an array
      if (!Array.isArray(data)) {
        logger.error('getAllFormTemplates did not return an array:', data);
        setTemplates([]);
        setSelectedTemplate(null);
        return;
      }
      // Ensure all templates have fields array initialized
      const templatesWithFields = data.map(t => ({
        ...t,
        fields: t.fields || [],
      }));
      setTemplates(templatesWithFields);
      // Auto-select first template if available
      if (templatesWithFields.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templatesWithFields[0]);
      } else if (templatesWithFields.length === 0) {
        setSelectedTemplate(null);
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری قالب‌های فرم',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading templates:', err);
      setTemplates([]);
      setSelectedTemplate(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTemplate]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({
        title: 'خطا',
        description: 'نام قالب الزامی است',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      // Create template without team dependency
      // Note: Backend may still require team field - we may need to pass empty string or null
      const created = await prsApi.createFormTemplate({
        team: '', // Backend may accept empty string or null for team-independent templates
        name: newTemplateName.trim(),
        fields: [],
      });
      toast({
        title: 'موفق',
        description: 'قالب فرم با موفقیت ایجاد شد',
      });
      setCreateTemplateDialogOpen(false);
      setNewTemplateName('');
      await loadTemplates();
      // Select the newly created template
      const updated = await prsApi.getAllFormTemplates();
      if (!Array.isArray(updated)) {
        logger.error('getAllFormTemplates did not return an array:', updated);
        return;
      }
      const updatedWithFields = updated.map(t => ({
        ...t,
        fields: t.fields || [],
      }));
      const newTemplate = updatedWithFields.find(t => t.id === created.id) || updatedWithFields[updatedWithFields.length - 1];
      if (newTemplate) {
        setSelectedTemplate(newTemplate);
      }
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
    if (!selectedTemplate) return;
    
    const fields = selectedTemplate.fields || [];
    const nextOrder = fields.length > 0 
      ? Math.max(...fields.map(f => f.order)) + 1 
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
    if (!selectedTemplate || !fieldFormData.field_id || !fieldFormData.name || !fieldFormData.label) {
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
      
      const templateFields = selectedTemplate.fields || [];
      const fields = editingField
        ? templateFields.map(f => 
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
            ...templateFields.map(f => ({
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

      await prsApi.updateFormTemplate(selectedTemplate.id, {
        team: typeof selectedTemplate.team === 'string' ? selectedTemplate.team : (selectedTemplate.team?.id || ''),
        fields,
      });

      toast({
        title: 'موفق',
        description: editingField ? 'فیلد با موفقیت به‌روزرسانی شد' : 'فیلد با موفقیت اضافه شد',
      });
      setFieldDialogOpen(false);
      await loadTemplates();
      // Reload selected template
      const updated = await prsApi.getAllFormTemplates();
      if (!Array.isArray(updated)) {
        logger.error('getAllFormTemplates did not return an array:', updated);
        return;
      }
      const updatedWithFields = updated.map(t => ({
        ...t,
        fields: t.fields || [],
      }));
      const reloaded = updatedWithFields.find(t => t.id === selectedTemplate.id);
      if (reloaded) {
        setSelectedTemplate(reloaded);
      }
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
    if (!selectedTemplate) return;

    const templateFields = selectedTemplate.fields || [];
    const sortedFields = [...templateFields].sort((a, b) => a.order - b.order);
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
      await prsApi.reorderFormFields(selectedTemplate.id, fieldOrders);
      await loadTemplates();
      // Reload selected template
      const updated = await prsApi.getAllFormTemplates();
      if (!Array.isArray(updated)) {
        logger.error('getAllFormTemplates did not return an array:', updated);
        return;
      }
      const updatedWithFields = updated.map(t => ({
        ...t,
        fields: t.fields || [],
      }));
      const reloaded = updatedWithFields.find(t => t.id === selectedTemplate.id);
      if (reloaded) {
        setSelectedTemplate(reloaded);
      }
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

  const sortedFields = selectedTemplate && selectedTemplate.fields 
    ? [...selectedTemplate.fields].sort((a, b) => a.order - b.order) 
    : [];

  return (
    <>
      <PageHeader title="مدیریت قالب‌های فرم" breadcrumb={['مدیریت', 'قالب‌های فرم']}>
        <Button
          variant="contained"
          startIcon={<Add size={20} />}
          onClick={() => {
            setNewTemplateName('');
            setCreateTemplateDialogOpen(true);
          }}
          disabled={isSubmitting}
        >
          قالب جدید
        </Button>
      </PageHeader>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : templates.length === 0 ? (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            هنوز قالب فرمی ایجاد نشده است
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            برای شروع، یک قالب فرم جدید ایجاد کنید
          </Typography>
        </Box>
      ) : (
        <>
          {/* Template Selector */}
          <Box sx={{ mb: 3 }}>
            <FormControl fullWidth>
              <InputLabel>قالب فرم</InputLabel>
              <Select
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const template = templates.find(t => t.id === e.target.value);
                  setSelectedTemplate(template || null);
                }}
                label="قالب فرم"
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name || `قالب ${template.version_number}`} (v{template.version_number})
                    {template.is_active && ' ✓'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {selectedTemplate && (
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
                    {selectedTemplate.name || `قالب فرم`} - نسخه {selectedTemplate.version_number}
                  </Typography>
                  <Chip
                    label={selectedTemplate.is_active ? 'فعال' : 'غیرفعال'}
                    color={selectedTemplate.is_active ? 'success' : 'default'}
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
                        color="primary"
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                        }}
                      >
                        <ArrowUp size={20} variant="Bold" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveField(field.id, 'down')}
                        disabled={index === sortedFields.length - 1}
                        color="primary"
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                        }}
                      >
                        <ArrowDown size={20} variant="Bold" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleEditField(field)}
                        color="warning"
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                        }}
                        aria-label="ویرایش"
                      >
                        <Edit2 size={20} className="w-5 h-5" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => {
                          // TODO: Implement delete field functionality
                          if (window.confirm('آیا از حذف این فیلد اطمینان دارید؟')) {
                            // handleDeleteField(field.id);
                          }
                        }}
                        color="error"
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: 1,
                        }}
                        aria-label="حذف"
                      >
                        <Trash2 size={20} className="w-5 h-5" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
            </>
          )}
        </>
      )}

      {/* Create Template Dialog */}
      <Dialog open={createTemplateDialogOpen} onClose={() => setCreateTemplateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ایجاد قالب فرم جدید</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="نام قالب *"
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            sx={{ mt: 2 }}
            required
            placeholder="مثال: قالب خرید کالا"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateTemplateDialogOpen(false)} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button onClick={handleCreateTemplate} variant="contained" disabled={isSubmitting}>
            ایجاد
          </Button>
        </DialogActions>
      </Dialog>

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

