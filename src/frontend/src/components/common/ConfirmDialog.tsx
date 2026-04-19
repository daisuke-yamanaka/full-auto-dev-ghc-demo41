interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dangerous?: boolean;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = '確認', cancelLabel = '閉じる',
  onConfirm, onCancel, dangerous = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }} onClick={onCancel}>
      <div style={{
        backgroundColor: '#fff', borderRadius: 8, padding: 32, maxWidth: 480, width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, color: '#202124' }}>{title}</h3>
        <p style={{ margin: '0 0 24px', color: '#5f6368', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button onClick={onCancel} style={{
            padding: '8px 20px', borderRadius: 4, border: '1px solid #dadce0',
            backgroundColor: '#fff', cursor: 'pointer', color: '#5f6368',
          }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{
            padding: '8px 20px', borderRadius: 4, border: 'none', cursor: 'pointer',
            backgroundColor: dangerous ? '#d93025' : '#1a73e8', color: '#fff',
          }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
