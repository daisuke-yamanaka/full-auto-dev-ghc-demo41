import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import BookFormPage from '../BookFormPage'
import * as booksApi from '../../api/books'
import * as adminApi from '../../api/admin'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { BookDetailResponse } from '../../types'

vi.mock('../../api/books')
vi.mock('../../api/admin')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

const mockBookDetail: BookDetailResponse = {
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

function renderCreatePage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: '管理者', role: 'ADMIN', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter initialEntries={['/admin/books/new']}>
      <AuthProvider>
        <SnackbarProvider>
          <Routes>
            <Route path="/admin/books/new" element={<BookFormPage />} />
          </Routes>
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

function renderEditPage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: '管理者', role: 'ADMIN', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter initialEntries={['/admin/books/1/edit']}>
      <AuthProvider>
        <SnackbarProvider>
          <Routes>
            <Route path="/admin/books/:id/edit" element={<BookFormPage />} />
          </Routes>
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('BookFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F028: 図書登録フォームの表示
  it('renders create form with title 図書登録', () => {
    renderCreatePage()
    expect(screen.getByText('図書登録')).toBeInTheDocument()
  })

  // TC-F029: 図書編集フォームの表示
  it('renders edit form and loads book data', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValueOnce(mockBookDetail)

    renderEditPage()

    await waitFor(() => {
      expect(screen.getByText('図書編集')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('Java入門')).toBeInTheDocument()
  })

  // TC-F030: バリデーションエラーの表示
  it('shows validation errors when submitting empty form', async () => {
    renderCreatePage()

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getAllByText('必須です').length).toBeGreaterThan(0)
    })
  })

  // TC-F031: 図書登録の成功
  it('creates book and navigates on success', async () => {
    vi.mocked(adminApi.createBook).mockResolvedValueOnce({
      id: 99, title: 'New Book', author: '著者', isbn: '1234567890',
      publisher: '出版社', publishedYear: 2024, category: 'IT', totalCopies: 1,
      availableCopies: 1, version: 0,
    })

    const { container } = renderCreatePage()
    const inputs = container.querySelectorAll('input')

    fireEvent.change(inputs[0], { target: { value: 'New Book' } })
    fireEvent.change(inputs[1], { target: { value: '著者' } })
    fireEvent.change(inputs[2], { target: { value: '1234567890' } })
    fireEvent.change(inputs[3], { target: { value: '出版社' } })
    fireEvent.change(inputs[4], { target: { value: '2024' } })
    fireEvent.change(inputs[5], { target: { value: 'IT' } })
    fireEvent.change(inputs[6], { target: { value: '1' } })

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(vi.mocked(adminApi.createBook)).toHaveBeenCalled()
    })
  })

  // TC-F032: 図書更新の成功
  it('updates book and navigates on success', async () => {
    vi.mocked(booksApi.getBook).mockResolvedValueOnce(mockBookDetail)
    vi.mocked(adminApi.updateBook).mockResolvedValueOnce({
      id: 1, title: 'Java入門 改訂版', author: '著者A', isbn: '9784123456789',
      publisher: '技術出版', publishedYear: 2021, category: 'プログラミング', totalCopies: 3,
      availableCopies: 3, version: 1,
    })

    renderEditPage()

    await waitFor(() => screen.getByDisplayValue('Java入門'))

    fireEvent.change(screen.getByDisplayValue('Java入門'), { target: { value: 'Java入門 改訂版' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(vi.mocked(adminApi.updateBook)).toHaveBeenCalled()
    })
  })

  // TC-F033: API エラーの表示
  it('shows api error on save failure', async () => {
    vi.mocked(adminApi.createBook).mockRejectedValueOnce(
      Object.assign(new Error(), { response: { status: 409, data: {} } })
    )

    const { container } = renderCreatePage()
    const inputs = container.querySelectorAll('input')

    fireEvent.change(inputs[0], { target: { value: 'Title' } })
    fireEvent.change(inputs[1], { target: { value: 'Author' } })
    fireEvent.change(inputs[2], { target: { value: '1234567890' } })
    fireEvent.change(inputs[3], { target: { value: 'Publisher' } })
    fireEvent.change(inputs[4], { target: { value: '2024' } })
    fireEvent.change(inputs[5], { target: { value: 'IT' } })
    fireEvent.change(inputs[6], { target: { value: '1' } })

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('データが更新されました。再読込してください')).toBeInTheDocument()
    })
  })

  // ISBN validation
  it('shows ISBN validation error for invalid format', async () => {
    const { container } = renderCreatePage()
    const inputs = container.querySelectorAll('input')

    fireEvent.change(inputs[0], { target: { value: 'Title' } })
    fireEvent.change(inputs[1], { target: { value: 'Author' } })
    fireEvent.change(inputs[2], { target: { value: 'invalid' } })
    fireEvent.change(inputs[3], { target: { value: 'Publisher' } })
    fireEvent.change(inputs[4], { target: { value: '2024' } })
    fireEvent.change(inputs[5], { target: { value: 'IT' } })
    fireEvent.change(inputs[6], { target: { value: '1' } })

    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(screen.getByText('10桁または13桁の数字で入力してください')).toBeInTheDocument()
    })
  })
})
