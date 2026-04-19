import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ReservationListPage from '../ReservationListPage'
import * as meApi from '../../api/me'
import * as reservationsApi from '../../api/reservations'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { MyReservationsResponse } from '../../types'

vi.mock('../../api/me')
vi.mock('../../api/reservations')

const mockReservationsData: MyReservationsResponse = {
  reservations: [
    {
      id: 1,
      bookId: 10,
      bookTitle: 'Spring Boot実践',
      author: '著者B',
      reservedAt: '2024-01-01T00:00:00',
      queuePosition: 1,
      version: 0,
    },
  ],
  total: 1,
  page: 1,
  size: 20,
}

function renderReservationListPage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <ReservationListPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ReservationListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F012: 予約一覧の表示
  it('renders reservation list', async () => {
    vi.mocked(meApi.getMyReservations).mockResolvedValueOnce(mockReservationsData)
    renderReservationListPage()

    await waitFor(() => {
      expect(screen.getByText('Spring Boot実践')).toBeInTheDocument()
    })
  })

  // キュー番号の表示
  it('shows queue position', async () => {
    vi.mocked(meApi.getMyReservations).mockResolvedValueOnce(mockReservationsData)
    renderReservationListPage()

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  // TC-F013: 予約キャンセル操作 - ConfirmDialogが表示される
  it('shows confirm dialog when cancel button clicked', async () => {
    vi.mocked(meApi.getMyReservations).mockResolvedValueOnce(mockReservationsData)
    renderReservationListPage()

    await waitFor(() => screen.getByText('Spring Boot実践'))

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => {
      expect(screen.getByText('予約のキャンセル確認')).toBeInTheDocument()
    })
  })

  // TC-F013: 確認後 cancelReservation が呼ばれる
  it('calls cancelReservation after confirm', async () => {
    vi.mocked(meApi.getMyReservations).mockResolvedValue(mockReservationsData)
    vi.mocked(reservationsApi.cancelReservation).mockResolvedValueOnce(undefined)

    renderReservationListPage()
    await waitFor(() => screen.getByText('Spring Boot実践'))

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() => screen.getByText('予約のキャンセル確認'))

    fireEvent.click(screen.getByRole('button', { name: 'キャンセルする' }))

    await waitFor(() => {
      expect(vi.mocked(reservationsApi.cancelReservation)).toHaveBeenCalledWith(1, { version: 0 })
    })
  })

  // エラー処理: キャンセル 409 競合エラー
  it('refetches on 409 cancel error', async () => {
    vi.mocked(meApi.getMyReservations).mockResolvedValue(mockReservationsData)
    const error = Object.assign(new Error(), { response: { status: 409 } })
    vi.mocked(reservationsApi.cancelReservation).mockRejectedValueOnce(error)

    renderReservationListPage()
    await waitFor(() => screen.getByText('Spring Boot実践'))

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await waitFor(() => screen.getByText('予約のキャンセル確認'))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセルする' }))

    await waitFor(() => {
      expect(vi.mocked(meApi.getMyReservations)).toHaveBeenCalledTimes(2)
    })
  })

  // エラー処理: データ読み込み失敗
  it('shows error message when fetch fails', async () => {
    vi.mocked(meApi.getMyReservations).mockRejectedValueOnce(new Error('Network Error'))
    renderReservationListPage()

    await waitFor(() => {
      expect(screen.getByText('データの読み込みに失敗しました。')).toBeInTheDocument()
    })
  })

  // 再読み込みボタン
  it('retries fetch when retry button clicked', async () => {
    vi.mocked(meApi.getMyReservations)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(mockReservationsData)
    renderReservationListPage()

    await waitFor(() => screen.getByText('再読み込み'))
    fireEvent.click(screen.getByText('再読み込み'))

    await waitFor(() => {
      expect(vi.mocked(meApi.getMyReservations)).toHaveBeenCalledTimes(2)
    })
  })
})
