import * as React from 'react';
import { X } from 'lucide-react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Modal,
  IconButton,
  Button,
  TextField,
  Toggle,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from 'injast-core/components';
import { User, UserFormData, Organization } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import { User as ApiUser } from 'src/types/api/users';
import { z } from 'zod';

const userSchema = z.object({
  userType: z.enum(['new', 'existing']),
  existingUserId: z.string().optional(),
  name: z.string().optional(),
  nationalId: z.string().optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string().min(1, 'سمت در شرکت الزامی است'),
  organizationId: z.string().min(1, 'عنوان سازمان الزامی است'),
  isActive: z.boolean(),
}).refine((data) => {
  if (data.userType === 'new') {
    return data.name && data.name.length > 0 && data.nationalId && data.nationalId.length > 0 && data.password && data.password.length > 0;
  } else {
    return data.existingUserId && data.existingUserId.length > 0;
  }
}, {
  message: 'لطفا تمام فیلدهای الزامی را پر کنید',
  path: ['userType'],
});

type FormData = z.infer<typeof userSchema>;

export interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: User) => void;
  initialData?: User | null;
  organizations: Organization[];
  roles: BasicInfoItem[]; // position-in-company items
  existingUsers?: ApiUser[]; // List of existing users for access scope creation
}

export function AddUserModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  organizations,
  roles,
  existingUsers = [],
}: AddUserModalProps) {
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isValid },
    setValue,
    watch,
    reset,
    control,
  } = useForm<FormData>({
    resolver: zodResolver(userSchema),
    mode: 'onChange',
    defaultValues: {
      userType: 'new',
      existingUserId: '',
      name: '',
      nationalId: '',
      password: '',
      phoneNumber: '',
      role: '',
      organizationId: '',
      isActive: false,
    },
  });

  const userType = watch('userType');
  const existingUserId = watch('existingUserId');

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          userType: 'existing',
          existingUserId: initialData.id,
          name: initialData.name,
          nationalId: initialData.nationalId,
          password: '',
          phoneNumber: initialData.phoneNumber || '',
          role: initialData.role,
          organizationId: initialData.organizationId || '',
          isActive: initialData.isActive,
        });
      } else {
        reset({
          userType: 'new',
          existingUserId: '',
          name: '',
          nationalId: '',
          password: '',
          phoneNumber: '',
          role: '',
          organizationId: '',
          isActive: false,
        });
      }
    }
  }, [initialData, open, reset]);

  // Update name and nationalId when existing user is selected
  React.useEffect(() => {
    if (userType === 'existing' && existingUserId) {
      const selectedUser = existingUsers.find(u => u.id === existingUserId);
      if (selectedUser) {
        setValue('name', `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username);
        setValue('nationalId', selectedUser.national_code || '');
        setValue('phoneNumber', selectedUser.mobile_phone || '');
      }
    }
  }, [userType, existingUserId, existingUsers, setValue]);

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    const userData: User = {
      id: data.userType === 'existing' && data.existingUserId ? data.existingUserId : (initialData?.id || `user-${Date.now()}`),
      name: data.name || '',
      nationalId: data.nationalId || '',
      phoneNumber: data.phoneNumber,
      role: data.role,
      organizationId: data.organizationId,
      isActive: data.isActive,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      password: data.password, // Include password for new users
      userType: data.userType, // Include user type
    };
    onSubmit(userData);
    onOpenChange(false);
  };

  return (
    <Modal open={open} onClose={() => onOpenChange(false)} width={551}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          p: 4,
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 40,
          }}
        >
          <IconButton
            onClick={() => onOpenChange(false)}
            sx={{
              width: 40,
              height: 40,
            }}
          >
            <X size={20} />
          </IconButton>
          <Typography
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'neutral.secondary',
            }}
          >
            افزودن کاربر
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleFormSubmit(onSubmitForm)}
          sx={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <Controller
            name="userType"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>نوع کاربر *</InputLabel>
                <Select
                  value={field.value || 'new'}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={!!errors.userType}
                  height={48}
                  size="small"
                >
                  <MenuItem value="new">کاربر جدید</MenuItem>
                  <MenuItem value="existing">کاربر موجود</MenuItem>
                </Select>
                {errors.userType && (
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: 'error.main',
                      mt: 0.5,
                    }}
                  >
                    {errors.userType.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          {userType === 'existing' && (
            <Controller
              name="existingUserId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth>
                  <InputLabel>انتخاب کاربر موجود *</InputLabel>
                  <Select
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={field.onBlur}
                    error={!!errors.existingUserId}
                    height={48}
                    size="small"
                  >
                    <MenuItem value="">انتخاب کنید</MenuItem>
                    {existingUsers.length > 0 &&
                      existingUsers.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username} ({user.national_code || user.username})
                        </MenuItem>
                      ))}
                  </Select>
                  {errors.existingUserId && (
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: 'error.main',
                        mt: 0.5,
                      }}
                    >
                      {errors.existingUserId.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
          )}

          {userType === 'new' && (
            <>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="نام و نام خانوادگی *"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="nationalId"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="کدملی *"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={!!errors.nationalId}
                    helperText={errors.nationalId?.message}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="رمز عبور *"
                    type="password"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                  />
                )}
              />
            </>
          )}

          {(userType === 'existing' && existingUserId) && (
            <>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="نام و نام خانوادگی"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />

              <Controller
                name="nationalId"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="کدملی"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled
                    error={!!errors.nationalId}
                    helperText={errors.nationalId?.message}
                  />
                )}
              />
            </>
          )}


          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>سمت در شرکت *</InputLabel>
                <Select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={!!errors.role}
                  height={48}
                  size="small"
                >
                  <MenuItem value="">انتخاب کنید</MenuItem>
                  {roles.length > 0 &&
                    roles.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.title}
                      </MenuItem>
                    ))}
                </Select>
                {errors.role && (
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: 'error.main',
                      mt: 0.5,
                    }}
                  >
                    {errors.role.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          <Controller
            name="phoneNumber"
            control={control}
            render={({ field }) => (
              <TextField
                label="شماره موبایل"
                fullWidth
                height={48}
                size="small"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={userType === 'existing' && !!existingUserId}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber?.message}
              />
            )}
          />

          <Controller
            name="organizationId"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>عنوان سازمان *</InputLabel>
                <Select
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  error={!!errors.organizationId}
                  height={48}
                  size="small"
                >
                  <MenuItem value="">انتخاب کنید</MenuItem>
                  {organizations.length > 0 &&
                    organizations.map((org) => (
                      <MenuItem key={org.id} value={org.id}>
                        {org.name}
                      </MenuItem>
                    ))}
                </Select>
                {errors.organizationId && (
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: 'error.main',
                      mt: 0.5,
                    }}
                  >
                    {errors.organizationId.message}
                  </Typography>
                )}
              </FormControl>
            )}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: '16px',
                fontWeight: 500,
                color: 'neutral.secondary',
              }}
            >
              فعالسازی کاربر
            </Typography>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Toggle
                  checked={field.value || false}
                  onChange={(checked) => {
                    field.onChange(checked);
                  }}
                />
              )}
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={!isValid}
            sx={{
              height: 48,
              borderRadius: 1,
              mt: 2,
            }}
          >
            ثبت
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}

