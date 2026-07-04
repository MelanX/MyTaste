import React, { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { useNextUp } from '../hooks/useNextUp';
import { useToast } from './ToastContext';

type NextUpContextType = ReturnType<typeof useNextUp>;

const NextUpContext = createContext<NextUpContextType | undefined>(undefined);

export const NextUpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const base = useNextUp();
  const toast = useToast();
  const { add: baseAdd, remove: baseRemove } = base;

  // Surface a confirmation when a recipe is added to / removed from Next Up (any caller).
  const add = useCallback(
    async (id: string) => {
      try {
        await baseAdd(id);
        toast.success('Zu Next Up hinzugefügt');
      } catch (err) {
        toast.error('Konnte nicht zu Next Up hinzugefügt werden');
        throw err;
      }
    },
    [baseAdd, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      try {
        await baseRemove(id);
        toast.info('Aus Next Up entfernt');
      } catch (err) {
        toast.error('Konnte nicht aus Next Up entfernt werden');
        throw err;
      }
    },
    [baseRemove, toast],
  );

  const value = useMemo(() => ({ ...base, add, remove }), [base, add, remove]);
  return <NextUpContext.Provider value={value}>{children}</NextUpContext.Provider>;
};

export function useNextUpContext(): NextUpContextType {
  const ctx = useContext(NextUpContext);
  if (!ctx) throw new Error('useNextUpContext must be used inside NextUpProvider');
  return ctx;
}
