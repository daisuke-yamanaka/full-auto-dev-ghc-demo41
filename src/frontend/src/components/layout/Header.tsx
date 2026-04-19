import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { logout as logoutApi } from '../../api/auth';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    logout();
    console.info('[auth] logout');
    showSnackbar('ログアウトしました', 'info');
    navigate('/login');
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 1000,
      backgroundColor: '#1a73e8', display: 'flex', alignItems: 'center',
      padding: '0 16px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    }}>
      <button onClick={onMenuClick} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: '#fff',
        fontSize: 24, padding: '4px 8px', borderRadius: 4, marginRight: 12,
        display: 'flex', alignItems: 'center',
      }} aria-label="メニュー">
        ☰
      </button>
      <span style={{ color: '#fff', fontSize: 18, fontWeight: 600, flex: 1 }}>図書管理システム</span>
      <button onClick={() => navigate('/me/profile')} style={{
        background: '#fff', border: 'none', cursor: 'pointer', color: '#1a73e8',
        width: 36, height: 36, borderRadius: '50%', fontSize: 16, fontWeight: 700,
        marginRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }} aria-label="プロフィール" title={user?.name}>
        {initial}
      </button>
      <button onClick={handleLogout} style={{
        background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.5)',
        cursor: 'pointer', color: '#fff', padding: '6px 14px', borderRadius: 4, fontSize: 13,
      }}>
        ログアウト
      </button>
    </header>
  );
}
