import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import DashboardPage from '../DashboardPage'
import * as meApi from '../../api/me'
import * as loansApi from '../../api/loans'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { MyLoansResponse, LoanItem } from '../../types'

vi.mock('../../api/me')
vi.mock('../../api/loans')

function renderDashboard() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <DashboardPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

const activeLoan: LoanItem = {
  loanId: 1,
  bookId: 1,
  bookTitle: 'Java入門',
  author: '著者A',
  loanedAt: '2024-01-01',
  dueDate: '2099-12-31',
  returnedAt: null,
  status: 'ACTIVE',
  isOverdue: false,
  version: 0,
}

const overdueLoan: LoanItem = {
  ...activeLoan,
  loanId: 2,
  dueDate: '2020-01-01',
  status: 'OVERDUE',
  isOverdue: true,
}

const mockLoansData: MyLoansResponse = {
  currentLoanCount: 1,
  remainingLoanCount: 4,
  isOverdue: false,
  loans: [activeLoan],
  total: 1,
  page: 1,
  size: 20,
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F034: ダッシュボードの表示
  it('renders dashboard with loan data', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValueOnce(mockLoansData)

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Java入門')).toBeInTheDocument()
    })
    expect(screen.getByText('ダッシュボード')).toBeInTheDocument()
  })

  // TC-F035: 貸出中なし状態
  it('shows empty state when no active loans', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValueOnce({
      ...mockLoansData,
      currentLoanCount: 0,
      loans: [],
      total: 0,
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('現在貸出中の図書はありません')).toBeInTheDocument()
    })
  })

  // TC-F036: 延滞警告の表示
  it('shows overdue warning when there are overdue loans', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValueOnce({
      ...mockLoansData,
      isOverdue: true,
      loans: [overdueLoan],
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText(/延滞中の図書があります/)).toBeInTheDocument()
    })
  })

  // TC-F037: 返却操作の成功
  it('calls returnLoan when 返却する button clicked', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoansData)
    vi.mocked(loansApi.returnLoan).mockResolvedValueOnce({
      id: 1, bookId: 1, bookTitle: 'Java入門', returnedAt: '2024-01-14', version: 1,
    })

    renderDashboard()
    await waitFor(() => screen.getByRole('button', { name: '返却する' }))
    fireEvent.click(screen.getByRole('button', { name: '返却する' }))

    await waitFor(() => {
      expect(vi.mocked(loansApi.returnLoan)).toHaveBeenCalledWith(1, { version: 0 })
    })
  })

  // TC-F038: 返却エラーの処理
  it('handles return loan error', async () => {
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoansData)
    vi.mocked(loansApi.returnLoan).mockRejectedValueOnce(
      Object.assign(new Error(), { response: { status: 500 } })
    )

    renderDashboard()
    await waitFor(() => screen.getByRole('button', { name: '返却する' }))
    fireEvent.click(screen.getByRole('button', { name: '返却する' }))

    await waitFor(() => {
      expect(vi.mocked(loansApi.returnLoan)).toHaveBeenCalled()
    })
  })

  // TC-F039: データ取得エラーの表示
  it('shows error message on fetch failure', async () => {
    vi.mocked(meApi.getMyLoans).mockRejectedValueOnce(new Error('network error'))

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('データの読み込みに失敗しました。')).toBeInTheDocument()
    })
  })
})
