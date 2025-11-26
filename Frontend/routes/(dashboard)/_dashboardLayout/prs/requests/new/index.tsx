import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Select,
  MenuItem,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { z } from 'zod';
import PageHeader from '../../../../components/PageHeader';
// Team is now selected globally in the header via TeamContext (non-admins).
// Admins can override team per request via a local dropdown on this page.
import PrsDynamicForm from '@/components/prs/PrsDynamicForm';
import PrsAttachmentsPanel from '@/components/prs/PrsAttachmentsPanel';
import {
  FormTemplateResponse,
  PurchaseRequest,
  FormField,
} from 'src/types/api/prs';
import {
  extractInitialValuesFromFieldValues,
  buildInitialValuesFromFields,
  convertFormValuesToApiFormat,
  isFieldValueEmpty,
} from '@/components/prs/fieldUtils';
import * as prsApi from 'src/services/api/prs';
import * as lookupApi from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';
import logger from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from 'src/shared/utils/prsUtils';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeam } from 'src/client/contexts/TeamContext';
import { useAuth } from 'src/client/contexts/AuthContext';

const topLevelFormSchema = z.object({
  vendor_name: z.string().min(1, 'نام فروشنده الزامی است'),
  vendor_account: z.string().min(1, 'حساب فروشنده الزامی است'),
  subject: z.string().min(1, 'موضوع الزامی است'),
  description: z.string().min(1, 'توضیحات الزامی است'),
  purchase_type: z.string().min(1, 'نوع خرید الزامی است'),
});

type TopLevelFormData = z.infer<typeof topLevelFormSchema>;

const pageSearchSchema = z.object({
  requestId: z.string().optional(),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/requests/new/')({
  component: NewPurchaseRequestPage,
  validateSearch: (search) => pageSearchSchema.parse(search),
});

function NewPurchaseRequestPage() {
  const navigate = useNavigate();
  const { requestId: editRequestId } = Route.useSearch();
  const isEditMode = !!editRequestId;
  const { selectedTeam, teams } = useTeam();
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [formTemplate, setFormTemplate] = useState<FormTemplateResponse | null>(null);
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [purchaseTypes, setPurchaseTypes] = useState<Lookup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [highlightRequiredAttachments, setHighlightRequiredAttachments] = useState(false);
  const [requiredCategoryNames, setRequiredCategoryNames] = useState<string[]>([]);
  const attachmentsSectionRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<TopLevelFormData>({
    resolver: zodResolver(topLevelFormSchema),
    mode: 'onChange',
  });

  // Load purchase types
  useEffect(() => {
    const loadPurchaseTypes = async () => {
      try {
        const lookups = await lookupApi.getLookups();
        logger.debug('All lookups loaded:', lookups.length);
        const purchaseTypeLookups = lookups.filter(
          (lookup) => lookup.type === 'PURCHASE_TYPE' && lookup.is_active
        );
        logger.debug('PURCHASE_TYPE lookups found:', purchaseTypeLookups.length, purchaseTypeLookups);
        setPurchaseTypes(purchaseTypeLookups);
        if (purchaseTypeLookups.length === 0) {
          logger.warn('No PURCHASE_TYPE lookups found. Check if they exist and are active.');
        }
      } catch (err) {
        logger.error('Error loading purchase types:', err);
      }
    };
    loadPurchaseTypes();
  }, []);

  // Load existing request for edit mode
  useEffect(() => {
    const loadExistingRequest = async () => {
      if (!editRequestId) return;

      try {
        setIsLoadingRequest(true);
        
        // Load existing request
        const existingRequest = await prsApi.getPurchaseRequest(editRequestId);
        setPurchaseRequest(existingRequest);
        setSelectedTeamId(existingRequest.team.id);

        // Load form template
        const template = await prsApi.getTeamFormTemplate(existingRequest.team.id);
        setFormTemplate(template);

        // Pre-populate top-level fields
        reset({
          vendor_name: existingRequest.vendor_name,
          vendor_account: existingRequest.vendor_account,
          subject: existingRequest.subject,
          description: existingRequest.description,
          purchase_type: existingRequest.purchase_type.code,
        });

        // Pre-populate field values using utility function
        const initialValues = extractInitialValuesFromFieldValues(existingRequest.field_values);
        
        // Merge with default values for fields that don't have values yet
        template.template.fields.forEach((field) => {
          if (!(field.id in initialValues) && field.default_value !== null && field.default_value !== undefined) {
            // Convert default_value based on field type
            switch (field.field_type) {
              case 'NUMBER':
                initialValues[field.id] = parseFloat(field.default_value);
                break;
              case 'BOOLEAN':
                initialValues[field.id] = field.default_value === 'true' || field.default_value === '1';
                break;
              default:
                initialValues[field.id] = field.default_value;
            }
          }
        });
        
        setFieldValues(initialValues);
      } catch (err: any) {
        const errorMessage = extractErrorMessage(err);
        toast({
          title: 'خطا در بارگذاری درخواست',
          description: errorMessage,
          variant: 'destructive',
        });
        logger.error('Error loading existing request:', err);
      } finally {
        setIsLoadingRequest(false);
      }
    };

    loadExistingRequest();
  }, [editRequestId, reset]);

  // Handle team selection (called from context-based auto selection above)
  const handleTeamSelect = useCallback(async (teamId: string) => {
    setSelectedTeamId(teamId);
    setFormTemplate(null);
    setPurchaseRequest(null);
    setFieldValues({});
    setFieldErrors({});
    setHighlightRequiredAttachments(false);
    setRequiredCategoryNames([]);

    try {
      setIsLoading(true);
      // Load form template
      const template = await prsApi.getTeamFormTemplate(teamId);
      setFormTemplate(template);

      // Initialize field values from default values using utility function
      const initialValues = buildInitialValuesFromFields(template.template.fields);
      setFieldValues(initialValues);
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری فرم',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading form template:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // For new requests (not edit mode), automatically use the globally selected team
  useEffect(() => {
    if (isEditMode) {
      return;
    }

    // Admins: default to first active team if nothing selected yet
    if (isAdmin) {
      if (!selectedTeamId && teams.length > 0) {
        handleTeamSelect(teams[0].id);
      }
      return;
    }

    // Non-admins: follow team selected in header
    if (selectedTeam && selectedTeam.id !== selectedTeamId) {
      handleTeamSelect(selectedTeam.id);
    }
  }, [isEditMode, isAdmin, selectedTeam, selectedTeamId, teams, handleTeamSelect]);

  // Handle field value changes
  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error for this field
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldId];
      return newErrors;
    });
  }, []);

  // Convert field values to API format using utility function
  const convertFieldValuesToApiFormat = useCallback(() => {
    if (!formTemplate) return [];
    return convertFormValuesToApiFormat(formTemplate.template.fields, fieldValues);
  }, [formTemplate, fieldValues]);

  // Save draft
  const saveDraft = useCallback(async () => {
    try {
      setIsSaving(true);

      const formData = watch();
      const fieldValuesData = convertFieldValuesToApiFormat();

      // If we don't have a request yet (new draft), create it first
      let currentRequest = purchaseRequest;
      if (!currentRequest) {
        if (!selectedTeamId) {
          toast({
            title: 'خطا',
            description: 'لطفا ابتدا تیم را از سربرگ انتخاب کنید.',
            variant: 'destructive',
          });
          return;
        }
        // purchase_type must come from backend lookups (no hard-coded default)
        if (!formData.purchase_type) {
          toast({
            title: 'خطا',
            description: 'لطفا نوع خرید را انتخاب کنید.',
            variant: 'destructive',
          });
          return;
        }
        const created = await prsApi.createPurchaseRequest({
          team_id: selectedTeamId,
          vendor_name: formData.vendor_name,
          vendor_account: formData.vendor_account,
          subject: formData.subject,
          description: formData.description,
          purchase_type: formData.purchase_type,
        });
        currentRequest = created;
        setPurchaseRequest(created);
      }

      await prsApi.updatePurchaseRequest(currentRequest.id, {
        vendor_name: formData.vendor_name,
        vendor_account: formData.vendor_account,
        subject: formData.subject,
        description: formData.description,
        purchase_type: formData.purchase_type,
        field_values: fieldValuesData,
      });

      // Refresh request
      const updated = await prsApi.getPurchaseRequest(currentRequest.id);
      setPurchaseRequest(updated);
      
      toast({
        title: 'موفق',
        description: 'پیش‌نویس با موفقیت ذخیره شد',
      });
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در ذخیره پیش‌نویس',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error saving draft:', err);
    } finally {
      setIsSaving(false);
    }
  }, [purchaseRequest, watch, convertFieldValuesToApiFormat, isEditMode, editRequestId]);

  // Validate required fields using utility function
  const validateFields = useCallback((): boolean => {
    if (!formTemplate) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    formTemplate.template.fields.forEach((field) => {
      if (field.required && field.field_type !== 'FILE_UPLOAD') {
        const value = fieldValues[field.id];
        if (isFieldValueEmpty(field, value)) {
          errors[field.id] = `${field.label || field.name} الزامی است`;
          isValid = false;
        }
      }
    });

    setFieldErrors(errors);
    return isValid;
  }, [formTemplate, fieldValues]);

  // Submit request
  const onSubmit: SubmitHandler<TopLevelFormData> = async (data) => {
    // Require an existing draft before submitting
    if (!purchaseRequest) {
      toast({
        title: 'خطا',
        description: 'ابتدا پیش‌نویس را ثبت کنید، سپس برای تأیید ارسال نمایید.',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields
    if (!validateFields()) {
      toast({
        title: 'خطا در اعتبارسنجی',
        description: 'لطفا تمام فیلدهای الزامی را پر کنید',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Save latest changes first
      const fieldValuesData = convertFieldValuesToApiFormat();
      await prsApi.updatePurchaseRequest(purchaseRequest.id, {
        vendor_name: data.vendor_name,
        vendor_account: data.vendor_account,
        subject: data.subject,
        description: data.description,
        purchase_type: data.purchase_type,
        field_values: fieldValuesData,
      });

      // Submit request (or resubmit in edit mode)
      const submitted = await prsApi.submitPurchaseRequest(purchaseRequest.id);
      setPurchaseRequest(submitted);

      toast({
        title: 'موفق',
        description: isEditMode ? 'درخواست با موفقیت ارسال مجدد شد' : 'درخواست با موفقیت ارسال شد',
      });

      // Navigate to detail page
      // Use setTimeout to ensure state updates are complete before navigation
      setTimeout(() => {
        navigate({ to: '/prs/requests/$requestId', params: { requestId: submitted.id } });
      }, 100);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.required_fields) {
        // Handle field validation errors
        const errors: Record<string, string> = {};
        errorData.required_fields.forEach((fieldError: any) => {
          if (fieldError.field_id) {
            errors[fieldError.field_id] = fieldError.message || 'این فیلد الزامی است';
          }
        });
        setFieldErrors(errors);
        toast({
          title: 'خطا در اعتبارسنجی',
          description: 'لطفا تمام فیلدهای الزامی را پر کنید',
          variant: 'destructive',
        });
      } else if (errorData?.required_attachments) {
        // Extract required category names from error
        const categoryNames: string[] = [];
        if (Array.isArray(errorData.required_attachments)) {
          errorData.required_attachments.forEach((err: any) => {
            if (err.category_name) {
              categoryNames.push(err.category_name);
            }
          });
        }
        setRequiredCategoryNames(categoryNames);
        setHighlightRequiredAttachments(true);
        toast({
          title: 'خطا در اعتبارسنجی',
          description: 'لطفا تمام فایل‌های پیوست الزامی را آپلود کنید',
          variant: 'destructive',
        });
        // Scroll to attachments section
        setTimeout(() => {
          attachmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      } else {
        const errorMessage = extractErrorMessage(err);
        toast({
          title: 'خطا در ارسال درخواست',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      logger.error('Error submitting request:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={isEditMode ? 'ویرایش درخواست خرید' : 'درخواست خرید جدید'}
        breadcrumb={['درخواست‌های خرید', isEditMode ? 'ویرایش درخواست' : 'درخواست جدید']}
      />
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          mt: 3,
        }}
      >
        {(!isAdmin && !selectedTeam && !isEditMode) && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              لطفا ابتدا یک تیم را از هدر انتخاب کنید تا فرم بارگذاری شود.
            </Typography>
          </Box>
        )}

        {(isLoading || isLoadingRequest) && (selectedTeamId || isEditMode) && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-32 w-full" />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4, mt: 2 }}>
              <CircularProgress />
            </Box>
          </Box>
        )}

        {formTemplate && !isLoading && !isLoadingRequest && (selectedTeamId || isEditMode) && (
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Top-level fields */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h1" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
                اطلاعات کلی
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Admins can choose team per request */}
                {isAdmin && (
                  <Select
                    fullWidth
                    height={48}
                    label="تیم"
                    value={selectedTeamId || ''}
                    onChange={(e) => handleTeamSelect(e.target.value as string)}
                    size="small"
                  >
                    {teams.map((team) => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                )}

                <TextField
                  fullWidth
                  height={48}
                  label="نام فروشنده"
                  {...register('vendor_name')}
                  error={!!errors.vendor_name}
                  helperText={errors.vendor_name?.message}
                  required
                />

                <TextField
                  fullWidth
                  height={48}
                  label="حساب فروشنده"
                  {...register('vendor_account')}
                  error={!!errors.vendor_account}
                  helperText={errors.vendor_account?.message}
                  required
                />

                <TextField
                  fullWidth
                  height={48}
                  label="موضوع"
                  {...register('subject')}
                  error={!!errors.subject}
                  helperText={errors.subject?.message}
                  required
                />

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="توضیحات"
                  {...register('description')}
                  error={!!errors.description}
                  helperText={errors.description?.message}
                  required
                />

                <Select
                  fullWidth
                  height={48}
                  label="نوع خرید"
                  value={watch('purchase_type') || ''}
                  onChange={(e) => setValue('purchase_type', e.target.value)}
                  error={!!errors.purchase_type}
                  required
                  size="small"
                >
                  {purchaseTypes.map((type) => (
                    <MenuItem key={type.id} value={type.code}>
                      {type.title}
                    </MenuItem>
                  ))}
                </Select>
                {errors.purchase_type && (
                  <Typography variant="body2" color="error" sx={{ mt: -1 }}>
                    {errors.purchase_type.message}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Dynamic form fields */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h1" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
                فیلدهای فرم
              </Typography>
              <PrsDynamicForm
                fields={formTemplate.template.fields}
                initialValues={fieldValues}
                onChange={handleFieldChange}
                errors={fieldErrors}
                onFileUploadClick={() => {
                  setTimeout(() => {
                    attachmentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 50);
                }}
              />
            </Box>

            {/* Attachments section */}
            <Box ref={attachmentsSectionRef} sx={{ mb: 4 }}>
              {purchaseRequest ? (
                <PrsAttachmentsPanel
                  requestId={purchaseRequest.id}
                  canEdit={true}
                  teamId={selectedTeamId || undefined}
                  highlightRequired={highlightRequiredAttachments}
                  requiredCategories={requiredCategoryNames}
                  onError={(err) => {
                    if (err) {
                      toast({
                        title: 'خطا',
                        description: err,
                        variant: 'destructive',
                      });
                    }
                  }}
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  برای فعال شدن بخش پیوست‌ها، ابتدا فیلدهای بالا را تکمیل کرده و روی «ثبت پیش‌نویس» کلیک کنید.
                </Typography>
              )}
            </Box>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
              <Button
                type="button"
                variant="outlined"
                color="primary"
                buttonSize="L"
                onClick={saveDraft}
                disabled={isSaving || isSubmitting}
              >
                {isSaving ? 'در حال ذخیره...' : 'ثبت پیش‌نویس'}
              </Button>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                buttonSize="L"
                disabled={isSaving || isSubmitting || !purchaseRequest}
              >
                {isSubmitting 
                  ? (isEditMode ? 'در حال ارسال مجدد...' : 'در حال ارسال...') 
                  : (isEditMode ? 'ارسال مجدد برای تأیید' : 'ارسال برای تأیید')}
              </Button>
            </Box>
          </form>
        )}
      </Box>
    </>
  );
}

