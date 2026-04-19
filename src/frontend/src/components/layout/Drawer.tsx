import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface DrawerProps {
  open: boolean;
  pinned: boolean;
  onClose: () => void;
  onTogglePin: () => void;
}

interface NavItem {
  label: string;
  path: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: '🏠 アクティビティフィード', path: '/' },
  { label: '📊 ダッシュボード', path: '/dashboard' },
  { label: '📚 図書を探す', path: '/books' },
  { label: '📖 貸出履歴', path: '/me/loans' },
  { label: '🔖 予約一覧', path: '/me/reservations' },
  { label: '👤 プロフィール', path: '/me/profile' },
  { label: '⚙️ 設定', path: '/me/settings' },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: '👥 ユーザ管理', path: '/admin/users', adminOnly: true },
  { label: '📑 図書管理', path: '/admin/books', adminOnly: true },
  { label: '📋 貸出管理', path: '/admin/loans', adminOnly: true },
  { label: '🗓 予約管理', path: '/admin/reservations', adminOnly: true },
  { label: '📝 操作ログ', path: '/admin/logs', adminOnly: true },
];

export default function Drawer({ open, pinned, onClose, onTogglePin }: DrawerProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const drawerWidth = 280;
  const isVisible = open || pinned;

  return (
    <>
      {/* Overlay for non-pinned mobile */}
      {open && !pinned && (
        <button
          type="button"
          aria-label="メニューを閉じる"
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 800, top: 56, border: 'none', cursor: 'default', padding: 0,
          }}
        />
      )}
      <nav style={{
        position: 'fixed', top: 56, left: 0, width: drawerWidth, bottom: 0,
        backgroundColor: '#fff', borderRight: '1px solid #e0e0e0',
        transform: isVisible ? 'translateX(0)' : `translateX(-${drawerWidth}px)`,
        transition: 'transform 0.3s ease', zIndex: 900,
        overflowY: 'auto', display: 'flex', flexDirection: 'column',
      }}>
        {/* Pin button - PC only */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onTogglePin} title={pinned ? 'ピン留め解除' : 'ピン留め'} style={{
            background: pinned ? '#e8f0fe' : 'none', border: '1px solid #dadce0',
            cursor: 'pointer', borderRadius: 4, padding: '4px 10px', fontSize: 12, color: '#1a73e8',
            display: 'none',
          }} className="pin-btn">
            {pinned ? '📌 固定中' : '📌 ピン留め'}
          </button>
        </div>

        <div style={{ flex: 1, padding: '8px 0' }}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} onClick={pinned ? undefined : onClose}
              style={({ isActive }) => ({
                display: 'block', padding: '12px 16px', textDecoration: 'none',
                color: isActive ? '#1a73e8' : '#202124',
                backgroundColor: isActive ? '#e8f0fe' : 'transparent',
                fontWeight: isActive ? 600 : 400, fontSize: 14,
                borderLeft: isActive ? '3px solid #1a73e8' : '3px solid transparent',
              })}
              end={item.path === '/'}>
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div style={{ padding: '12px 16px 4px', fontSize: 11, color: '#5f6368', fontWeight: 600, textTransform: 'uppercase' }}>
                管理メニュー
              </div>
              {ADMIN_NAV_ITEMS.map((item) => (
                <NavLink key={item.path} to={item.path} onClick={pinned ? undefined : onClose}
                  style={({ isActive }) => ({
                    display: 'block', padding: '12px 16px', textDecoration: 'none',
                    color: isActive ? '#1a73e8' : '#202124',
                    backgroundColor: isActive ? '#e8f0fe' : 'transparent',
                    fontWeight: isActive ? 600 : 400, fontSize: 14,
                    borderLeft: isActive ? '3px solid #1a73e8' : '3px solid transparent',
                  })}>
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </div>
      </nav>

      <style>{`
        @media (min-width: 1024px) {
          .pin-btn { display: inline-block !important; }
        }
      `}</style>
    </>
  );
}
