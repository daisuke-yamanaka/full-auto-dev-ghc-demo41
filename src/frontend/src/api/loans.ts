import apiClient from './client';
import type { CreateLoanRequest, LoanResponse, ReturnLoanRequest, ReturnLoanResponse } from '../types';

export async function createLoan(data: CreateLoanRequest): Promise<LoanResponse> {
  const res = await apiClient.post<LoanResponse>('/api/loans', data);
  return res.data;
}

export async function returnLoan(id: number, data: ReturnLoanRequest): Promise<ReturnLoanResponse> {
  const res = await apiClient.put<ReturnLoanResponse>(`/api/loans/${id}/return`, data);
  return res.data;
}
