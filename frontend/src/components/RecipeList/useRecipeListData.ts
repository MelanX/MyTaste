import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Recipe } from '../../types/Recipe';
import { isAuthError, updateRecipeStatus } from '../../utils/apiService';
import { useRecipes } from '../../hooks/useRecipes';
import { useRecipeFilters } from '../../context/RecipeFiltersContext';
import { useToast } from '../../context/ToastContext';
import { knownDietary, knownTypes, type RecipeType } from './constants';
import { recipeSearchIndex } from '../../utils/recipeSearch';

export interface RecipeListData {
  loading: boolean;
  error: Error | null;
  recipes: Recipe[] | null;
  filtered: Recipe[];
  matchReasons: Map<string, string[]>;
  hasActiveFilters: boolean;
  toastMessage: string | null;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;
  handleToggleFavorite: (recipeId: string, favorite: boolean) => Promise<void>;
  markCooked: (recipeId: string) => Promise<void>;
  filters: ReturnType<typeof useRecipeFilters>;
  handleSortChange: (mode: ReturnType<typeof useRecipeFilters>['sortMode']) => void;
}

/**
 * Owns the RecipeList data pipeline: fetching, local mutation state, auth-error
 * handling, and the filtered/sorted derived list. Filter UI state itself lives in
 * RecipeFiltersContext and is passed straight through.
 */
export const useRecipeListData = (): RecipeListData => {
  const { logout } = useAuth();
  const toast = useToast();

  const { recipes, loading, error } = useRecipes();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!error) return;
    if (isAuthError(error)) {
      logout();
    } else if (recipes !== null) {
      setToastMessage(error.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const filters = useRecipeFilters();
  const { searchQuery, selectedTypes, typeMode, selectedDietary, dietaryMode, favFilter, cookFilter, sortMode, setSortMode } = filters;

  const [randomOrder, setRandomOrder] = React.useState<string[]>([]);
  const [localRecipes, setLocalRecipes] = React.useState<Recipe[]>([]);

  const handleSortChange = (mode: typeof sortMode) => {
    setSortMode(mode);
    if (mode === 'random') {
      setRandomOrder([...localRecipes].map((r) => r.id).sort(() => Math.random() - 0.5));
    }
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedTypes.length > 0 ||
    selectedDietary.length > 0 ||
    favFilter ||
    cookFilter !== null ||
    sortMode !== 'relevance';

  React.useEffect(() => {
    const list = recipes ?? [];
    recipeSearchIndex.replaceAll(list);
    setLocalRecipes(list);
    // Re-seed if random sort was activated before recipes finished loading
    if (sortMode === 'random' && list.length > 0 && randomOrder.length === 0) {
      setRandomOrder(list.map((r) => r.id).sort(() => Math.random() - 0.5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes]);

  const handleToggleFavorite = async (recipeId: string, favorite: boolean) => {
    try {
      const updated = await updateRecipeStatus(recipeId, { favorite });
      setLocalRecipes((recipes) =>
        recipes.map((r) => (r.id === recipeId ? { ...r, status: { ...r.status, favorite: updated.favorite } } : r)),
      );
      if (favorite) toast.success('Zu Favoriten hinzugefügt');
      else toast.info('Aus Favoriten entfernt');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  const markCooked = async (recipeId: string) => {
    try {
      const updated = await updateRecipeStatus(recipeId, { cookState: true });
      setLocalRecipes((recipes) =>
        recipes.map((r) => (r.id === recipeId ? { ...r, status: { ...r.status, cookState: updated.cookState } } : r)),
      );
      toast.success('Als gekocht markiert');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  const { filtered, matchReasons } = React.useMemo(() => {
    const searchResults = recipeSearchIndex.search(searchQuery);
    const searchById = new Map(searchResults.map((result, index) => [result.id, { ...result, index }]));
    const result = localRecipes.filter((r) => {
      if (!searchById.has(r.id)) return false;

      // quick filters
      if (favFilter && !r.status?.favorite) return false;
      if (cookFilter === 'cooked' && !r.status?.cookState) return false;
      if (cookFilter === 'uncooked' && r.status?.cookState) return false;

      // type filter
      if (selectedTypes.length > 0) {
        const typeMatch = (t: string) => (t === 'other' ? !knownTypes.includes(r.recipeType as RecipeType) : r.recipeType === t);
        const ok = typeMode === 'and' ? selectedTypes.every(typeMatch) : selectedTypes.some(typeMatch);
        if (!ok) return false;
      }

      // dietary filter (recipe.dietaryRestrictions is now string[])
      if (selectedDietary.length > 0) {
        const recipeDietary = r.dietaryRestrictions ?? [];
        const dietaryMatch = (d: string) =>
          d === 'other'
            ? recipeDietary.some((x) => !knownDietary.includes(x))
            : recipeDietary.includes(d as (typeof recipeDietary)[number]);
        const ok = dietaryMode === 'and' ? selectedDietary.every(dietaryMatch) : selectedDietary.some(dietaryMatch);
        if (!ok) return false;
      }

      return true;
    });

    let sorted: Recipe[];
    switch (sortMode) {
      case 'favorites':
        sorted = [...result].sort((a, b) => (b.status?.favorite ? 1 : 0) - (a.status?.favorite ? 1 : 0));
        break;
      case 'alpha-desc':
        sorted = [...result].sort((a, b) => b.title.localeCompare(a.title, 'de'));
        break;
      case 'random':
        sorted = [...result].sort((a, b) => randomOrder.indexOf(a.id) - randomOrder.indexOf(b.id));
        break;
      case 'alpha-asc':
        sorted = [...result].sort((a, b) => a.title.localeCompare(b.title, 'de'));
        break;
      default:
        sorted = [...result].sort((a, b) => searchById.get(a.id)!.index - searchById.get(b.id)!.index);
    }

    return {
      filtered: sorted,
      matchReasons: new Map(sorted.map((recipe) => [recipe.id, searchById.get(recipe.id)?.reasons ?? []])),
    };
  }, [localRecipes, searchQuery, selectedTypes, typeMode, selectedDietary, dietaryMode, favFilter, cookFilter, sortMode, randomOrder]);

  return {
    loading,
    error,
    recipes,
    filtered,
    matchReasons,
    hasActiveFilters,
    toastMessage,
    setToastMessage,
    handleToggleFavorite,
    markCooked,
    filters,
    handleSortChange,
  };
};
