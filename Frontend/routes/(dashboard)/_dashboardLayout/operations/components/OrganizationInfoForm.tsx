import { FC, useEffect, useState } from 'react';
import logger from "@/lib/logger";
import { X, Calendar } from 'lucide-react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  TextField,
  Toggle,
  Typography,
  IconButton,
  Button,
  Select,
  MenuItem,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { Organization, OrganizationFormData } from 'src/types/operations';
import { MultiSelectDropdown, SelectOption } from '@/components/ui/multi-select-dropdown';
import OrganizationInfoEmptyState from './OrganizationInfoEmptyState';
import { z } from 'zod';
import * as lookupApi from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';
import { PersianDatePicker } from '@/components/ui/persian-date-picker';

const organizationSchema = z.object({
  name: z.string().min(1, 'نام شرکت الزامی است'),
  type: z.string().optional(),
  registrationNumber: z.string().optional(),
  companyClassifications: z.array(z.string()).optional(),
  legalEntityTypeId: z.string().optional(),
  nationalId: z.string().optional(),
  economicCode: z.string().optional(),
  registrationDate: z.string().optional(),
  subIndustryId: z.string().optional(),
  industryId: z.string().optional(),
  websiteUrl: z.string().optional(),
  parentHolding: z.string().optional(),
  isActive: z.boolean(),
  parentId: z.string().optional(),
});

type FormData = z.infer<typeof organizationSchema>;

type OrganizationInfoFormProps = {
  organizations: Organization[];
  selectedOrganization: Organization | null;
  onSelectOrganization: (id: string | null) => void;
  onSave: (org: Organization) => void;
  onAdd: (org: Organization) => void;
  onStartAdding?: (callback: () => void) => void;
};

const OrganizationInfoForm: FC<OrganizationInfoFormProps> = ({
  organizations,
  selectedOrganization,
  onSelectOrganization,
  onSave,
  onAdd,
  onStartAdding,
}) => {
  // Track if user has started adding (clicked the add button)
  const [hasStartedAdding, setHasStartedAdding] = useState(false);
  const [companyClassificationOptions, setCompanyClassificationOptions] = useState<SelectOption[]>([]);
  const [industryOptions, setIndustryOptions] = useState<SelectOption[]>([]);
  const [subIndustryOptions, setSubIndustryOptions] = useState<SelectOption[]>([]);
  const [legalEntityTypeOptions, setLegalEntityTypeOptions] = useState<SelectOption[]>([]);

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
      companyClassifications: [],
      legalEntityTypeId: '',
      nationalId: '',
      economicCode: '',
      registrationDate: '',
      subIndustryId: '',
      industryId: '',
      websiteUrl: '',
      parentHolding: '',
      isActive: true,
      parentId: undefined,
    },
  });

  // Load lookups from API (company classifications, industry, sub-industry, and legal entity type)
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const lookups = await lookupApi.getLookups();
        
        // Filter and map company classification options
        const companyClassifications = lookups
          .filter((l) => l.type === 'COMPANY_CLASSIFICATION' && l.is_active)
          .map((lookup) => ({
            value: lookup.id,
            label: lookup.title,
          }));
        setCompanyClassificationOptions(companyClassifications);
        
        // Filter and map industry options
        const industries = lookups
          .filter((l) => l.type === 'INDUSTRY_TYPE' && l.is_active)
          .map((lookup) => ({
            value: lookup.id,
            label: lookup.title,
          }));
        setIndustryOptions(industries);

        // Filter and map sub-industry options
        const subIndustries = lookups
          .filter((l) => l.type === 'SUB_INDUSTRY_TYPE' && l.is_active)
          .map((lookup) => ({
            value: lookup.id,
            label: lookup.title,
          }));
        setSubIndustryOptions(subIndustries);

        // Filter and map legal entity type options
        const legalEntityTypes = lookups
          .filter((l) => l.type === 'LEGAL_ENTITY_TYPE' && l.is_active)
          .map((lookup) => ({
            value: lookup.id,
            label: lookup.title,
          }));
        setLegalEntityTypeOptions(legalEntityTypes);
      } catch (error) {
        logger.error('Error loading lookups:',  error);
      }
    };
    loadLookups();
  }, []);

  // Update form when selected organization changes
  useEffect(() => {
    if (selectedOrganization) {
      const formValues: FormData = {
        name: selectedOrganization.name || '',
        type: selectedOrganization.type || '',
        registrationNumber: selectedOrganization.registrationNumber || '',
        companyClassifications: selectedOrganization.companyClassifications || [],
        legalEntityTypeId: selectedOrganization.legalEntityTypeId || '',
        nationalId: selectedOrganization.nationalId || '',
        economicCode: selectedOrganization.economicCode || '',
        registrationDate: selectedOrganization.registrationDate || '',
        subIndustryId: selectedOrganization.subIndustryId || '',
        industryId: selectedOrganization.industryId || '',
        websiteUrl: selectedOrganization.websiteUrl || '',
        parentHolding: selectedOrganization.parentHolding || '',
        isActive: selectedOrganization.isActive,
        parentId: selectedOrganization.parentId || '',
      };
      reset(formValues, { keepDefaultValues: false });
    } else if (!hasStartedAdding) {
      // Reset form when no organization is selected (only if not in adding mode)
      reset({
        name: '',
        type: '',
        registrationNumber: '',
        companyClassifications: [],
        legalEntityTypeId: '',
        nationalId: '',
        economicCode: '',
        registrationDate: '',
        subIndustryId: '',
        industryId: '',
        websiteUrl: '',
        parentHolding: '',
        isActive: true,
        parentId: undefined,
      }, { keepDefaultValues: false });
    }
  }, [selectedOrganization?.id, selectedOrganization?.updatedAt, reset, hasStartedAdding]);

  const onSubmitForm: SubmitHandler<FormData> = (data) => {
    const now = new Date().toISOString();
    if (selectedOrganization) {
      // Update existing organization
      const org: Organization = {
        id: selectedOrganization.id,
        name: data.name,
        type: data.type || '',
        registrationNumber: data.registrationNumber || '',
        companyClassifications: data.companyClassifications || [],
        legalEntityTypeId: data.legalEntityTypeId || undefined,
        nationalId: data.nationalId || '',
        economicCode: data.economicCode || '',
        registrationDate: data.registrationDate || '',
        subIndustryId: data.subIndustryId || undefined,
        industryId: data.industryId || undefined,
        websiteUrl: data.websiteUrl || '',
        parentHolding: data.parentHolding || '',
        isActive: data.isActive,
        parentId: data.parentId,
        createdAt: selectedOrganization.createdAt,
        updatedAt: now,
      };
      onSave(org);
      // Clear form and deselect after update
      onSelectOrganization(null);
      reset({
        name: '',
        type: '',
        registrationNumber: '',
        companyClassifications: [],
        legalEntityTypeId: '',
        nationalId: '',
        economicCode: '',
        registrationDate: '',
        subIndustryId: '',
        industryId: '',
        websiteUrl: '',
        parentHolding: '',
        isActive: true,
        parentId: undefined,
      }, { keepDefaultValues: false });
      setHasStartedAdding(false);
    } else {
      // Add new organization
      const org: Organization = {
        id: `org-${Date.now()}-${Math.random()}`,
        name: data.name,
        type: data.type || '',
        registrationNumber: data.registrationNumber || '',
        companyClassifications: data.companyClassifications || [],
        legalEntityTypeId: data.legalEntityTypeId || undefined,
        nationalId: data.nationalId || '',
        economicCode: data.economicCode || '',
        registrationDate: data.registrationDate || '',
        subIndustryId: data.subIndustryId || undefined,
        industryId: data.industryId || undefined,
        websiteUrl: data.websiteUrl || '',
        parentHolding: data.parentHolding || '',
        isActive: data.isActive,
        parentId: data.parentId,
        createdAt: now,
        updatedAt: now,
      };
      onAdd(org);
      // Clear form after adding (don't select the new organization)
      onSelectOrganization(null);
      reset({
        name: '',
        type: '',
        registrationNumber: '',
        companyClassifications: [],
        legalEntityTypeId: '',
        nationalId: '',
        economicCode: '',
        registrationDate: '',
        subIndustryId: '',
        industryId: '',
        websiteUrl: '',
        parentHolding: '',
        isActive: true,
        parentId: undefined,
      }, { keepDefaultValues: false });
      setHasStartedAdding(false);
    }
  };

  useEffect(() => {
    // When selectedOrganization becomes null and there are organizations, user is adding
    if (organizations.length > 0 && !selectedOrganization) {
      setHasStartedAdding(true);
    } else if (selectedOrganization) {
      setHasStartedAdding(false);
    }
  }, [selectedOrganization, organizations.length]);

  // Expose function to start adding mode
  useEffect(() => {
    if (onStartAdding) {
      onStartAdding(() => {
        setHasStartedAdding(true);
      });
    }
  }, [onStartAdding]);

  // Show empty state only when there are no organizations AND user hasn't clicked add button
  const showEmptyState = organizations.length === 0 && !hasStartedAdding;

  if (showEmptyState) {
    return (
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'neutral.dark',
          }}
        >
          اطلاعات سازمان
        </Typography>
        <OrganizationInfoEmptyState />
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <Typography
          sx={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'neutral.dark',
          }}
        >
          اطلاعات سازمان
        </Typography>

        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: 2,
            px: 4,
            py: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <Box
            component="form"
            onSubmit={handleFormSubmit(onSubmitForm)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                label="نام شرکت"
                fullWidth
                height={48}
                size="small"
                value={field.value || ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="نام شرکت"
                error={!!errors.name}
                helperText={errors.name?.message}
                endAdornment={
                  field.value !== '' ? (
                    <IconButton
                      size="small"
                      onClick={() => setValue('name', '')}
                    >
                      <X size={20} color={defaultColors.neutral.light} />
                    </IconButton>
                  ) : undefined
                }
              />
            )}
          />

          <Select
            value={watch('type') || ''}
            onChange={(e) => setValue('type', e.target.value as string)}
            fullWidth
            height={48}
            size="small"
            displayEmpty
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="" disabled>
              نوع سازمان
            </MenuItem>
            <MenuItem value="HOLDING">هلدینگ</MenuItem>
            <MenuItem value="COMPANY">شرکت</MenuItem>
          </Select>

          <TextField
            label="شماره ثبت"
            fullWidth
            height={48}
            size="small"
            {...register('registrationNumber')}
            placeholder="شماره ثبت"
            error={!!errors.registrationNumber}
            helperText={errors.registrationNumber?.message}
            endAdornment={
              watch('registrationNumber') !== '' ? (
                <IconButton
                  size="small"
                  onClick={() => setValue('registrationNumber', '')}
                >
                  <X size={20} color={defaultColors.neutral.light} />
                </IconButton>
              ) : undefined
            }
          />

          <Box>
            <MultiSelectDropdown
              label="گروه گزارش"
              options={companyClassificationOptions}
              value={watch('companyClassifications') || []}
              onChange={(value) => setValue('companyClassifications', value)}
              placeholder="گروه را انتخاب کنید"
            />
          </Box>

          <Select
            value={watch('legalEntityTypeId') || ''}
            onChange={(e) => setValue('legalEntityTypeId', e.target.value as string)}
            fullWidth
            height={48}
            size="small"
            displayEmpty
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="" disabled>
              نوع شخصیت حقوقی
            </MenuItem>
            {legalEntityTypeOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

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

          <Select
            value={watch('industryId') || ''}
            onChange={(e) => setValue('industryId', e.target.value as string)}
            fullWidth
            height={48}
            size="small"
            displayEmpty
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="" disabled>
              صنعت
            </MenuItem>
            {industryOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

          <Select
            value={watch('subIndustryId') || ''}
            onChange={(e) => setValue('subIndustryId', e.target.value as string)}
            fullWidth
            height={48}
            size="small"
            displayEmpty
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="" disabled>
              زیرصنعت
            </MenuItem>
            {subIndustryOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>

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

          <Select
            value={watch('parentId') || ''}
            onChange={(e) => {
              const value = e.target.value as string;
              if (!value) {
                setValue('parentId', undefined);
                setValue('parentHolding', '');
              } else {
                const parentOrg = organizations.find((o) => o.id === value);
                setValue('parentId', value);
                setValue('parentHolding', parentOrg?.name || '');
              }
            }}
            fullWidth
            height={48}
            size="small"
            displayEmpty
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1,
              },
            }}
          >
            <MenuItem value="" disabled>
              هلدینگ بالاسری (در صورت وجود)
            </MenuItem>
            {organizations
              .filter((org) => {
                // Only show HOLDING organizations as potential parents
                // Exclude the current organization being edited
                return org.type === 'HOLDING' && org.id !== selectedOrganization?.id;
              })
              .map((org) => (
                <MenuItem key={org.id} value={org.id}>
                  {org.name}
                </MenuItem>
              ))}
          </Select>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1,
              py: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'neutral.dark',
              }}
            >
              فعال‌سازی سازمان
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
            fullWidth
            buttonSize="M"
            disabled={!isValid}
            sx={{ height: 48, borderRadius: 2, mt: 2 }}
          >
            {selectedOrganization ? 'ذخیره تغییرات' : 'افزودن سازمان'}
          </Button>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default OrganizationInfoForm;

