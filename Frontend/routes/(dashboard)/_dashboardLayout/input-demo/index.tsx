import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, ChangeEvent } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  TextField,
  Typography,
  OtpInput,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  IconButton,
  Divider,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { appColors } from 'src/theme/colors';
import { Call, SearchNormal1, Clock, ArrowRight } from 'iconsax-reactjs';
import PageHeader from '../../components/PageHeader';
import ContentBox from '@shared/components/ContentBox';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/input-demo/')({
  component: InputDemoPage,
});

// Zod schemas for form validation
const mobileSchema = z.object({
  mobile: z
    .string()
    .length(11, 'شماره موبایل باید 11 رقم باشد')
    .refine((val) => val.startsWith('09'), {
      message: 'شماره موبایل باید با 09 شروع شود',
    }),
});

const userInfoSchema = z.object({
  name: z.string().min(1, 'نام الزامی است'),
  email: z.string().email('ایمیل معتبر نیست'),
  age: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num > 0 && num < 150;
  }, 'سن باید عدد معتبر باشد'),
  city: z.string().min(1, 'شهر الزامی است'),
  gender: z.enum(['male', 'female'], {
    required_error: 'جنسیت الزامی است',
  }),
  country: z.string().min(1, 'کشور الزامی است'),
});

type MobileFormData = z.infer<typeof mobileSchema>;
type UserInfoFormData = z.infer<typeof userInfoSchema>;

function InputDemoPage() {
  // State for OTP
  const [otp, setOtp] = useState('');
  const [otpExpireTime, setOtpExpireTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');
  const [isOtpValid, setIsOtpValid] = useState<'expired' | 'valid' | 'loading'>('expired');

  // State for Radio
  const [radioValue, setRadioValue] = useState('option1');

  // State for Select
  const [selectValue, setSelectValue] = useState('10');

  // Mobile form with react-hook-form
  const {
    register: registerMobile,
    handleSubmit: handleMobileSubmit,
    formState: { errors: mobileErrors, isValid: isMobileValid },
  } = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
    mode: 'onChange',
  });

  // User info form with react-hook-form
  const {
    register: registerUserInfo,
    handleSubmit: handleUserInfoSubmit,
    formState: { errors: userInfoErrors, isValid: isUserInfoValid },
    setValue: setUserInfoValue,
    watch: watchUserInfo,
  } = useForm<UserInfoFormData>({
    resolver: zodResolver(userInfoSchema),
    mode: 'onChange',
    defaultValues: {
      gender: 'male',
      country: '',
    },
  });

  // OTP form with react-hook-form
  const {
    register: registerOtp,
    setValue: setOtpValue,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm<{ otp: string }>({
    defaultValues: { otp: '' },
  });

  // Update OTP form value when otp state changes
  useEffect(() => {
    setOtpValue('otp', otp);
  }, [otp, setOtpValue]);

  // OTP countdown timer
  useEffect(() => {
    if (!otpExpireTime) {
      setIsOtpValid('expired');
      return;
    }

    const interval = setInterval(() => {
      const remainingOtpTime = otpExpireTime - Date.now();

      if (remainingOtpTime <= 0) {
        clearInterval(interval);
        setCountdown('0:00');
        setIsOtpValid('expired');
        return;
      }

      const totalSeconds = Math.floor(remainingOtpTime / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      setCountdown(formattedTime);
      setIsOtpValid('valid');
    }, 1000);

    return () => clearInterval(interval);
  }, [otpExpireTime]);

  // Form handlers
  const onMobileSubmit: SubmitHandler<MobileFormData> = async (data) => {
    
    // Set OTP expire time (2 minutes from now)
    const expireAt = Date.now() + 2 * 60 * 1000;
    setOtpExpireTime(expireAt);
    setIsOtpValid('valid');
    alert(`شماره موبایل ثبت شد: ${data.mobile}`);
  };

  const onUserInfoSubmit: SubmitHandler<UserInfoFormData> = async (data) => {
    
    alert('اطلاعات کاربر با موفقیت ثبت شد!');
  };

  const onOtpSubmit = async () => {
    if (otp.length === 5) {
      
      alert(`کد تایید ثبت شد: ${otp}`);
    }
  };

  const resendOtp = () => {
    setIsOtpValid('loading');
    const expireAt = Date.now() + 2 * 60 * 1000;
    setOtpExpireTime(expireAt);
    setOtp('');
  };

  const handleRadioChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRadioValue((event.target as HTMLInputElement).value);
    setUserInfoValue('gender', (event.target as HTMLInputElement).value as 'male' | 'female');
  };

  const handleSelectChange = (event: any) => {
    const value = event.target.value as string;
    setSelectValue(value);
  };

  return (
    <>
      <PageHeader
        title="نمایش تمامی کامپوننت‌های ورودی"
        breadcrumb={['داشبورد', 'نمایش کامپوننت‌ها']}
      />

      <ContentBox>
        <Box display="flex" flexDirection="column" dir="rtl" gap={6}>
          {/* Section 1: TextField Examples */}
          <Box>
            <Typography variant="h2" fontWeight={700} mb={4}>
              1. TextField Examples
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* Basic TextField with react-hook-form */}
              <Box
                component="form"
                onSubmit={handleMobileSubmit(onMobileSubmit)}
                sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
              >
                <Typography variant="h3" fontWeight={600} mb={2}>
                  TextField با react-hook-form و Zod
                </Typography>
                <TextField
                  label="شماره موبایل"
                  startAdornment={
                    <Call size="20" color={defaultColors.neutral.light} />
                  }
                  {...registerMobile('mobile')}
                  error={!!mobileErrors.mobile}
                  helperText={mobileErrors.mobile?.message}
                  inputProps={{
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                    onKeyPress: (e: any) => {
                      if (!/[0-9]/.test(e.key)) {
                        e.preventDefault();
                      }
                    },
                  }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!isMobileValid}
                  sx={{ width: 'fit-content' }}
                >
                  ثبت شماره موبایل
                </Button>
              </Box>

              <Divider />

              {/* TextField with Search Icon */}
              <Box>
                <Typography variant="h3" fontWeight={600} mb={2}>
                  TextField با آیکون جستجو
                </Typography>
                <TextField
                  height={46}
                  fullWidth
                  startAdornment={
                    <SearchNormal1 size="20" color={defaultColors.neutral.light} />
                  }
                  placeholder="جستجو..."
                />
              </Box>

              <Divider />

              {/* TextField Small Size */}
              <Box>
                <Typography variant="h3" fontWeight={600} mb={2}>
                  TextField با اندازه کوچک
                </Typography>
                <TextField
                  fullWidth
                  height={40}
                  size="small"
                  startAdornment={
                    <SearchNormal1 size="20" color={defaultColors.neutral.light} />
                  }
                  placeholder="جستجوی مشتری"
                />
              </Box>
            </Box>
          </Box>

          {/* Section 2: OTP Input */}
          <Box>
            <Typography variant="h2" fontWeight={700} mb={4}>
              2. OtpInput Example
            </Typography>
            <Box
              component="form"
              onSubmit={handleOtpSubmit(onOtpSubmit)}
              sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
            >
              <Box px={7} dir="ltr">
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  length={5}
                  separator={<span style={{ paddingLeft: '4px' }}></span>}
                  inputProps={{
                    width: '46px',
                    height: '48px',
                    backgroundColor: defaultColors.neutral[100],
                    focusedBorderColor: appColors.primary.main,
                    error: !!otpErrors.otp,
                  }}
                />
                {otpErrors.otp && (
                  <Box alignItems="start" dir="rtl" mt={2}>
                    <Typography variant="label1" color="error">
                      {otpErrors.otp.message}
                    </Typography>
                  </Box>
                )}
              </Box>
              <input type="hidden" {...registerOtp('otp')} />

              {isOtpValid === 'valid' ? (
                <Box
                  textAlign="center"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap={1}
                >
                  <Typography fontWeight={700} color={defaultColors.neutral.main} mt={0.5}>
                    {countdown}
                  </Typography>
                  <Clock size={20} color={defaultColors.neutral[900]} />
                </Box>
              ) : isOtpValid === 'expired' ? (
                <Button onClick={resendOtp} variant="outlined">
                  کد جدید می‌خوام؟
                </Button>
              ) : null}

              <Button
                type="submit"
                variant="contained"
                disabled={otp.length < 5 || isOtpValid !== 'valid'}
                sx={{ width: 'fit-content' }}
              >
                تایید کد
              </Button>
            </Box>
          </Box>

          {/* Section 3: Radio & RadioGroup */}
          <Box>
            <Typography variant="h2" fontWeight={700} mb={4}>
              3. Radio & RadioGroup Example
            </Typography>
            <FormControl>
              <RadioGroup
                row
                value={radioValue}
                onChange={handleRadioChange}
                sx={{ ml: 3 }}
              >
                <FormControlLabel
                  sx={{
                    border: 1,
                    borderRadius: 2,
                    pr: 3,
                    borderColor: defaultColors.neutral[300],
                    color: defaultColors.neutral.main,
                  }}
                  value="male"
                  control={<Radio size="small" />}
                  label="مرد"
                />
                <FormControlLabel
                  sx={{
                    border: 1,
                    borderRadius: 2,
                    pr: 3,
                    ml: 2,
                    borderColor: defaultColors.neutral[300],
                    color: defaultColors.neutral.main,
                  }}
                  value="female"
                  control={<Radio size="small" />}
                  label="زن"
                />
              </RadioGroup>
            </FormControl>
            <Typography variant="body2" color="neutral.light" mt={2}>
              انتخاب شده: {radioValue === 'male' ? 'مرد' : 'زن'}
            </Typography>
          </Box>

          {/* Section 4: Select & MenuItem */}
          <Box>
            <Typography variant="h2" fontWeight={700} mb={4}>
              4. Select & MenuItem Example
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="label1">تعداد در صفحه:</Typography>
              <Select
                value={selectValue}
                size="small"
                onChange={handleSelectChange}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="10">10</MenuItem>
                <MenuItem value="25">25</MenuItem>
                <MenuItem value="50">50</MenuItem>
                <MenuItem value="100">100</MenuItem>
              </Select>
            </Box>
            <Typography variant="body2" color="neutral.light" mt={2}>
              انتخاب شده: {selectValue}
            </Typography>
          </Box>

          {/* Section 5: Complete Form Example */}
          <Box>
            <Typography variant="h2" fontWeight={700} mb={4}>
              5. فرم کامل با تمام کامپوننت‌ها
            </Typography>
            <Box
              component="form"
              onSubmit={handleUserInfoSubmit(onUserInfoSubmit)}
              sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <TextField
                label="نام و نام خانوادگی"
                {...registerUserInfo('name')}
                error={!!userInfoErrors.name}
                helperText={userInfoErrors.name?.message}
                fullWidth
              />

              <TextField
                label="ایمیل"
                type="email"
                {...registerUserInfo('email')}
                error={!!userInfoErrors.email}
                helperText={userInfoErrors.email?.message}
                fullWidth
              />

              <TextField
                label="سن"
                {...registerUserInfo('age')}
                error={!!userInfoErrors.age}
                helperText={userInfoErrors.age?.message}
                inputProps={{
                  inputMode: 'numeric',
                  pattern: '[0-9]*',
                }}
                fullWidth
              />

              <TextField
                label="شهر"
                {...registerUserInfo('city')}
                error={!!userInfoErrors.city}
                helperText={userInfoErrors.city?.message}
                fullWidth
              />

              <FormControl>
                <Typography variant="body2" mb={1} color="neutral.main">
                  جنسیت *
                </Typography>
                <RadioGroup
                  row
                  value={watchUserInfo('gender')}
                  onChange={handleRadioChange}
                  sx={{ ml: 3 }}
                >
                  <FormControlLabel
                    sx={{
                      border: 1,
                      borderRadius: 2,
                      pr: 3,
                      borderColor: defaultColors.neutral[300],
                      color: defaultColors.neutral.main,
                    }}
                    value="male"
                    control={<Radio size="small" />}
                    label="مرد"
                  />
                  <FormControlLabel
                    sx={{
                      border: 1,
                      borderRadius: 2,
                      pr: 3,
                      ml: 2,
                      borderColor: defaultColors.neutral[300],
                      color: defaultColors.neutral.main,
                    }}
                    value="female"
                    control={<Radio size="small" />}
                    label="زن"
                  />
                </RadioGroup>
                {userInfoErrors.gender && (
                  <Typography variant="label1" color="error" mt={1}>
                    {userInfoErrors.gender.message}
                  </Typography>
                )}
              </FormControl>

              <Box>
                <Typography variant="body2" mb={1} color="neutral.main">
                  کشور *
                </Typography>
                <Select
                  value={watchUserInfo('country')}
                  onChange={(e) => {
                    setUserInfoValue('country', e.target.value as string);
                  }}
                  fullWidth
                  error={!!userInfoErrors.country}
                >
                  <MenuItem value="">انتخاب کنید</MenuItem>
                  <MenuItem value="iran">ایران</MenuItem>
                  <MenuItem value="usa">آمریکا</MenuItem>
                  <MenuItem value="uk">انگلستان</MenuItem>
                  <MenuItem value="germany">آلمان</MenuItem>
                </Select>
                {userInfoErrors.country && (
                  <Typography variant="label1" color="error" mt={1}>
                    {userInfoErrors.country.message}
                  </Typography>
                )}
              </Box>

              <Button
                type="submit"
                variant="contained"
                disabled={!isUserInfoValid}
                sx={{ width: 'fit-content', mt: 2 }}
              >
                ثبت اطلاعات
              </Button>
            </Box>
          </Box>
        </Box>
      </ContentBox>
    </>
  );
}

