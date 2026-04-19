import apiClient from './client';
import type {
  BooksResponse,
  BookSearchParams,
  AdminBookResponse,
  CreateBookRequest,
  UpdateBookRequest,
  DeleteRequest,
  UsersResponse,
  AdminUserResponse,
  CreateUserRequest,
  UpdateUserRequest,
  AdminResetPasswordRequest,
  AdminLoansResponse,
  AdminReservationsResponse,
  OperationLogsResponse,
} from '../types';

// ---- Books ----
export async function getAdminBooks(params?: BookSearchParams): Promise<BooksResponse> {
  const res = await apiClient.get<BooksResponse>('/api/books', { params });
  return res.data;
}

export async function createBook(data: CreateBookRequest): Promise<AdminBookResponse> {
  const res = await apiClient.post<AdminBookResponse>('/api/admin/books', data);
  return res.data;
}

export async function updateBook(id: number, data: UpdateBookRequest): Promise<AdminBookResponse> {
  const res = await apiClient.put<AdminBookResponse>(`/api/admin/books/${id}`, data);
  return res.data;
}

export async function deleteBook(id: number, data: DeleteRequest): Promise<void> {
  await apiClient.delete(`/api/admin/books/${id}`, { data });
}

// ---- Users ----
export async function getUsers(page = 1, size = 20): Promise<UsersResponse> {
  const res = await apiClient.get<UsersResponse>('/api/admin/users', { params: { page, size } });
  return res.data;
}

export async function createUser(data: CreateUserRequest): Promise<AdminUserResponse> {
  const res = await apiClient.post<AdminUserResponse>('/api/admin/users', data);
  return res.data;
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<AdminUserResponse> {
  const res = await apiClient.put<AdminUserResponse>(`/api/admin/users/${id}`, data);
  return res.data;
}

export async function deleteUser(id: number, data: DeleteRequest): Promise<void> {
  await apiClient.delete(`/api/admin/users/${id}`, { data });
}

export async function resetUserPassword(id: number, data: AdminResetPasswordRequest): Promise<void> {
  await apiClient.put(`/api/admin/users/${id}/password`, data);
}

// ---- Admin Loans ----
export async function getAdminLoans(page = 1, size = 20): Promise<AdminLoansResponse> {
  const res = await apiClient.get<AdminLoansResponse>('/api/admin/loans', { params: { page, size } });
  return res.data;
}

// ---- Admin Reservations ----
export async function getAdminReservations(page = 1, size = 20): Promise<AdminReservationsResponse> {
  const res = await apiClient.get<AdminReservationsResponse>('/api/admin/reservations', { params: { page, size } });
  return res.data;
}

// ---- Operation Logs ----
export async function getOperationLogs(page = 1, size = 20): Promise<OperationLogsResponse> {
  const res = await apiClient.get<OperationLogsResponse>('/api/admin/logs', { params: { page, size } });
  return res.data;
}
