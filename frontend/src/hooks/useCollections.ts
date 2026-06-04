import { useCallback, useEffect, useState } from 'react';
import { Collection } from '../types/Collections';
import {
  addToCollection,
  clearCollection,
  createCollection,
  deleteCollection,
  fetchCollections,
  removeFromCollection,
  renameCollection,
} from '../utils/api_service';

export function useCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCollections()
      .then((data) => {
        if (!cancelled) {
          setCollections(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = useCallback(async (name: string): Promise<Collection[]> => {
    const updated = await createCollection(name);
    setCollections(updated);
    return updated;
  }, []);

  const rename = useCallback(async (id: string, name: string) => {
    const updated = await renameCollection(id, name);
    setCollections(updated);
  }, []);

  const remove = useCallback(async (id: string) => {
    const updated = await deleteCollection(id);
    setCollections(updated);
  }, []);

  const addRecipe = useCallback(async (collectionId: string, recipeId: string) => {
    const updated = await addToCollection(collectionId, recipeId);
    setCollections(updated);
  }, []);

  const removeRecipe = useCallback(async (collectionId: string, recipeId: string) => {
    const updated = await removeFromCollection(collectionId, recipeId);
    setCollections(updated);
  }, []);

  const clearRecipes = useCallback(async (id: string) => {
    const updated = await clearCollection(id);
    setCollections(updated);
  }, []);

  return { collections, loading, error, create, rename, remove, addRecipe, removeRecipe, clearRecipes };
}
