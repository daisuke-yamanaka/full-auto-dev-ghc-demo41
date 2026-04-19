import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Drawer from '../layout/Drawer'
import { AuthProvider } from '../../contexts/AuthContext'

function renderDrawer(
  props: {
    open?: boolean
    pinned?: boolean
    onClose?: () => void
    onTogglePin?: () => void
  },
  role: 'USER' | 'ADMIN' = 'USER'
) {
  if (role === 'ADMIN') {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ userId: 2, name: '管理者', role: 'ADMIN', fontSize: 'NORMAL' }))
  } else {
    localStorage.setItem('token', 'test-token')
    localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'ユーザ', role: 'USER', fontSize: 'NORMAL' }))
  }

  return render(
    <MemoryRouter>
      <AuthProvider>
        <Drawer
          open={props.open ?? false}
          pinned={props.pinned ?? false}
          onClose={props.onClose ?? vi.fn()}
          onTogglePin={props.onTogglePin ?? vi.fn()}
        />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('Drawer', () => {
  afterEach(() => {
    localStorage.clear()
  })

  // TC-F017: ドロワー open=true でナビゲーションアイテムが表示される
  it('shows navigation items when open is true', () => {
    renderDrawer({ open: true })
    expect(screen.getByText(/図書を探す/)).toBeInTheDocument()
    expect(screen.getByText(/貸出履歴/)).toBeInTheDocument()
    expect(screen.getByText(/予約一覧/)).toBeInTheDocument()
  })

  // TC-F018: 管理者メニュー表示条件 - ADMIN
  it('shows admin menu for admin user', () => {
    renderDrawer({ open: true }, 'ADMIN')
    expect(screen.getByText('管理メニュー')).toBeInTheDocument()
    expect(screen.getByText(/ユーザ管理/)).toBeInTheDocument()
  })

  // TC-F018: 管理者メニュー非表示 - USER
  it('does not show admin menu for regular user', () => {
    renderDrawer({ open: true }, 'USER')
    expect(screen.queryByText('管理メニュー')).not.toBeInTheDocument()
    expect(screen.queryByText(/ユーザ管理/)).not.toBeInTheDocument()
  })

  // ドロワーが開いている時: non-pinnedでNavLinkクリックするとonCloseが呼ばれる
  it('calls onClose when nav link is clicked in non-pinned mode', () => {
    const onClose = vi.fn()
    renderDrawer({ open: true, pinned: false, onClose })
    // NavLinkをクリックするとonCloseが呼ばれる (pinned=false)
    fireEvent.click(screen.getByText(/図書を探す/))
    expect(onClose).toHaveBeenCalled()
  })

  // pinnedモードではNavLinkクリックでonCloseが呼ばれない
  it('does not call onClose when nav link clicked in pinned mode', () => {
    const onClose = vi.fn()
    renderDrawer({ open: true, pinned: true, onClose })
    fireEvent.click(screen.getByText(/図書を探す/))
    expect(onClose).not.toHaveBeenCalled()
  })
})
