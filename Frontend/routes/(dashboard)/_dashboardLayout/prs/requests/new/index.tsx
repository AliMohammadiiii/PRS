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
  Modal,
  IconButton,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { z } from 'zod';
import { Chip, Collapse, Alert, AlertTitle, useTheme } from '@mui/material';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2, X, Upload, Trash2 } from 'lucide-react';
import PageHeader from '../../../../components/PageHeader';
// Team is now selected globally in the header via TeamContext (non-admins).
// Admins can override team per request via a local dropdown on this page.
import PrsDynamicForm from '@/components/prs/PrsDynamicForm';
import PrsAttachmentsPanel from '@/components/prs/PrsAttachmentsPanel';
import {
  FormTemplateResponse,
  PurchaseRequest,
  FormField,
  EffectiveTemplateResponse,
  WorkflowTemplateStepSummary,
} from 'src/types/api/prs';
import {
  extractInitialValuesFromFieldValues,
  buildInitialValuesFromFields,
  convertFormValuesToApiFormat,
  isFieldValueEmpty,
} from '@/components/prs/fieldUtils';
import * as prsApi from 'src/services/api/prs';
import { Lookup } from 'src/types/api/lookups';
import logger from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage, isEditableStatus } from 'src/shared/utils/prsUtils';
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
  const theme = useTheme();
  const { requestId: editRequestId } = Route.useSearch();
  const isEditMode = !!editRequestId;
  const { selectedTeam, teams } = useTeam();
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;
  
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPurchaseType, setSelectedPurchaseType] = useState<string | null>(null);
  const [formTemplate, setFormTemplate] = useState<FormTemplateResponse | null>(null);
  const [effectiveTemplate, setEffectiveTemplate] = useState<EffectiveTemplateResponse | null>(null);
  const [purchaseRequest, setPurchaseRequest] = useState<PurchaseRequest | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [purchaseTypes, setPurchaseTypes] = useState<Lookup[]>([]);
  const [availablePurchaseTypes, setAvailablePurchaseTypes] = useState<Lookup[]>([]); // Filtered by team configs
  const [teamPurchaseConfigs, setTeamPurchaseConfigs] = useState<any[]>([]); // TeamPurchaseConfig[]
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [highlightRequiredAttachments, setHighlightRequiredAttachments] = useState(false);
  const [requiredCategoryNames, setRequiredCategoryNames] = useState<string[]>([]);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [workflowExpanded, setWorkflowExpanded] = useState(true);
  const attachmentsSectionRef = useRef<HTMLDivElement>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitComment, setSubmitComment] = useState('');
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);

  // Determine if team and purchase type can be changed
  // In edit mode, these can only be changed if the request status is editable
  const canChangeTeamAndPurchaseType = !isEditMode || (purchaseRequest && isEditableStatus(purchaseRequest.status.code));
  
  // Get selected purchase type title for display
  // Use availablePurchaseTypes if team is selected, otherwise use all purchaseTypes
  const purchaseTypesForDisplay = selectedTeamId ? availablePurchaseTypes : purchaseTypes;
  const selectedPurchaseTypeTitle = purchaseTypesForDisplay.find(p => p.code === selectedPurchaseType)?.title || selectedPurchaseType;

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

  // Load purchase types using dedicated API function
  useEffect(() => {
    const loadPurchaseTypes = async () => {
      try {
        const purchaseTypeLookups = await prsApi.fetchPurchaseTypes();
        logger.debug('PURCHASE_TYPE lookups found:', purchaseTypeLookups.length, purchaseTypeLookups);
        setPurchaseTypes(purchaseTypeLookups);
        if (purchaseTypeLookups.length === 0) {
          logger.warn('No PURCHASE_TYPE lookups found. Check if they exist and are active.');
        }
      } catch (err) {
        logger.error('Error loading purchase types:', err);
        toast({
          title: 'خطا',
          description: 'خطا در بارگذاری انواع خرید. لطفا صفحه را بازنشانی کنید.',
          variant: 'destructive',
        });
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
        setSelectedPurchaseType(existingRequest.purchase_type.code);

        // Try to load effective template, fall back to legacy form template
        try {
          const effective = await prsApi.getEffectiveTemplate(
            existingRequest.team.id,
            existingRequest.purchase_type.code
          );
          setEffectiveTemplate(effective);
          
          const compatibleTemplate: FormTemplateResponse = {
            team: effective.team,
            template: {
              id: effective.form_template.id,
              team: effective.team.id,
              version_number: effective.form_template.version_number,
              is_active: true,
              created_by: null,
              fields: effective.form_template.fields,
              created_at: '',
              updated_at: '',
            },
          };
          setFormTemplate(compatibleTemplate);
        } catch (templateErr: any) {
          // Fall back to loading the form template the request was created with
          // 404 is expected when effective template endpoint doesn't exist - silently handle
          const isExpected404 = templateErr?.response?.status === 404;
          if (!isExpected404) {
            logger.warn('Error loading effective template in edit mode, using fallback:', templateErr);
          }
          try {
            const template = await prsApi.getTeamFormTemplate(existingRequest.team.id);
            setFormTemplate(template);
          } catch (fallbackErr: any) {
            logger.error('Error loading fallback template in edit mode:', fallbackErr);
            // Don't show error toast here - let the form render with what we have
          }
        }

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
        if (formTemplate?.template?.fields) {
          formTemplate.template.fields.forEach((field) => {
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
        }
        
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

  // Load team purchase configs when team is selected to filter available purchase types
  useEffect(() => {
    const loadTeamConfigs = async () => {
      if (!selectedTeamId) {
        setAvailablePurchaseTypes([]);
        setTeamPurchaseConfigs([]);
        return;
      }

      try {
        setIsLoadingConfigs(true);
        const configs = await prsApi.getTeamPurchaseConfigs(selectedTeamId);
        setTeamPurchaseConfigs(configs);

        // Extract purchase type codes from configs
        const availablePurchaseTypeCodes = new Set(
          configs
            .filter(config => config.is_active)
            .map(config => config.purchase_type.code)
        );

        // Filter purchase types to only show those with configurations
        const filtered = purchaseTypes.filter(p => availablePurchaseTypeCodes.has(p.code));
        setAvailablePurchaseTypes(filtered);

        logger.debug('Available purchase types for team:', {
          teamId: selectedTeamId,
          configs: configs.length,
          availableTypes: filtered.map(p => p.code),
        });

        // If current purchase type is not in available list, reset it
        if (selectedPurchaseType && !availablePurchaseTypeCodes.has(selectedPurchaseType)) {
          setSelectedPurchaseType(null);
          setFormTemplate(null);
          setEffectiveTemplate(null);
        }
      } catch (err: any) {
        logger.error('Error loading team purchase configs:', err);
        // On error, show all purchase types (fallback behavior)
        setAvailablePurchaseTypes(purchaseTypes);
        setTeamPurchaseConfigs([]);
      } finally {
        setIsLoadingConfigs(false);
      }
    };

    loadTeamConfigs();
  }, [selectedTeamId, purchaseTypes]);

  // Handle team selection (called from context-based auto selection above)
  const handleTeamSelect = useCallback((teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedPurchaseType(null); // Reset purchase type when team changes
    setFormTemplate(null);
    setEffectiveTemplate(null);
    setPurchaseRequest(null);
    setFieldValues({});
    setFieldErrors({});
    setTemplateError(null);
    setHighlightRequiredAttachments(false);
    setRequiredCategoryNames([]);
  }, []);

  // Load effective template when both team and purchase type are selected
  const loadEffectiveTemplate = useCallback(async (teamId: string, purchaseTypeCode: string) => {
    try {
      setIsLoadingTemplate(true);
      setFormTemplate(null);
      setEffectiveTemplate(null);
      setFieldValues({});
      setTemplateError(null);
      
      // Try to load effective template (team + purchase type -> form template + workflow template)
      const effective = await prsApi.getEffectiveTemplate(teamId, purchaseTypeCode);
      setEffectiveTemplate(effective);
      
      // Build form template response structure from effective template for compatibility
      const compatibleTemplate: FormTemplateResponse = {
        team: effective.team,
        template: {
          id: effective.form_template.id,
          team: effective.team.id,
          version_number: effective.form_template.version_number,
          is_active: true,
          created_by: null,
          fields: effective.form_template.fields,
          created_at: '',
          updated_at: '',
        },
      };
      setFormTemplate(compatibleTemplate);
      
      // Initialize field values from default values
      const initialValues = buildInitialValuesFromFields(effective.form_template.fields);
      setFieldValues(initialValues);
      
      logger.debug('Loaded effective template:', {
        formTemplate: effective.form_template.name,
        workflowTemplate: effective.workflow_template.name,
        steps: effective.workflow_template.steps.length,
      });
    } catch (err: any) {
      // Fall back to legacy behavior if no effective template is configured
      // 404 is expected when effective template endpoint doesn't exist - don't log as error
      const isExpected404 = err?.response?.status === 404;
      if (!isExpected404) {
        logger.warn('No effective template found, falling back to legacy form template:', err);
      }
      
      try {
        const template = await prsApi.getTeamFormTemplate(teamId);
        setFormTemplate(template);
        setEffectiveTemplate(null); // Clear effective template on fallback
        
        // Initialize field values from default values using utility function
        const initialValues = buildInitialValuesFromFields(template.template.fields);
        setFieldValues(initialValues);
      } catch (fallbackErr: any) {
        // Both effective template and legacy template failed - show clear error
        const errorMessage = 'برای این تیم و این نوع خرید، فرم و جریان تأیید تعریف نشده است. لطفاً با ادمین تماس بگیرید.';
        setTemplateError(errorMessage);
        toast({
          title: 'خطا در بارگذاری فرم',
          description: errorMessage,
          variant: 'destructive',
        });
        logger.error('Error loading form template:', fallbackErr);
      }
    } finally {
      setIsLoadingTemplate(false);
    }
  }, []);

  // Handle purchase type selection
  const handlePurchaseTypeSelect = useCallback((purchaseTypeCode: string) => {
    setSelectedPurchaseType(purchaseTypeCode);
    setValue('purchase_type', purchaseTypeCode);
    
    // If team is already selected, load the effective template
    if (selectedTeamId) {
      loadEffectiveTemplate(selectedTeamId, purchaseTypeCode);
    }
  }, [selectedTeamId, loadEffectiveTemplate, setValue]);

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

  // Load effective template when purchase type changes (and team is already selected)
  useEffect(() => {
    if (!isEditMode && selectedTeamId && selectedPurchaseType) {
      loadEffectiveTemplate(selectedTeamId, selectedPurchaseType);
    }
  }, [isEditMode, selectedTeamId, selectedPurchaseType, loadEffectiveTemplate]);

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

  // Submit request - opens modal first
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

    // Save latest changes first
    try {
      setIsSaving(true);
      const fieldValuesData = convertFieldValuesToApiFormat();
      await prsApi.updatePurchaseRequest(purchaseRequest.id, {
        vendor_name: data.vendor_name,
        vendor_account: data.vendor_account,
        subject: data.subject,
        description: data.description,
        purchase_type: data.purchase_type,
        field_values: fieldValuesData,
      });
      setIsSaving(false);
    } catch (err: any) {
      setIsSaving(false);
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در ذخیره',
        description: errorMessage,
        variant: 'destructive',
      });
      return;
    }

    // Open submit modal
    setSubmitModalOpen(true);
  };

  // Actually submit the request with comment and files
  const handleSubmitConfirm = async () => {
    if (!purchaseRequest) return;

    try {
      setIsSubmitting(true);

      // Submit request (or resubmit in edit mode) with comment and files
      const submitted = await prsApi.submitPurchaseRequest(purchaseRequest.id, {
        comment: submitComment || undefined,
        files: submitFiles.length > 0 ? submitFiles : undefined,
      });
      setPurchaseRequest(submitted);
      setSubmitModalOpen(false);
      setSubmitComment('');
      setSubmitFiles([]);

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

        {/* For admins: Show team selector (always visible when no form is loaded) */}
        {isAdmin && !isEditMode && !formTemplate && !isLoadingTemplate && !templateError && (
          <Box sx={{ textAlign: 'center', py: selectedTeamId && !selectedPurchaseType ? 4 : 8 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {selectedTeamId ? 'تیم انتخاب شده' : 'لطفا تیم را انتخاب کنید'}
            </Typography>
            <Box sx={{ maxWidth: 400, mx: 'auto' }}>
              <Select
                fullWidth
                height={48}
                label="تیم"
                value={selectedTeamId || ''}
                onChange={(e) => handleTeamSelect(e.target.value as string)}
                size="small"
                displayEmpty
              >
                <MenuItem value="" disabled>
                  <em style={{ fontStyle: 'normal', color: defaultColors.neutral.light }}>تیم را انتخاب کنید</em>
                </MenuItem>
                {teams.filter(team => team.is_active).map((team) => (
                  <MenuItem key={team.id} value={team.id}>
                    {team.name}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        )}

        {/* Prompt to select purchase type if team is selected but purchase type is not */}
        {selectedTeamId && !selectedPurchaseType && !isEditMode && !formTemplate && !isLoadingTemplate && !templateError && (
          <Box sx={{ textAlign: 'center', py: isAdmin ? 4 : 8 }}>
            {isLoadingConfigs ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography variant="body1" color="text.secondary">
                  در حال بارگذاری فرم‌های در دسترس...
                </Typography>
              </Box>
            ) : availablePurchaseTypes.length === 0 ? (
              <Box>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  برای این تیم هیچ فرمی پیکربندی نشده است. لطفاً با مدیر سیستم تماس بگیرید.
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  لطفا نوع خرید را انتخاب کنید تا فرم مربوطه بارگذاری شود.
                </Typography>
                <Box sx={{ maxWidth: 400, mx: 'auto', mt: 3 }}>
                  <Select
                    fullWidth
                    height={48}
                    label="نوع خرید"
                    value=""
                    onChange={(e) => handlePurchaseTypeSelect(e.target.value)}
                    size="small"
                  >
                    {availablePurchaseTypes.map((type) => (
                      <MenuItem key={type.id} value={type.code}>
                        {type.title}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Template Error Banner */}
        {templateError && !isLoadingTemplate && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error" icon={<AlertCircle size={24} />}>
              <AlertTitle>خطا در بارگذاری فرم</AlertTitle>
              {templateError}
            </Alert>
          </Box>
        )}

        {(isLoading || isLoadingRequest || isLoadingTemplate) && (selectedTeamId || isEditMode) && (
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

        {formTemplate && !isLoading && !isLoadingRequest && !isLoadingTemplate && !templateError && (selectedTeamId || isEditMode) && (
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Top-level fields */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h1" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
                اطلاعات کلی
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Team selector - Admin can choose team per request, locked in non-editable edit mode */}
                {isAdmin && (
                  canChangeTeamAndPurchaseType ? (
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
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" color="text.secondary">تیم:</Typography>
                      <Chip 
                        label={purchaseRequest?.team.name || ''} 
                        size="medium"
                        sx={{ bgcolor: defaultColors.neutral[100], fontWeight: 600 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        (قابل تغییر نیست)
                      </Typography>
                    </Box>
                  )
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

                {/* Purchase type selector - locked in non-editable edit mode */}
                {canChangeTeamAndPurchaseType ? (
                  <>
                    <Select
                      fullWidth
                      height={48}
                      label="نوع خرید"
                      value={selectedPurchaseType || watch('purchase_type') || ''}
                      onChange={(e) => handlePurchaseTypeSelect(e.target.value)}
                      error={!!errors.purchase_type}
                      required
                      size="small"
                      disabled={!selectedTeamId || isLoadingConfigs}
                    >
                      {purchaseTypesForDisplay.map((type) => (
                        <MenuItem key={type.id} value={type.code}>
                          {type.title}
                        </MenuItem>
                      ))}
                    </Select>
                    {selectedTeamId && availablePurchaseTypes.length === 0 && !isLoadingConfigs && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
                        برای این تیم هیچ فرمی پیکربندی نشده است.
                      </Typography>
                    )}
                    {errors.purchase_type && (
                      <Typography variant="body2" color="error" sx={{ mt: -1 }}>
                        {errors.purchase_type.message}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" color="text.secondary">نوع خرید:</Typography>
                    <Chip 
                      label={purchaseRequest?.purchase_type.title || selectedPurchaseTypeTitle || ''} 
                      size="medium"
                      sx={{ 
                        bgcolor: purchaseRequest?.purchase_type.code === 'GOODS' 
                          ? (theme.palette.primary?.light || '#D4F7E8')
                          : (theme.palette.secondary?.light || '#E5E7EA'),
                        color: purchaseRequest?.purchase_type.code === 'GOODS'
                          ? (theme.palette.primary?.dark || '#054F5B')
                          : (theme.palette.secondary?.dark || '#3A3E46'),
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      (قابل تغییر نیست)
                    </Typography>
                  </Box>
                )}
                {isLoadingTemplate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      در حال بارگذاری فرم...
                    </Typography>
                  </Box>
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

            {/* Workflow Preview Section */}
            {effectiveTemplate && effectiveTemplate.workflow_template.steps.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    mb: 2,
                  }}
                  onClick={() => setWorkflowExpanded(!workflowExpanded)}
                >
                  <Typography variant="h1" fontWeight={700} color="text.primary">
                    زنجیره تأیید
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {effectiveTemplate.workflow_template.steps.length} مرحله
                    </Typography>
                    {workflowExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </Box>
                </Box>
                <Collapse in={workflowExpanded}>
                  <Box
                    sx={{
                      bgcolor: defaultColors.neutral[50],
                      borderRadius: 2,
                      p: 3,
                      border: `1px solid ${defaultColors.neutral[200]}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                      {effectiveTemplate.workflow_template.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step, index) => (
                          <Box key={step.order} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={step.name}
                              size="medium"
                              icon={step.is_finance_review ? <CheckCircle2 size={16} /> : undefined}
                              sx={{
                                bgcolor: step.is_finance_review 
                                  ? (theme.palette.success?.light || '#E8F5E9')
                                  : (theme.palette.primary?.light || '#D4F7E8'),
                                color: step.is_finance_review 
                                  ? (theme.palette.success?.dark || '#1B5E20')
                                  : (theme.palette.primary?.dark || '#054F5B'),
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                '& .MuiChip-icon': {
                                  color: step.is_finance_review 
                                    ? (theme.palette.success?.dark || '#1B5E20')
                                    : (theme.palette.primary?.dark || '#054F5B'),
                                },
                              }}
                            />
                            {index < effectiveTemplate.workflow_template.steps.length - 1 && (
                              <Typography variant="body2" color="text.secondary" sx={{ mx: 0.5 }}>
                                ←
                              </Typography>
                            )}
                          </Box>
                        ))}
                    </Box>
                    {effectiveTemplate.workflow_template.steps.some(s => s.is_finance_review) && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        <CheckCircle2 size={14} style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle' }} />
                        مرحله بررسی مالی
                      </Typography>
                    )}
                  </Box>
                </Collapse>
              </Box>
            )}

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

      {/* Submit Confirmation Modal */}
      <Modal
        open={submitModalOpen}
        onClose={() => {
          if (!isSubmitting) {
            setSubmitModalOpen(false);
            setSubmitComment('');
            setSubmitFiles([]);
          }
        }}
        width={500}
      >
        <Box sx={{ p: 4, position: 'relative' }}>
          <IconButton
            onClick={() => {
              if (!isSubmitting) {
                setSubmitModalOpen(false);
                setSubmitComment('');
                setSubmitFiles([]);
              }
            }}
            disabled={isSubmitting}
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
          <Typography variant="h2" fontWeight={700} sx={{ mb: 3 }}>
            {isEditMode ? 'ارسال مجدد درخواست' : 'ارسال درخواست'}
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            آیا از ارسال این درخواست اطمینان دارید؟
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="توضیحات (اختیاری)"
            value={submitComment}
            onChange={(e) => setSubmitComment(e.target.value)}
            sx={{ mb: 2 }}
            disabled={isSubmitting}
          />
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              فایل‌های پیوست (اختیاری)
            </Typography>
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.xls"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setSubmitFiles((prev) => [...prev, ...files]);
              }}
              disabled={isSubmitting}
              style={{ display: 'none' }}
              id="submit-file-input"
            />
            <label htmlFor="submit-file-input">
              <Button
                component="span"
                variant="outlined"
                startIcon={<Upload className="w-4 h-4" />}
                disabled={isSubmitting}
                sx={{ mb: 1 }}
              >
                انتخاب فایل
              </Button>
            </label>
            {submitFiles.length > 0 && (
              <Box sx={{ mt: 1 }}>
                {submitFiles.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1,
                      bgcolor: '#f5f5f5',
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="body2">{file.name}</Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSubmitFiles((prev) => prev.filter((_, i) => i !== index));
                      }}
                      disabled={isSubmitting}
                      color="error"
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: 1,
                      }}
                      aria-label="حذف"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              buttonSize="M"
              onClick={() => {
                setSubmitModalOpen(false);
                setSubmitComment('');
                setSubmitFiles([]);
              }}
              disabled={isSubmitting}
            >
              انصراف
            </Button>
            <Button
              variant="contained"
              color="primary"
              buttonSize="M"
              onClick={handleSubmitConfirm}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={16} /> : <CheckCircle2 className="w-5 h-5" />}
            >
              {isSubmitting 
                ? (isEditMode ? 'در حال ارسال مجدد...' : 'در حال ارسال...') 
                : (isEditMode ? 'ارسال مجدد' : 'ارسال')}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

