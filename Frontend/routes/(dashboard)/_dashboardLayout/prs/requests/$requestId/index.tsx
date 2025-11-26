import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  TextField,
  Modal,
  IconButton,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { CheckCircle, XCircle, FileText, X } from 'lucide-react';
import { Chip } from '@mui/material';
import PageHeader from '../../../../components/PageHeader';
import PrsDynamicForm from '@/components/prs/PrsDynamicForm';
import PrsAttachmentsPanel from '@/components/prs/PrsAttachmentsPanel';
import PrsHistoryPanel from '@/components/prs/PrsHistoryPanel';
import { extractInitialValuesFromFieldValues } from '@/components/prs/fieldUtils';
import { PurchaseRequest } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';
import { useAuth } from 'src/client/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  extractErrorMessage,
  isRequestor as isRequestorHelper,
  isEditableStatus,
  canApprove,
  canReject,
  canFinanceComplete,
  hasRole,
} from 'src/shared/utils/prsUtils';
import { Skeleton } from '@/components/ui/skeleton';

export const Route = createFileRoute('/(dashboard)/_dashboardLayout/prs/requests/$requestId/')({
  component: PurchaseRequestDetailPage,
});

function PurchaseRequestDetailPage() {
  const { requestId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActioning, setIsActioning] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await prsApi.getPurchaseRequest(requestId);
      setRequest(data);
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      toast({
        title: 'خطا در بارگذاری درخواست',
        description: errorMessage,
        variant: 'destructive',
      });
      logger.error('Error loading request:', err);
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleApprove = async () => {
    if (!request) return;

    try {
      setIsActioning(true);
      const updated = await prsApi.approveRequest(request.id);
      setRequest(updated);
      // Reload to get latest state
      await loadRequest();
      setApproveModalOpen(false);
      
      // Show success toast
      toast({
        title: 'موفق',
        description: 'درخواست با موفقیت تأیید شد',
      });
      
      // Navigate back to inbox if we came from there
      const searchParams = new URLSearchParams(window.location.search);
      const from = searchParams.get('from');
      if (from === 'inbox') {
        setTimeout(() => {
          navigate({ to: '/prs/inbox' });
        }, 1000);
      } else if (from === 'finance') {
        setTimeout(() => {
          navigate({ to: '/prs/finance' });
        }, 1000);
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      logger.error('Error approving request:', err);
      
      // Show error toast
      toast({
        title: 'خطا در تأیید درخواست',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
    }
  };

  const handleReject = async () => {
    if (!request) return;

    if (!rejectComment || rejectComment.trim().length < 10) {
      setRejectError('لطفا دلیل رد را وارد کنید (حداقل 10 کاراکتر)');
      return;
    }

    try {
      setIsActioning(true);
      setRejectError(null);
      const updated = await prsApi.rejectRequest(request.id, { comment: rejectComment });
      setRequest(updated);
      setRejectModalOpen(false);
      setRejectComment('');
      // Reload to get latest state
      await loadRequest();
      
      // Show success toast
      toast({
        title: 'موفق',
        description: 'درخواست با موفقیت رد شد',
      });
      
      // Navigate back to inbox if we came from there
      const searchParams = new URLSearchParams(window.location.search);
      const from = searchParams.get('from');
      if (from === 'inbox') {
        setTimeout(() => {
          navigate({ to: '/prs/inbox' });
        }, 1000);
      } else if (from === 'finance') {
        setTimeout(() => {
          navigate({ to: '/prs/finance' });
        }, 1000);
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      setRejectError(errorMessage);
      logger.error('Error rejecting request:', err);
      
      // Show error toast
      toast({
        title: 'خطا در رد درخواست',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
    }
  };

  const handleComplete = async () => {
    if (!request) return;

    try {
      setIsActioning(true);
      const updated = await prsApi.completeRequest(request.id);
      setRequest(updated);
      // Reload to get latest state
      await loadRequest();
      setCompleteModalOpen(false);
      
      // Show success toast
      toast({
        title: 'موفق',
        description: 'درخواست با موفقیت تکمیل شد',
      });
      
      // Navigate back to inbox if we came from there
      const searchParams = new URLSearchParams(window.location.search);
      const from = searchParams.get('from');
      if (from === 'inbox') {
        setTimeout(() => {
          navigate({ to: '/prs/inbox' });
        }, 1000);
      } else if (from === 'finance') {
        setTimeout(() => {
          navigate({ to: '/prs/finance' });
        }, 1000);
      }
    } catch (err: any) {
      const errorMessage = extractErrorMessage(err);
      logger.error('Error completing request:', err);
      
      // Show error toast
      toast({
        title: 'خطا در تکمیل درخواست',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsActioning(false);
    }
  };

  // Check if current user is the requestor
  const isRequestor = request && user && isRequestorHelper(user.id, request);

  const isAdmin = user?.is_admin ?? false;
  const isApproverRole = !!user && hasRole(user, 'APPROVER');
  const isFinanceRole = !!user && hasRole(user, 'FINANCE');

  // Check if request is editable by requestor
  const isEditable = request && isRequestor && isEditableStatus(request.status.code);

  // Check if user can approve/reject/complete (frontend guard; backend still validates step approver)
  const canApproveRequest =
    request && !isAdmin && isApproverRole && canApprove(request.status.code);
  const canRejectRequest =
    request && !isAdmin && (isApproverRole || isFinanceRole) && canReject(request.status.code);
  const canFinanceCompleteRequest =
    request && !isAdmin && isFinanceRole && canFinanceComplete(request.status.code);

  // Convert field values to initial values format for PrsDynamicForm
  const getFieldValues = () => {
    if (!request) return {};
    return extractInitialValuesFromFieldValues(request.field_values);
  };

  // Get form fields from request (extract from field_values)
  const getFormFields = () => {
    if (!request) return [];
    // Extract unique fields from field_values (fields are already in field_values)
    return request.field_values.map((fv) => fv.field);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="جزئیات درخواست خرید"
          breadcrumb={['درخواست‌های خرید', 'جزئیات']}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        </Box>
      </>
    );
  }

  if (!request) {
    return null;
  }

  const formFields = getFormFields();
  const fieldValues = getFieldValues();

  return (
    <>
      <PageHeader
        title="جزئیات درخواست خرید"
        breadcrumb={['درخواست‌های خرید', 'جزئیات']}
      >
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Initiator actions */}
          {isEditable && (
            <Button
              variant="contained"
              color="primary"
              buttonSize="M"
              startIcon={<FileText className="w-5 h-5" />}
              onClick={() => navigate({ to: '/prs/requests/new', search: (prev: any) => ({ ...prev, requestId: request.id }) })}
            >
              ویرایش و ارسال مجدد
            </Button>
          )}
          
          {/* Approver/Finance actions - only show if user is NOT the requestor */}
          {!isRequestor && (canApproveRequest || canRejectRequest || canFinanceCompleteRequest) && (
            <>
              {canApproveRequest && (
                <Button
                  variant="contained"
                  color="success"
                  buttonSize="M"
                  startIcon={<CheckCircle className="w-5 h-5" />}
                  onClick={() => setApproveModalOpen(true)}
                  disabled={isActioning}
                >
                  {isActioning ? 'در حال پردازش...' : 'تأیید'}
                </Button>
              )}
              {canRejectRequest && (
                <Button
                  variant="outlined"
                  color="error"
                  buttonSize="M"
                  startIcon={<XCircle className="w-5 h-5" />}
                  onClick={() => setRejectModalOpen(true)}
                  disabled={isActioning}
                >
                  {isActioning ? 'در حال پردازش...' : 'رد با توضیح'}
                </Button>
              )}
              {canFinanceCompleteRequest && (
                <Button
                  variant="contained"
                  color="primary"
                  buttonSize="M"
                  startIcon={<CheckCircle className="w-5 h-5" />}
                  onClick={() => setCompleteModalOpen(true)}
                  disabled={isActioning}
                >
                  {isActioning ? 'در حال پردازش...' : 'علامت به عنوان انجام‌شده'}
                </Button>
              )}
            </>
          )}
        </Box>
      </PageHeader>

      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: 2,
          px: 4,
          py: 6,
          mt: 3,
        }}
      >
        {/* Top-level info */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h1" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
            اطلاعات کلی
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                تیم
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {request.team.name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                وضعیت
              </Typography>
              <Chip
                label={request.status.title}
                size="small"
                sx={{
                  backgroundColor: 
                    request.status.code === 'DRAFT' ? '#E3F2FD' :
                    request.status.code === 'PENDING_APPROVAL' ? '#FFF3E0' :
                    request.status.code === 'IN_REVIEW' ? '#E1F5FE' :
                    request.status.code === 'REJECTED' ? '#FFEBEE' :
                    request.status.code === 'RESUBMITTED' ? '#F3E5F5' :
                    request.status.code === 'FINANCE_REVIEW' ? '#E8F5E9' :
                    request.status.code === 'COMPLETED' ? '#E8F5E9' : '#F5F5F5',
                  color:
                    request.status.code === 'DRAFT' ? '#1976D2' :
                    request.status.code === 'PENDING_APPROVAL' ? '#F57C00' :
                    request.status.code === 'IN_REVIEW' ? '#0288D1' :
                    request.status.code === 'REJECTED' ? '#D32F2F' :
                    request.status.code === 'RESUBMITTED' ? '#7B1FA2' :
                    request.status.code === 'FINANCE_REVIEW' ? '#388E3C' :
                    request.status.code === 'COMPLETED' ? '#2E7D32' : '#616161',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  height: 28,
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                نام فروشنده
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {request.vendor_name}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                حساب فروشنده
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {request.vendor_account}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                موضوع
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {request.subject}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                نوع خرید
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {request.purchase_type.title}
              </Typography>
            </Box>
            {request.current_step_name && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  مرحله فعلی
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {request.current_step_name}
                </Typography>
              </Box>
            )}
            {request.submitted_at && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  تاریخ ارسال
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {new Date(request.submitted_at).toLocaleDateString('fa-IR')}
                </Typography>
              </Box>
            )}
          </Box>
          {request.description && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                توضیحات
              </Typography>
              <Typography variant="body1">{request.description}</Typography>
            </Box>
          )}
          {request.rejection_comment && (
            <Box sx={{ mt: 3, p: 3, bgcolor: '#FFEBEE', borderRadius: 2, border: '1px solid #FFCDD2' }}>
              <Typography variant="h3" color="error" fontWeight={700} sx={{ mb: 1 }}>
                دلیل رد درخواست:
              </Typography>
              <Typography variant="body1" color="error" sx={{ lineHeight: 1.8 }}>
                {request.rejection_comment}
              </Typography>
            </Box>
          )}
          
          {/* Edit & Resubmit section for initiator */}
          {isEditable && (
            <Box sx={{ mt: 3, p: 3, bgcolor: '#E3F2FD', borderRadius: 2, border: '1px solid #BBDEFB' }}>
              <Typography variant="h3" fontWeight={700} color="primary" sx={{ mb: 2 }}>
                ویرایش و ارسال مجدد
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                شما می‌توانید این درخواست را ویرایش کرده و مجدداً ارسال کنید.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                buttonSize="M"
                startIcon={<FileText className="w-5 h-5" />}
                onClick={() => navigate({ to: '/prs/requests/new', search: (prev: any) => ({ ...prev, requestId: request.id }) })}
              >
                ویرایش درخواست
              </Button>
            </Box>
          )}
        </Box>

        {/* Field values */}
        {formFields.length > 0 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h1" fontWeight={700} color="text.primary" sx={{ mb: 3 }}>
              فیلدهای فرم
            </Typography>
            <PrsDynamicForm
              fields={formFields}
              initialValues={fieldValues}
              onChange={() => {}} // Read-only
              errors={{}}
              isEditable={false}
            />
          </Box>
        )}

        {/* Attachments */}
        <PrsAttachmentsPanel
          requestId={requestId}
          canEdit={isEditable || false}
          teamId={request.team.id}
        />

        {/* History Panel */}
        <PrsHistoryPanel
          requestId={requestId}
          request={request}
        />
      </Box>

      {/* Approve Confirmation Modal */}
      <Modal
        open={approveModalOpen}
        onClose={() => {
          if (!isActioning) {
            setApproveModalOpen(false);
          }
        }}
        width={500}
      >
        <Box sx={{ p: 4, position: 'relative' }}>
          <IconButton
            onClick={() => {
              if (!isActioning) {
                setApproveModalOpen(false);
              }
            }}
            disabled={isActioning}
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
            تأیید درخواست
          </Typography>
          {request && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                آیا از تأیید این درخواست اطمینان دارید؟
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>موضوع:</strong> {request.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>فروشنده:</strong> {request.vendor_name}
                </Typography>
                {request.current_step_name && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>مرحله فعلی:</strong> {request.current_step_name}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              buttonSize="M"
              onClick={() => setApproveModalOpen(false)}
              disabled={isActioning}
            >
              انصراف
            </Button>
            <Button
              variant="contained"
              color="success"
              buttonSize="M"
              onClick={handleApprove}
              disabled={isActioning}
              startIcon={isActioning ? <CircularProgress size={16} /> : <CheckCircle className="w-5 h-5" />}
            >
              {isActioning ? 'در حال تأیید...' : 'تأیید'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Complete Confirmation Modal */}
      <Modal
        open={completeModalOpen}
        onClose={() => {
          if (!isActioning) {
            setCompleteModalOpen(false);
          }
        }}
        width={500}
      >
        <Box sx={{ p: 4, position: 'relative' }}>
          <IconButton
            onClick={() => {
              if (!isActioning) {
                setCompleteModalOpen(false);
              }
            }}
            disabled={isActioning}
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
            تکمیل درخواست
          </Typography>
          {request && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                آیا از تکمیل این درخواست اطمینان دارید؟ پس از تکمیل، درخواست قابل ویرایش نخواهد بود.
              </Typography>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>موضوع:</strong> {request.subject}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>فروشنده:</strong> {request.vendor_name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>حساب فروشنده:</strong> {request.vendor_account}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>نوع خرید:</strong> {request.purchase_type.title}
                </Typography>
                {request.current_step_name && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>مرحله فعلی:</strong> {request.current_step_name}
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              buttonSize="M"
              onClick={() => setCompleteModalOpen(false)}
              disabled={isActioning}
            >
              انصراف
            </Button>
            <Button
              variant="contained"
              color="primary"
              buttonSize="M"
              onClick={handleComplete}
              disabled={isActioning}
              startIcon={isActioning ? <CircularProgress size={16} /> : <CheckCircle className="w-5 h-5" />}
            >
              {isActioning ? 'در حال تکمیل...' : 'تکمیل'}
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModalOpen}
        onClose={() => {
          if (!isActioning) {
            setRejectModalOpen(false);
            setRejectComment('');
            setRejectError(null);
          }
        }}
        width={500}
      >
        <Box sx={{ p: 4, position: 'relative' }}>
          <IconButton
            onClick={() => {
              if (!isActioning) {
                setRejectModalOpen(false);
                setRejectComment('');
                setRejectError(null);
              }
            }}
            disabled={isActioning}
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
            رد درخواست
          </Typography>
          {rejectError && (
            <Box sx={{ p: 2, bgcolor: '#fee', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" color="error">
                {rejectError}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label="دلیل رد (حداقل 10 کاراکتر)"
            value={rejectComment}
            onChange={(e) => {
              setRejectComment(e.target.value);
              setRejectError(null);
            }}
            sx={{ mb: 3 }}
            disabled={isActioning}
          />
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="primary"
              buttonSize="M"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectComment('');
                setRejectError(null);
              }}
              disabled={isActioning}
            >
              انصراف
            </Button>
            <Button
              variant="contained"
              color="error"
              buttonSize="M"
              onClick={handleReject}
              disabled={isActioning || !rejectComment || rejectComment.trim().length < 10}
              startIcon={isActioning ? <CircularProgress size={16} /> : <XCircle className="w-5 h-5" />}
            >
              {isActioning ? 'در حال رد...' : 'رد درخواست'}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
}

