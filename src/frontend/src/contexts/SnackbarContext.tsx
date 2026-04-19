import { createContext, useContext, useState, type ReactNode } from 'react';

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

  const showSnackbar = (message: string, severity: SnackbarSeverity = 'info') => {
    setSnackbar({ message, severity, open: true });
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <SnackbarContext.Provider value={{ snackbar, showSnackbar, closeSnackbar }}>
      {children}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextType {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider');
  return ctx;
}
