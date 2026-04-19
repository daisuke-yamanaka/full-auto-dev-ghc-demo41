import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import PasswordChangePage from '../PasswordChangePage'
import * as meApi from '../../api/me'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'

vi.mock('../../api/me')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

function renderPasswordChangePage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <PasswordChangePage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('PasswordChangePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F040: パスワード変更フォームの表示
  it('renders password change form', () => {
    renderPasswordChangePage()
    expect(screen.getByText('パスワード変更')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '変更する' })).toBeInTheDocument()
  })

  // TC-F041: パスワード強度インジケーター
  it('shows password strength indicator', async () => {
    renderPasswordChangePage()

    const newPwInputs = screen.getAllByDisplayValue('')
    // The second input (index 1) is the new password field
    fireEvent.change(newPwInputs[1], { target: { value: 'weakpw' } })

    await waitFor(() => {
      expect(screen.getByText(/強度:/)).toBeInTheDocument()
    })
  })

  // TC-F042: パスワード不一致エラー
  it('shows confirm password mismatch error', async () => {
    renderPasswordChangePage()

    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[1], { target: { value: 'newPassword123' } })
    fireEvent.change(inputs[2], { target: { value: 'differentPassword' } })

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument()
    })
  })

  // TC-F043: パスワード変更の成功
  it('submits form and navigates on success', async () => {
    vi.mocked(meApi.changeMyPassword).mockResolvedValueOnce(undefined)

    renderPasswordChangePage()

    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: 'currentPass' } })
    fireEvent.change(inputs[1], { target: { value: 'newPass123' } })
    fireEvent.change(inputs[2], { target: { value: 'newPass123' } })

    fireEvent.click(screen.getByRole('button', { name: '変更する' }))

    await waitFor(() => {
      expect(vi.mocked(meApi.changeMyPassword)).toHaveBeenCalledWith({
        currentPassword: 'currentPass',
        newPassword: 'newPass123',
        confirmPassword: 'newPass123',
      })
    })
    expect(mockNavigate).toHaveBeenCalledWith('/me/profile')
  })

  // TC-F044: パスワード変更エラー (400)
  it('shows error message on 400 response', async () => {
    vi.mocked(meApi.changeMyPassword).mockRejectedValueOnce(
      Object.assign(new Error(), {
        response: { status: 400, data: { message: '現在のパスワードが正しくありません' } },
      })
    )

    renderPasswordChangePage()

    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: 'wrongPass' } })
    fireEvent.change(inputs[1], { target: { value: 'newPass123' } })
    fireEvent.change(inputs[2], { target: { value: 'newPass123' } })

    fireEvent.click(screen.getByRole('button', { name: '変更する' }))

    await waitFor(() => {
      expect(screen.getByText('現在のパスワードが正しくありません')).toBeInTheDocument()
    })
  })

  // TC-F045: パスワード変更エラー (500)
  it('shows generic error message on server error', async () => {
    vi.mocked(meApi.changeMyPassword).mockRejectedValueOnce(
      Object.assign(new Error(), { response: { status: 500 } })
    )

    renderPasswordChangePage()

    const inputs = screen.getAllByDisplayValue('')
    fireEvent.change(inputs[0], { target: { value: 'currentPass' } })
    fireEvent.change(inputs[1], { target: { value: 'newPass123' } })
    fireEvent.change(inputs[2], { target: { value: 'newPass123' } })

    fireEvent.click(screen.getByRole('button', { name: '変更する' }))

    await waitFor(() => {
      expect(screen.getByText('パスワード変更に失敗しました')).toBeInTheDocument()
    })
  })
})
