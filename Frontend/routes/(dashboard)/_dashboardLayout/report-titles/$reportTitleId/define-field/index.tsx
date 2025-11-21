import { createFileRoute, useNavigate } from '@tanstack/react-router';
import logger from "@/lib/logger";
import { useState, useEffect } from 'react';
import { Box, Button, Typography, CircularProgress } from 'injast-core/components';
import PageHeader from '../../../../components/PageHeader';
import { ReportField, generatePersianCode } from 'src/types/reportTitles';
import FieldForm from './components/FieldForm';
import FieldsList from './components/FieldsList';
import * as reportBoxApi from 'src/services/api/reports';
import * as reportFieldApi from 'src/services/api/reports';
import { ReportBox, ReportField as ApiReportField } from 'src/types/api/reports';

export const Route = createFileRoute(
  '/(dashboard)/_dashboardLayout/report-titles/$reportTitleId/define-field/'
)({
  component: DefineFieldPage,
});

// Helper function to map backend ReportField to frontend ReportField
function mapApiFieldToField(apiField: ApiReportField): ReportField {
  // Parse options from help_text if it's a combo-box
  let options: string[] | undefined;
  if (apiField.data_type === 'combo-box' && apiField.help_text) {
    try {
      options = JSON.parse(apiField.help_text);
    } catch {
      // If parsing fails, treat as single string
      options = [apiField.help_text];
    }
  }

  // Parse file extension from help_text if it's a file-upload
  let fileExtension: string | undefined;
  if (apiField.data_type === 'file-upload' && apiField.help_text) {
    fileExtension = apiField.help_text;
  }

  return {
    id: apiField.id,
    title: apiField.name,
    type: apiField.data_type as any,
    label: apiField.name,
    defaultText: apiField.data_type === 'text' ? apiField.help_text || undefined : undefined,
    code: apiField.field_id,
    isActive: apiField.is_active,
    options,
    fileExtension,
  };
}

// Helper function to map frontend ReportField to backend ReportFieldCreateRequest
function mapFieldToApiCreateRequest(field: ReportField, reportBoxId: string): any {
  let helpText: string | null = null;
  
  if (field.type === 'combo-box' && field.options) {
    helpText = JSON.stringify(field.options);
  } else if (field.type === 'file-upload' && field.fileExtension) {
    helpText = field.fileExtension;
  } else if (field.type === 'text' && field.defaultText) {
    helpText = field.defaultText;
  }

  return {
    report: reportBoxId,
    field_id: field.code,
    name: field.title,
    help_text: helpText,
    required: false,
    data_type: field.type,
    entity_ref_type: field.type === 'financial-period' ? 'FINANCIAL_PERIOD' : null,
    is_active: field.isActive,
  };
}

// Helper function to map frontend ReportField to backend ReportFieldUpdateRequest
function mapFieldToApiUpdateRequest(field: ReportField): any {
  let helpText: string | null = null;
  
  if (field.type === 'combo-box' && field.options) {
    helpText = JSON.stringify(field.options);
  } else if (field.type === 'file-upload' && field.fileExtension) {
    helpText = field.fileExtension;
  } else if (field.type === 'text' && field.defaultText) {
    helpText = field.defaultText;
  }

  return {
    field_id: field.code,
    name: field.title,
    help_text: helpText,
    required: false,
    data_type: field.type,
    entity_ref_type: field.type === 'financial-period' ? 'FINANCIAL_PERIOD' : null,
    is_active: field.isActive,
  };
}

function DefineFieldPage() {
  const { reportTitleId } = Route.useParams();
  const navigate = useNavigate();
  const [reportTitle, setReportTitle] = useState<ReportBox | null>(null);
  const [fields, setFields] = useState<ReportField[]>([]);
  const [currentField, setCurrentField] = useState<ReportField | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load report title and fields from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Load report box
        const reportBox = await reportBoxApi.getReportBox(reportTitleId);
        setReportTitle(reportBox);

        // Load fields for this report box
        const allFields = await reportFieldApi.getReportFields();
        const reportFields = allFields.filter((f) => f.report === reportTitleId);
        const mapped = reportFields.map(mapApiFieldToField);
        setFields(mapped);
      } catch (err: any) {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'خطا در بارگذاری اطلاعات'
        );
        logger.error('Error loading report title and fields:',  err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [reportTitleId]);

  // Save fields to API
  const handleSave = async () => {
    if (!reportTitle) return;

    try {
      // Get current fields from API
      const allFields = await reportFieldApi.getReportFields();
      const currentApiFields = allFields.filter((f) => f.report === reportTitleId);
      const fieldsMap = new Map(fields.map((f) => [f.id, f]));
      const apiFieldsMap = new Map(currentApiFields.map((f) => [f.id, f]));

      // Create or update fields
      for (const field of fields) {
        if (apiFieldsMap.has(field.id)) {
          // Update existing field
          await reportFieldApi.updateReportField(field.id, mapFieldToApiUpdateRequest(field));
        } else {
          // Create new field
          await reportFieldApi.createReportField(
            mapFieldToApiCreateRequest(field, reportTitleId)
          );
        }
      }

      // Delete removed fields
      for (const apiField of currentApiFields) {
        if (!fieldsMap.has(apiField.id)) {
          await reportFieldApi.deleteReportField(apiField.id);
        }
      }

      navigate({ to: '/report-titles' });
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        err.message ||
        'خطا در ذخیره فیلدها'
      );
      logger.error('Error saving fields:',  err);
    }
  };

  const handleAddField = () => {
    const newField: ReportField = {
      id: `field-${Date.now()}-${Math.random()}`,
      title: '',
      type: 'text',
      label: `فیلد ${fields.length + 1}`,
      code: generatePersianCode(),
      isActive: false,
    };
    // Add to fields list immediately
    setFields([...fields, newField]);
    // Select the new field
    setCurrentField(newField);
  };

  const handleFieldSubmit = (field: ReportField) => {
    // Use title as label if title exists, otherwise keep the current label
    const updatedField = {
      ...field,
      label: field.title || field.label || `فیلد ${fields.length + 1}`,
    };

    if (currentField?.id && fields.find((f) => f.id === currentField.id)) {
      // Update existing field in local state
      setFields(fields.map((f) => (f.id === currentField.id ? updatedField : f)));
      setCurrentField(updatedField); // Keep the field selected after update
    } else {
      // Add new field to local state (will be saved when user clicks save button)
      const updatedFields = [...fields, updatedField];
      setFields(updatedFields);
      setCurrentField(updatedField); // Automatically select the newly added field
    }
  };

  const handleFieldEdit = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    if (field) {
      setCurrentField(field);
    }
  };

  const handleFieldDelete = (fieldId: string) => {
    setFields(fields.filter((f) => f.id !== fieldId));
    if (currentField?.id === fieldId) {
      setCurrentField(null);
    }
  };

  const handleDeleteAll = () => {
    setFields([]);
    setCurrentField(null);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader
          title="تعریف فیلد"
          breadcrumb={['تعریف فیلد', 'تعریف عناوین']}
        />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </>
    );
  }

  if (error && !reportTitle) {
    return (
      <>
        <PageHeader
          title="تعریف فیلد"
          breadcrumb={['تعریف فیلد', 'تعریف عناوین']}
        />
        <Box sx={{ p: 3, bgcolor: '#fee', borderRadius: 2, mt: 3 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </>
    );
  }

  if (!reportTitle) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>گزارش یافت نشد</Typography>
      </Box>
    );
  }

  return (
    <>
      <PageHeader
        title="تعریف فیلد"
        breadcrumb={['تعریف فیلد', 'تعریف عناوین']}
      >
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          buttonSize="M"
          disabled={fields.length === 0 || !!error}
          sx={{ borderRadius: 1 }}
        >
          ذخیره
        </Button>
      </PageHeader>
      {error && (
        <Box sx={{ p: 2, bgcolor: '#fee', borderRadius: 2, mt: 2 }}>
          <Typography color="error" variant="body2">{error}</Typography>
        </Box>
      )}
      <Box
        sx={{
          mt: 3,
          display: 'flex',
          gap: 2,
          width: '100%',
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <FieldsList
            fields={fields}
            selectedFieldId={currentField?.id || null}
            onAdd={handleAddField}
            onSelect={handleFieldEdit}
            onDelete={handleFieldDelete}
            onDeleteAll={handleDeleteAll}
          />
        </Box>
        <Box
          sx={{
            flex: 1.5,
            minWidth: 0,
          }}
        >
          <FieldForm
            field={currentField}
            onSubmit={handleFieldSubmit}
            onCancel={() => setCurrentField(null)}
            onDelete={currentField ? () => handleFieldDelete(currentField.id) : undefined}
          />
        </Box>
      </Box>
    </>
  );
}

