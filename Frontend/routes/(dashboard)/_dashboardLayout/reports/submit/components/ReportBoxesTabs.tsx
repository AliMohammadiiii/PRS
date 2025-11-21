import React, { useState, useEffect, useMemo } from 'react';
import logger from "@/lib/logger";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Box, Typography, CircularProgress } from 'injast-core/components';
import { defaultColors } from 'injast-core/constants';
import { getWorkflowDashboard, getSubmission } from 'src/services/api/workflow';
import { Submission } from 'src/types/api/workflow';
import { Lookup } from 'src/types/api/lookups';
import ReportBoxFieldsForm from './ReportBoxFieldsForm';

type ReportBoxesTabsProps = {
  companyId: string;
  financialPeriodId: string;
  reportingPeriodId: string;
  fieldValues: Record<string, Record<string, any>>;
  onFieldChange: (reportId: string, fieldId: string, value: any, reportBox: any) => void;
  initialFormData: {
    companyId: string;
    financialPeriodId: string;
    reportingPeriodId: string;
    title: string;
    description: string;
  };
};

// Group submissions by their report's classifications
function getGroupedByClassifications(submissions: Submission[]) {
    const classificationMap = new Map<string, { classification: Lookup; submissions: Submission[] }>();
    
    submissions.forEach((submission) => {
      const classifications = submission.report.classifications || [];
      
      if (classifications.length === 0) {
        // If no classification, add to a default "Other" group
        const defaultKey = 'other';
        if (!classificationMap.has(defaultKey)) {
          classificationMap.set(defaultKey, {
            classification: {
              id: 'other',
              type: 'COMPANY_CLASSIFICATION',
              code: 'OTHER',
              title: 'سایر',
              description: null,
              is_active: true,
              created_at: '',
              updated_at: '',
            },
            submissions: [],
          });
        }
        classificationMap.get(defaultKey)!.submissions.push(submission);
      } else {
        // Add to each classification the report belongs to
        classifications.forEach((classification) => {
          const key = classification.id;
          if (!classificationMap.has(key)) {
            classificationMap.set(key, {
              classification,
              submissions: [],
            });
          }
          classificationMap.get(key)!.submissions.push(submission);
        });
      }
    });
    
    return Array.from(classificationMap.values());
}

// Transform submission values array to Record<fieldId, value>
function transformSubmissionValues(submission: Submission): Record<string, any> {
  const fieldValues: Record<string, any> = {};
  
  submission.values.forEach((value) => {
    const fieldId = value.field.id;
    // Get the actual value based on the field's data type
    if (value.value_number !== null && value.value_number !== undefined) {
      fieldValues[fieldId] = value.value_number;
    } else if (value.value_text !== null && value.value_text !== undefined) {
      fieldValues[fieldId] = value.value_text;
    } else if (value.value_bool !== null && value.value_bool !== undefined) {
      fieldValues[fieldId] = value.value_bool;
    } else if (value.value_date !== null && value.value_date !== undefined) {
      fieldValues[fieldId] = value.value_date;
    } else if (value.value_file !== null && value.value_file !== undefined) {
      fieldValues[fieldId] = value.value_file;
    } else if (value.entity_ref_uuid !== null && value.entity_ref_uuid !== undefined) {
      fieldValues[fieldId] = value.entity_ref_uuid;
    }
  });
  
  return fieldValues;
}

export default function ReportBoxesTabs({
  companyId,
  financialPeriodId,
  reportingPeriodId,
  fieldValues,
  onFieldChange,
  initialFormData,
}: ReportBoxesTabsProps) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('details');

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        setLoading(true);
        // Get workflow dashboard items to find submissions
        const items = await getWorkflowDashboard({
          company_id: companyId,
          period_id: financialPeriodId,
          reporting_period_id: reportingPeriodId,
        });
        
        // Filter to only items with submission_id (i.e., only submissions that exist)
        const itemsWithSubmissions = items.filter(item => item.submission_id !== null);
        
        // Fetch full submission data for each submission_id
        const submissionPromises = itemsWithSubmissions.map(item => 
          getSubmission(item.submission_id!)
        );
        
        const fetchedSubmissions = await Promise.all(submissionPromises);
        setSubmissions(fetchedSubmissions);
        // Always start with 'details' tab active (مشخصات گزارش)
        setActiveTab('details');
      } catch (error) {
        logger.error('Error fetching submissions:',  error);
      } finally {
        setLoading(false);
      }
    };

    if (companyId && financialPeriodId && reportingPeriodId) {
      fetchSubmissions();
    }
  }, [companyId, financialPeriodId, reportingPeriodId]);

  const groupedClassifications = useMemo(() => {
    return getGroupedByClassifications(submissions);
  }, [submissions]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>در حال بارگذاری گزارش‌ها...</Typography>
      </Box>
    );
  }

  if (submissions.length === 0) {
    return (
      <Box
        sx={{
          bgcolor: 'white',
          borderRadius: '12px',
          p: 2,
          textAlign: 'center',
        }}
      >
        <Typography>گزارشی برای این دوره مالی یافت نشد.</Typography>
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
          {/* Report Details Tab - First (مشخصات گزارش) - appears on right in RTL */}
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
          >
            <span style={{ lineHeight: '22px' }}>مشخصات گزارش</span>
            {/* Active indicator - 3px underline */}
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
          
          {/* Separator after مشخصات گزارش */}
          {groupedClassifications.length > 0 && (
            <Box
              sx={{
                width: '1px',
                height: '19px',
                bgcolor: defaultColors.neutral[300],
                alignSelf: 'center',
              }}
            />
          )}

          {/* Classification Tabs */}
          {groupedClassifications.map((group, index) => (
            <React.Fragment key={group.classification.id}>
              <TabsTrigger
                value={`classification-${group.classification.id}`}
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
              >
                <span style={{ lineHeight: '22px' }}>{group.classification.title}</span>
                {/* Active indicator - 3px underline */}
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
                    opacity: activeTab === `classification-${group.classification.id}` ? 1 : 0,
                    transition: 'opacity 0.2s',
                  }}
                />
              </TabsTrigger>
              {/* Separator after each classification tab except the last one */}
              {index < groupedClassifications.length - 1 && (
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

        {/* Report Details Content - Shows initial form data */}
        <TabsContent value="details" className="p-6 mt-0">
          <Box
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                  عنوان
                </Typography>
                <Box
                  sx={{
                    height: '56px',
                    px: 1.5,
                    py: 2,
                    border: `1px solid ${defaultColors.neutral[300]}`,
                    borderRadius: '8px',
                    textAlign: 'left',
                    color: defaultColors.neutral.main,
                    bgcolor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Typography>{initialFormData.title || '-'}</Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                  توضیحات
                </Typography>
                <Box
                  sx={{
                    minHeight: '136px',
                    px: 1.5,
                    py: 2,
                    border: `1px solid ${defaultColors.neutral[300]}`,
                    borderRadius: '8px',
                    textAlign: 'left',
                    color: defaultColors.neutral.main,
                    bgcolor: 'white',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <Typography>{initialFormData.description || '-'}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </TabsContent>

        {/* Classification Tabs Content - Shows submissions grouped by classification */}
        {groupedClassifications.map((group) => (
          <TabsContent 
            key={group.classification.id} 
            value={`classification-${group.classification.id}`} 
            className="p-6 mt-0"
          >
            <Box
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                maxWidth: '736px',
                width: '100%',
              }}
            >
              {group.submissions.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography color="neutral.light">گزارشی در این دسته‌بندی یافت نشد.</Typography>
                </Box>
              ) : (
                group.submissions.map((submission) => {
                  // Transform submission values to fieldValues format
                  const submissionFieldValues = transformSubmissionValues(submission);
                  // Merge with any local changes from fieldValues prop
                  const mergedFieldValues = {
                    ...submissionFieldValues,
                    ...(fieldValues[submission.report.id] || {}),
                  };
                  
                  return (
                    <Box key={submission.id} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      {/* Report Box Name as Section Header */}
                      <Typography variant="h2" fontWeight={700} color="text.primary" textAlign="left">
                        {submission.report.name}
                      </Typography>
                      {submission.report.description && (
                        <Typography variant="body2" color="neutral.light" textAlign="left" sx={{ mb: 1 }}>
                          {submission.report.description}
                        </Typography>
                      )}
                      {/* Report Box Fields */}
                      <ReportBoxFieldsForm
                        reportBox={submission.report}
                        fieldValues={mergedFieldValues}
                        onFieldChange={(fieldId, value) => onFieldChange(submission.report.id, fieldId, value, submission.report)}
                      />
                    </Box>
                  );
                })
              )}
            </Box>
          </TabsContent>
        ))}
      </Tabs>
    </Box>
  );
}

