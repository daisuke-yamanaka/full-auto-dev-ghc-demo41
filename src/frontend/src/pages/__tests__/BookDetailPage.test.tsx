import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BookDetailPage from '../BookDetailPage'
import * as booksApi from '../../api/books'
import * as loansApi from '../../api/loans'
import * as reservationsApi from '../../api/reservations'
import * as meApi from '../../api/me'
import * as adminApi from '../../api/admin'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { BookDetailResponse, MyLoansResponse } from '../../types'

vi.mock('../../api/books')
vi.mock('../../api/loans')
vi.mock('../../api/reservations')
vi.mock('../../api/me')
vi.mock('../../api/admin')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

const mockBook: BookDetailResponse = {
  id: 1,
  title: 'Java入門',
  author: '著者A',
  isbn: '9784123456789',
  publisher: '技術出版',
  publishedYear: 2020,
  category: 'プログラミング',
  totalCopies: 2,
  availableCopies: 2,
  reservationCount: 0,
  earliestDueDate: null,
  currentUserLoanId: null,
  currentUserLoanVersion: null,
  currentUserReservationId: null,
  currentUserReservationVersion: null,
  currentUserStatus: 'none',
  currentUserQueuePosition: null,
  version: 0,
}

const mockLoans: MyLoansResponse = {
  currentLoanCount: 0,
  remainingLoanCount: 5,
  isOverdue: false,
  loans: [],
  total: 0,
  page: 1,
  size: 1,
}

function renderBookDetailPage(role: 'USER' | 'ADMIN' = 'USER') {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role, fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter initialEntries={['/books/1']}>
      <AuthProvider>
        <SnackbarProvider>
          <Routes>
            <Route path="/books/:id" element={<BookDetailPage />} />
          </Routes>
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}
describe('BookDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F007: 図書詳細の表示
  it('renders book detail', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValueOnce(mockBook)
    vi.mocked(meApi.getMyLoans).mockResolvedValueOnce(mockLoans)

    renderBookDetailPage()

    await waitFor(() => {
      expect(screen.getByText('Java入門')).toBeInTheDocument()
      expect(screen.getByText('著者A')).toBeInTheDocument()
      expect(screen.getByText('9784123456789')).toBeInTheDocument()
    })
  })

  // TC-F008: 貸出ボタンのクリック
  it('calls createLoan when 貸し出す button clicked', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoans)
    vi.mocked(loansApi.createLoan).mockResolvedValueOnce({
      id: 1, bookId: 1, bookTitle: 'Java入門', loanedAt: '', dueDate: '2024-01-14', version: 0,
    })

    renderBookDetailPage()
    await waitFor(() => screen.getByText('Java入門'))

    const loanButton = screen.getByRole('button', { name: '貸し出す' })
    fireEvent.click(loanButton)

    await waitFor(() => {
      expect(vi.mocked(loansApi.createLoan)).toHaveBeenCalledWith({ bookId: 1 })
    })
  })

  // TC-F009: 予約ボタンのクリック
  it('calls createReservation when 予約する button clicked', async () => {
    const fullBook = { ...mockBook, availableCopies: 0 }
    vi.mocked(booksApi.getBook).mockResolvedValue(fullBook)
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoans)
    vi.mocked(reservationsApi.createReservation).mockResolvedValueOnce({
      id: 1, bookId: 1, bookTitle: 'Java入門', reservedAt: '', queuePosition: 1, version: 0,
    })

    renderBookDetailPage()
    await waitFor(() => screen.getByText('Java入門'))

    const reserveButton = screen.getByRole('button', { name: '予約する' })
    fireEvent.click(reserveButton)

    await waitFor(() => {
      expect(vi.mocked(reservationsApi.createReservation)).toHaveBeenCalledWith({ bookId: 1 })
    })
  })

  // 404エラー表示
  it('shows not found message on 404', async () => {
    const error = Object.assign(new Error('Not found'), { response: { status: 404 } })
    vi.mocked(booksApi.getBook).mockRejectedValueOnce(error)
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoans)

    renderBookDetailPage()

    await waitFor(() => {
      expect(screen.getByText('図書が見つかりませんでした')).toBeInTheDocument()
    })
  })

  // 返却エラー: 409 競合
  it('handles 409 on return loan', async () => {
    const loanedBook = {
      ...mockBook,
      availableCopies: 1,
      currentUserStatus: 'loaned' as const,
      currentUserLoanId: 100,
      currentUserLoanVersion: 0,
    }
    vi.mocked(booksApi.getBook).mockResolvedValue(loanedBook)
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoans)
    const error = Object.assign(new Error(), { response: { status: 409 } })
    vi.mocked(loansApi.returnLoan).mockRejectedValueOnce(error)

    renderBookDetailPage()
    await waitFor(() => screen.getByRole('button', { name: '返却する' }))

    fireEvent.click(screen.getByRole('button', { name: '返却する' }))

    await waitFor(() => {
      expect(vi.mocked(loansApi.returnLoan)).toHaveBeenCalled()
    })
  })

  // 貸出エラー: 一般エラー
  it('handles general error on createLoan', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoans)
    vi.mocked(loansApi.createLoan).mockRejectedValueOnce(
      Object.assign(new Error(), { response: { status: 400, data: { message: '貸出失敗' } } })
    )

    renderBookDetailPage()
    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.click(screen.getByRole('button', { name: '貸し出す' }))

    await waitFor(() => {
      expect(vi.mocked(loansApi.createLoan)).toHaveBeenCalled()
    })
  })

  // 戻るボタン
  it('navigates back when 戻る button clicked', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)
    vi.mocked(meApi.getMyLoans).mockResolvedValue(mockLoans)

    renderBookDetailPage()
    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.click(screen.getByText('← 戻る'))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  // 管理者: 削除エラー処理
  it('handles delete error', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)
    const error = Object.assign(new Error(), { response: { status: 500 } })
    vi.mocked(adminApi.deleteBook).mockRejectedValueOnce(error)

    renderBookDetailPage('ADMIN')
    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => screen.getByText('図書の削除'))
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    await waitFor(() => {
      expect(vi.mocked(adminApi.deleteBook)).toHaveBeenCalled()
    })
  })

  // 管理者: 削除ボタンの表示
  it('shows delete button for admin', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)

    renderBookDetailPage('ADMIN')
    await waitFor(() => screen.getByText('Java入門'))

    expect(screen.getByRole('button', { name: '削除' })).toBeInTheDocument()
  })

  // 管理者: 削除確認ダイアログ表示
  it('shows delete confirm dialog when delete button clicked', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)

    renderBookDetailPage('ADMIN')
    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(screen.getByText('図書の削除')).toBeInTheDocument()
  })

  // 管理者: 削除確認ダイアログのキャンセル
  it('closes confirm dialog when cancel is clicked', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)

    renderBookDetailPage('ADMIN')
    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => screen.getByText('図書の削除'))

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.queryByText('図書の削除')).not.toBeInTheDocument()
  })

  // 管理者: 削除実行
  it('calls deleteBook when delete confirmed', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValue(mockBook)
    vi.mocked(adminApi.deleteBook).mockResolvedValueOnce(undefined)

    renderBookDetailPage('ADMIN')
    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await waitFor(() => screen.getByText('図書の削除'))

    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    await waitFor(() => {
      expect(vi.mocked(adminApi.deleteBook)).toHaveBeenCalledWith(1, { version: 0 })
    })
  })
})
