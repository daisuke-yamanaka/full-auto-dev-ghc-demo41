import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from '../ProfilePage'
import * as meApi from '../../api/me'
import { AuthProvider } from '../../contexts/AuthContext'
import { SnackbarProvider } from '../../contexts/SnackbarContext'
import type { ProfileResponse } from '../../types'

vi.mock('../../api/me')

const mockProfile: ProfileResponse = {
  id: 1,
  userId: 'user001',
  email: 'user001@example.com',
  name: 'テストユーザ',
  role: 'USER',
  fontSize: 'NORMAL',
  version: 0,
}

function renderProfilePage() {
  localStorage.setItem('token', 'test-token')
  localStorage.setItem('user', JSON.stringify({ userId: 1, name: 'テストユーザ', role: 'USER', fontSize: 'NORMAL' }))
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SnackbarProvider>
          <ProfilePage />
        </SnackbarProvider>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  // TC-F014: プロフィール表示
  it('renders profile data', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByDisplayValue('user001')).toBeInTheDocument()
      expect(screen.getByDisplayValue('user001@example.com')).toBeInTheDocument()
    })
  })

  // 名前フィールドの表示
  it('shows user name in editable field', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    renderProfilePage()

    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('テストユーザ')
      expect(nameInput).toBeInTheDocument()
    })
  })

  // TC-F015: 名前の編集・保存
  it('calls updateMyProfile with new name on save', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(meApi.updateMyProfile).mockResolvedValueOnce({ ...mockProfile, name: '新しい名前', version: 1 })
    vi.mocked(meApi.updateMySettings).mockResolvedValue({ id: 1, fontSize: 'NORMAL', version: 1 })

    renderProfilePage()
    await waitFor(() => screen.getByDisplayValue('テストユーザ'))

    const nameInput = screen.getByDisplayValue('テストユーザ')
    fireEvent.change(nameInput, { target: { value: '新しい名前' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(vi.mocked(meApi.updateMyProfile)).toHaveBeenCalledWith({ name: '新しい名前', version: 0 })
    })
  })

  // TC-F016: 名前空欄バリデーション - 保存ボタンが無効になる
  it('disables save button and does not call API when name is empty', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    renderProfilePage()

    await waitFor(() => screen.getByDisplayValue('テストユーザ'))

    const nameInput = screen.getByDisplayValue('テストユーザ')
    fireEvent.change(nameInput, { target: { value: '' } })

    // canSave = false → button disabled
    const saveButton = screen.getByRole('button', { name: '保存' })
    expect(saveButton).toBeDisabled()
    expect(vi.mocked(meApi.updateMyProfile)).not.toHaveBeenCalled()
  })

  // 名前のみ変更（fontSize変更なし）
  it('calls only updateMyProfile when only name changed', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(meApi.updateMyProfile).mockResolvedValueOnce({ ...mockProfile, name: '別の名前', version: 1 })

    renderProfilePage()
    await waitFor(() => screen.getByDisplayValue('テストユーザ'))

    fireEvent.change(screen.getByDisplayValue('テストユーザ'), { target: { value: '別の名前' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(vi.mocked(meApi.updateMyProfile)).toHaveBeenCalled()
      expect(vi.mocked(meApi.updateMySettings)).not.toHaveBeenCalled()
    })
  })

  // 保存エラー: 409 競合
  it('handles 409 conflict on profile update', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    const error = Object.assign(new Error(), { response: { status: 409 } })
    vi.mocked(meApi.updateMyProfile).mockRejectedValueOnce(error)

    renderProfilePage()
    await waitFor(() => screen.getByDisplayValue('テストユーザ'))

    fireEvent.change(screen.getByDisplayValue('テストユーザ'), { target: { value: '変更名' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(vi.mocked(meApi.updateMyProfile)).toHaveBeenCalled()
    })
  })

  // プロフィール読み込みエラー
  it('handles profile fetch error', async () => {
    vi.mocked(meApi.getMyProfile).mockRejectedValueOnce(new Error('Network Error'))
    renderProfilePage()

    await waitFor(() => {
      expect(vi.mocked(meApi.getMyProfile)).toHaveBeenCalled()
    })
  })

  // TC-F015: fontSizeのみ変更
  it('calls only updateMySettings when only fontSize changed', async () => {
    vi.mocked(meApi.getMyProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(meApi.updateMySettings).mockResolvedValueOnce({ id: 1, fontSize: 'LARGE', version: 1 })

    renderProfilePage()
    await waitFor(() => screen.getByDisplayValue('テストユーザ'))

    // Change font size radio
    const largeRadio = screen.getByDisplayValue('LARGE')
    fireEvent.click(largeRadio)
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(vi.mocked(meApi.updateMyProfile)).not.toHaveBeenCalled()
      expect(vi.mocked(meApi.updateMySettings)).toHaveBeenCalled()
    })
  })
})
