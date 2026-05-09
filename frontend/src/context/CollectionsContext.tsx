import React, { createContext, ReactNode, useContext } from 'react';
import { useCollections } from '../hooks/useCollections';

type CollectionsContextType = ReturnType<typeof useCollections>;

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export const CollectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const value = useCollections();
    return <CollectionsContext.Provider value={ value }>{ children }</CollectionsContext.Provider>;
};

export function useCollectionsContext(): CollectionsContextType {
    const ctx = useContext(CollectionsContext);
    if (!ctx) throw new Error('useCollectionsContext must be used inside CollectionsProvider');
    return ctx;
}
