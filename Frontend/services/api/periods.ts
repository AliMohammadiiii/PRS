import { apiRequest } from 'src/libs/apiRequest';
import {
  FinancialPeriod,
  FinancialPeriodCreateRequest,
  FinancialPeriodUpdateRequest,
} from 'src/types/api/periods';

export async function getFinancialPeriods(): Promise<FinancialPeriod[]> {
  const response = await apiRequest.get<FinancialPeriod[]>('/api/financial-periods/');
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

