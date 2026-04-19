import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from 'react';

type SnackbarSeverity = 'success' | 'error' | 'info';

interface SnackbarState {
  message: string;
  severity: SnackbarSeverity;
  open: boolean;
}

interface SnackbarContextType {
  showSnackbar: (message: string, severity?: SnackbarSeverity) => void;
  snackbar: SnackbarState;
  closeSnackbar: () => void;
}

const SnackbarContext = createContext<SnackbarContextType | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    message: '',
    severity: 'info',
    open: false,
  });

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity = 'info') => {
    setSnackbar({ message, severity, open: true });
  }, []);

  const closeSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const contextValue = useMemo(() => ({
    snackbar, showSnackbar, closeSnackbar,
  }), [snackbar, showSnackbar, closeSnackbar]);

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextType {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}
