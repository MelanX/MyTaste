import React, { createContext, type ReactNode, useContext } from 'react';
import { useNextUp } from '../hooks/useNextUp';

type NextUpContextType = ReturnType<typeof useNextUp>;

const NextUpContext = createContext<NextUpContextType | undefined>(undefined);

export const NextUpProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const value = useNextUp();
  return <NextUpContext.Provider value={value}>{children}</NextUpContext.Provider>;
};

export function useNextUpContext(): NextUpContextType {
  const ctx = useContext(NextUpContext);
  if (!ctx) throw new Error('useNextUpContext must be used inside NextUpProvider');
  return ctx;
}
