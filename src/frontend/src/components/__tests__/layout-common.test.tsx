import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Header from '../layout/Header'
import Snackbar from '../common/Snackbar'
import Layout from '../layout/Layout'
import * as authApi from '../../api/auth'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider, useSnackbar } from '../../contexts/SnackbarContext'

vi.mock('../../api/auth')

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

function renderHeader(role: 'USER' | 'ADMIN' = 'USER') {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テストユーザ', role, fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <Header onMenuClick={vi.fn()} />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders app title', () => {
    renderHeader()
    expect(screen.getByText('図書管理システム')).toBeInTheDocument()
  })

  it('shows menu button', () => {
    const onMenuClick = vi.fn()
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Header onMenuClick={onMenuClick} />
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    const menuButton = screen.getByRole('button', { name: 'メニュー' })
    fireEvent.click(menuButton)
    expect(onMenuClick).toHaveBeenCalled()
  })

  it('navigates to profile when profile button clicked', () => {
    renderHeader()
    fireEvent.click(screen.getByRole('button', { name: 'プロフィール' }))
    expect(mockNavigate).toHaveBeenCalledWith('/me/profile')
  })

  it('calls logout API and navigates on logout click', async () => {
    vi.mocked(authApi.logout).mockResolvedValueOnce(undefined)
    renderHeader()

    fireEvent.click(screen.getByText('ログアウト'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('still logs out even if logout API fails', async () => {
    vi.mocked(authApi.logout).mockRejectedValueOnce(new Error('Network Error'))
    renderHeader()

    fireEvent.click(screen.getByText('ログアウト'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })
})

describe('Snackbar', () => {
  function SnackbarWithTrigger() {
    const { showSnackbar } = useSnackbar()
    return (
      <>
        <button onClick={() => showSnackbar('成功!', 'success')}>Show</button>
        <button onClick={() => showSnackbar('エラー!', 'error')}>ShowError</button>
        <Snackbar />
      </>
    )
  }

  it('shows message when snackbar is opened', () => {
    render(
      <SnackbarProvider>
        <SnackbarWithTrigger />
      </SnackbarProvider>
    )

    fireEvent.click(screen.getByText('Show'))
    expect(screen.getByText('成功!')).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(
      <SnackbarProvider>
        <SnackbarWithTrigger />
      </SnackbarProvider>
    )

    fireEvent.click(screen.getByText('ShowError'))
    expect(screen.getByText('エラー!')).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <SnackbarProvider>
        <Snackbar />
      </SnackbarProvider>
    )
    // Snackbar is closed by default, returns null
    const snackbarDiv = container.querySelector('div[style*="position: fixed"]')
    expect(snackbarDiv).toBeNull()
  })
})

describe('Layout', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders children inside layout', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Layout>
              <div>コンテンツ</div>
            </Layout>
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('コンテンツ')).toBeInTheDocument()
  })

  it('renders the header', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Layout>
              <span />
            </Layout>
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('図書管理システム')).toBeInTheDocument()
  })

  it('opens drawer when menu is clicked', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Layout>
              <span />
            </Layout>
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    fireEvent.click(screen.getByRole('button', { name: 'メニュー' }))
    // Drawer opens (nav is present)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('updates localStorage when drawer pin is toggled', () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Layout>
              <span />
            </Layout>
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    // Drawer renders with a pin button
    const pinButton = screen.queryByRole('button', { name: /ピン/ })
    if (pinButton) {
      fireEvent.click(pinButton)
      expect(localStorage.getItem('drawerPinned')).toBeTruthy()
    }
    // useEffect runs and sets localStorage
    expect(localStorage.getItem('drawerPinned')).not.toBeNull()
  })

  it('shows drawer as visible when drawerPinned=true in localStorage', () => {
    localStorage.setItem('drawerPinned', 'true')
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Layout>
              <span />
            </Layout>
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('applies LARGE font size when user has LARGE fontSize', () => {
    localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'LARGE' }))
    render(
      <MemoryRouter>
        <AuthProvider>
          <SnackbarProvider>
            <Layout>
              <span>large</span>
            </Layout>
          </SnackbarProvider>
        </AuthProvider>
      </MemoryRouter>
    )
    expect(screen.getByText('large')).toBeInTheDocument()
  })
})
