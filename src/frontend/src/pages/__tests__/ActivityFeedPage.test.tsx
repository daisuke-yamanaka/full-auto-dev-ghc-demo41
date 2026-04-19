import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ActivityFeedPage from '../ActivityFeedPage'
import * as meApi from '../../api/me'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { ActivitiesResponse } from '../../types'

vi.mock('../../api/me')

function renderActivityFeedPage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <ActivityFeedPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

const mockActivities: ActivitiesResponse = {
  activities: [
    { id: 1, type: 'LOAN', bookId: 1, bookTitle: 'Java入門', datetime: '2024-01-01T10:00:00' },
    { id: 2, type: 'RETURN', bookId: 1, bookTitle: 'Java入門', datetime: '2024-01-14T10:00:00' },
    { id: 3, type: 'RESERVATION', bookId: 2, bookTitle: 'Python入門', datetime: '2024-01-10T10:00:00' },
  ],
}

describe('ActivityFeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F023: アクティビティ一覧の表示
  it('renders activities list', async () => {
    vi.mocked(meApi.getMyActivities).mockResolvedValueOnce(mockActivities)

    renderActivityFeedPage()

    await waitFor(() => {
      expect(screen.getAllByText('Java入門')[0]).toBeInTheDocument()
      expect(screen.getByText('Python入門')).toBeInTheDocument()
    })
  })

  // TC-F024: アクティビティ空状態の表示
  it('shows empty state when no activities', async () => {
    vi.mocked(meApi.getMyActivities).mockResolvedValueOnce({ activities: [] })

    renderActivityFeedPage()

    await waitFor(() => {
      expect(screen.getByText('まだアクティビティがありません')).toBeInTheDocument()
    })
  })

  // TC-F025: アクティビティ取得エラー時
  it('shows error message on fetch failure', async () => {
    vi.mocked(meApi.getMyActivities).mockRejectedValueOnce(new Error('network error'))

    renderActivityFeedPage()

    await waitFor(() => {
      expect(screen.getByText('アクティビティの読み込みに失敗しました。再読み込みしてください。')).toBeInTheDocument()
    })
  })

  // TC-F026: エラー時の再読み込みボタン
  it('retries fetching when reload button clicked', async () => {
    vi.mocked(meApi.getMyActivities)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(mockActivities)

    renderActivityFeedPage()

    await waitFor(() => screen.getByRole('button', { name: '再読み込み' }))
    fireEvent.click(screen.getByRole('button', { name: '再読み込み' }))

    await waitFor(() => {
      expect(screen.getAllByText('Java入門')[0]).toBeInTheDocument()
    })
  })

  // TC-F027: アクティビティタイプ別アイコン表示
  it('displays activity type labels', async () => {
    vi.mocked(meApi.getMyActivities).mockResolvedValueOnce(mockActivities)

    renderActivityFeedPage()

    await waitFor(() => {
      expect(screen.getByText('貸出')).toBeInTheDocument()
      expect(screen.getByText('返却')).toBeInTheDocument()
      expect(screen.getByText('予約')).toBeInTheDocument()
    })
  })
})
