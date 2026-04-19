import apiClient from './client';
import type {
  ProfileResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  UpdateSettingsRequest,
  SettingsResponse,
  MyLoansResponse,
  MyReservationsResponse,
  ActivitiesResponse,
} from '../types';

export async function getMyProfile(): Promise<ProfileResponse> {
  const res = await apiClient.get<ProfileResponse>('/api/me/profile');
  return res.data;
}

export async function updateMyProfile(data: UpdateProfileRequest): Promise<ProfileResponse> {
  const res = await apiClient.put<ProfileResponse>('/api/me/profile', data);
  return res.data;
}

export async function changeMyPassword(data: ChangePasswordRequest): Promise<void> {
  await apiClient.put('/api/me/password', data);
}

export async function updateMySettings(data: UpdateSettingsRequest): Promise<SettingsResponse> {
  const res = await apiClient.put<SettingsResponse>('/api/me/settings', data);
  return res.data;
}

export async function getMyLoans(page = 1, size = 20): Promise<MyLoansResponse> {
  const res = await apiClient.get<MyLoansResponse>('/api/me/loans', { params: { page, size } });
  return res.data;
}

export async function getMyReservations(page = 1, size = 20): Promise<MyReservationsResponse> {
  const res = await apiClient.get<MyReservationsResponse>('/api/me/reservations', { params: { page, size } });
  return res.data;
}

export async function getMyActivities(): Promise<ActivitiesResponse> {
  const res = await apiClient.get<ActivitiesResponse>('/api/me/activities');
  return res.data;
}
