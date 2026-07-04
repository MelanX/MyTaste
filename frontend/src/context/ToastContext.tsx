import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import Toast from '../components/Toast';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
  id: number;
}

interface ToastApi {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

/**
 * App-wide toast. Any component can call `useToast().success('…')` to surface a
 * short confirmation/error. Only one toast shows at a time — a newer one replaces
 * the current (its `id` re-mounts <Toast>, restarting the slide-in + auto-dismiss).
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      showToast,
      success: (message: string) => showToast(message, 'success'),
      error: (message: string) => showToast(message, 'error'),
      info: (message: string) => showToast(message, 'info'),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toast key={toast?.id} message={toast?.message ?? null} type={toast?.type} onDismiss={() => setToast(null)} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
