import apiClient from './client';
import type { CreateReservationRequest, ReservationResponse, CancelReservationRequest } from '../types';

export async function createReservation(data: CreateReservationRequest): Promise<ReservationResponse> {
  const res = await apiClient.post<ReservationResponse>('/api/reservations', data);
  return res.data;
}

export async function cancelReservation(id: number, data: CancelReservationRequest): Promise<void> {
  await apiClient.delete(`/api/reservations/${id}`, { data });
}
