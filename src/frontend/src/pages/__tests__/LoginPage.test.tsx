import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from '../LoginPage'
import * as authApi from '../../api/auth'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'

vi.mock('../../api/auth')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <LoginPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F002: 送信ボタン 入力なしで無効化
  it('disables submit button when inputs are empty', () => {
    renderLoginPage()
    const button = screen.getByRole('button', { name: 'ログイン' })
    expect(button).toBeDisabled()
  })

  // TC-F001: フォーム入力・ログイン送信
  it('calls loginApi with credentials and navigates on success', async () => {
    const mockLogin = vi.mocked(authApi.login)
    mockLogin.mockResolvedValueOnce({
      token: 'test-token',
      userId: 1,
      role: 'USER',
      name: 'テストユーザ',
      fontSize: 'NORMAL',
    })

    renderLoginPage()

    fireEvent.change(screen.getByPlaceholderText('user001 または メールアドレス'), {
      target: { value: 'user001' },
    })
    fireEvent.change(screen.getByPlaceholderText('パスワード'), {
      target: { value: 'password123' },
    })

    const button = screen.getByRole('button', { name: 'ログイン' })
    expect(button).not.toBeDisabled()

    fireEvent.click(button)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        loginId: 'user001',
        password: 'password123',
      })
    })

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  // TC-F003: ログインエラー表示
  it('shows error message when login fails', async () => {
    const mockLogin = vi.mocked(authApi.login)
    mockLogin.mockRejectedValueOnce(new Error('Unauthorized'))

    renderLoginPage()

    fireEvent.change(screen.getByPlaceholderText('user001 または メールアドレス'), {
      target: { value: 'user001' },
    })
    fireEvent.change(screen.getByPlaceholderText('パスワード'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    await waitFor(() => {
      expect(
        screen.getByText('ユーザIDまたはパスワードが正しくありません')
      ).toBeInTheDocument()
    })
  })

  // ボタンが両フィールド入力済みで有効になる
  it('enables submit button when both fields are filled', () => {
    renderLoginPage()

    fireEvent.change(screen.getByPlaceholderText('user001 または メールアドレス'), {
      target: { value: 'user001' },
    })
    fireEvent.change(screen.getByPlaceholderText('パスワード'), {
      target: { value: 'pass' },
    })

    expect(screen.getByRole('button', { name: 'ログイン' })).not.toBeDisabled()
  })

  // onFocus/onBlur イベント
  it('fires focus and blur events on inputs', () => {
    renderLoginPage()

    const loginIdInput = screen.getByPlaceholderText('user001 または メールアドレス')
    fireEvent.focus(loginIdInput)
    fireEvent.blur(loginIdInput)

    const passwordInput = screen.getByPlaceholderText('パスワード')
    fireEvent.focus(passwordInput)
    fireEvent.blur(passwordInput)
    // no error, events fire without issues
  })

  // パスワード表示切り替え
  it('toggles password visibility', () => {
    renderLoginPage()
    const passwordInput = screen.getByPlaceholderText('パスワード')
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Toggle button is the first button (type="button"), submit is the second
    const allButtons = screen.getAllByRole('button')
    const toggleButton = allButtons.find(b => b.getAttribute('type') === 'button')!
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
  })
})
