import { ReportBox, ReportField } from 'src/types/api/reports';
import logger from "@/lib/logger";
import { Box, TextField, Typography, Select, MenuItem, Toggle } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { useState, useEffect } from 'react';
import { getOrgNodes } from 'src/services/api/organizations';
import { getFinancialPeriods } from 'src/services/api/periods';
import { OrgNode } from 'src/types/api/organizations';
import { FinancialPeriod } from 'src/types/api/periods';
import { PersianDatePicker } from '@/components/ui/persian-date-picker';

type ReportBoxFieldsFormProps = {
  reportBox: ReportBox;
  fieldValues: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  isEditable?: boolean;
};

export default function ReportBoxFieldsForm({
  reportBox,
  fieldValues,
  onFieldChange,
  isEditable = true,
}: ReportBoxFieldsFormProps) {
  const [orgNodes, setOrgNodes] = useState<OrgNode[]>([]);
  const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);

  useEffect(() => {
    // Pre-fetch entity reference data if needed
    const hasEntityRef = reportBox.fields?.some(
      f => f.data_type === 'ENTITY_REF'
    );
    
    if (hasEntityRef) {
      const fetchEntityRefData = async () => {
        try {
          // Fetch org nodes for ORG_NODE references
          const orgs = await getOrgNodes();
          setOrgNodes(orgs.filter(o => o.is_active));
          
          // Fetch financial periods for FINANCIAL_PERIOD references
          const periods = await getFinancialPeriods();
          setFinancialPeriods(periods.filter(p => p.is_active));
        } catch (error) {
          logger.error('Error fetching entity reference data:',  error);
        }
      };
      
      fetchEntityRefData();
    }
  }, [reportBox]);

  const renderField = (field: ReportField) => {
    const fieldValue = fieldValues[field.id] ?? null;
    const isRequired = field.required;

    switch (field.data_type) {
      case 'NUMBER':
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.name}
              {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2.5 }}>
              <TextField
                type="number"
                value={fieldValue ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseFloat(e.target.value);
                  onFieldChange(field.id, value);
                }}
                disabled={!isEditable}
                fullWidth
                height={48}
                required={isRequired}
                placeholder={field.name}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& input': {
                      textAlign: 'left',
                    },
                  },
                }}
              />
            </Box>
          </Box>
        );

      case 'TEXT':
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.name}
              {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2.5 }}>
              <TextField
                value={fieldValue ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : e.target.value;
                  onFieldChange(field.id, value);
                }}
                disabled={!isEditable}
                fullWidth
                height={48}
                required={isRequired}
                placeholder={field.name}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& input': {
                      textAlign: 'left',
                    },
                  },
                }}
              />
            </Box>
          </Box>
        );

      case 'YES_NO':
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Toggle
                checked={fieldValue ?? false}
                onChange={(e) => {
                  onFieldChange(field.id, e.target.checked);
                }}
                disabled={!isEditable}
              />
              <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                {field.name}
                {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
              </Typography>
            </Box>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left" sx={{ mr: 3 }}>
                {field.help_text}
              </Typography>
            )}
          </Box>
        );

      case 'DATE':
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.name}
              {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <PersianDatePicker
              value={fieldValue}
              onChange={(value) => onFieldChange(field.id, value)}
              disabled={!isEditable}
              fullWidth
              height={48}
              required={isRequired}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                  borderColor: defaultColors.neutral[300],
                  '& input': {
                    textAlign: 'left',
                  },
                },
              }}
            />
          </Box>
        );

      case 'FILE':
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.name}
              {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
            </Typography>
            {field.help_text && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {field.help_text}
              </Typography>
            )}
            <TextField
              type="file"
              onChange={(e) => {
                const file = (e.target as HTMLInputElement).files?.[0] || null;
                onFieldChange(field.id, file);
              }}
              disabled={!isEditable}
              fullWidth
              height={48}
              required={isRequired}
              sx={{
                '& input[type="file"]': {
                  padding: '12px',
                },
              }}
            />
            {fieldValue && (
              <Typography variant="body2" color="neutral.light" textAlign="left">
                {fieldValue instanceof File 
                  ? `فایل انتخاب شده: ${fieldValue.name}` 
                  : `فایل: ${fieldValue}`}
              </Typography>
            )}
          </Box>
        );

      case 'ENTITY_REF':
        const entityRefType = field.entity_ref_type;
        if (entityRefType === 'ORG_NODE') {
          return (
            <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                {field.name}
                {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
              </Typography>
              {field.help_text && (
                <Typography variant="body2" color="neutral.light" textAlign="left">
                  {field.help_text}
                </Typography>
              )}
              <Select
                value={fieldValue ?? ''}
                size="small"
                onChange={(e) => {
                  onFieldChange(field.id, e.target.value === '' ? null : e.target.value);
                }}
                disabled={!isEditable}
                displayEmpty
                height={48}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& .MuiSelect-select': {
                      textAlign: 'left',
                    },
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <em style={{ fontStyle: 'normal', color: defaultColors.neutral.light }}>انتخاب کنید</em>
                </MenuItem>
                {orgNodes.map((node) => (
                  <MenuItem key={node.id} value={node.id}>
                    {node.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          );
        } else if (entityRefType === 'FINANCIAL_PERIOD') {
          return (
            <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                {field.name}
                {isRequired && <Typography component="span" color="danger.main" sx={{ ml: 0.5 }}>*</Typography>}
              </Typography>
              {field.help_text && (
                <Typography variant="body2" color="neutral.light" textAlign="left">
                  {field.help_text}
                </Typography>
              )}
              <Select
                value={fieldValue ?? ''}
                size="small"
                onChange={(e) => {
                  onFieldChange(field.id, e.target.value === '' ? null : e.target.value);
                }}
                disabled={!isEditable}
                displayEmpty
                height={48}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& .MuiSelect-select': {
                      textAlign: 'left',
                    },
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <em style={{ fontStyle: 'normal', color: defaultColors.neutral.light }}>انتخاب کنید</em>
                </MenuItem>
                {financialPeriods.map((period) => (
                  <MenuItem key={period.id} value={period.id}>
                    {period.title}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          );
        }
        return null;

      default:
        return (
          <Box key={field.id} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
              {field.name} (نوع پشتیبانی نشده: {field.data_type})
            </Typography>
          </Box>
        );
    }
  };

  // Group fields by section if needed (based on field names or structure)
  // For now, just render all fields in order
  const fields = reportBox.fields || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {fields.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography color="neutral.light">فیلدی برای این گزارش تعریف نشده است.</Typography>
        </Box>
      ) : (
        fields.map((field) => renderField(field))
      )}
    </Box>
  );
}

