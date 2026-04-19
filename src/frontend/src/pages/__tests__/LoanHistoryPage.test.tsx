import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LoanHistoryPage from '../LoanHistoryPage'
import * as meApi from '../../api/me'
import * as loansApi from '../../api/loans'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { MyLoansResponse } from '../../types'

vi.mock('../../api/me')
vi.mock('../../api/loans')

const mockLoansData: MyLoansResponse = {
  currentLoanCount: 1,
  remainingLoanCount: 4,
  isOverdue: false,
  loans: [
    {
      loanId: 1,
      bookId: 10,
      bookTitle: 'Java入門',
      author: '著者A',
      loanedAt: '2024-01-01T00:00:00',
      dueDate: '2024-01-08',
      returnedAt: null,
      status: 'ACTIVE',
      isOverdue: false,
      version: 0,
    },
    {
      loanId: 2,
      bookId: 11,
      bookTitle: 'Spring Boot実践',
      author: '著者B',
      loanedAt: '2024-01-01T00:00:00',
      dueDate: '2024-01-08',
      returnedAt: '2024-01-05T00:00:00',
      status: 'RETURNED',
      isOverdue: false,
      version: 1,
    },
  ],
  total: 2,
  page: 1,
  size: 20,
}

function renderLoanHistoryPage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <LoanHistoryPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('LoanHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F010: 貸出一覧の表示
  it('renders loan list', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValueOnce(mockLoansData)
    renderLoanHistoryPage()

    await waitFor(() => {
      expect(screen.getByText('Java入門')).toBeInTheDocument()
      expect(screen.getByText('Spring Boot実践')).toBeInTheDocument()
    })
  })

  // TC-F011: 返却操作
  it('calls returnLoan when 返却する button clicked', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoansData)
    vi.mocked(loansApi.returnLoan).mockResolvedValueOnce({
      id: 1, bookId: 10, bookTitle: 'Java入門', returnedAt: '2024-01-07T00:00:00', version: 1,
    })

    renderLoanHistoryPage()
    await waitFor(() => screen.getByText('Java入門'))

    const returnButtons = screen.getAllByRole('button', { name: '返却する' })
    fireEvent.click(returnButtons[0])

    await waitFor(() => {
      expect(vi.mocked(loansApi.returnLoan)).toHaveBeenCalledWith(1, { version: 0 })
    })
  })

  // 空の貸出履歴
  it('shows empty message when no loans', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValueOnce({
      ...mockLoansData, loans: [], total: 0,
    })
    renderLoanHistoryPage()

    await waitFor(() => {
      expect(screen.getByText('貸出履歴がありません')).toBeInTheDocument()
    })
  })

  // エラー処理: 返却 409 競合エラー
  it('shows conflict message on 409 return error', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoansData)
    const error = Object.assign(new Error(), { response: { status: 409 } })
    vi.mocked(loansApi.returnLoan).mockRejectedValueOnce(error)

    renderLoanHistoryPage()
    await waitFor(() => screen.getByText('Java入門'))

    const returnButtons = screen.getAllByRole('button', { name: '返却する' })
    fireEvent.click(returnButtons[0])

    await waitFor(() => {
      expect(vi.mocked(meApi.getMyLoans)).toHaveBeenCalledTimes(2) // initial + after error
    })
  })

  // エラー処理: データ読み込み失敗
  it('shows error message when fetch fails', async () => {
    vi.mocked(meApi.getMyLoans).mockRejectedValueOnce(new Error('Network Error'))
    renderLoanHistoryPage()

    await waitFor(() => {
      expect(screen.getByText('データの読み込みに失敗しました。')).toBeInTheDocument()
    })
  })

  // 再読み込みボタン
  it('retries fetch when retry button clicked', async () => {
    vi.mocked(meApi.getMyLoans)
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockResolvedValueOnce(mockLoansData)
    renderLoanHistoryPage()

    await waitFor(() => screen.getByText('再読み込み'))
    fireEvent.click(screen.getByText('再読み込み'))

    await waitFor(() => {
      expect(vi.mocked(meApi.getMyLoans)).toHaveBeenCalledTimes(2)
    })
  })
})
