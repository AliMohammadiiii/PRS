import * as React from 'react';
import { X, Calendar } from 'lucide-react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
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
  Select,
  MenuItem,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { Organization, OrganizationFormData } from 'src/types/operations';
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown';
import { z } from 'zod';
import { PersianDatePicker } from '@/components/ui/persian-date-picker';

const organizationSchema = z.object({
  name: z.string().min(1, 'نام شرکت الزامی است'),
  type: z.string().optional(),
  registrationNumber: z.string().optional(),
  reportGroups: z.array(z.string()).optional(),
  legalEntityType: z.string().optional(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
  registrationDate: z.string().optional(),
  subIndustry: z.string().optional(),
  industry: z.string().optional(),
  websiteUrl: z.string().optional(),
  parentHolding: z.string().optional(),
  isActive: z.boolean(),
  parentId: z.string().optional(),
});

type FormData = z.infer<typeof organizationSchema>;

const groupOptions = [
  { value: 'financial', label: 'گروه مالی' },
  { value: 'service', label: 'گروه خدماتی' },
  { value: 'commercial', label: 'گروه تجاری' },
  { value: 'investment', label: 'گروه سرمایه‌گذاری' },
];

export interface AddOrganizationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: OrganizationFormData) => void;
  initialData?: Organization | null;
  organizations: Organization[];
}

export function AddOrganizationModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  organizations,
}: AddOrganizationModalProps) {
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(organizationSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      type: '',
      registrationNumber: '',
      reportGroups: [],
      legalEntityType: '',
      nationalId: '',
      economicCode: '',
      registrationDate: '',
      subIndustry: '',
      industry: '',
      websiteUrl: '',
      parentHolding: '',
      isActive: true,
      parentId: undefined,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name || '',
          type: initialData.type || '',
          registrationNumber: initialData.registrationNumber || '',
          reportGroups: initialData.reportGroups || [],
          legalEntityType: initialData.legalEntityType || '',
          nationalId: initialData.nationalId || '',
          economicCode: initialData.economicCode || '',
          registrationDate: initialData.registrationDate || '',
          subIndustry: initialData.subIndustry || '',
          industry: initialData.industry || '',
          websiteUrl: initialData.websiteUrl || '',
          parentHolding: initialData.parentHolding || '',
          isActive: initialData.isActive,
          parentId: initialData.parentId,
        });
      } else {
        reset({
          name: '',
          type: '',
          registrationNumber: '',
          reportGroups: [],
          legalEntityType: '',
          nationalId: '',
          economicCode: '',
          registrationDate: '',
          subIndustry: '',
          industry: '',
          websiteUrl: '',
          parentHolding: '',
          isActive: true,
          parentId: undefined,
        });
      }
    }
  }, [initialData, open, reset]);

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    onSubmit(data as OrganizationFormData);
    onOpenChange(false);
  };

  const modalTitle = initialData ? 'ویرایش سازمان' : 'افزودن سازمان';

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} width={600}>
      <Box sx={{ p: 4, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
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
              label="نام شرکت *"
              fullWidth
              height={48}
              size="small"
              {...register('name')}
              placeholder="نام شرکت"
              error={!!errors.name}
              helperText={errors.name?.message}
              endAdornment={
                watch('name') !== '' ? (
                  <IconButton
                    size="small"
                    onClick={() => setValue('name', '')}
                  >
                    <X size={20} color={defaultColors.neutral.light} />
                  </IconButton>
                ) : undefined
              }
            />

            <FormControl fullWidth>
              <InputLabel>نوع سازمان</InputLabel>
              <Select
                value={watch('type') || ''}
                onChange={(e) => setValue('type', e.target.value as string)}
                height={48}
                size="small"
              >
                <MenuItem value="">انتخاب کنید</MenuItem>
                <MenuItem value="هلدینگ">هلدینگ</MenuItem>
                <MenuItem value="شرکت">شرکت</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="شماره ثبت"
              fullWidth
              height={48}
              size="small"
              {...register('registrationNumber')}
              placeholder="شماره ثبت"
              error={!!errors.registrationNumber}
              helperText={errors.registrationNumber?.message}
            />

            <Box>
              <MultiSelectDropdown
                label="گروه گزارش"
                options={groupOptions}
                value={watch('reportGroups') || []}
                onChange={(value) => setValue('reportGroups', value)}
                placeholder="گروه را انتخاب کنید"
              />
            </Box>

            <TextField
              label="نوع شخصیت حقوقی"
              fullWidth
              height={48}
              size="small"
              {...register('legalEntityType')}
              placeholder="نوع شخصیت حقوقی"
              error={!!errors.legalEntityType}
              helperText={errors.legalEntityType?.message}
            />

            <TextField
              label="شناسه ملی"
              fullWidth
              height={48}
              size="small"
              {...register('nationalId')}
              placeholder="شناسه ملی"
              error={!!errors.nationalId}
              helperText={errors.nationalId?.message}
            />

            <TextField
              label="کد اقتصادی"
              fullWidth
              height={48}
              size="small"
              {...register('economicCode')}
              placeholder="کد اقتصادی"
              error={!!errors.economicCode}
              helperText={errors.economicCode?.message}
            />

            <Controller
              name="registrationDate"
              control={control}
              render={({ field }) => (
                <PersianDatePicker
                  label="تاریخ ثبت/تأسیس"
                  fullWidth
                  height={48}
                  size="small"
                  value={field.value || null}
                  onChange={field.onChange}
                  placeholder="تاریخ ثبت/تأسیس"
                  error={!!errors.registrationDate}
                  helperText={errors.registrationDate?.message}
                  startAdornment={
                    <Calendar size={20} color={defaultColors.neutral.light} />
                  }
                />
              )}
            />

            <TextField
              label="زیرصنعت"
              fullWidth
              height={48}
              size="small"
              {...register('subIndustry')}
              placeholder="زیرصنعت"
              error={!!errors.subIndustry}
              helperText={errors.subIndustry?.message}
            />

            <TextField
              label="صنعت"
              fullWidth
              height={48}
              size="small"
              {...register('industry')}
              placeholder="صنعت"
              error={!!errors.industry}
              helperText={errors.industry?.message}
            />

            <TextField
              label="لینک وبسایت رسمی"
              fullWidth
              height={48}
              size="small"
              {...register('websiteUrl')}
              placeholder="لینک وبسایت رسمی"
              error={!!errors.websiteUrl}
              helperText={errors.websiteUrl?.message}
            />

            <TextField
              label="هلدینگ بالاسری (در صورت وجود)"
              fullWidth
              height={48}
              size="small"
              {...register('parentHolding')}
              placeholder="هلدینگ بالاسری (در صورت وجود)"
              error={!!errors.parentHolding}
              helperText={errors.parentHolding?.message}
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
              sx={{ height: 48, borderRadius: 2, mt: 2 }}
            >
              ثبت
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
}

export default AddOrganizationModal;

