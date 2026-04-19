import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { FontSize } from '../../types'

interface TestAuthUser {
  userId: number
  name: string
  role: 'USER' | 'ADMIN'
  fontSize: FontSize
}

interface TestWrapperOptions {
  user?: TestAuthUser | null
  initialPath?: string
}

export function setupAuthUser(user: TestAuthUser) {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const defaultUser: TestAuthUser = {
  userId: 1,
  name: 'テストユーザ',
  role: 'USER',
  fontSize: 'NORMAL',
}

export const adminUser: TestAuthUser = {
  userId: 2,
  name: '管理者',
  role: 'ADMIN',
  fontSize: 'NORMAL',
}

function AllProviders({
  children,
  initialPath = '/',
}: {
  children: React.ReactNode
  initialPath?: string
}) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <SnackbarProvider>
          {children}
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & TestWrapperOptions
) {
  const { user = defaultUser, initialPath = '/', ...renderOptions } = options || {}

  if (user) {
    setupAuthUser(user)
  } else {
    clearAuth()
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders initialPath={initialPath}>{children}</AllProviders>
  )

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}
