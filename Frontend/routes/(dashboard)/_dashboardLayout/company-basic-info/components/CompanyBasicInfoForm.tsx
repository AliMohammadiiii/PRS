import { FC, useEffect, useState } from 'react';
import logger from "@/lib/logger";
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Grid,
  TextField,
  Typography,
  Button,
  Select,
  MenuItem,
} from 'injast-core/components';
import { Chip } from '@mui/material';
import { defaultColors } from 'injast-core/constants';
import { OrgNode } from 'src/types/api/organizations';
import { UserMeResponse } from 'src/types/api/auth';
import { z } from 'zod';
import * as lookupApi from 'src/services/api/lookups';
import * as orgApi from 'src/services/api/organizations';
import { Lookup } from 'src/types/api/lookups';
import { CompanyRole } from 'src/types/api/auth';
import { Calendar } from 'lucide-react';
import { PersianDatePicker } from '@/components/ui/persian-date-picker';

const companyBasicInfoSchema = z.object({
  // User Information
  nationalId: z.string().optional(),
  fullName: z.string().optional(),
  mobileNumber: z.string().optional(),
  positionInCompany: z.string().optional(),
  
  // Company Basic Information
  legalEntityTypeId: z.string().optional().nullable(),
  companyName: z.string().optional(),
  registrationNumber: z.string().optional().nullable(),
  companyNationalId: z.string().optional().nullable(),
  economicCode: z.string().optional().nullable(),
  incorporationDate: z.string().optional().nullable(),
  subIndustryId: z.string().optional().nullable(),
  industryId: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  parentHoldingId: z.string().optional().nullable(),
  companyClassificationIds: z.array(z.string()).optional().nullable(),
});

type FormData = z.infer<typeof companyBasicInfoSchema>;

type CompanyBasicInfoFormProps = {
  companyData: OrgNode | null;
  userData: UserMeResponse | null;
  selectedCompany: OrgNode;
  onSave: (data: Partial<OrgNode>) => Promise<void>;
};

const CompanyBasicInfoForm: FC<CompanyBasicInfoFormProps> = ({
  companyData,
  userData,
  selectedCompany,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [legalEntityTypeOptions, setLegalEntityTypeOptions] = useState<Lookup[]>([]);
  const [industryOptions, setIndustryOptions] = useState<Lookup[]>([]);
  const [subIndustryOptions, setSubIndustryOptions] = useState<Lookup[]>([]);
  const [positionOptions, setPositionOptions] = useState<CompanyRole[]>([]);
  const [parentNodeOptions, setParentNodeOptions] = useState<OrgNode[]>([]);
  const [classificationOptions, setClassificationOptions] = useState<Lookup[]>([]);
  const [parentNodeName, setParentNodeName] = useState<string>('');

  // Helper function to convert null to empty string for Select components
  const nullToEmpty = (value: string | null | undefined): string => {
    return value || '';
  };

  // Helper function to extract ID from nested lookup object
  const getLookupId = (lookup: Lookup | null | undefined): string => {
    return lookup?.id || '';
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(companyBasicInfoSchema),
    mode: 'onChange',
    defaultValues: {
      nationalId: userData?.username || '',
      fullName: userData?.username || '',
      mobileNumber: '',
      positionInCompany: '',
      legalEntityTypeId: nullToEmpty(companyData?.legal_entity_type?.id || companyData?.legal_entity_type_id),
      companyName: companyData?.name || '',
      registrationNumber: companyData?.registration_number || '',
      companyNationalId: companyData?.national_id || '',
      economicCode: companyData?.economic_code || '',
      incorporationDate: companyData?.incorporation_date || '',
      subIndustryId: getLookupId(companyData?.sub_industry),
      industryId: getLookupId(companyData?.industry),
      websiteUrl: companyData?.website_url || '',
        parentHoldingId: companyData?.parent_id || companyData?.parent?.id || '',
      companyClassificationIds: companyData?.company_classifications?.map((cc: Lookup) => cc.id) || [],
    },
  });

  // Load lookup options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [lookups, orgNodes] = await Promise.all([
          lookupApi.getLookups(),
          orgApi.getOrgNodes().catch(() => []),
        ]);

        setLegalEntityTypeOptions(
          lookups.filter((l) => l.type === 'LEGAL_ENTITY_TYPE')
        );
        setIndustryOptions(
          lookups.filter((l) => l.type === 'INDUSTRY_TYPE')
        );
        setSubIndustryOptions(
          lookups.filter((l) => l.type === 'SUB_INDUSTRY_TYPE')
        );
        
        // Load company classification lookups (type: COMPANY_CLASSIFICATION)
        setClassificationOptions(
          lookups.filter((l) => l.type === 'COMPANY_CLASSIFICATION' && l.is_active)
        );
        
        // Get roles for current company from userData
        if (userData?.company_roles && selectedCompany?.id) {
          const companyRoles = userData.company_roles[selectedCompany.id] || [];
          setPositionOptions(companyRoles);
        } else {
          setPositionOptions([]);
        }
        
        // Filter parent nodes (exclude current company and show only HOLDING types)
        let parentNodes = orgNodes.filter(
          (node) => node.id !== selectedCompany?.id && node.node_type === 'HOLDING'
        );
        
        // If company has a parent, ensure it's in the options even if it wasn't in the filtered list
        if (companyData?.parent) {
          const parentId = companyData.parent.id;
          const parentName = companyData.parent.name;
          let parentNode = orgNodes.find((node) => node.id === parentId);
          
          if (parentNode) {
            // Parent found in orgNodes - add to options if not already there
            if (!parentNodes.find((node) => node.id === parentId)) {
              parentNodes = [parentNode, ...parentNodes];
            }
          } else if (parentName) {
            // If parent is not in orgNodes but we have the name from companyData,
            // create a minimal node from companyData.parent
            // This ensures the parent appears in the dropdown
            const parentFromData: OrgNode = {
              id: parentId,
              name: parentName,
              node_type: 'HOLDING',
              code: '',
              registration_number: null,
              national_id: null,
              economic_code: null,
              incorporation_date: null,
              website_url: null,
              is_active: true,
              created_at: '',
              updated_at: '',
            };
            if (!parentNodes.find((node) => node.id === parentId)) {
              parentNodes = [parentFromData, ...parentNodes];
            }
          }
        }
        
        setParentNodeOptions(parentNodes);
      } catch (error) {
        logger.error('Error loading options:',  error);
      }
    };

    loadOptions();
  }, [userData?.id, userData?.company_roles, selectedCompany?.id, companyData]);

  // Reset form when company data or position options change
  useEffect(() => {
    if (companyData) {
      // Get initial position from first role if available
      const initialPosition = positionOptions.length > 0 ? positionOptions[0].id || '' : '';
      
      reset({
        nationalId: userData?.username || '',
        fullName: userData?.username || '',
        mobileNumber: '',
        positionInCompany: initialPosition,
        legalEntityTypeId: nullToEmpty(companyData.legal_entity_type?.id || companyData.legal_entity_type_id),
        companyName: companyData.name || '',
        registrationNumber: companyData.registration_number || '',
        companyNationalId: companyData.national_id || '',
        economicCode: companyData.economic_code || '',
        incorporationDate: companyData.incorporation_date || '',
        subIndustryId: getLookupId(companyData.sub_industry),
        industryId: getLookupId(companyData.industry),
        websiteUrl: companyData.website_url || '',
        parentHoldingId: companyData.parent_id || companyData.parent?.id || '',
        companyClassificationIds: companyData.company_classifications?.map((cc: Lookup) => cc.id) || [],
      });
    }
  }, [companyData, userData, reset, positionOptions]);

  // Set parent node name from companyData when it changes
  useEffect(() => {
    if (companyData?.parent) {
      setParentNodeName(companyData.parent.name);
    } else {
      setParentNodeName('');
    }
  }, [companyData]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSaving(true);
      // Convert empty strings to null for API
      const emptyToNull = (value: string | null | undefined): string | null => {
        return value && value.trim() !== '' ? value : null;
      };
      
      await onSave({
        name: data.companyName,
        legal_entity_type_id: emptyToNull(data.legalEntityTypeId),
        registration_number: emptyToNull(data.registrationNumber),
        national_id: emptyToNull(data.companyNationalId),
        economic_code: emptyToNull(data.economicCode),
        incorporation_date: emptyToNull(data.incorporationDate),
        sub_industry_id: emptyToNull(data.subIndustryId),
        industry_id: emptyToNull(data.industryId),
        website_url: emptyToNull(data.websiteUrl),
        parent_id: emptyToNull(data.parentHoldingId),
        company_classification_ids: data.companyClassificationIds || [],
      });
      setIsEditing(false);
    } catch (error: any) {
      logger.error('Error saving:',  error);
      alert(error.message || 'خطا در ذخیره اطلاعات');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={10}>
        {/* User Information Section */}
        <Grid size={12}>
          <Typography
            variant="h6"
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: defaultColors.neutral?.dark || defaultColors.neutral?.[900] || '#242933',
              mb: 2.5,
            }}
          >
            اطلاعات کاربر
          </Typography>
          <Grid container spacing={10}>
            <Grid size={6}>
              <TextField
                {...register('nationalId')}
                fullWidth
                height={48}
                placeholder="کدملی"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('fullName')}
                fullWidth
                height={48}
                placeholder="نام و نام‌خانوادگی"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('mobileNumber')}
                fullWidth
                height={48}
                placeholder="شماره موبایل"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="positionInCompany"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || '')}
                    fullWidth
                    height={48}
                    size="small"
                    disabled={!isEditing}
                    displayEmpty
                    sx={{
                      borderRadius: 1,
                      '& .MuiSelect-select': {
                        py: 2,
                        px: 1.5,
                        fontSize: '14px',
                        color: field.value
                          ? (defaultColors.neutral?.main || defaultColors.neutral?.[700] || '#4F545E')
                          : (defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F'),
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      سمت در شرکت
                    </MenuItem>
                    {positionOptions.map((role) => (
                      <MenuItem key={role.id} value={role.id}>
                        {role.position_title || role.title || 'بدون عنوان'}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Company Basic Information Section */}
        <Grid size={12}>
          <Typography
            variant="h6"
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: defaultColors.neutral?.dark || defaultColors.neutral?.[900] || '#242933',
              mb: 2.5,
            }}
          >
            اطلاعات پایه شرکت
          </Typography>
          <Grid container spacing={10}>
            <Grid size={6}>
              <Controller
                name="legalEntityTypeId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || '')}
                    fullWidth
                    height={48}
                    size="small"
                    disabled={!isEditing}
                    displayEmpty
                    sx={{
                      borderRadius: 1,
                      '& .MuiSelect-select': {
                        py: 2,
                        px: 1.5,
                        fontSize: '14px',
                        color: field.value
                          ? (defaultColors.neutral?.main || defaultColors.neutral?.[700] || '#4F545E')
                          : (defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F'),
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      نوع شخصیت حقوقی
                    </MenuItem>
                    {legalEntityTypeOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('companyName')}
                fullWidth
                height={48}
                placeholder="نام شرکت"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('registrationNumber')}
                fullWidth
                height={48}
                placeholder="شماره ثبت"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('companyNationalId')}
                fullWidth
                height={48}
                placeholder="شناسه ملی"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('economicCode')}
                fullWidth
                height={48}
                placeholder="کد اقتصادی"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="incorporationDate"
                control={control}
                render={({ field }) => (
                  <PersianDatePicker
                    value={field.value}
                    onChange={field.onChange}
                    fullWidth
                    height={48}
                    placeholder="تاریخ ثبت/تأسیس"
                    disabled={!isEditing}
                    startAdornment={
                      <Calendar size={20} color={defaultColors.neutral.light} />
                    }
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                      },
                    }}
                  />
                )}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="subIndustryId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || '')}
                    fullWidth
                    height={48}
                    size="small"
                    disabled={!isEditing}
                    displayEmpty
                    sx={{
                      borderRadius: 1,
                      '& .MuiSelect-select': {
                        py: 2,
                        px: 1.5,
                        fontSize: '14px',
                        color: field.value
                          ? (defaultColors.neutral?.main || defaultColors.neutral?.[700] || '#4F545E')
                          : (defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F'),
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      زیرصنعت
                    </MenuItem>
                    {subIndustryOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="industryId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => field.onChange(e.target.value || '')}
                    fullWidth
                    height={48}
                    size="small"
                    disabled={!isEditing}
                    displayEmpty
                    sx={{
                      borderRadius: 1,
                      '& .MuiSelect-select': {
                        py: 2,
                        px: 1.5,
                        fontSize: '14px',
                        color: field.value
                          ? (defaultColors.neutral?.main || defaultColors.neutral?.[700] || '#4F545E')
                          : (defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F'),
                      },
                    }}
                  >
                    <MenuItem value="" disabled>
                      صنعت
                    </MenuItem>
                    {industryOptions.map((option) => (
                      <MenuItem key={option.id} value={option.id}>
                        {option.title}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                {...register('websiteUrl')}
                fullWidth
                height={48}
                placeholder="لینک وبسایت رسمی"
                disabled={!isEditing}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  },
                }}
              />
            </Grid>
            <Grid size={6}>
              <Controller
                name="parentHoldingId"
                control={control}
                render={({ field }) => {
                  return (
                    <Select
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value || '')}
                      fullWidth
                      height={48}
                      size="small"
                      disabled={!isEditing}
                      displayEmpty
                      renderValue={(selected) => {
                        if (!selected || selected === '') {
                          return (
                            <Typography variant="body2" sx={{ color: defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F' }}>
                              هلدینگ بالاسری (در صورت وجود)
                            </Typography>
                          );
                        }
                        
                        // Get parent name from options or from companyData
                        const node = parentNodeOptions.find((n) => n.id === selected);
                        if (node) {
                          return node.name;
                        }
                        
                        // If parent is in companyData, use its name
                        if (companyData?.parent && companyData.parent.id === selected) {
                          return companyData.parent.name;
                        }
                        
                        // Use stored parent name if available
                        if (parentNodeName && field.value === selected) {
                          return parentNodeName;
                        }
                        
                        // Don't show UUID if we don't have the name yet - show placeholder instead
                        return (
                          <Typography variant="body2" sx={{ color: defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F' }}>
                            در حال بارگذاری...
                          </Typography>
                        );
                      }}
                      sx={{
                        borderRadius: 1,
                        '& .MuiSelect-select': {
                          py: 2,
                          px: 1.5,
                          fontSize: '14px',
                          color: field.value
                            ? (defaultColors.neutral?.main || defaultColors.neutral?.[700] || '#4F545E')
                            : (defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F'),
                        },
                      }}
                    >
                      <MenuItem value="">
                        <em style={{ fontStyle: 'normal' }}>هلدینگ بالاسری (در صورت وجود)</em>
                      </MenuItem>
                      {parentNodeOptions.map((node) => (
                        <MenuItem key={node.id} value={node.id}>
                          {node.name}
                        </MenuItem>
                      ))}
                    </Select>
                  );
                }}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Company Classifications Section */}
        <Grid size={12} sx={{ mt: 3 }}>
          <Typography
            variant="h6"
            sx={{
              fontSize: '16px',
              fontWeight: 700,
              color: defaultColors.neutral?.dark || defaultColors.neutral?.[900] || '#242933',
              mb: 2.5,
            }}
          >
            دسته‌بندی شرکت
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {watch('companyClassificationIds') && watch('companyClassificationIds').length > 0 ? (
              classificationOptions
                .filter((opt) => (watch('companyClassificationIds') || []).includes(opt.id))
                .map((cc) => (
                  <Chip
                    key={cc.id}
                    label={cc.title}
                    size="medium"
                    sx={{
                      height: '32px',
                      fontSize: '14px',
                      bgcolor: defaultColors.primary?.light || '#e3f2fd',
                      color: defaultColors.primary?.main || '#1976d2',
                      '& .MuiChip-label': {
                        px: 1.5,
                      },
                    }}
                  />
                ))
            ) : (
              <Typography variant="body2" sx={{ color: defaultColors.neutral?.light || defaultColors.neutral?.[500] || '#91969F' }}>
                دسته‌بندی‌ای انتخاب نشده است
              </Typography>
            )}
          </Box>
        </Grid>

        {/* Action Buttons */}
        <Grid size={12}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            {!isEditing ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsEditing(true)}
              >
                ویرایش
              </Button>
            ) : (
              <>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to current company data
                    if (companyData) {
                      reset({
                        nationalId: userData?.username || '',
                        fullName: userData?.username || '',
                        mobileNumber: '',
                        positionInCompany: '',
                        legalEntityTypeId: nullToEmpty(companyData.legal_entity_type?.id || companyData.legal_entity_type_id),
                        companyName: companyData.name || '',
                        registrationNumber: companyData.registration_number || '',
                        companyNationalId: companyData.national_id || '',
                        economicCode: companyData.economic_code || '',
                        incorporationDate: companyData.incorporation_date || '',
                        subIndustryId: getLookupId(companyData.sub_industry),
                        industryId: getLookupId(companyData.industry),
                        websiteUrl: companyData.website_url || '',
                        parentHoldingId: companyData.parent_id || '',
                        companyClassificationIds: companyData.company_classifications?.map((cc: Lookup) => cc.id) || [],
                        financialGroupId: '',
                      });
                    }
                  }}
                  disabled={isSaving}
                >
                  انصراف
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'در حال ذخیره...' : 'ذخیره'}
                </Button>
              </>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CompanyBasicInfoForm;

