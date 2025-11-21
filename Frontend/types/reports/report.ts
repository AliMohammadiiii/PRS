import { FetchReportResponse } from '../reportResponse';

export type ReportRow = {
  id: string; // set in client - NO server-response
  companyName: string; // نام شرکت
  title: string; // عنوان گزارش
  fiscalYear: string; // سال مالی
  timeRange: string; // بازه زمانی
  status: string; // وضعیت (pending_approval, approved)
};

export type FetchReportsResponse = FetchReportResponse<ReportRow>;

