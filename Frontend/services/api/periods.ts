import { apiRequest } from 'src/libs/apiRequest';
import {
  FinancialPeriod,
  FinancialPeriodCreateRequest,
  FinancialPeriodUpdateRequest,
} from 'src/types/api/periods';

export async function getFinancialPeriods(): Promise<FinancialPeriod[]> {
  // Legacy CFO-wise endpoint `/api/financial-periods/` is no longer exposed
  // on the backend. To keep the PRS UI stable, we return an empty list when
  // a 404 is encountered, treating financial periods as optional metadata.
  const response = await apiRequest.get<FinancialPeriod[]>('/api/financial-periods/').catch((error: any) => {
    if (error?.response?.status === 404) {
      return { data: [] as FinancialPeriod[] };
    }
    throw error;
  });
  return response.data;
}

export async function getFinancialPeriod(id: string): Promise<FinancialPeriod> {
  const response = await apiRequest.get<FinancialPeriod>(`/api/financial-periods/${id}/`);
  return response.data;
}

export async function createFinancialPeriod(data: FinancialPeriodCreateRequest): Promise<FinancialPeriod> {
  const response = await apiRequest.post<FinancialPeriod>('/api/financial-periods/', data);
  return response.data;
}

export async function updateFinancialPeriod(id: string, data: FinancialPeriodUpdateRequest): Promise<FinancialPeriod> {
  const response = await apiRequest.patch<FinancialPeriod>(`/api/financial-periods/${id}/`, data);
  return response.data;
}

export async function deleteFinancialPeriod(id: string): Promise<void> {
  // Soft delete by setting is_active to false (backend doesn't support DELETE method)
  await apiRequest.patch<FinancialPeriod>(`/api/financial-periods/${id}/`, {
    is_active: false,
  });
}

