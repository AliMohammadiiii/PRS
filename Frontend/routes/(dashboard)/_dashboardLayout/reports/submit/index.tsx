import { createFileRoute, useNavigate } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState } from 'react';
import { Box } from 'injast-core/components';
import PageHeader from '../../../components/PageHeader';
import ReportBoxesTabs from '../components/ReportBoxesTabs';
import SubmitButton from './components/SubmitButton';
import { useSubmissionDraft } from 'src/client/hooks/useSubmissionDraft';
import { useCompany } from 'src/client/contexts/CompanyContext';
import { useFinancialPeriod } from 'src/client/contexts/FinancialPeriodContext';
import { z } from 'zod';

const searchSchema = z.object({
  companyId: z.string().optional(),
});

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/reports/submit/')({
  component: ReportSubmitPage,
  validateSearch: searchSchema,
});


function ReportSubmitPage() {
  const navigate = useNavigate();
  const { companyId: urlCompanyId } = Route.useSearch();
  const { selectedCompany } = useCompany();
  const { selectedFinancialPeriodId } = useFinancialPeriod();
  const [reportDetails, setReportDetails] = useState<{
    reportingPeriodId: string;
    title: string;
    description: string;
  }>({
    reportingPeriodId: '',
    title: '',
    description: '',
  });
  const { fieldValues, updateFieldValue, createOrUpdateSubmission, submissionIds } = useSubmissionDraft();
  const [isAllComplete, setIsAllComplete] = useState(false);

  // Get company ID from context or URL
  const getCompanyId = () => {
    if (urlCompanyId) return urlCompanyId;
    if (selectedCompany) return selectedCompany.id;
    return '';
  };

  const handleFieldChange = async (reportId: string, fieldId: string, value: any, reportBox: any) => {
    const companyId = getCompanyId();
    if (!companyId || !selectedFinancialPeriodId || !reportDetails.reportingPeriodId) return;
    
    // Update local state immediately
    const updatedFieldValues = {
      ...fieldValues,
      [reportId]: {
        ...fieldValues[reportId],
        [fieldId]: value,
      },
    };
    
    // Update local state in hook
    await updateFieldValue(
      reportId,
      fieldId,
      value,
      companyId,
      selectedFinancialPeriodId,
      reportDetails.reportingPeriodId
    );

    // Save to backend after a short delay (debounced)
    setTimeout(async () => {
      try {
        await createOrUpdateSubmission(
          reportId,
          companyId,
          selectedFinancialPeriodId,
          reportDetails.reportingPeriodId,
          reportBox.fields || [],
          updatedFieldValues[reportId] || {}
        );
      } catch (error) {
        logger.error('Error saving field:',  error);
      }
    }, 1000);
  };

  const handleReportDetailsChange = (details: { title: string; description: string; reportingPeriodId: string }) => {
    setReportDetails(details);
  };

  // Check if there are any draft submissions
  const hasDraftSubmissions = Object.keys(submissionIds).length > 0;

  const companyId = getCompanyId();
  const canShowTabs = companyId && selectedFinancialPeriodId;
  
  // Button should be enabled only when all pages are complete
  const canSubmit = isAllComplete && hasDraftSubmissions && canShowTabs && reportDetails.reportingPeriodId;

  return (
    <>
      <PageHeader
        title="ارسال گزارش"
        breadcrumb={['گزارش‌ها', 'ارسال گزارش']}
      >
        {canSubmit && (
          <SubmitButton
            companyId={companyId}
            financialPeriodId={selectedFinancialPeriodId}
            reportingPeriodId={reportDetails.reportingPeriodId}
            disabled={!isAllComplete}
            onSuccess={() => {
              navigate({ to: '/reports' });
            }}
          />
        )}
      </PageHeader>
      
      <Box sx={{ mt: 3 }}>
        {canShowTabs ? (
          <ReportBoxesTabs
            companyId={companyId}
            financialPeriodId={selectedFinancialPeriodId}
            reportingPeriodId={reportDetails.reportingPeriodId}
            fieldValues={fieldValues}
            onFieldChange={handleFieldChange}
            reportDetails={reportDetails}
            onReportDetailsChange={handleReportDetailsChange}
            onCompletionChange={setIsAllComplete}
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
            {!companyId && <p>لطفا شرکت را انتخاب کنید</p>}
            {!selectedFinancialPeriodId && <p>لطفا دوره مالی را انتخاب کنید</p>}
          </Box>
        )}
      </Box>
    </>
  );
}

