import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import Header from './Header';
import Drawer from './Drawer';
import Snackbar from '../common/Snackbar';
import { useAuth } from '../../contexts/AuthContext';
import type { FontSize } from '../../types';

interface LayoutProps {
  children: ReactNode;
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  NORMAL: '14px',
  LARGE: '16px',
  XLARGE: '18px',
};

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPinned, setDrawerPinned] = useState(() => {
    return localStorage.getItem('drawerPinned') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('drawerPinned', String(drawerPinned));
  }, [drawerPinned]);

  const fontSize = user?.fontSize ? FONT_SIZE_MAP[user.fontSize] : '14px';
  const drawerWidth = 280;
  const contentMargin = drawerPinned ? drawerWidth : 0;

  return (
    <div style={{ fontSize }}>
      <Header onMenuClick={() => setDrawerOpen((o) => !o)} />
      <Drawer
        open={drawerOpen}
        pinned={drawerPinned}
        onClose={() => setDrawerOpen(false)}
        onTogglePin={() => setDrawerPinned((p) => !p)}
      />
      <main style={{
        marginTop: 56,
        marginLeft: contentMargin,
        padding: 24,
        minHeight: 'calc(100vh - 56px)',
        backgroundColor: '#f8f9fa',
        transition: 'margin-left 0.3s ease',
      }}>
        {children}
      </main>
      <Snackbar />
    </div>
  );
}


