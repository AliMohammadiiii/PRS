import * as React from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
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
import { User, UserFormData } from 'src/types/operations';
import { BasicInfoItem } from 'src/types/basicInfo';
import { User as ApiUser } from 'src/types/api/users';
import { Team } from 'src/types/api/prs';
import { z } from 'zod';

type TeamRoleAssignment = {
  teamId: string;
  roleId: string;
};

const userSchema = z.object({
  userType: z.enum(['new', 'existing']),
  existingUserId: z.string().optional(),
  name: z.string().optional(),
  nationalId: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  phoneNumber: z.string().optional(),
  assignments: z.array(z.object({
    teamId: z.string().min(1, 'تیم الزامی است'),
    roleId: z.string().min(1, 'سمت الزامی است'),
  })),
  applyToAllTeams: z.boolean().optional(),
  allTeamsRoleId: z.string().optional(),
  isActive: z.boolean(),
}).refine((data) => {
  // Must have either applyToAllTeams with role OR at least one individual assignment
  const hasAllTeamsRole = data.applyToAllTeams && data.allTeamsRoleId && data.allTeamsRoleId.length > 0;
  const hasIndividualAssignments = data.assignments && data.assignments.some(a => a.teamId && a.roleId);
  return hasAllTeamsRole || hasIndividualAssignments;
}, {
  message: 'حداقل یک تیم و سمت باید انتخاب شود',
  path: ['assignments'],
}).refine((data) => {
  if (data.userType === 'new') {
    return (
      !!data.name &&
      data.name.length > 0 &&
      !!data.nationalId &&
      data.nationalId.length > 0 &&
      !!data.password &&
      data.password.length > 0 &&
      !!data.username &&
      data.username.length > 0
    );
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
  teams: Team[];
  roles: BasicInfoItem[]; // position-in-company items
  existingUsers?: ApiUser[]; // List of existing users for access scope creation
}

export function AddUserModal({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  teams,
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
      username: '',
      password: '',
      phoneNumber: '',
      assignments: [{ teamId: '', roleId: '' }],
      applyToAllTeams: false,
      allTeamsRoleId: '',
      isActive: false,
    },
  });

  const assignments = watch('assignments') || [];
  const applyToAllTeams = watch('applyToAllTeams') || false;
  const allTeamsRoleId = watch('allTeamsRoleId') || '';

  const userType = watch('userType');
  const existingUserId = watch('existingUserId');

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        // Map initialData.assignments to form format
        const assignments = initialData.assignments && initialData.assignments.length > 0
          ? initialData.assignments
          : initialData.organizationId && initialData.role
          ? [{
              teamId: initialData.organizationId,
              roleId: initialData.role,
              teamName: initialData.teamName || '',
              roleTitle: '',
              isActive: initialData.isActive,
            }]
          : [];

        // Separate all-teams assignments from individual ones
        let allTeamsRoleId = '';
        const individualAssignments: typeof assignments = [];
        
        // Check if there's a role that appears in all teams
        const roleCounts = new Map<string, number>();
        const teamIdsWithRole = new Map<string, Set<string>>();
        
        assignments.forEach(a => {
          if (a.roleId && a.teamId) {
            roleCounts.set(a.roleId, (roleCounts.get(a.roleId) || 0) + 1);
            if (!teamIdsWithRole.has(a.roleId)) {
              teamIdsWithRole.set(a.roleId, new Set());
            }
            teamIdsWithRole.get(a.roleId)!.add(a.teamId);
          }
        });
        
        // Find role that appears in all teams
        for (const [roleId, count] of roleCounts.entries()) {
          const teamsWithRole = teamIdsWithRole.get(roleId);
          if (teamsWithRole && teamsWithRole.size === teams.length) {
            allTeamsRoleId = roleId;
            // Keep assignments that don't match this role as individual (these override the all-teams role)
            assignments.forEach(a => {
              if (a.roleId !== roleId) {
                individualAssignments.push(a);
              }
            });
            break;
          }
        }
        
        // If no all-teams role detected, all are individual
        if (!allTeamsRoleId) {
          individualAssignments.push(...assignments);
        }
        
        const formAssignments = individualAssignments.length > 0 
          ? individualAssignments.map(a => ({
              teamId: a.teamId || '',
              roleId: a.roleId || '',
            }))
          : [{ teamId: '', roleId: '' }];

        reset({
          userType: 'existing',
          existingUserId: initialData.id,
          name: initialData.name,
          nationalId: initialData.nationalId,
          username: initialData.username || '',
          password: '',
          phoneNumber: initialData.phoneNumber || '',
          assignments: formAssignments,
          applyToAllTeams: !!allTeamsRoleId,
          allTeamsRoleId: allTeamsRoleId,
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
          assignments: [{ teamId: '', roleId: '' }],
          applyToAllTeams: false,
          allTeamsRoleId: '',
          isActive: false,
        });
      }
    }
  }, [initialData, open, reset, teams]);

  // Update name and nationalId when existing user is selected
  React.useEffect(() => {
    if (userType === 'existing' && existingUserId) {
      const selectedUser = existingUsers.find(u => u.id === existingUserId);
      if (selectedUser) {
        setValue('name', `${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.username);
        setValue('nationalId', selectedUser.national_code || '');
        setValue('phoneNumber', selectedUser.mobile_phone || '');
        setValue('username', selectedUser.username || '');
      }
    }
  }, [userType, existingUserId, existingUsers, setValue]);

  const addAssignment = () => {
    setValue('assignments', [...assignments, { teamId: '', roleId: '' }]);
  };

  const removeAssignment = (index: number) => {
    if (assignments.length > 1) {
      const newAssignments = assignments.filter((_, i) => i !== index);
      setValue('assignments', newAssignments);
    }
  };

  const updateAssignment = (index: number, field: 'teamId' | 'roleId', value: string) => {
    const newAssignments = [...assignments];
    newAssignments[index] = { ...newAssignments[index], [field]: value };
    setValue('assignments', newAssignments);
  };

  const handleApplyToAllTeamsChange = (checked: boolean) => {
    setValue('applyToAllTeams', checked);
    if (!checked) {
      // Clear all teams role when unchecking
      setValue('allTeamsRoleId', '');
    }
    // Don't clear individual assignments - allow both simultaneously
  };

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    let finalAssignments: Array<{ teamId: string; roleId: string; teamName: string; roleTitle: string; isActive: boolean }> = [];
    
    // Add all teams role if enabled
    if (data.applyToAllTeams && data.allTeamsRoleId) {
      const allTeamsAssignments = teams.map(team => ({
        teamId: team.id,
        roleId: data.allTeamsRoleId!,
        teamName: team.name,
        roleTitle: roles.find(r => r.id === data.allTeamsRoleId)?.title || '',
        isActive: data.isActive,
      }));
      finalAssignments.push(...allTeamsAssignments);
    }
    
    // Add individual team assignments (these may override all-teams assignments for specific teams)
    const individualAssignments = data.assignments
      .filter(a => a.teamId && a.roleId)
      .map(a => ({
        teamId: a.teamId,
        roleId: a.roleId,
        teamName: teams.find(t => t.id === a.teamId)?.name || '',
        roleTitle: roles.find(r => r.id === a.roleId)?.title || '',
        isActive: data.isActive,
      }));
    
    // Merge: if a team has both all-teams and individual assignment, keep the individual one
    const assignmentsMap = new Map<string, typeof finalAssignments[0]>();
    
    // First add all-teams assignments
    finalAssignments.forEach(assignment => {
      assignmentsMap.set(assignment.teamId, assignment);
    });
    
    // Then override with individual assignments (they take priority)
    individualAssignments.forEach(assignment => {
      assignmentsMap.set(assignment.teamId, assignment);
    });
    
    finalAssignments = Array.from(assignmentsMap.values());

    // Get primary assignment (first one) for backward compatibility
    const primaryAssignment = finalAssignments[0];
    
    const userData: User = {
      id: data.userType === 'existing' && data.existingUserId ? data.existingUserId : (initialData?.id || `user-${Date.now()}`),
      name: data.name || '',
      nationalId: data.nationalId || '',
      username: data.username || '',
      phoneNumber: data.phoneNumber,
      role: primaryAssignment?.roleId || '',
      organizationId: primaryAssignment?.teamId || '',
      isActive: data.isActive,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      password: data.password,
      userType: data.userType,
      assignments: finalAssignments,
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
            {initialData ? 'ویرایش کاربر' : 'افزودن کاربر'}
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
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="نام کاربری *"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={!!errors.username}
                    helperText={errors.username?.message}
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

              <Controller
                name="username"
                control={control}
                render={({ field }) => (
                  <TextField
                    label="نام کاربری"
                    fullWidth
                    height={48}
                    size="small"
                    value={field.value || ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled
                    error={!!errors.username}
                    helperText={errors.username?.message}
                  />
                )}
              />
            </>
          )}


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

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'neutral.secondary',
                }}
              >
                تیم‌ها و سمت‌ها *
              </Typography>
              {!applyToAllTeams && (
                <Button
                  type="button"
                  variant="outlined"
                  color="primary"
                  buttonSize="S"
                  onClick={addAssignment}
                  sx={{ height: 32, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <Plus size={16} />
                  افزودن
                </Button>
              )}
            </Box>

            {/* Apply to All Teams Option */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2,
                border: '1px solid',
                borderColor: 'neutral.300',
                borderRadius: 1,
                bgcolor: applyToAllTeams ? 'primary.50' : 'neutral.50',
              }}
            >
              <Typography
                sx={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'neutral.secondary',
                }}
              >
                اعمال به همه تیم‌ها
              </Typography>
              <Controller
                name="applyToAllTeams"
                control={control}
                render={({ field }) => (
                  <Toggle
                    checked={field.value || false}
                    onChange={(checked) => {
                      field.onChange(checked);
                      handleApplyToAllTeamsChange(checked);
                    }}
                  />
                )}
              />
            </Box>

            {applyToAllTeams && (
              <Box
                sx={{
                  p: 2,
                  border: '1px solid',
                  borderColor: 'neutral.300',
                  borderRadius: 1,
                  bgcolor: 'neutral.50',
                }}
              >
                <FormControl fullWidth>
                  <InputLabel>سمت برای همه تیم‌ها</InputLabel>
                  <Select
                    value={allTeamsRoleId || ''}
                    onChange={(e) => setValue('allTeamsRoleId', e.target.value)}
                    error={!!errors.allTeamsRoleId}
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
                  {errors.allTeamsRoleId && (
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: 'error.main',
                        mt: 0.5,
                      }}
                    >
                      {errors.allTeamsRoleId.message}
                    </Typography>
                  )}
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: 'neutral.light',
                      mt: 1,
                    }}
                  >
                    این سمت برای تمام تیم‌های فعال ({teams.length} تیم) اعمال خواهد شد. می‌توانید علاوه بر این، سمت‌های خاص برای تیم‌های مشخص نیز اضافه کنید.
                  </Typography>
                </FormControl>
              </Box>
            )}

            {/* Individual Team Assignments */}
            {(!applyToAllTeams || assignments.length > 0) && (
              <>

            {assignments.map((assignment, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  gap: 2,
                  alignItems: 'flex-start',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'neutral.300',
                  borderRadius: 1,
                  bgcolor: 'neutral.50',
                }}
              >
                <FormControl fullWidth>
                  <InputLabel>تیم *</InputLabel>
                  <Select
                    value={assignment.teamId || ''}
                    onChange={(e) => updateAssignment(index, 'teamId', e.target.value)}
                    error={!!errors.assignments?.[index]?.teamId}
                    height={48}
                    size="small"
                  >
                    <MenuItem value="">انتخاب کنید</MenuItem>
                    {teams.length > 0 &&
                      teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name}
                        </MenuItem>
                      ))}
                  </Select>
                  {errors.assignments?.[index]?.teamId && (
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: 'error.main',
                        mt: 0.5,
                      }}
                    >
                      {errors.assignments[index]?.teamId?.message}
                    </Typography>
                  )}
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>سمت *</InputLabel>
                  <Select
                    value={assignment.roleId || ''}
                    onChange={(e) => updateAssignment(index, 'roleId', e.target.value)}
                    error={!!errors.assignments?.[index]?.roleId}
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
                  {errors.assignments?.[index]?.roleId && (
                    <Typography
                      sx={{
                        fontSize: '12px',
                        color: 'error.main',
                        mt: 0.5,
                      }}
                    >
                      {errors.assignments[index]?.roleId?.message}
                    </Typography>
                  )}
                </FormControl>

                {assignments.length > 1 && (
                  <IconButton
                    type="button"
                    onClick={() => removeAssignment(index)}
                    sx={{
                      width: 40,
                      height: 40,
                      color: 'error.main',
                    }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                )}
              </Box>
            ))}

                {errors.assignments && typeof errors.assignments === 'object' && 'message' in errors.assignments && (
                  <Typography
                    sx={{
                      fontSize: '12px',
                      color: 'error.main',
                      mt: -1,
                    }}
                  >
                    {errors.assignments.message as string}
                  </Typography>
                )}
              </>
            )}
          </Box>

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

