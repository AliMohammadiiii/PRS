import { Submission, ReportSubmissionGroup } from './workflow';

export interface ReviewRejectRequest {
  comment: string;
}

export interface ReviewRejectResponse {
  detail: string;
}

export interface ReviewApproveResponse {
  detail: string;
}

// Review endpoints return Submission objects
export type ReviewSubmission = Submission;

// Group review types
export interface ReviewGroupRejectRequest {
  comment: string;
}

export interface ReviewGroupRejectResponse {
  detail: string;
}

export interface ReviewGroupApproveResponse {
  detail: string;
}

// ReviewGroup includes nested submissions
export interface ReviewGroup extends ReportSubmissionGroup {
  submissions?: Submission[];
}


