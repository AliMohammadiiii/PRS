import { createFileRoute, useNavigate, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Box, Button, TextField, Typography, Image, IconButton } from 'injast-core/components';
import { useAuth } from 'src/client/contexts/AuthContext';
import { defaultColors } from 'injast-core/constants';
import { User, Lock1, Eye, EyeSlash, CloseCircle } from 'iconsax-reactjs';
import { appColors } from 'src/theme/colors';
import { getAccessToken } from 'src/client/contexts/AuthContext';
import { hasRole } from 'src/shared/utils/prsUtils';
import type { UserMeResponse } from 'src/types/api/auth';
import * as authApi from 'src/services/api/auth';
import { useIsMobile } from '@/hooks/use-mobile';

// Logo - use specific login SVG logo from public assets
// Use BASE_URL from Vite to handle subpath deployment
const logoUrl = `${import.meta.env.BASE_URL}LoginLogo.svg`;

const schema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

type FormData = z.infer<typeof schema>;

// Centralised helper so login submit & login route guard use the same logic
const getDefaultLandingRoute = (u: UserMeResponse): string => {
  if (u.is_admin || hasRole(u, 'ADMIN')) {
    // Admins can see everything; route them to approvals inbox
    return '/prs/inbox';
  }
  if (hasRole(u, 'APPROVER')) {
    // Approvers land on their approvals inbox (UA-02)
    return '/prs/inbox';
  }
  // Requesters land on "My Requests" (UA-01 expectation)
  return '/prs/my-requests';
};

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      // Use the same role-based landing rules as the login submit handler
      const user = await authApi.getMe();
      const target = getDefaultLandingRoute(user);

      throw redirect({
        to: target,
      });
    } catch {
      // If we can't fetch the user (e.g. token expired), let the user see the login page
      return;
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const isMobile = useIsMobile();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
  });

  const username = watch('username');
  const password = watch('password');

  if (isMobile) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100%',
          bgcolor: 'white',
          px: 3,
        }}
      >
        <Typography
          variant="h6"
          sx={{
            textAlign: 'center',
            color: '#242933',
            fontSize: '18px',
            fontWeight: 500,
            lineHeight: 1.6,
          }}
        >
          برای استفاده از اپلیکیشن لطفا از لپ‌تاپ استفاده کنید
        </Typography>
      </Box>
    );
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError(null);
    setLoading(true);
    try {
      const user = await login(data.username, data.password);

      navigate({ to: getDefaultLandingRoute(user) });
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'ورود ناموفق بود. لطفاً نام کاربری و رمز عبور را بررسی کنید.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearUsername = () => {
    setValue('username', '');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#181D26',
        px: 3,
        colorScheme: 'light',
        '& *': {
          colorScheme: 'light',
        },
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 352,
          bgcolor: 'white',
          borderRadius: 3,
          px: 4,
          py: 5,
          position: 'relative',
          // Force light mode for all MUI components inside
          '& .MuiButton-root': {
            color: 'inherit',
          },
          '& .MuiTextField-root': {
            '& .MuiInputBase-root': {
              backgroundColor: 'white',
              color: '#242933',
            },
            '& .MuiInputLabel-root': {
              color: '#4F545E',
            },
          },
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mb: 6,
          }}
        >
          <Image
            src={logoUrl}
            alt="CFO WIZE Logo"
            width="80px"
            height={53.313}
            objectFit="contain"
          />
        </Box>

        {/* Title and Subtitle */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: '16px',
              lineHeight: '22px',
              color: defaultColors.neutral.dark,
              mb: 3,
              textAlign: 'left',
            }}
          >
            ورود به دشبورد
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: '14px',
              lineHeight: '24px',
              color: defaultColors.neutral.light,
              textAlign: 'left',
            }}
          >
            نام کاربری و رمز عبور رو وارد کن
          </Typography>
        </Box>

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {/* Username Field */}
          <Box>
            <TextField
              label="نام کاربری"
              fullWidth
              height={48}
              {...register('username')}
              error={!!errors.username}
              helperText={errors.username?.message}
              disabled={loading}
              startAdornment={
                <User size={20} color={defaultColors.neutral.light} />
              }
              endAdornment={
                username ? (
                  <IconButton
                    onClick={handleClearUsername}
                    sx={{
                      p: 0,
                      minWidth: 'auto',
                      width: 20,
                      height: 20,
                    }}
                  >
                    <CloseCircle size={20} color={defaultColors.neutral.light} />
                  </IconButton>
                ) : null
              }
              sx={{
                '& .MuiInputBase-root': {
                  borderRadius: 1,
                },
              }}
            />
          </Box>

          {/* Password Field */}
          <Box>
            <TextField
              label="رمز عبور"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              height={48}
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={loading}
              startAdornment={
                <Lock1 size={20} color={defaultColors.neutral.light} />
              }
              endAdornment={
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  sx={{
                    p: 0,
                    minWidth: 'auto',
                    width: 20,
                    height: 20,
                  }}
                >
                  {showPassword ? (
                    <EyeSlash size={20} color={defaultColors.neutral.light} />
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

          {/* Forgot Password Link (UI only; backend flow not yet implemented) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mt: -1,
            }}
          >
            <Typography
              component="button"
              type="button"
              onClick={() => {}}
              sx={{
                fontSize: '12px',
                fontWeight: 700,
                lineHeight: '14px',
                color: appColors.primary.main,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              رمز عبور رو فراموش کردم
            </Typography>
          </Box>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={!isValid || loading}
            loading={loading}
            sx={{
              height: 48,
              borderRadius: 3,
              bgcolor: appColors.primary.main,
              fontSize: '14px',
              fontWeight: 700,
              lineHeight: '24px',
              '&:hover': {
                bgcolor: appColors.primary.dark,
              },
              '&:disabled': {
                bgcolor: defaultColors.neutral[300],
                color: defaultColors.neutral.light,
              },
            }}
          >
            تأیید و ادامه
          </Button>

          {/* Terms and Conditions (static text only; no navigation wired yet) */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 0.5,
              mt: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: '12px',
                lineHeight: '20px',
                color: defaultColors.neutral.light,
                textAlign: 'center',
              }}
            >
              با ورود یعنی{' '}
              <Typography
                component="span"
                sx={{
                  fontSize: '12px',
                  lineHeight: '20px',
                  color: appColors.primary.main,
                  cursor: 'pointer',
                }}
                onClick={() => {}}
              >
                قوانین و مقررات
              </Typography>{' '}
              رو قبول می‌کنی.
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

