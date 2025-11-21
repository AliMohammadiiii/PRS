import * as React from 'react';
import logger from "@/lib/logger";
import { X, Plus, Trash2 } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Typography,
  TextField,
  Toggle,
  Button,
  IconButton,
  Select,
  MenuItem,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { ReportField, FieldType, generatePersianCode } from 'src/types/reportTitles';
import { BasicInfoItem } from 'src/types/basicInfo';
import { z } from 'zod';
import * as lookupApi from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';

type FieldFormProps = {
  field: ReportField | null;
  onSubmit: (field: ReportField) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'فیلد متنی' },
  { value: 'switch', label: 'سوئیچ' },
  { value: 'combo-box', label: 'فهرست کشویی' },
  { value: 'file-upload', label: 'بارگذاری فایل' },
  { value: 'financial-period', label: 'دوره گزارش' },
];

const FILE_EXTENSION_OPTIONS = ['XLSX', 'PDF', 'DOCX', 'CSV'];

const fieldSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  type: z.enum(['text', 'switch', 'combo-box', 'file-upload', 'financial-period']),
  label: z.string().min(1, 'لیبل الزامی است'),
  defaultText: z.string().optional(),
  code: z.string().min(1, 'کد الزامی است'),
  isActive: z.boolean(),
  options: z.array(z.string()).optional(),
  fileExtension: z.string().optional(),
}).refine((data) => {
  if (data.type === 'combo-box') {
    return data.options && data.options.length > 0;
  }
  return true;
}, {
  message: 'حداقل یک گزینه باید اضافه شود',
  path: ['options'],
});

type FormData = z.infer<typeof fieldSchema>;

export default function FieldForm({
  field,
  onSubmit,
  onCancel,
  onDelete,
}: FieldFormProps) {
  const [newOption, setNewOption] = React.useState('');
  const [financialPeriodOptions, setFinancialPeriodOptions] = React.useState<
    BasicInfoItem[]
  >([]);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(fieldSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      type: 'text',
      label: '',
      defaultText: '',
      code: '',
      isActive: false,
      options: [],
    },
  });

  const formType = watch('type');
  const comboOptions = watch('options') || [];

  // Load financial period options from API
  React.useEffect(() => {
    const loadFinancialPeriods = async () => {
      try {
        const lookups = await lookupApi.getLookups();
        // Filter for report-period type (REPORTING_PERIOD)
        const periodLookups = lookups.filter(
          (l) => l.type === 'REPORTING_PERIOD' && l.is_active
        );
        const mapped: BasicInfoItem[] = periodLookups.map((lookup: Lookup) => ({
          id: lookup.id,
          title: lookup.title,
          code: lookup.code,
          status: lookup.is_active ? 'active' : 'inactive',
          category: 'report-period' as any,
        }));
        setFinancialPeriodOptions(mapped);
      } catch (error) {
        logger.error('Error loading financial periods:',  error);
      }
    };
    loadFinancialPeriods();
  }, []);

  React.useEffect(() => {
    if (field) {
      reset({
        title: field.title,
        type: field.type,
        label: field.label,
        defaultText: field.defaultText || '',
        code: field.code,
        isActive: field.isActive || false,
        options: field.options || [],
        fileExtension: field.fileExtension,
      });
    } else {
      reset({
        title: '',
        type: 'text',
        label: '',
        defaultText: '',
        code: generatePersianCode(),
        isActive: false,
        options: [],
      });
      setNewOption('');
    }
  }, [field, reset]);

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    const fieldData: ReportField = {
      id: field?.id || `field-${Date.now()}-${Math.random()}`,
      title: data.title,
      type: data.type,
      label: data.label,
      code: data.code,
      isActive: data.isActive,
      defaultText: data.defaultText,
      options: data.type === 'combo-box' ? data.options : undefined,
      fileExtension: data.type === 'file-upload' ? data.fileExtension : undefined,
    };

    onSubmit(fieldData);
  };

  const handleAddOption = () => {
    if (newOption.trim()) {
      setValue('options', [...comboOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (index: number) => {
    setValue('options', comboOptions.filter((_, i) => i !== index));
  };


  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
        px: 4,
        py: 6,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontSize: 16,
            fontWeight: 700,
            color: 'neutral.dark',
          }}
        >
          اطلاعات فیلد
        </Typography>
        {onDelete && (
          <IconButton
            onClick={onDelete}
            color="error"
            size="small"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
            }}
            aria-label="حذف"
          >
            <Trash2 className="w-5 h-5" />
          </IconButton>
        )}
      </Box>

      {!field ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 400,
            bgcolor: 'neutral.50',
            borderRadius: 2,
            p: 2.5,
          }}
        >
          <Box
            component="img"
            src="https://www.figma.com/api/mcp/asset/513c6153-8482-42c7-81dd-fb3343206772"
            alt="Empty state"
            sx={{ width: 105, height: 58, mb: 2.5 }}
          />
          <Typography
            variant="body2"
            sx={{
              color: 'neutral.main',
              fontSize: '14px',
              textAlign: 'center',
              fontWeight: 500,
            }}
          >
            برای شروع یک فیلد اضافه کن
          </Typography>
        </Box>
      ) : (
        <form onSubmit={handleFormSubmit(onSubmitForm)}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {formType !== 'financial-period' && (
            <TextField
              fullWidth
              height={48}
              label="عنوان"
              {...register('title')}
              placeholder="عنوان را وارد کنید"
              error={!!errors.title}
              helperText={errors.title?.message}
              endAdornment={
                watch('title') ? (
                  <IconButton
                    type="button"
                    onClick={() => setValue('title', '')}
                    size="small"
                    sx={{
                      p: 0.5,
                      color: defaultColors.neutral.light,
                      '&:hover': {
                        color: defaultColors.neutral.main,
                      },
                    }}
                  >
                    <X size={20} />
                  </IconButton>
                ) : undefined
              }
            />
          )}

          <Select
            fullWidth
            height={48}
            label="نوع فیلد"
            value={watch('type')}
            onChange={(e) => setValue('type', e.target.value as FieldType)}
            size="small"
          >
            {FIELD_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

          <TextField
            fullWidth
            height={48}
            label="لیبل"
            {...register('label')}
            placeholder="لیبل را وارد کنید"
            error={!!errors.label}
            helperText={errors.label?.message}
            endAdornment={
              watch('label') ? (
                <IconButton
                  type="button"
                  onClick={() => setValue('label', '')}
                  size="small"
                  sx={{
                    p: 0.5,
                    color: defaultColors.neutral.light,
                    '&:hover': {
                      color: defaultColors.neutral.main,
                    },
                  }}
                >
                  <X size={20} />
                </IconButton>
              ) : undefined
            }
          />

          {formType === 'text' && (
            <TextField
              fullWidth
              height={48}
              label="متن پیش‌فرض (اختیاری)"
              {...register('defaultText')}
              placeholder="متن پیش‌فرض را وارد کنید"
              error={!!errors.defaultText}
              helperText={errors.defaultText?.message}
              endAdornment={
                watch('defaultText') ? (
                  <IconButton
                    type="button"
                    onClick={() => setValue('defaultText', '')}
                    size="small"
                    sx={{
                      p: 0.5,
                      color: defaultColors.neutral.light,
                      '&:hover': {
                        color: defaultColors.neutral.main,
                      },
                    }}
                  >
                    <X size={20} />
                  </IconButton>
                ) : undefined
              }
            />
          )}

          {formType === 'combo-box' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {comboOptions.map((option, index) => (
                <TextField
                  key={index}
                  fullWidth
                  height={48}
                  label={index === 0 ? 'گزینه اول' : `گزینه ${index + 1}`}
                  value={option}
                  onChange={(e) => {
                    const updated = [...comboOptions];
                    updated[index] = e.target.value;
                    setValue('options', updated);
                  }}
                  placeholder="گزینه را وارد کنید"
                  endAdornment={
                    <IconButton
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      size="small"
                      sx={{
                        p: 0.5,
                        color: defaultColors.neutral.light,
                        '&:hover': {
                          color: defaultColors.danger.main,
                        },
                      }}
                    >
                      <X size={20} />
                    </IconButton>
                  }
                />
              ))}
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  fullWidth
                  height={48}
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="گزینه جدید"
                  sx={{ flex: 1 }}
                />
                <Button
                  type="button"
                  onClick={handleAddOption}
                  variant="contained"
                  color="primary"
                  buttonSize="M"
                  startIcon={<Plus className="w-5 h-5" />}
                  disabled={!newOption.trim()}
                >
                  افزودن گزینه
                </Button>
              </Box>
            </Box>
          )}

          {formType === 'file-upload' && (
            <Select
              fullWidth
              height={48}
              label="پسوند فایل"
              value={watch('fileExtension') || 'XLSX'}
              onChange={(e) => setValue('fileExtension', e.target.value as string)}
              size="small"
            >
              {FILE_EXTENSION_OPTIONS.map((ext) => (
                <MenuItem key={ext} value={ext}>
                  {ext}
                </MenuItem>
              ))}
            </Select>
          )}

          {formType === 'financial-period' && (
            <Select
              fullWidth
              height={48}
              label="دوره گزارش"
              value={
                financialPeriodOptions.find((p) => p.title === watch('title'))
                  ?.id || ''
              }
              onChange={(e) => {
                const selected = financialPeriodOptions.find((p) => p.id === e.target.value);
                if (selected) {
                  setValue('title', selected.title);
                  if (!watch('label')) {
                    setValue('label', selected.title);
                  }
                }
              }}
              size="small"
            >
              <MenuItem value="">دوره گزارش را انتخاب کنید</MenuItem>
              {financialPeriodOptions.map((period) => (
                <MenuItem key={period.id} value={period.id}>
                  {period.title}
                </MenuItem>
              ))}
            </Select>
          )}

          <TextField
            fullWidth
            height={48}
            label="کد فیلد"
            {...register('code')}
            disabled
            error={!!errors.code}
            helperText={errors.code?.message}
            sx={{
              bgcolor: 'neutral.200',
              '& .MuiInputBase-input': {
                bgcolor: 'neutral.200',
              },
            }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              py: 1.5,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              فعال‌سازی فیلد
            </Typography>
            <Toggle
              checked={watch('isActive')}
              onChange={(e, checked) => setValue('isActive', checked)}
              color="primary"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              type="button"
              onClick={onCancel}
              variant="outlined"
              fullWidth
              buttonSize="M"
            >
              انصراف
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isValid}
              fullWidth
              buttonSize="M"
            >
              ثبت
            </Button>
          </Box>
        </Box>
      </form>
      )}
    </Box>
  );
}

