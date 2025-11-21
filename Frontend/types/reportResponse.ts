export type ReportColumn = {
  key: string;
  sortable: boolean;
  type: number;
  title: string;
};

export interface FetchReportResponse<Row> {
  columns: ReportColumn[];
  rows: Row[];
}

