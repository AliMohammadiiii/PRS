import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Divider,
} from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { Clock, CheckCircle, XCircle, FileText, Send, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ApprovalHistory, PurchaseRequest } from 'src/types/api/prs';
import * as prsApi from 'src/services/api/prs';
import logger from '@/lib/logger';

export interface PrsHistoryPanelProps {
  requestId: string;
  request?: PurchaseRequest | null; // Optional request data for created/submitted/completed events
}

interface HistoryItem {
  id: string;
  type: 'created' | 'submitted' | 'approved' | 'rejected' | 'completed';
  user: string;
  step?: string;
  timestamp: string;
  comment?: string | null;
}

export default function PrsHistoryPanel({
  requestId,
  request,
}: PrsHistoryPanelProps) {
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (requestId) {
      loadApprovalHistory();
    }
  }, [requestId]);

  const loadApprovalHistory = async () => {
    if (!requestId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await prsApi.getRequestApprovalHistory(requestId);
      setApprovalHistory(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message || 'خطا در بارگذاری تاریخچه';
      setError(errorMessage);
      logger.error('Error loading approval history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getUserDisplayName = (request: PurchaseRequest | null): string => {
    if (!request) return 'نامشخص';
    return request.requestor_name || request.requestor || 'نامشخص';
  };

  const buildHistoryItems = (): HistoryItem[] => {
    const items: HistoryItem[] = [];

    // Created event
    if (request && request.created_at) {
      items.push({
        id: 'created',
        type: 'created',
        user: getUserDisplayName(request),
        timestamp: request.created_at,
      });
    }

    // Submitted event
    if (request && request.submitted_at) {
      items.push({
        id: 'submitted',
        type: 'submitted',
        user: getUserDisplayName(request),
        timestamp: request.submitted_at,
      });
    }

    // Approval history items
    approvalHistory.forEach((history) => {
      items.push({
        id: history.id,
        type: history.action === 'APPROVE' ? 'approved' : 'rejected',
        user: history.approver_name,
        step: history.step_name,
        timestamp: history.timestamp,
        comment: history.comment,
      });
    });

    // Completed event
    if (request && request.completed_at) {
      // Find the last approval before completion (finance review completion)
      const lastApproval = approvalHistory
        .filter((h) => h.action === 'APPROVE')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      
      items.push({
        id: 'completed',
        type: 'completed',
        user: lastApproval?.approver_name || 'نامشخص',
        timestamp: request.completed_at,
      });
    }

    // Sort by timestamp (oldest first)
    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getHistoryItemIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'created':
        return (
          <FileText
            className="w-5 h-5"
            color={defaultColors.neutral?.[600] || '#757575'}
          />
        );
      case 'submitted':
        return (
          <Send
            className="w-5 h-5"
            color={defaultColors.primary?.main || '#1976d2'}
          />
        );
      case 'approved':
        return (
          <CheckCircle
            className="w-5 h-5"
            color={defaultColors.success?.[600] || '#2e7d32'}
          />
        );
      case 'rejected':
        return (
          <XCircle
            className="w-5 h-5"
            color={defaultColors.error?.[600] || '#d32f2f'}
          />
        );
      case 'completed':
        return (
          <Check
            className="w-5 h-5"
            color={defaultColors.success?.[600] || '#2e7d32'}
          />
        );
      default:
        return (
          <Clock
            className="w-5 h-5"
            color={defaultColors.neutral?.[600] || '#757575'}
          />
        );
    }
  };

  const getHistoryItemLabel = (item: HistoryItem): string => {
    switch (item.type) {
      case 'created':
        return `ایجاد شده توسط ${item.user}`;
      case 'submitted':
        return `ارسال شده توسط ${item.user}`;
      case 'approved':
        return item.step
          ? `تایید شده توسط ${item.user} در مرحله ${item.step}`
          : `تایید شده توسط ${item.user}`;
      case 'rejected':
        return item.step
          ? `رد شده توسط ${item.user} در مرحله ${item.step}`
          : `رد شده توسط ${item.user}`;
      case 'completed':
        return `تکمیل شده توسط ${item.user}`;
      default:
        return 'وضعیت نامشخص';
    }
  };

  const historyItems = buildHistoryItems();

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h1" fontWeight={700} color="text.primary">
          تاریخچه تایید
        </Typography>
        <Button
          variant="text"
          color="primary"
          buttonSize="S"
          onClick={() => setExpanded(!expanded)}
          startIcon={expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        >
          {expanded ? 'بستن' : 'نمایش'}
        </Button>
      </Box>

      {expanded && (
        <>
          {error && (
            <Box sx={{ p: 2, bgcolor: '#fee', borderRadius: 1, mb: 2 }}>
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            </Box>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : historyItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              هیچ رویدادی در تاریخچه وجود ندارد
            </Typography>
          ) : (
            <Box
              sx={{
                position: 'relative',
                pl: 3,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  left: '12px',
                  top: 0,
                  bottom: 0,
                  width: '2px',
                  bgcolor: defaultColors.neutral[200],
                },
              }}
            >
              {historyItems.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    position: 'relative',
                    mb: index < historyItems.length - 1 ? 3 : 0,
                    pb: index < historyItems.length - 1 ? 3 : 0,
                  }}
                >
                  {/* Timeline dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '-20px',
                      top: '4px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      bgcolor: 'white',
                      border: `2px solid ${
                        item.type === 'approved' || item.type === 'completed'
                          ? (defaultColors.success?.[500] || '#2e7d32')
                          : item.type === 'rejected'
                          ? (defaultColors.error?.[500] || '#d32f2f')
                          : item.type === 'submitted'
                          ? (defaultColors.primary?.main || '#1976d2')
                          : (defaultColors.neutral?.[400] || '#bdbdbd')
                      }`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1,
                    }}
                  >
                    {getHistoryItemIcon(item.type)}
                  </Box>

                  {/* Content */}
                  <Box
                    sx={{
                      bgcolor: defaultColors.neutral[50],
                      borderRadius: 1,
                      p: 2,
                      border: `1px solid ${defaultColors.neutral[200]}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {getHistoryItemLabel(item)}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: item.comment ? 1 : 0 }}>
                      {formatDate(item.timestamp)}
                    </Typography>
                    {item.comment && (
                      <>
                        <Divider sx={{ my: 1 }} />
                        <Box
                          sx={{
                            p: 1.5,
                            bgcolor:
                              item.type === 'rejected'
                                ? (defaultColors.error?.[50] || '#ffebee')
                                : (defaultColors.neutral?.[100] || '#f5f5f5'),
                            borderRadius: 1,
                            border: `1px solid ${
                              item.type === 'rejected'
                                ? (defaultColors.error?.[200] || '#ef9a9a')
                                : (defaultColors.neutral?.[200] || '#eeeeee')
                            }`,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              color: item.type === 'rejected'
                                ? (defaultColors.error?.[700] || '#c62828')
                                : 'text.primary',
                            }}
                          >
                            {item.comment}
                          </Typography>
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}

