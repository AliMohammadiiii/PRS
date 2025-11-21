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
import { BasicInfoItem } from 'src/types/basicInfo';
import { z } from 'zod';

const basicInfoSchema = z.object({
  title: z.string().min(1, 'عنوان الزامی است'),
  isActive: z.boolean(),
});

type FormData = z.infer<typeof basicInfoSchema>;

export type BasicInfoFormData = {
  title: string;
  isActive: boolean;
};

export interface AddBasicInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BasicInfoFormData) => void;
  initialData?: BasicInfoItem | null;
  categoryTitle: string;
}

export function AddBasicInfoModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  categoryTitle,
}: AddBasicInfoModalProps) {
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(basicInfoSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          title: initialData.title,
          isActive: initialData.status === 'active',
        });
      } else {
        reset({
          title: '',
          isActive: true,
        });
      }
    }
  }, [initialData, open, reset]);

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    onSubmit(data);
    onOpenChange(false);
  };

  const modalTitle = initialData
    ? `ویرایش ${categoryTitle}`
    : `افزودن ${categoryTitle}`;

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
              label="عنوان"
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

