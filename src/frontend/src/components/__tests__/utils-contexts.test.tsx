import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { AuthProvider, useAuth } from '../../contexts/AuthContext'
import { SnackbarProvider, useSnackbar } from '../../contexts/SnackbarContext'
import Pagination from '../common/Pagination'
import LoadingSpinner from '../common/LoadingSpinner'

// AuthContext tests
describe('AuthContext', () => {
  function AuthConsumer() {
    const { user, isAuthenticated, login, logout, updateUser } = useAuth()
    return (
      <div>
        <span data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</span>
        <span data-testid="user-name">{user?.name ?? ''}</span>
        <button onClick={() => login('token123', { userId: 1, name: 'テスト', role: 'USER', fontSize: 'NORMAL' })}>Login</button>
        <button onClick={logout}>Logout</button>
        <button onClick={() => updateUser({ name: '更新後' })}>Update</button>
      </div>
    )
  }

  it('starts with no user when localStorage is empty', () => {
    localStorage.clear()
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out')
  })

  it('login sets user and token', () => {
    localStorage.clear()
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    fireEvent.click(screen.getByText('Login'))
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-in')
    expect(screen.getByTestId('user-name').textContent).toBe('テスト')
  })

  it('logout clears user and token', () => {
    localStorage.clear()
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    fireEvent.click(screen.getByText('Login'))
    fireEvent.click(screen.getByText('Logout'))
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-out')
  })

  it('updateUser changes user fields', () => {
    localStorage.clear()
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    fireEvent.click(screen.getByText('Login'))
    fireEvent.click(screen.getByText('Update'))
    expect(screen.getByTestId('user-name').textContent).toBe('更新後')
  })

  it('restores user from localStorage on init', () => {
    localStorage.setItem('token', 'saved-token')
    localStorage.setItem('user', JSON.stringify({ userId: 2, name: '保存済ユーザ', role: 'USER', fontSize: 'NORMAL' }))
    render(<AuthProvider><AuthConsumer /></AuthProvider>)
    expect(screen.getByTestId('auth-status').textContent).toBe('logged-in')
    expect(screen.getByTestId('user-name').textContent).toBe('保存済ユーザ')
    localStorage.clear()
  })

  it('throws if useAuth is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<AuthConsumer />)).toThrow()
    spy.mockRestore()
  })
})

// SnackbarContext tests
describe('SnackbarContext', () => {
  function SnackbarConsumer() {
    const { showSnackbar, snackbar } = useSnackbar()
    return (
      <div>
        <span data-testid="snackbar-open">{snackbar.open ? 'open' : 'closed'}</span>
        <span data-testid="snackbar-message">{snackbar.message}</span>
        <span data-testid="snackbar-severity">{snackbar.severity}</span>
        <button onClick={() => showSnackbar('成功しました', 'success')}>Show Success</button>
        <button onClick={() => showSnackbar('エラー', 'error')}>Show Error</button>
        <button onClick={() => showSnackbar('Info')}>Show Info</button>
      </div>
    )
  }

  it('starts with closed snackbar', () => {
    render(<SnackbarProvider><SnackbarConsumer /></SnackbarProvider>)
    expect(screen.getByTestId('snackbar-open').textContent).toBe('closed')
  })

  it('showSnackbar sets message and opens', () => {
    render(<SnackbarProvider><SnackbarConsumer /></SnackbarProvider>)
    fireEvent.click(screen.getByText('Show Success'))
    expect(screen.getByTestId('snackbar-open').textContent).toBe('open')
    expect(screen.getByTestId('snackbar-message').textContent).toBe('成功しました')
    expect(screen.getByTestId('snackbar-severity').textContent).toBe('success')
  })

  it('shows error severity', () => {
    render(<SnackbarProvider><SnackbarConsumer /></SnackbarProvider>)
    fireEvent.click(screen.getByText('Show Error'))
    expect(screen.getByTestId('snackbar-severity').textContent).toBe('error')
  })

  it('defaults to info severity', () => {
    render(<SnackbarProvider><SnackbarConsumer /></SnackbarProvider>)
    fireEvent.click(screen.getByText('Show Info'))
    expect(screen.getByTestId('snackbar-severity').textContent).toBe('info')
  })

  it('throws if useSnackbar is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<SnackbarConsumer />)).toThrow()
    spy.mockRestore()
  })
})

// Pagination tests
describe('Pagination', () => {
  it('returns null when totalPages <= 1', () => {
    const { container } = render(
      <Pagination page={1} total={5} size={20} onPageChange={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders page buttons for multiple pages', () => {
    render(<Pagination page={1} total={50} size={10} onPageChange={vi.fn()} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('前へ')).toBeInTheDocument()
    expect(screen.getByText('次へ')).toBeInTheDocument()
  })

  it('calls onPageChange with next page when 次へ is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} total={30} size={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('次へ'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with prev page when 前へ is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={2} total={30} size={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('前へ'))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('disables 前へ button on first page', () => {
    render(<Pagination page={1} total={30} size={10} onPageChange={vi.fn()} />)
    expect(screen.getByText('前へ')).toBeDisabled()
  })

  it('disables 次へ button on last page', () => {
    render(<Pagination page={3} total={30} size={10} onPageChange={vi.fn()} />)
    expect(screen.getByText('次へ')).toBeDisabled()
  })

  it('calls onPageChange when page number is clicked', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={1} total={30} size={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('2'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})

// LoadingSpinner tests
describe('LoadingSpinner', () => {
  it('renders a spinner element', () => {
    const { container } = render(<LoadingSpinner />)
    expect(container.firstChild).not.toBeNull()
  })
})
