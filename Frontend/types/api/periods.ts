export interface FinancialPeriod {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialPeriodCreateRequest {
  title: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface FinancialPeriodUpdateRequest {
  title?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}






