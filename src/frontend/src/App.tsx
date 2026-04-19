import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';

import LoginPage from './pages/LoginPage';
import ActivityFeedPage from './pages/ActivityFeedPage';
import DashboardPage from './pages/DashboardPage';
import BookListPage from './pages/BookListPage';
import BookDetailPage from './pages/BookDetailPage';
import BookFormPage from './pages/BookFormPage';
import LoanHistoryPage from './pages/LoanHistoryPage';
import ReservationListPage from './pages/ReservationListPage';
import ProfilePage from './pages/ProfilePage';
import PasswordChangePage from './pages/PasswordChangePage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import BookManagementPage from './pages/admin/BookManagementPage';
import LoanManagementPage from './pages/admin/LoanManagementPage';
import ReservationManagementPage from './pages/admin/ReservationManagementPage';
import OperationLogPage from './pages/admin/OperationLogPage';

function PrivateRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><ActivityFeedPage /></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/books" element={<PrivateRoute><BookListPage /></PrivateRoute>} />
      <Route path="/books/:id" element={<PrivateRoute><BookDetailPage /></PrivateRoute>} />
      <Route path="/me/loans" element={<PrivateRoute><LoanHistoryPage /></PrivateRoute>} />
      <Route path="/me/reservations" element={<PrivateRoute><ReservationListPage /></PrivateRoute>} />
      <Route path="/me/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/me/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/me/password" element={<PrivateRoute><PasswordChangePage /></PrivateRoute>} />
      <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
      <Route path="/admin/books" element={<AdminRoute><BookManagementPage /></AdminRoute>} />
      <Route path="/admin/books/new" element={<AdminRoute><BookFormPage /></AdminRoute>} />
      <Route path="/admin/books/:id/edit" element={<AdminRoute><BookFormPage /></AdminRoute>} />
      <Route path="/admin/loans" element={<AdminRoute><LoanManagementPage /></AdminRoute>} />
      <Route path="/admin/reservations" element={<AdminRoute><ReservationManagementPage /></AdminRoute>} />
      <Route path="/admin/logs" element={<AdminRoute><OperationLogPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SnackbarProvider>
          <AppRoutes />
        </SnackbarProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

