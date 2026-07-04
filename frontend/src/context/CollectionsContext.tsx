import React, { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import { useCollections } from '../hooks/useCollections';
import { useToast } from './ToastContext';

type CollectionsContextType = ReturnType<typeof useCollections>;

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export const CollectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const base = useCollections();
  const toast = useToast();
  const { addRecipe: baseAddRecipe, removeRecipe: baseRemoveRecipe, create: baseCreate } = base;

  // Confirm when a recipe is added to / removed from a collection (any caller).
  const addRecipe = useCallback(
    async (collectionId: string, recipeId: string) => {
      try {
        const result = await baseAddRecipe(collectionId, recipeId);
        toast.success('Zu Sammlung hinzugefügt');
        return result;
      } catch (err) {
        toast.error('Konnte nicht zur Sammlung hinzugefügt werden');
        throw err;
      }
    },
    [baseAddRecipe, toast],
  );

  const removeRecipe = useCallback(
    async (collectionId: string, recipeId: string) => {
      try {
        const result = await baseRemoveRecipe(collectionId, recipeId);
        toast.info('Aus Sammlung entfernt');
        return result;
      } catch (err) {
        toast.error('Konnte nicht aus der Sammlung entfernt werden');
        throw err;
      }
    },
    [baseRemoveRecipe, toast],
  );

  const create = useCallback(
    async (name: string) => {
      try {
        const result = await baseCreate(name);
        toast.success('Sammlung erstellt');
        return result;
      } catch (err) {
        toast.error('Sammlung konnte nicht erstellt werden');
        throw err;
      }
    },
    [baseCreate, toast],
  );

  const value = useMemo(() => ({ ...base, addRecipe, removeRecipe, create }), [base, addRecipe, removeRecipe, create]);
  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
};

export function useCollectionsContext(): CollectionsContextType {
  const ctx = useContext(CollectionsContext);
  if (!ctx) throw new Error('useCollectionsContext must be used inside CollectionsProvider');
  return ctx;
}
