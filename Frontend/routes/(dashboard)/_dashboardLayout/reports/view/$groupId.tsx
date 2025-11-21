import { createFileRoute, useNavigate } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Button } from 'injast-core/components';
import { useErrorHandler } from 'injast-core/hooks';
import PageHeader from '../../../components/PageHeader';
import { getSubmissionGroup, getSubmissionsByGroup } from 'src/services/api/submissions';
import { updateReportSubmissionGroup } from 'src/services/api/reportSubmissionGroups';
import { ReportSubmissionGroup, Submission } from 'src/types/api/workflow';
import ReportBoxesTabs from '../components/ReportBoxesTabs';
import { useSubmissionDraft } from 'src/client/hooks/useSubmissionDraft';
import { useCompany } from 'src/client/contexts/CompanyContext';
import { useFinancialPeriod } from 'src/client/contexts/FinancialPeriodContext';
import { useAuth } from 'src/client/contexts/AuthContext';
import { SetStatusModal } from '@/components/SetStatusModal';
import * as reviewApi from 'src/services/api/review';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/reports/view/$groupId')({
  component: ReportViewPage,
});

function ReportViewPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const { handleError } = useErrorHandler();
  const { selectedCompany } = useCompany();
  const { selectedFinancialPeriodId } = useFinancialPeriod();
  const { user } = useAuth();
  
  const [group, setGroup] = useState<ReportSubmissionGroup | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportDetails, setReportDetails] = useState<{
    reportingPeriodId: string;
    title: string;
    description: string;
    status?: string | null;
    statusComment?: string | null; // Rejection or approval comment
  }>({
    reportingPeriodId: '',
    title: '',
    description: '',
    status: null,
    statusComment: null,
  });

  const { fieldValues } = useSubmissionDraft();
  const [loadedFieldValues, setLoadedFieldValues] = useState<Record<string, Record<string, any>>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const getStatusCode = (status: string | { code: string; type?: string | { code: string } } | null | undefined): string | null => {
    if (!status) return null;
    if (typeof status === 'string') return status;
    if (typeof status === 'object' && status.code) {
      // Handle both cases: type as string or type as object with code
      const typeValue = typeof status.type === 'string' 
        ? status.type 
        : (status.type as any)?.code;
      // If type exists and is not REPORT_STATUS, skip it (but still return code if it's a valid status)
      // Actually, we should just return the code regardless of type check for now
      // The type check was too restrictive
      return status.code;
    }
    return null;
  };

  const statusCode = group ? getStatusCode(group.status) : null;
  
  // Normal users can edit when status is DRAFT or REJECTED
  // If status is null/undefined, default to allowing edit (treat as DRAFT)
  // Also allow editing if status extraction failed (statusCode is null but group exists)
  const isEditable = statusCode === 'DRAFT' || statusCode === 'REJECTED' || statusCode === null;
  
  // Check if user is admin
  const isAdmin = user?.is_admin ?? false;
  
  // Check that status is REPORT_STATUS:UNDER_REVIEW (for admin review)
  const isUnderReview = statusCode === 'UNDER_REVIEW';
  
  // Normal users can submit when status is DRAFT or REJECTED (or null, treated as DRAFT)
  // Always show submit button for non-admin users when status allows editing
  const canSubmit = !isAdmin && (statusCode === 'DRAFT' || statusCode === 'REJECTED' || statusCode === null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const groupData = await getSubmissionGroup(groupId);
        setGroup(groupData);
        
        // Get reporting period ID
        const reportingPeriodId = typeof groupData.reporting_period === 'string' 
          ? groupData.reporting_period 
          : groupData.reporting_period?.id || '';

        // Extract status code from group
        const groupStatusCode = getStatusCode(groupData.status);
        
        // Fetch submissions in this group
        const groupSubmissions = await getSubmissionsByGroup(groupData);
        setSubmissions(groupSubmissions);

        // Get rejection comment from submissions (all submissions in a rejected group have the same comment)
        const statusComment = groupSubmissions.find(s => s.rejection_comment)?.rejection_comment || null;
        
        // Set report details
        setReportDetails({
          title: groupData.title || '',
          description: groupData.description || '',
          reportingPeriodId,
          status: groupStatusCode,
          statusComment: statusComment,
        });

        // Load field values from submissions
        const loadedValues: Record<string, Record<string, any>> = {};
        for (const submission of groupSubmissions) {
          if (submission.report?.id) {
            const reportId = submission.report.id;
            loadedValues[reportId] = {};
            
            // Transform submission values to fieldValues format
            submission.values.forEach((value) => {
              const fieldId = value.field.id;
              if (value.value_number !== null && value.value_number !== undefined) {
                loadedValues[reportId][fieldId] = value.value_number;
              } else if (value.value_text !== null && value.value_text !== undefined) {
                loadedValues[reportId][fieldId] = value.value_text;
              } else if (value.value_bool !== null && value.value_bool !== undefined) {
                loadedValues[reportId][fieldId] = value.value_bool;
              } else if (value.value_date !== null && value.value_date !== undefined) {
                loadedValues[reportId][fieldId] = value.value_date;
              } else if (value.value_file !== null && value.value_file !== undefined) {
                loadedValues[reportId][fieldId] = value.value_file;
              } else if (value.entity_ref_uuid !== null && value.entity_ref_uuid !== undefined) {
                loadedValues[reportId][fieldId] = value.entity_ref_uuid;
              }
            });
          }
        }
        setLoadedFieldValues(loadedValues);
      } catch (error) {
        logger.error('Error fetching data:',  error);
        handleError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [groupId, handleError]);

  const handleReportDetailsChange = async (details: { title: string; description: string; reportingPeriodId: string }) => {
    if (!isEditable || !group) return;
    
    setReportDetails(details);
    
    // Auto-save after debounce
    setTimeout(async () => {
      try {
        await updateReportSubmissionGroup(group.id, {
          title: details.title,
          description: details.description,
        });
        // Refresh group data
        const updatedGroup = await getSubmissionGroup(groupId);
        setGroup(updatedGroup);
      } catch (error) {
        logger.error('Error saving report details:',  error);
        handleError(error);
      }
    }, 1000);
  };

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED', comment?: string) => {
    if (!group) return;
    
    setIsSubmitting(true);
    try {
      if (status === 'APPROVED') {
        await reviewApi.approveGroup(group.id);
      } else {
        await reviewApi.rejectGroup(group.id, { comment: comment || '' });
      }
      // Reload group to get updated status
      const updatedGroup = await getSubmissionGroup(groupId);
      setGroup(updatedGroup);
      // Refresh submissions
      const updatedSubmissions = await getSubmissionsByGroup(updatedGroup);
      setSubmissions(updatedSubmissions);
      // Get updated status comment
      const updatedStatusComment = updatedSubmissions.find(s => s.rejection_comment)?.rejection_comment || null;
      // Update report details with new status
      const updatedStatusCode = getStatusCode(updatedGroup.status);
      setReportDetails(prev => ({
        ...prev,
        status: updatedStatusCode,
        statusComment: updatedStatusComment,
      }));
      setIsModalOpen(false);
    } catch (err: any) {
      throw err; // Let modal handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = async (reportId: string, fieldId: string, value: any, reportBox: any) => {
    if (!isEditable || !group) return;

    // Update local state immediately
    setLoadedFieldValues(prev => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        [fieldId]: value,
      },
    }));

    // Save to backend after a short delay (debounced)
    setTimeout(async () => {
      try {
        // Find the submission for this report
        const submission = submissions.find(s => s.report?.id === reportId);
        if (submission) {
          const { updateSubmission } = await import('src/services/api/workflow');
          const currentFieldValues = { ...loadedFieldValues[reportId], [fieldId]: value };
          const fieldsData = (reportBox.fields || [])
            .map((field: any) => {
              const fieldValue = currentFieldValues[field.id];
              
              if (field.data_type !== 'YES_NO' && (fieldValue === null || fieldValue === undefined || fieldValue === '')) {
                return null;
              }
              
              if (field.data_type === 'YES_NO' && (fieldValue === null || fieldValue === undefined)) {
                return null;
              }
              
              const data: any = { field_id: field.id };
              
              if (field.data_type === 'NUMBER') {
                data.value_number = fieldValue;
              } else if (field.data_type === 'TEXT') {
                data.value_text = fieldValue;
              } else if (field.data_type === 'YES_NO') {
                data.value_bool = fieldValue;
              } else if (field.data_type === 'DATE') {
                data.value_date = fieldValue;
              } else if (field.data_type === 'FILE') {
                data.value_file = fieldValue;
              } else if (field.data_type === 'ENTITY_REF') {
                data.entity_ref_uuid = fieldValue;
              }
              
              return data;
            })
            .filter((item: any) => item !== null);

          await updateSubmission(submission.id, { fields: fieldsData });
        } else {
          // If submission doesn't exist, create it with DRAFT status
          // Always use the existing group to avoid creating duplicate groups
          const { createSubmission } = await import('src/services/api/workflow');
          const companyId = typeof group.company === 'string' ? group.company : group.company.id;
          const financialPeriodId = typeof group.financial_period === 'string' ? group.financial_period : group.financial_period.id;
          const reportingPeriodId = reportDetails.reportingPeriodId;
          
          const submissionData = {
            report: reportId,
            company: companyId,
            financial_period: financialPeriodId,
            reporting_period: reportingPeriodId,
            group: group.id, // Always pass the existing group ID to avoid creating new groups
            fields: fieldsData,
          };
          
          // Create with DRAFT status - backend defaults to DRAFT if not specified
          const newSubmission = await createSubmission({
            ...submissionData,
            status: 'DRAFT',
          } as any);
          // Update local submissions list
          setSubmissions(prev => [...prev, newSubmission]);
        }
      } catch (error) {
        logger.error('Error saving field:',  error);
        handleError(error);
      }
    }, 1000);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!group) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>گروه گزارش یافت نشد</Typography>
      </Box>
    );
  }

  const companyId = typeof group.company === 'string' ? group.company : group.company.id;
  const financialPeriodId = typeof group.financial_period === 'string' ? group.financial_period : group.financial_period.id;
  const canShowTabs = companyId && financialPeriodId && reportDetails.reportingPeriodId;

  return (
    <>
      <PageHeader title="مشاهده گزارش" breadcrumb={['گزارش‌ها']}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Admin button: Set status (only visible when status is UNDER_REVIEW) */}
          {isAdmin && (
            <Button
              onClick={() => setIsModalOpen(true)}
              disabled={!isUnderReview || isSubmitting}
              sx={{
                width: '157px',
                height: '40px',
                bgcolor: '#1dbf98',
                '&:hover': {
                  bgcolor: '#1dbf98',
                  opacity: 0.9,
                },
                '&:disabled': {
                  bgcolor: '#b1b7c2',
                  color: '#91969f',
                  opacity: 0.6,
                },
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              تعیین وضعیت
            </Button>
          )}
          {/* Normal user button: Submit (only visible when status is DRAFT or REJECTED) */}
          {canSubmit && (
            <Button
              onClick={async () => {
                if (!group) return;
                const companyId = typeof group.company === 'string' ? group.company : group.company.id;
                const financialPeriodId = typeof group.financial_period === 'string' ? group.financial_period : group.financial_period.id;
                const reportingPeriodId = reportDetails.reportingPeriodId;
                
                if (!companyId || !financialPeriodId || !reportingPeriodId) return;
                
                const confirmed = window.confirm('آیا از ارسال گزارش اطمینان دارید؟');
                if (!confirmed) return;
                
                try {
                  setSaving(true);
                  const { submitAllDrafts } = await import('src/services/api/workflow');
                  // Pass the group_id to ensure this specific group's status is updated
                  await submitAllDrafts({
                    company_id: companyId,
                    financial_period_id: financialPeriodId,
                    reporting_period_id: reportingPeriodId,
                    group_id: groupId, // Pass the current group ID to update its status
                  });
                  // Refresh group data to get updated status
                  const updatedGroup = await getSubmissionGroup(groupId);
                  setGroup(updatedGroup);
                  // Refresh submissions
                  const updatedSubmissions = await getSubmissionsByGroup(updatedGroup);
                  setSubmissions(updatedSubmissions);
                  // Get updated status comment (should be null after submission)
                  const updatedStatusComment = updatedSubmissions.find(s => s.rejection_comment)?.rejection_comment || null;
                  // Update report details with new status
                  const updatedStatusCode = getStatusCode(updatedGroup.status);
                  setReportDetails(prev => ({
                    ...prev,
                    status: updatedStatusCode,
                    statusComment: updatedStatusComment,
                  }));
                  alert('گزارش با موفقیت ارسال شد');
                } catch (error) {
                  logger.error('Error submitting:',  error);
                  handleError(error);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              sx={{
                width: '157px',
                height: '40px',
                bgcolor: '#1dbf98',
                '&:hover': {
                  bgcolor: '#1dbf98',
                  opacity: 0.9,
                },
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              تایید و ارسال
            </Button>
          )}
        </Box>
      </PageHeader>
      
      <Box sx={{ mt: 3 }}>
        {canShowTabs ? (
          <ReportBoxesTabs
            companyId={companyId}
            financialPeriodId={financialPeriodId}
            reportingPeriodId={reportDetails.reportingPeriodId}
            fieldValues={{ ...loadedFieldValues, ...fieldValues }}
            onFieldChange={handleFieldChange}
            reportDetails={reportDetails}
            onReportDetailsChange={handleReportDetailsChange}
            isEditable={isEditable}
          />
        ) : (
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: '12px',
              p: 3,
              textAlign: 'center',
            }}
          >
            <Typography>در حال بارگذاری...</Typography>
          </Box>
        )}
      </Box>

      <SetStatusModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onConfirm={handleStatusChange}
        isLoading={isSubmitting}
      />
    </>
  );
}
