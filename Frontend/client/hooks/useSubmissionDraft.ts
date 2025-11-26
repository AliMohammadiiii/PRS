import { useState, useCallback, useRef, useEffect } from 'react';
import logger from "@/lib/logger";
import { createSubmission, updateSubmission } from 'src/services/api/workflow';
import { ReportField } from 'src/types/api/reports';

type FieldValues = Record<string, Record<string, any>>; // reportId -> fieldId -> value

export function useSubmissionDraft() {
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [submissionIds, setSubmissionIds] = useState<Record<string, string>>({}); // reportId -> submissionId
  const submissionIdsRef = useRef<Record<string, string>>({}); // ref for synchronous reading
  const debounceTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Keep ref in sync with state
  useEffect(() => {
    submissionIdsRef.current = submissionIds;
  }, [submissionIds]);

  const convertFieldValueToApiFormat = (
    fieldId: string,
    value: any,
    field: ReportField
  ): any => {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const baseValue = {
      field_id: fieldId,
    };

    switch (field.data_type) {
      case 'NUMBER':
        return {
          ...baseValue,
          value_number: typeof value === 'number' ? value : parseFloat(value),
        };
      case 'TEXT':
        return {
          ...baseValue,
          value_text: String(value),
        };
      case 'YES_NO':
        return {
          ...baseValue,
          value_bool: Boolean(value),
        };
      case 'DATE':
        return {
          ...baseValue,
          value_date: typeof value === 'string' ? value : value.toISOString().split('T')[0],
        };
      case 'FILE':
        // File objects need to be sent as FormData
        return {
          ...baseValue,
          value_file: value,
        };
      case 'ENTITY_REF':
        return {
          ...baseValue,
          entity_ref_uuid: value,
        };
      default:
        return null;
    }
  };

  const createOrUpdateSubmission = useCallback(async (
    reportId: string,
    companyId: string,
    financialPeriodId: string,
    reportingPeriodId: string,
    fields: ReportField[],
    currentFieldValues: Record<string, any>
  ): Promise<string | null> => {
    try {
      // Convert field values to API format (shared with both create and update flows)
      const fieldsData = fields
        .map((field) => {
          const value = currentFieldValues[field.id];
          if (value === null || value === undefined || value === '') {
            return null;
          }
          return convertFieldValueToApiFormat(field.id, value, field);
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      // Check if we need to use FormData for file uploads
      const hasFiles = fieldsData.some(f => f.value_file instanceof File);
      
      // Get current submission ID from ref for synchronous reading
      let submissionId = submissionIdsRef.current[reportId] || null;

      if (submissionId) {
        // Update existing submission
        // For now, file fields are not handled differently here – callers should
        // manage file uploads explicitly, and this hook focuses on non-file data.
        const nonFileFields = hasFiles
          ? fieldsData.filter(f => !(f as any).value_file instanceof File)
          : fieldsData;

        await updateSubmission(submissionId, {
          fields: nonFileFields,
        } as any);
      } else {
        // Create new submission
        const nonFileFields = hasFiles
          ? fieldsData.filter(f => !(f as any).value_file instanceof File)
          : fieldsData;

        const submission = await createSubmission({
          report: reportId,
          company: companyId,
          financial_period: financialPeriodId,
          reporting_period: reportingPeriodId,
          fields: nonFileFields,
        } as any);
        submissionId = submission.id;
        
        const newSubmissionIds = { ...submissionIdsRef.current, [reportId]: submissionId };
        submissionIdsRef.current = newSubmissionIds;
        setSubmissionIds(newSubmissionIds);
        setSubmissionId(submissionId);
      }

      return submissionId;
    } catch (error) {
      logger.error('Error saving submission:',  error);
      throw error;
    }
  }, []);

  const updateFieldValue = useCallback(async (
    reportId: string,
    fieldId: string,
    value: any,
    companyId: string,
    financialPeriodId: string,
    reportingPeriodId: string
  ) => {
    // Update local state immediately
    setFieldValues((prev) => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        [fieldId]: value,
      },
    }));

    // Debounce API calls
    const key = `${reportId}-${fieldId}`;
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }

    debounceTimersRef.current[key] = setTimeout(async () => {
      try {
        // Get current field values for this report
        const currentReportValues = {
          ...fieldValues[reportId],
          [fieldId]: value,
        };

        // We need the field definition to convert the value properly
        // For now, we'll fetch it or pass it from the component
        // This is a limitation - we might need to refactor to pass fields
        // For now, let's assume we can get the field type from somewhere
        // This will be handled in the component that calls this
        
        // The actual save will be triggered from the component with field definitions
      } catch (error) {
        logger.error('Error updating field value:',  error);
      }
    }, 500); // 500ms debounce
  }, [fieldValues]);

  return {
    submissionId,
    fieldValues,
    updateFieldValue,
    createOrUpdateSubmission,
    submissionIds,
    setFieldValues,
  };
}



