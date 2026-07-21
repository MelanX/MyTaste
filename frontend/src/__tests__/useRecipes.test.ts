import { act, renderHook, waitFor } from '@testing-library/react';
import type { Recipe } from '../types/Recipe';
import { useRecipes } from '../hooks/useRecipes';
import { recipeSearchIndex } from '../utils/recipeSearch';

const recipe = (id: string, title: string): Recipe => ({
  id,
  title,
  instructions: [],
  ingredient_sections: [],
});

describe('useRecipes search-index synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    recipeSearchIndex.replaceAll([]);
    global.fetch = vi.fn(() => new Promise<Response>(() => {}));
  });

  it('reconstructs the index from the initial cache and a cross-tab storage update', async () => {
    localStorage.setItem('recipes-cache-v1', JSON.stringify([recipe('one', 'Apfelkuchen')]));
    const { result, unmount } = renderHook(() => useRecipes());

    expect(result.current.recipes?.[0].id).toBe('one');
    expect(recipeSearchIndex.search('apfel').map((match) => match.id)).toEqual(['one']);

    localStorage.setItem('recipes-cache-v1', JSON.stringify([recipe('two', 'Birnenkuchen')]));
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: 'recipes-cache-v1' })));

    await waitFor(() => expect(result.current.recipes?.[0].id).toBe('two'));
    expect(recipeSearchIndex.search('apfel')).toEqual([]);
    expect(recipeSearchIndex.search('birne').map((match) => match.id)).toEqual(['two']);
    unmount();
  });
});
