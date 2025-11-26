import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Toggle,
  Select,
  MenuItem,
  Button,
} from 'injast-core/components';
import { FormField } from 'src/types/api/prs';
import { PersianDatePicker } from '@/components/ui/persian-date-picker';

export interface PrsDynamicFormProps {
  fields: FormField[];
  initialValues?: Record<string, any>;
  onChange: (fieldId: string, value: any) => void;
  errors?: Record<string, string>;
  isEditable?: boolean;
  onFileUploadClick?: () => void;
}

export default function PrsDynamicForm({
  fields,
  initialValues = {},
  onChange,
  errors = {},
  isEditable = true,
  onFileUploadClick,
}: PrsDynamicFormProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(initialValues);

  // Update local state when initialValues change
  useEffect(() => {
    setFieldValues(initialValues);
  }, [initialValues]);

  const handleFieldChange = (fieldId: string, value: any) => {
    const newValues = { ...fieldValues, [fieldId]: value };
    setFieldValues(newValues);
    onChange(fieldId, value);
  };

  const renderField = (field: FormField) => {
    // Get field value, preferring current state over initial value
    const fieldValue = fieldValues[field.id] ?? field.default_value ?? null;
    const fieldError = errors[field.id];
    const isRequired = field.required;

    switch (field.field_type) {
      case 'TEXT':
        const isMultiline = field.validation_rules?.multiline || false;
        const rows = field.validation_rules?.rows || (isMultiline ? 4 : 1);

        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.label || field.name}
              {isRequired && (
                <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>
                  *
                </Typography>
              )}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <TextField
              fullWidth
              height={isMultiline ? undefined : 48}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value || null)}
              disabled={!isEditable}
              required={isRequired}
              error={!!fieldError}
              helperText={fieldError}
              multiline={isMultiline}
              rows={rows}
            />
          </Box>
        );

      case 'NUMBER':
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.label || field.name}
              {isRequired && (
                <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>
                  *
                </Typography>
              )}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <TextField
              fullWidth
              height={48}
              type="number"
              value={fieldValue !== null && fieldValue !== undefined ? fieldValue : ''}
              onChange={(e) => {
                const numValue = e.target.value === '' ? null : parseFloat(e.target.value);
                handleFieldChange(field.id, isNaN(numValue!) ? null : numValue);
              }}
              disabled={!isEditable}
              required={isRequired}
              error={!!fieldError}
              helperText={fieldError}
              inputProps={{
                step: field.validation_rules?.step || 'any',
                min: field.validation_rules?.min,
                max: field.validation_rules?.max,
              }}
            />
          </Box>
        );

      case 'DATE':
        // Format date value for input (YYYY-MM-DD format)
        const dateValue = fieldValue
          ? typeof fieldValue === 'string'
            ? fieldValue.split('T')[0] // Extract date part from ISO datetime string
            : fieldValue
          : '';

        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.label || field.name}
              {isRequired && (
                <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>
                  *
                </Typography>
              )}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <PersianDatePicker
              fullWidth
              height={48}
              value={dateValue}
              onChange={(value) => handleFieldChange(field.id, value)}
              disabled={!isEditable}
              required={isRequired}
              error={!!fieldError}
              helperText={fieldError}
            />
          </Box>
        );

      case 'BOOLEAN':
        // Handle boolean value: true, false, or null
        const boolValue = fieldValue === true || fieldValue === 'true';

        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Toggle
                checked={boolValue}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
                disabled={!isEditable}
              />
              <Box>
                <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                  {field.label || field.name}
                  {isRequired && (
                    <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>
                      *
                    </Typography>
                  )}
                </Typography>
                {field.help_text && (
                  <Typography variant="body2" color="neutral.light" textAlign="left">
                    {field.help_text}
                  </Typography>
                )}
              </Box>
            </Box>
            {fieldError && (
              <Typography variant="body2" color="error" sx={{ mt: -1 }}>
                {fieldError}
              </Typography>
            )}
          </Box>
        );

      case 'DROPDOWN':
        const dropdownOptions = field.dropdown_options || [];

        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.label || field.name}
              {isRequired && (
                <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>
                  *
                </Typography>
              )}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <Select
              fullWidth
              height={48}
              value={fieldValue || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value || null)}
              disabled={!isEditable}
              required={isRequired}
              error={!!fieldError}
              size="small"
            >
              <MenuItem value="">
                <em>انتخاب کنید</em>
              </MenuItem>
              {dropdownOptions.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {fieldError && (
              <Typography variant="body2" color="error" sx={{ mt: -1 }}>
                {fieldError}
              </Typography>
            )}
          </Box>
        );

      case 'FILE_UPLOAD':
        // FILE_UPLOAD values are stored via the attachments panel, not RequestFieldValue.
        // We still render a row here so that dynamic form configuration from backend is visible.
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.label || field.name}
              {isRequired && (
                <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>
                  *
                </Typography>
              )}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Typography variant="body2" color="neutral.light" textAlign="left">
                آپلود این فایل از بخش «پیوست‌ها» در پایین فرم انجام می‌شود.
              </Typography>
              {onFileUploadClick && (
                <Button
                  variant="outlined"
                  color="primary"
                  buttonSize="S"
                  onClick={onFileUploadClick}
                >
                  رفتن به پیوست‌ها
                </Button>
              )}
            </Box>
            {fieldError && (
              <Typography variant="body2" color="error" sx={{ mt: -1 }}>
                {fieldError}
              </Typography>
            )}
          </Box>
        );

      default:
        return (
          <Box key={field.id} sx={{ mb: 3 }}>
            <Typography variant="body2" color="error">
              نوع فیلد پشتیبانی نشده: {field.field_type}
            </Typography>
          </Box>
        );
    }
  };

  // Sort fields by order ascending
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  return (
    <Box>
      {sortedFields.map((field) => renderField(field))}
    </Box>
  );
}

