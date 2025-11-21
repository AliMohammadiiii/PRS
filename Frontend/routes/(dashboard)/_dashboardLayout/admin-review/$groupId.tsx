import { createFileRoute, useNavigate } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, CircularProgress, Typography, Card, CardContent, Divider } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { ReviewGroup } from 'src/types/api/review';
import { Submission } from 'src/types/api/workflow';
import * as reviewApi from 'src/services/api/review';
import { SetStatusModal } from '@/components/SetStatusModal';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/FieldTable/StatusBadge';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/admin-review/$groupId')({
  component: GroupDetailPage,
});

function GroupDetailPage() {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState<ReviewGroup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGroup = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const groups = await reviewApi.getReviewGroups();
      const foundGroup = groups.find((g) => g.id === groupId);
      if (!foundGroup) {
        setError('گروه یافت نشد');
        return;
      }
      setGroup(foundGroup);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'خطا در بارگذاری گروه'
      );
      logger.error('Error loading group:',  err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const handleStatusChange = async (status: 'APPROVED' | 'REJECTED', comment?: string) => {
    setIsSubmitting(true);
    try {
      if (status === 'APPROVED') {
        await reviewApi.approveGroup(groupId);
      } else {
        await reviewApi.rejectGroup(groupId, { comment: comment || '' });
      }
      // Reload group to get updated status
      await loadGroup();
    } catch (err: any) {
      throw err; // Let modal handle the error
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFieldValue = (fieldValue: Submission['values'][0]) => {
    if (fieldValue.value_number !== null && fieldValue.value_number !== undefined) {
      return fieldValue.value_number.toString();
    }
    if (fieldValue.value_text !== null && fieldValue.value_text !== undefined) {
      return fieldValue.value_text;
    }
    if (fieldValue.value_bool !== null && fieldValue.value_bool !== undefined) {
      return fieldValue.value_bool ? 'بله' : 'خیر';
    }
    if (fieldValue.value_date) {
      return new Date(fieldValue.value_date).toLocaleDateString('fa-IR');
    }
    if (fieldValue.value_file) {
      return fieldValue.value_file;
    }
    if (fieldValue.entity_ref_uuid) {
      return fieldValue.entity_ref_uuid;
    }
    return '-';
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="جزئیات گروه" breadcrumb={['بررسی گروه‌های ارسالی', 'جزئیات گروه']} />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error || !group) {
    return (
      <>
        <PageHeader title="جزئیات گروه" breadcrumb={['بررسی گروه‌های ارسالی', 'جزئیات گروه']} />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error || 'گروه یافت نشد'}</Typography>
        </Box>
      </>
    );
  }

  const companyName = typeof group.company === 'string' ? group.company : group.company?.name || '-';
  const financialPeriod = typeof group.financial_period === 'string' 
    ? group.financial_period 
    : group.financial_period?.title || '-';
  const reportingPeriod = typeof group.reporting_period === 'string'
    ? group.reporting_period
    : group.reporting_period?.title || '-';
  const statusObj = group.status;
  const status = typeof statusObj === 'string' 
    ? statusObj 
    : statusObj?.code || null;
  // Check that status is REPORT_STATUS:UNDER_REVIEW
  const isUnderReviewStatus = status === 'UNDER_REVIEW' && 
    (typeof statusObj === 'string' || 
     (typeof statusObj === 'object' && (!statusObj.type || statusObj.type.code === 'REPORT_STATUS')));

  return (
    <>
      <PageHeader title="جزئیات گروه" breadcrumb={['بررسی گروه‌های ارسالی', 'جزئیات گروه']} />
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          mt: 3,
        }}
        dir="rtl"
      >
        {/* Group Info */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {group.title}
              </Typography>
              <StatusBadge 
                status={status === 'UNDER_REVIEW' ? 'active' : status === 'APPROVED' ? 'active' : 'inactive'} 
              />
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>شرکت:</strong> {companyName}
              </Typography>
              <Typography variant="body2">
                <strong>دوره مالی:</strong> {financialPeriod}
              </Typography>
              <Typography variant="body2">
                <strong>دوره گزارش‌دهی:</strong> {reportingPeriod}
              </Typography>
              {group.description && (
                <Typography variant="body2">
                  <strong>توضیحات:</strong> {group.description}
                </Typography>
              )}
            </Box>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setIsModalOpen(true)}
                disabled={!isUnderReviewStatus || isSubmitting}
                className="px-6"
                style={{
                  opacity: !isUnderReviewStatus ? 0.6 : 1,
                  cursor: !isUnderReviewStatus ? 'not-allowed' : 'pointer',
                }}
              >
                تعیین وضعیت
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Submissions */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          گزارش‌های گروه ({group.submissions?.length || 0})
        </Typography>

        {group.submissions && group.submissions.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {group.submissions.map((submission) => (
              <Card key={submission.id}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {submission.report.name} ({submission.report.code})
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {submission.values && submission.values.length > 0 ? (
                      submission.values.map((fieldValue) => (
                        <Box key={fieldValue.id} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                            {fieldValue.field.name}
                            {fieldValue.field.required && <span style={{ color: 'red' }}> *</span>}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            {getFieldValue(fieldValue)}
                          </Typography>
                          {fieldValue.field.help_text && (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              {fieldValue.field.help_text}
                            </Typography>
                          )}
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                        هیچ فیلدی پر نشده است
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" sx={{ color: 'text.disabled', textAlign: 'center', py: 4 }}>
            هیچ گزارشی در این گروه وجود ندارد
          </Typography>
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

