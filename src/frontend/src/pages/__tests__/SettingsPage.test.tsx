import { render, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../SettingsPage'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

function renderSettingsPage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <SettingsPage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F046: 設定ページはプロフィールページへリダイレクト
  it('redirects to profile page on mount', async () => {
    renderSettingsPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/me/profile', { replace: true })
    })
  })
})
