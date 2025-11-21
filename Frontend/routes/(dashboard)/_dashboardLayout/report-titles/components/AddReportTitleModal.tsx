import * as React from 'react';
import { X } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Modal,
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Toggle,
  Box,
  Typography,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import {
  MultiSelectDropdown,
  type SelectOption,
} from '@/components/ui/multi-select-dropdown';
import { ReportTitleItem, ReportTitleFormData } from 'src/types/reportTitles';
import { z } from 'zod';

const reportTitleSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  groups: z.array(z.string()).min(1, 'حداقل یک گروه باید انتخاب شود'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof reportTitleSchema>;

export interface AddReportTitleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ReportTitleFormData) => void;
  initialData?: ReportTitleItem | null;
  groupOptions: SelectOption[];
}

export function AddReportTitleModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  groupOptions,
}: AddReportTitleModalProps) {
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(reportTitleSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      groups: [],
      description: '',
      isActive: false,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          title: initialData.title,
          groups: initialData.groups,
          description: initialData.description || '',
          isActive: initialData.status === 'active',
        });
      } else {
        reset({
          title: '',
          groups: [],
          description: '',
          isActive: false,
        });
      }
    }
  }, [initialData, open, reset]);

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    onSubmit(data);
    onOpenChange(false);
  };

  const modalTitle = initialData
    ? 'ویرایش عنوان گزارش'
    : 'افزودن عنوان گزارش';

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} width={551}>
      <Box sx={{ p: 4, position: 'relative' }}>
        <IconButton
          onClick={() => onOpenChange(false)}
          sx={{
            position: 'absolute',
            left: 16,
            top: 16,
            width: 40,
            height: 40,
          }}
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </IconButton>

        <Typography
          variant="h6"
          sx={{
            mb: 3,
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'right',
            pr: 0,
          }}
        >
          {modalTitle}
        </Typography>

        <form onSubmit={handleFormSubmit(onSubmitForm)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TextField
              label="عنوان گزارش"
              fullWidth
              height={48}
              size="small"
              {...register('title')}
              placeholder="عنوان را وارد کنید"
              error={!!errors.title}
              helperText={errors.title?.message}
              endAdornment={
                watch('title') !== '' ? (
                  <IconButton
                    size="small"
                    onClick={() => setValue('title', '')}
                  >
                    <X size={20} color={defaultColors.neutral.light} />
                  </IconButton>
                ) : undefined
              }
            />

            <Box sx={{ mt: 1 }}>
              <MultiSelectDropdown
                label="گروه گزارش"
                options={groupOptions}
                value={watch('groups') || []}
                onChange={(groups) => setValue('groups', groups)}
                placeholder="گروه را انتخاب کنید"
              />
              {errors.groups && (
                <Typography
                  sx={{
                    fontSize: '12px',
                    color: 'error.main',
                    mt: 0.5,
                  }}
                >
                  {errors.groups.message}
                </Typography>
              )}
            </Box>

            <TextField
              label="توضیحات"
              fullWidth
              height={48}
              size="small"
              {...register('description')}
              placeholder="توضیحات را وارد کنید"
              multiline
              rows={4}
              error={!!errors.description}
              helperText={errors.description?.message}
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
                فعالسازی
              </Typography>
              <Toggle
                checked={watch('isActive')}
                onChange={(e, checked) => setValue('isActive', checked)}
                color="primary"
              />
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isValid}
              fullWidth
              buttonSize="M"
              sx={{ height: 48, borderRadius: 2 }}
            >
              ثبت
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
}

