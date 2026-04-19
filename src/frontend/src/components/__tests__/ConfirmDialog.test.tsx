import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import ConfirmDialog from '../common/ConfirmDialog'

describe('ConfirmDialog', () => {
  // TC-F022: open=false のとき非表示
  it('renders nothing when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="テスト"
        message="本当に？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  // TC-F019: 表示確認
  it('renders title and message when open is true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="削除の確認"
        message="本当に削除しますか？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByText('削除の確認')).toBeInTheDocument()
    expect(screen.getByText('本当に削除しますか？')).toBeInTheDocument()
  })

  // カスタムラベルの表示
  it('renders custom confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        open={true}
        title="確認"
        message="メッセージ"
        confirmLabel="はい"
        cancelLabel="いいえ"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: 'はい' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'いいえ' })).toBeInTheDocument()
  })

  // TC-F020: 確認ボタンクリック
  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="確認"
        message="実行？"
        confirmLabel="実行"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '実行' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  // TC-F021: キャンセルボタンクリック
  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open={true}
        title="確認"
        message="実行？"
        cancelLabel="閉じる"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // オーバーレイクリックでキャンセル
  it('calls onCancel when overlay background is clicked', () => {
    const onCancel = vi.fn()
    const { container } = render(
      <ConfirmDialog
        open={true}
        title="確認"
        message="実行？"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    )
    // 最外部div（オーバーレイ）をファーストチャイルドとして取得してクリック
    const overlay = container.firstElementChild as HTMLElement
    if (overlay) fireEvent.click(overlay)
    expect(onCancel).toHaveBeenCalled()
  })

  // dangerousフラグで赤いボタン
  it('renders danger button style when dangerous is true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="削除"
        message="削除？"
        confirmLabel="削除"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        dangerous
      />
    )
    const confirmBtn = screen.getByRole('button', { name: '削除' })
    expect(confirmBtn).toHaveStyle('background-color: #d93025')
  })

  // デフォルトのラベル
  it('uses default labels when not specified', () => {
    render(
      <ConfirmDialog
        open={true}
        title="確認"
        message="実行？"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
  })
})
