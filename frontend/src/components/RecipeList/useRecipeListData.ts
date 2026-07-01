import React from 'react';
import { useAuth } from '../../context/AuthContext';
import type { Recipe } from '../../types/Recipe';
import { isAuthError, updateRecipeStatus } from '../../utils/apiService';
import { useRecipes } from '../../hooks/useRecipes';
import { useRecipeFilters } from '../../context/RecipeFiltersContext';
import { levenshtein } from './levenshtein';
import { knownTypes, knownDietary, type RecipeType } from './constants';

export interface RecipeListData {
  loading: boolean;
  error: Error | null;
  recipes: Recipe[] | null;
  filtered: Recipe[];
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
  const { titleFilter, selectedTypes, typeMode, selectedDietary, dietaryMode, favFilter, cookFilter, sortMode, setSortMode } = filters;

  const [randomOrder, setRandomOrder] = React.useState<string[]>([]);
  const [localRecipes, setLocalRecipes] = React.useState<Recipe[]>([]);

  const handleSortChange = (mode: typeof sortMode) => {
    setSortMode(mode);
    if (mode === 'random') {
      setRandomOrder([...localRecipes].map((r) => r.id).sort(() => Math.random() - 0.5));
    }
  };

  const hasActiveFilters =
    titleFilter !== '' ||
    selectedTypes.length > 0 ||
    selectedDietary.length > 0 ||
    favFilter ||
    cookFilter !== null ||
    sortMode !== 'alpha-asc';

  React.useEffect(() => {
    const list = recipes ?? [];
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
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  const markCooked = async (recipeId: string) => {
    try {
      const updated = await updateRecipeStatus(recipeId, { cookState: true });
      setLocalRecipes((recipes) =>
        recipes.map((r) => (r.id === recipeId ? { ...r, status: { ...r.status, cookState: updated.cookState } } : r)),
      );
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  // final filtered + sorted recipes
  const filtered = React.useMemo(() => {
    const term = titleFilter.trim().toLowerCase();
    const result = localRecipes.filter((r) => {
      // title match
      const title = r.title.toLowerCase();
      const titleOk = !term || title.includes(term) || levenshtein(term, title) <= 2;

      if (!titleOk) return false;

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

    switch (sortMode) {
      case 'favorites':
        return [...result].sort((a, b) => (b.status?.favorite ? 1 : 0) - (a.status?.favorite ? 1 : 0));
      case 'alpha-desc':
        return [...result].sort((a, b) => b.title.localeCompare(a.title));
      case 'random':
        return [...result].sort((a, b) => randomOrder.indexOf(a.id) - randomOrder.indexOf(b.id));
      default:
        return [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [localRecipes, titleFilter, selectedTypes, typeMode, selectedDietary, dietaryMode, favFilter, cookFilter, sortMode, randomOrder]);

  return {
    loading,
    error,
    recipes,
    filtered,
    hasActiveFilters,
    toastMessage,
    setToastMessage,
    handleToggleFavorite,
    markCooked,
    filters,
    handleSortChange,
  };
};
