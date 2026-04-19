import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    coverage: {
      reporter: ['text', 'text-summary'],
      include: [
        'src/pages/LoginPage.tsx',
        'src/pages/BookListPage.tsx',
        'src/pages/BookDetailPage.tsx',
        'src/pages/LoanHistoryPage.tsx',
        'src/pages/ReservationListPage.tsx',
        'src/pages/ProfilePage.tsx',
        'src/components/layout/Drawer.tsx',
        'src/components/layout/Layout.tsx',
        'src/components/layout/Header.tsx',
        'src/components/common/ConfirmDialog.tsx',
        'src/components/common/Pagination.tsx',
        'src/components/common/LoadingSpinner.tsx',
        'src/components/common/Snackbar.tsx',
        'src/contexts/AuthContext.tsx',
        'src/contexts/SnackbarContext.tsx',
        'src/utils/dateUtils.ts',
        'src/constants/business.ts',
      ],
      threshold: { lines: 90, branches: 85 }
    }
  }
})
