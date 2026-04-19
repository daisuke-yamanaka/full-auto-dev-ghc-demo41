import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import BookListPage from '../BookListPage'
import * as booksApi from '../../api/books'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { BooksResponse } from '../../types'

vi.mock('../../api/books')

function renderBookListPage(role: 'USER' | 'ADMIN' = 'USER') {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role, fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <BookListPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

const mockBooksResponse: BooksResponse = {
  books: [
    { id: 1, title: 'Java入門', author: '著者A', isbn: '9784123456789', publisher: '出版社', publishedYear: 2020, category: 'プログラミング', totalCopies: 2, availableCopies: 2, earliestDueDate: null, version: 0 },
    { id: 2, title: 'Spring Boot実践', author: '著者B', isbn: '9784234567890', publisher: '出版社', publishedYear: 2021, category: 'プログラミング', totalCopies: 1, availableCopies: 0, earliestDueDate: null, version: 0 },
  ],
  total: 2,
  page: 1,
  size: 20,
}

describe('BookListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F004: 図書一覧の表示
  it('renders book list on load', async () => {
    vi.mocked(booksApi.searchBooks).mockResolvedValueOnce(mockBooksResponse)
    renderBookListPage()

    await waitFor(() => {
      expect(screen.getByText('Java入門')).toBeInTheDocument()
      expect(screen.getByText('Spring Boot実践')).toBeInTheDocument()
    })
  })

  // TC-F005: 検索フォーム送信
  it('calls searchBooks with title when search form submitted', async () => {
    vi.mocked(booksApi.searchBooks).mockResolvedValue(mockBooksResponse)
    renderBookListPage()

    await waitFor(() => screen.getByText('Java入門'))

    fireEvent.change(screen.getByPlaceholderText('タイトル'), {
      target: { value: 'Java' },
    })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    await waitFor(() => {
      expect(vi.mocked(booksApi.searchBooks)).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Java' })
      )
    })
  })

  // TC-F006: 検索結果0件の表示
  it('shows empty message when no books found', async () => {
    vi.mocked(booksApi.searchBooks).mockResolvedValueOnce({
      books: [], total: 0, page: 1, size: 20,
    })
    renderBookListPage()

    await waitFor(() => {
      expect(screen.getByText('該当する図書が見つかりませんでした')).toBeInTheDocument()
    })
  })

  // 管理者は「図書追加」リンクが表示される
  it('shows add book link for admin', async () => {
    vi.mocked(booksApi.searchBooks).mockResolvedValueOnce(mockBooksResponse)
    renderBookListPage('ADMIN')

    await waitFor(() => screen.getByText('Java入門'))

    expect(screen.getByText('+ 図書追加')).toBeInTheDocument()
  })

  // 全件数の表示
  it('shows total count', async () => {
    vi.mocked(booksApi.searchBooks).mockResolvedValueOnce(mockBooksResponse)
    renderBookListPage()

    await waitFor(() => {
      expect(screen.getByText('全 2 件')).toBeInTheDocument()
    })
  })

  // エラー処理
  it('shows error state when fetch fails', async () => {
    vi.mocked(booksApi.searchBooks).mockRejectedValueOnce(new Error('Network Error'))
    renderBookListPage()

    await waitFor(() => {
      expect(screen.getByText('図書の読み込みに失敗しました。')).toBeInTheDocument()
    })
  })

  // カテゴリフィルター
  it('calls searchBooks with category when category is selected', async () => {
    vi.mocked(booksApi.searchBooks).mockResolvedValue(mockBooksResponse)
    renderBookListPage()
    await waitFor(() => screen.getByText('Java入門'))

    const categorySelect = screen.getByDisplayValue('カテゴリを選択')
    fireEvent.change(categorySelect, { target: { value: 'プログラミング' } })
    fireEvent.click(screen.getByRole('button', { name: '検索' }))

    await waitFor(() => {
      expect(vi.mocked(booksApi.searchBooks)).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'プログラミング' })
      )
    })
  })
})
