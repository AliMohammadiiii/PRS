import { ReportBox } from './reports';

export interface WorkflowDashboardItem {
  report: ReportBox;
  company: {
    id: string;
    name: string;
    code: string;
  } | null;
  status: 'NOT_STARTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | null;
  submission_id: string | null;
  financial_period_id: string | null;
  reporting_period_id: string | null;
}

export interface SubmissionFieldValue {
  field_id: string;
  value_number?: number | null;
  value_text?: string | null;
  value_bool?: boolean | null;
  value_date?: string | null;
  value_file?: File | null;
  entity_ref_uuid?: string | null;
}

export interface SubmissionCreateRequest {
  report: string; // UUID
  company: string; // UUID
  financial_period: string; // UUID
  reporting_period: string; // UUID (Lookup with type=REPORTING_PERIOD)
  fields: SubmissionFieldValue[]; // Array of field values
}

export interface SubmissionFieldValueRead {
  id: string;
  field: {
    id: string;
    name: string;
    help_text: string | null;
    required: boolean;
    data_type: string;
    entity_ref_type: string | null;
  };
  value_number: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  value_date: string | null;
  value_file: string | null;
  entity_ref_uuid: string | null;
}

export interface Submission {
  id: string;
  report: ReportBox;
  company: {
    id: string;
    name: string;
    code: string;
  };
  financial_period: {
    id: string;
    title: string;
  };
  reporting_period: {
    id: string;
    code: string;
    title: string;
  };
  status: {
    code: string;
    title: string;
  };
  values: SubmissionFieldValueRead[];
  rejection_comment: string | null;
  group?: {
    id: string;
    title: string;
    description: string | null;
    created_at?: string;
    updated_at?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionUpdateRequest {
  fields: SubmissionFieldValue[]; // Array of field values
}

export interface ReportSubmissionGroup {
  id: string;
  title: string;
  description: string | null;
  company: string | {
    id: string;
    name: string;
    code: string;
  };
  financial_period: string | {
    id: string;
    title: string;
  };
  reporting_period: string | {
    id: string;
    code: string;
    title: string;
  };
  status: string | {
    id: string;
    code: string;
    title: string;
  } | null;
  submitted_by: string | null;
  submissions?: Submission[];
  created_at: string;
  updated_at: string;
}

