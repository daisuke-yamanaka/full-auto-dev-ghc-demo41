import apiClient from './client';
import type { BooksResponse, BookDetailResponse, BookSearchParams } from '../types';

export async function searchBooks(params?: BookSearchParams): Promise<BooksResponse> {
  const res = await apiClient.get<BooksResponse>('/api/books', { params });
  return res.data;
}

export async function getBook(id: number): Promise<BookDetailResponse> {
  const res = await apiClient.get<BookDetailResponse>(`/api/books/${id}`);
  return res.data;
}
