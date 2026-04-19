import { useEffect } from 'react';
import { useSnackbar } from '../../contexts/SnackbarContext';

const SEVERITY_COLORS: Record<string, string> = {
  success: '#1e8e3e',
  error: '#d93025',
  info: '#1a73e8',
};

export default function Snackbar() {
  const { snackbar, closeSnackbar } = useSnackbar();

  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(closeSnackbar, 3000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open, closeSnackbar]);

  if (!snackbar.open) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      backgroundColor: SEVERITY_COLORS[snackbar.severity] || '#1a73e8',
      color: '#fff', padding: '12px 24px', borderRadius: 4,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 9999,
      fontSize: 14, maxWidth: 480, textAlign: 'center',
    }}>
      {snackbar.message}
    </div>
  );
}

