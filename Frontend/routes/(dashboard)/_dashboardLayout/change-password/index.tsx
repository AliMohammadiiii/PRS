import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { Lock1, Eye, EyeSlash } from 'iconsax-reactjs';
import { appColors } from 'src/theme/colors';
import PageHeader from '../../components/PageHeader';
import PasswordRequirements from './components/PasswordRequirements';
import * as authApi from 'src/services/api/auth';

const schema = z
  .object({
    old_password: z.string().min(1, 'رمز عبور فعلی الزامی است'),
    new_password: z.string().min(1, 'رمز عبور جدید الزامی است'),
    confirm_password: z.string().min(1, 'تکرار رمز عبور الزامی است'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'رمز عبور جدید و تکرار آن مطابقت ندارند',
    path: ['confirm_password'],
  })
  .refine((data) => data.new_password.length >= 8, {
    message: 'رمز عبور باید حداقل ۸ کارکتر باشد',
    path: ['new_password'],
  })
  .refine((data) => /[a-z]/.test(data.new_password) && /[A-Z]/.test(data.new_password), {
    message: 'رمز عبور باید شامل حروف کوچک و بزرگ انگلیسی باشد',
    path: ['new_password'],
  })
  .refine((data) => /\d/.test(data.new_password), {
    message: 'رمز عبور باید حداقل یک عدد داشته باشد',
    path: ['new_password'],
  })
  .refine((data) => /[@%&*!?#$^()_+\-=\[\]{};':"\\|,.<>\/]/.test(data.new_password), {
    message: 'رمز عبور باید حداقل یک سمبل داشته باشد',
    path: ['new_password'],
  });

type FormData = z.infer<typeof schema>;

export const Route = createFileRoute(
  '/(dashboard)/_dashboardLayout/change-password/'
)({
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const newPassword = watch('new_password', '');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await authApi.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_password: data.confirm_password,
      });
      setSuccess('رمز عبور با موفقیت تغییر یافت.');
      // Reset form
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.old_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.confirm_password?.[0] ||
        err.response?.data?.detail ||
        err.message ||
        'خطا در تغییر رمز عبور. لطفاً دوباره تلاش کنید.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const allRequirementsMet =
    newPassword.length >= 8 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword) &&
    /[@%&*!?#$^()_+\-=\[\]{};':"\\|,.<>\/]/.test(newPassword);

  return (
    <Box>
      <PageHeader title="تغییر رمز عبور" breadcrumb={['تغییر رمز عبور']}>
        <Button
          variant="contained"
          disabled={!isValid || loading || !allRequirementsMet}
          onClick={handleSubmit(onSubmit)}
          loading={loading}
          sx={{
            bgcolor: defaultColors.neutral[300],
            color: defaultColors.neutral.light,
            borderRadius: 1,
            px: 3,
            py: 1.25,
            fontSize: '14px',
            fontWeight: 700,
            '&:hover': {
              bgcolor: defaultColors.neutral[400],
            },
            '&:disabled': {
              bgcolor: defaultColors.neutral[300],
              color: defaultColors.neutral.light,
            },
          }}
        >
          ثبت رمز عبور جدید
        </Button>
      </PageHeader>

      <Box
        sx={{
          mt: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 3,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 488,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10, // Increased spacing between title and inputs
                alignItems: 'flex-start', // Flipped: was flex-end, now flex-start
                width: '100%',
              }}
            >
              <Typography
                sx={{
                  fontSize: '16px',
                  fontWeight: 700,
                  lineHeight: '22px',
                  color: defaultColors.neutral.dark,
                  textAlign: 'right',
                  fontFamily: "'IRANYekanXFaNum', sans-serif",
                }}
              >
                رمز عبور جدید رو ثبت کن
              </Typography>

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10, // 80px spacing between inputs
                  width: '100%',
                }}
              >
                {/* Current Password Field */}
                <Box sx={{ position: 'relative', width: '100%' }}>
                  <TextField
                    label="رمز عبور فعلی"
                    type={showOldPassword ? 'text' : 'password'}
                    fullWidth
                    height={48}
                    {...register('old_password')}
                    error={!!errors.old_password}
                    helperText={errors.old_password?.message}
                    disabled={loading}
                    startAdornment={
                      <Lock1 size={20} color={defaultColors.neutral.light} />
                    }
                    endAdornment={
                      <IconButton
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        sx={{
                          p: 0,
                          minWidth: 'auto',
                          width: 20,
                          height: 20,
                        }}
                      >
                        {showOldPassword ? (
                          <EyeSlash
                            size={20}
                            color={defaultColors.neutral.light}
                          />
                        ) : (
                          <Eye size={20} color={defaultColors.neutral.light} />
                        )}
                      </IconButton>
                    }
                    sx={{
                      '& .MuiInputBase-root': {
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>

                {/* New Password Field */}
                <Box sx={{ position: 'relative', width: '100%' }}>
                  <TextField
                    label="رمز عبور جدید"
                    type={showNewPassword ? 'text' : 'password'}
                    fullWidth
                    height={48}
                    {...register('new_password')}
                    error={!!errors.new_password}
                    helperText={errors.new_password?.message}
                    disabled={loading}
                    startAdornment={
                      <Lock1 size={20} color={defaultColors.neutral.light} />
                    }
                    endAdornment={
                      <IconButton
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        sx={{
                          p: 0,
                          minWidth: 'auto',
                          width: 20,
                          height: 20,
                        }}
                      >
                        {showNewPassword ? (
                          <EyeSlash
                            size={20}
                            color={defaultColors.neutral.light}
                          />
                        ) : (
                          <Eye size={20} color={defaultColors.neutral.light} />
                        )}
                      </IconButton>
                    }
                    sx={{
                      '& .MuiInputBase-root': {
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>

                {/* Confirm Password Field */}
                <Box sx={{ position: 'relative', width: '100%' }}>
                  <TextField
                    label="تکرار رمز عبور جدید"
                    type={showConfirmPassword ? 'text' : 'password'}
                    fullWidth
                    height={48}
                    {...register('confirm_password')}
                    error={!!errors.confirm_password}
                    helperText={errors.confirm_password?.message}
                    disabled={loading}
                    startAdornment={
                      <Lock1 size={20} color={defaultColors.neutral.light} />
                    }
                    endAdornment={
                      <IconButton
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        sx={{
                          p: 0,
                          minWidth: 'auto',
                          width: 20,
                          height: 20,
                        }}
                      >
                        {showConfirmPassword ? (
                          <EyeSlash
                            size={20}
                            color={defaultColors.neutral.light}
                          />
                        ) : (
                          <Eye size={20} color={defaultColors.neutral.light} />
                        )}
                      </IconButton>
                    }
                    sx={{
                      '& .MuiInputBase-root': {
                        borderRadius: 1,
                      },
                    }}
                  />
                </Box>
              </Box>

              {/* Password Requirements */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1, // 8px gap
                  alignItems: 'flex-start', // Flipped: was flex-end, now flex-start
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <PasswordRequirements password={newPassword || ''} />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Error Message */}
        {error && (
          <Box
            sx={{
              p: 2,
              bgcolor: '#fee',
              borderRadius: 1,
              border: '1px solid #fcc',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: '#c00',
                textAlign: 'center',
              }}
            >
              {error}
            </Typography>
          </Box>
        )}

        {/* Success Message */}
        {success && (
          <Box
            sx={{
              p: 2,
              bgcolor: '#efe',
              borderRadius: 1,
              border: '1px solid #cfc',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: '#0c0',
                textAlign: 'center',
              }}
            >
              {success}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

