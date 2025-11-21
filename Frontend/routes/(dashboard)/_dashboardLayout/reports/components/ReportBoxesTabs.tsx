import React, { useState, useEffect, useMemo } from 'react';
import logger from "@/lib/logger";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Box, Typography, CircularProgress, Button, TextField, Select, MenuItem } from 'injast-core/components';
import { Chip } from '@mui/material';
import { defaultColors } from 'injast-core/constants';
import { getReportBoxesByClassification, ReportBoxByClassification } from 'src/services/reports/report';
import { getLookups } from 'src/services/api/lookups';
import { Lookup } from 'src/types/api/lookups';
import { getSubmission, createSubmission, updateSubmission } from 'src/services/api/workflow';
import { getOrCreateReportSubmissionGroup, updateReportSubmissionGroup } from 'src/services/api/reportSubmissionGroups';
import ReportBoxFieldsForm from '../submit/components/ReportBoxFieldsForm';
import { ReportBox } from 'src/types/api/reports';

type ReportBoxesTabsProps = {
  companyId: string;
  financialPeriodId: string;
  reportingPeriodId: string;
  fieldValues: Record<string, Record<string, any>>;
  onFieldChange: (reportId: string, fieldId: string, value: any, reportBox: any) => void;
  reportDetails: {
    title: string;
    description: string;
    reportingPeriodId: string;
    status?: string | null; // Status code (DRAFT, UNDER_REVIEW, etc.)
    statusComment?: string | null; // Rejection or approval comment
  };
  onReportDetailsChange: (details: { title: string; description: string; reportingPeriodId: string }) => void;
  onCompletionChange?: (isComplete: boolean) => void;
  isEditable?: boolean;
};

type ReportBoxWithSubmission = {
  reportBox: ReportBox;
  hasSubmission: boolean;
  submissionStatus: string | null;
};

export default function ReportBoxesTabs({
  companyId,
  financialPeriodId,
  reportingPeriodId,
  fieldValues,
  onFieldChange,
  reportDetails,
  onReportDetailsChange,
  onCompletionChange,
  isEditable = true,
}: ReportBoxesTabsProps) {
  const [classifications, setClassifications] = useState<ReportBoxByClassification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [reportingPeriods, setReportingPeriods] = useState<Lookup[]>([]);
  const [submissionIds, setSubmissionIds] = useState<Record<string, string>>({});
  const [reportSubmissionGroupId, setReportSubmissionGroupId] = useState<string | null>(null);

  // Helper functions for status display
  const getStatusText = (status: string | null | undefined): string => {
    if (!status) return 'نامشخص';
    switch (status) {
      case 'UNDER_REVIEW':
        return 'درانتظار تایید';
      case 'APPROVED':
        return 'تایید شده';
      case 'REJECTED':
        return 'نیازمند تغییرات';
      case 'DRAFT':
        return 'پیش نویس';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string | null | undefined): string => {
    if (!status) return defaultColors.neutral.main || '#4f545e';
    switch (status) {
      case 'UNDER_REVIEW':
        return defaultColors.orange?.main || '#F4BC28';
      case 'APPROVED':
        return defaultColors.success?.main || '#1DBF98';
      case 'REJECTED':
        return defaultColors.danger?.main || '#FF0000';
      case 'DRAFT':
        return defaultColors.neutral.light || '#91969f';
      default:
        return defaultColors.neutral.main || '#4f545e';
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Always fetch reporting periods
        const lookups = await getLookups();
        const reportingPeriodLookups = lookups.filter(
          l => l.type === 'REPORTING_PERIOD' && l.is_active
        );
        setReportingPeriods(reportingPeriodLookups);
        
        // Only fetch report boxes if reporting_period is selected
        if (companyId && financialPeriodId && reportingPeriodId) {
          const data = await getReportBoxesByClassification({
            company_id: companyId,
            financial_period_id: financialPeriodId,
            reporting_period_id: reportingPeriodId,
          });
          setClassifications(data);
        } else {
          setClassifications([]);
        }
        
        // Load existing submission IDs by fetching submissions
        const ids: Record<string, string> = {};
        setSubmissionIds(ids);
      } catch (error) {
        logger.error('Error fetching data', error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId && financialPeriodId) {
      fetchData();
    }
  }, [companyId, financialPeriodId, reportingPeriodId]);

  // Get all report boxes in a flat list (one tab per report_box)
  const allReportBoxes = useMemo<ReportBoxWithSubmission[]>(() => {
    const boxes: ReportBoxWithSubmission[] = [];
    const seenBoxIds = new Set<string>();
    
    // Flatten all report_boxes from all classifications
    for (const classification of classifications) {
      for (const item of classification.report_boxes) {
        // Avoid duplicates (a report_box might be in multiple classifications)
        if (!seenBoxIds.has(item.report_box.id)) {
          seenBoxIds.add(item.report_box.id);
          boxes.push({
            reportBox: item.report_box,
            hasSubmission: item.has_submission,
            submissionStatus: item.submission_status,
          });
        }
      }
    }
    return boxes;
  }, [classifications]);

  // Check if all report boxes are complete (all required fields filled)
  const isAllComplete = useMemo(() => {
    if (allReportBoxes.length === 0) return false;
    
    // Check each report box
    for (const item of allReportBoxes) {
      const reportBox = item.reportBox;
      const reportFieldValues = fieldValues[reportBox.id] || {};
      const fields = reportBox.fields || [];
      
      // Check if all required fields are filled
      for (const field of fields) {
        if (field.required) {
          const value = reportFieldValues[field.id];
          // Check if value is empty/null/undefined
          if (value === null || value === undefined || value === '') {
            return false;
          }
          // For boolean fields, false is a valid value, so we only check for null/undefined
          if (field.data_type === 'YES_NO' && value === null) {
            return false;
          }
        }
      }
    }
    
    return true;
  }, [allReportBoxes, fieldValues]);

  // Notify parent of completion status change
  useEffect(() => {
    if (onCompletionChange) {
      onCompletionChange(isAllComplete);
    }
  }, [isAllComplete, onCompletionChange]);

  // Get current report box based on active tab - MUST be before any conditional returns
  const currentReportBox = useMemo(() => {
    if (activeTab.startsWith('report-box-')) {
      const reportBoxId = activeTab.replace('report-box-', '');
      return allReportBoxes.find(b => b.reportBox.id === reportBoxId)?.reportBox || null;
    }
    return null;
  }, [activeTab, allReportBoxes]);

  const handleReportBoxTabClick = async (reportBoxId: string) => {
    setActiveTab(`report-box-${reportBoxId}`);
    
    // Load existing submission values if submission exists
    const submissionId = submissionIds[reportBoxId];
    if (submissionId) {
      try {
        const submission = await getSubmission(submissionId);
        // Transform submission values to fieldValues format
        const submissionFieldValues: Record<string, any> = {};
        submission.values.forEach((value) => {
          const fieldId = value.field.id;
          if (value.value_number !== null && value.value_number !== undefined) {
            submissionFieldValues[fieldId] = value.value_number;
          } else if (value.value_text !== null && value.value_text !== undefined) {
            submissionFieldValues[fieldId] = value.value_text;
          } else if (value.value_bool !== null && value.value_bool !== undefined) {
            submissionFieldValues[fieldId] = value.value_bool;
          } else if (value.value_date !== null && value.value_date !== undefined) {
            submissionFieldValues[fieldId] = value.value_date;
          } else if (value.value_file !== null && value.value_file !== undefined) {
            submissionFieldValues[fieldId] = value.value_file;
          } else if (value.entity_ref_uuid !== null && value.entity_ref_uuid !== undefined) {
            submissionFieldValues[fieldId] = value.entity_ref_uuid;
          }
        });
        
        // Update fieldValues with loaded submission data
        const reportBox = allReportBoxes.find(b => b.reportBox.id === reportBoxId)?.reportBox;
        if (reportBox) {
          onFieldChange(reportBoxId, '', submissionFieldValues, reportBox);
        }
      } catch (error) {
        logger.error('Error loading submission:',  error);
      }
    }
  };

  // Load existing submissions to get their IDs and report submission group
  useEffect(() => {
    const loadSubmissionIds = async () => {
      if (!companyId || !financialPeriodId || !reportingPeriodId) return;
      
      try {
        const { getSubmissions } = await import('src/services/api/submissions');
        const submissions = await getSubmissions({
          company_id: companyId,
          financial_period_id: financialPeriodId,
          reporting_period_id: reportingPeriodId,
        });
        
        const ids: Record<string, string> = {};
        for (const submission of submissions) {
          if (submission.report?.id) {
            ids[submission.report.id] = submission.id;
          }
          // Get report submission group ID from first submission
          if (submission.group?.id && !reportSubmissionGroupId) {
            setReportSubmissionGroupId(submission.group.id);
            // Load report details from group
            if (submission.group.title || submission.group.description) {
              onReportDetailsChange({
                title: submission.group.title || '',
                description: submission.group.description || '',
                reportingPeriodId: reportingPeriodId,
              });
            }
          }
        }
        setSubmissionIds(ids);
      } catch (error) {
        logger.error('Error loading submission IDs:',  error);
      }
    };
    
    loadSubmissionIds();
  }, [companyId, financialPeriodId, reportingPeriodId]);

  // Auto-save report details when they change
  useEffect(() => {
    if (!companyId || !financialPeriodId || !reportDetails.reportingPeriodId) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        if (reportSubmissionGroupId) {
          await updateReportSubmissionGroup(reportSubmissionGroupId, {
            title: reportDetails.title,
            description: reportDetails.description,
          });
        } else {
          const group = await getOrCreateReportSubmissionGroup({
            company_id: companyId,
            financial_period_id: financialPeriodId,
            reporting_period_id: reportDetails.reportingPeriodId,
            title: reportDetails.title,
            description: reportDetails.description,
          });
          setReportSubmissionGroupId(group.id);
        }
      } catch (error) {
        logger.error('Error saving report details:',  error);
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [reportDetails.title, reportDetails.description, companyId, financialPeriodId, reportDetails.reportingPeriodId]);

  const handleFieldChange = async (reportId: string, fieldId: string, value: any, reportBox: ReportBox) => {
    onFieldChange(reportId, fieldId, value, reportBox);
    
    // Auto-save after debounce
    setTimeout(async () => {
      try {
        const submissionId = submissionIds[reportId];
        const currentFieldValues = fieldValues[reportId] || {};
        const updatedFieldValues = { ...currentFieldValues, [fieldId]: value };
        
        const fieldsData = (reportBox.fields || [])
          .map(field => {
            const fieldValue = updatedFieldValues[field.id];
            
            // Skip fields with no value (null, undefined, or empty string)
            // For YES_NO fields, false is a valid value, so we check explicitly
            if (field.data_type !== 'YES_NO' && (fieldValue === null || fieldValue === undefined || fieldValue === '')) {
              return null;
            }
            
            // For YES_NO, if value is null/undefined, skip it (don't send false as default)
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
          .filter((item): item is NonNullable<typeof item> => item !== null);

        const submissionData: any = {
          report: reportId,
          company: companyId,
          financial_period: financialPeriodId,
          reporting_period: reportingPeriodId,
          fields: fieldsData,
        };

        // If we have a report submission group ID, use it to avoid creating duplicate groups
        if (reportSubmissionGroupId) {
          submissionData.group = reportSubmissionGroupId;
        }

        if (submissionId) {
          // Update existing submission - only update fields, keep status
          await updateSubmission(submissionId, { fields: fieldsData });
        } else {
          // Create new submission with DRAFT status for auto-saves
          // The backend will check if submission already exists and update it if so
          const newSubmission = await createSubmission({
            ...submissionData,
            status: 'DRAFT',
          } as any);
          // Store the submission ID (could be new or existing)
          setSubmissionIds(prev => ({ ...prev, [reportId]: newSubmission.id }));
        }
      } catch (error) {
        logger.error('Error auto-saving submission:',  error);
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
          p: 4,
          bgcolor: 'white',
          borderRadius: '12px',
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>در حال بارگذاری گزارش‌ها...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList
          className="w-full h-[55px] bg-white rounded-t-xl rounded-b-none border-b border-gray-200 p-0 flex"
          style={{
            height: '55px',
            backgroundColor: 'white',
            borderBottom: `1px solid ${defaultColors.neutral[300]}`,
            borderRadius: '12px 12px 0 0',
            padding: 0,
            display: 'flex',
            gap: 0,
          }}
        >
          {/* Report Details Tab - First (مشخصات گزارش) */}
          <TabsTrigger
            value="details"
            className="flex-1 min-w-[170px] h-full text-base font-medium text-[#91969f] data-[state=active]:text-[#4f545e] data-[state=active]:font-bold relative"
            style={{
              flex: 1,
              minWidth: '170px',
              height: '100%',
              fontSize: '16px',
              fontWeight: 500,
              color: defaultColors.neutral.light,
              paddingTop: '16px',
              paddingBottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
            onClick={() => setActiveTab('details')}
          >
            <span style={{ lineHeight: '22px' }}>مشخصات گزارش</span>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: '64px',
                height: '3px',
                borderRadius: '8px',
                bgcolor: defaultColors.neutral.main,
                opacity: activeTab === 'details' ? 1 : 0,
                transition: 'opacity 0.2s',
              }}
            />
          </TabsTrigger>
          
          {/* Separator after مشخصات گزارش - only show if there are report boxes */}
          {reportingPeriodId && allReportBoxes.length > 0 && (
            <Box
              sx={{
                width: '1px',
                height: '19px',
                bgcolor: defaultColors.neutral[300],
                alignSelf: 'center',
              }}
            />
          )}

          {/* Report Box Tabs - one tab per report_box, only show when reporting_period is selected */}
          {reportingPeriodId && allReportBoxes.map((item, index) => (
            <React.Fragment key={item.reportBox.id}>
              <TabsTrigger
                value={`report-box-${item.reportBox.id}`}
                className="flex-1 min-w-[170px] h-full text-base font-medium text-[#91969f] data-[state=active]:text-[#4f545e] data-[state=active]:font-bold relative"
                style={{
                  flex: 1,
                  minWidth: '170px',
                  height: '100%',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: defaultColors.neutral.light,
                  paddingTop: '16px',
                  paddingBottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                }}
                onClick={() => handleReportBoxTabClick(item.reportBox.id)}
              >
                <span style={{ lineHeight: '22px' }}>{item.reportBox.name}</span>
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '64px',
                    height: '3px',
                    borderRadius: '8px',
                    bgcolor: defaultColors.neutral.main,
                    opacity: activeTab === `report-box-${item.reportBox.id}` ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}
                />
              </TabsTrigger>
              {/* Separator after each report box tab except the last one */}
              {index < allReportBoxes.length - 1 && (
                <Box
                  sx={{
                    width: '1px',
                    height: '19px',
                    bgcolor: defaultColors.neutral[300],
                    alignSelf: 'center',
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </TabsList>

        {/* Report Details Content - "مشخصات گزارش" tab */}
        <TabsContent value="details" className="p-6 mt-0">
          <Box
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {/* Report Period */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                دوره گزارش
              </Typography>
              <Select
                value={reportDetails.reportingPeriodId}
                size="small"
                onChange={(e) => {
                  const newReportingPeriodId = e.target.value as string;
                  onReportDetailsChange({ ...reportDetails, reportingPeriodId: newReportingPeriodId });
                  // Reset to details tab when reporting period changes
                  setActiveTab('details');
                }}
                disabled={!isEditable}
                displayEmpty
                height={48}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& .MuiSelect-select': {
                      textAlign: 'left',
                    },
                  },
                }}
              >
                <MenuItem value="" disabled>
                  <em style={{ fontStyle: 'normal', color: defaultColors.neutral.light }}>بازه زمانی</em>
                </MenuItem>
                {reportingPeriods.map((period) => (
                  <MenuItem key={period.id} value={period.id}>
                    {period.title}
                  </MenuItem>
                ))}
              </Select>
            </Box>

            {/* General Information */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                اطلاعات کلی
              </Typography>
              
              <TextField
                placeholder="عنوان"
                value={reportDetails.title}
                onChange={(e) => onReportDetailsChange({ ...reportDetails, title: e.target.value })}
                disabled={!isEditable}
                fullWidth
                height={48}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& input': {
                      textAlign: 'left',
                    },
                  },
                }}
              />

              {/* Status Display */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                  وضعیت
                </Typography>
                <Box
                  sx={{
                    height: '48px',
                    borderRadius: '8px',
                    border: `1px solid ${defaultColors.neutral[300]}`,
                    display: 'flex',
                    alignItems: 'center',
                    paddingX: 2,
                    bgcolor: 'white',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: getStatusColor(reportDetails.status),
                      textAlign: 'left',
                      width: '100%',
                    }}
                  >
                    {getStatusText(reportDetails.status)}
                  </Typography>
                </Box>
              </Box>

              {/* Status Comment (Rejection/Approval Comments) */}
              {(reportDetails.status === 'REJECTED' || reportDetails.status === 'APPROVED') && reportDetails.statusComment && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                    {reportDetails.status === 'REJECTED' ? 'توضیحات رد' : 'توضیحات تایید'}
                  </Typography>
                  <TextField
                    value={reportDetails.statusComment}
                    disabled
                    multiline
                    rows={4}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        borderColor: defaultColors.neutral[300],
                        bgcolor: reportDetails.status === 'REJECTED' 
                          ? (defaultColors.danger?.light || '#ffe0e0') 
                          : (defaultColors.success?.light || '#e0f5f0'),
                        '& textarea': {
                          textAlign: 'left',
                        },
                        '&.Mui-disabled': {
                          bgcolor: reportDetails.status === 'REJECTED' 
                            ? (defaultColors.danger?.light || '#ffe0e0') 
                            : (defaultColors.success?.light || '#e0f5f0'),
                        },
                      },
                    }}
                  />
                </Box>
              )}
              <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                  توضیحات
              </Typography>
              <TextField
                placeholder="توضیحات"
                value={reportDetails.description}
                onChange={(e) => onReportDetailsChange({ ...reportDetails, description: e.target.value })}
                disabled={!isEditable}
                multiline
                rows={6}
                fullWidth
                sx={{
                  minHeight: '136px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    borderColor: defaultColors.neutral[300],
                    '& textarea': {
                      textAlign: 'left',
                    },
                  },
                }}
              />
            </Box>
          </Box>
        </TabsContent>

        {/* Report Box Tabs Content - show form in full page section when tab is clicked */}
        {reportingPeriodId && allReportBoxes.map((item) => (
          <TabsContent 
            key={item.reportBox.id} 
            value={`report-box-${item.reportBox.id}`} 
            className="p-0 mt-0"
          >
            {/* Empty content - form will be shown below tabs in full page section */}
          </TabsContent>
        ))}
      </Tabs>

      {/* Full Page Form Section - shown when a report_box tab is active */}
      {currentReportBox && activeTab.startsWith('report-box-') && (
        <Box
          sx={{
            bgcolor: 'white',
            borderRadius: '12px',
            mt: 3,
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            width: '100%',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              width: '100%',
              maxWidth: '736px',
            }}
          >
            {/* Report Box Fields - Full Page Section */}
            <ReportBoxFieldsForm
              reportBox={currentReportBox}
              fieldValues={fieldValues[currentReportBox.id] || {}}
              onFieldChange={(fieldId, value) => handleFieldChange(currentReportBox.id, fieldId, value, currentReportBox)}
              isEditable={isEditable}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}

