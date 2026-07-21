import type { Recipe } from '../types/Recipe';
import { ApiError, apiFetch } from './apiService';
import { recipeSearchIndex } from './recipeSearch';

const KEY = 'recipes-cache-v1';

/** Try reading the cache, return null on any problem */
export function readCache(): Recipe[] | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Write to cache, ignore any errors */
export function writeCache(data: Recipe[]): void {
  recipeSearchIndex.replaceAll(data);
  persistCache(data);
}

function persistCache(data: Recipe[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    /* wake up any other tabs */
    window.dispatchEvent(new Event('recipes-updated'));
  } catch {
    /* ignore localStorage write failures (quota, private mode) */
  }
}

/** Fetch from network **and** update cache */
export async function fetchAndCache(signal?: AbortSignal): Promise<Recipe[]> {
  const res = await apiFetch('/api/recipes', { signal });
  if (!res.ok) throw new ApiError(res.status, res.statusText || `HTTP ${res.status}`);

  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    console.warn('[fetchAndCache] Non-JSON response', { status: res.status, contentType: ct });
    throw new Error('Server returned non-JSON response (possible HTML error page)');
  }

  const { recipes } = await res.json();
  writeCache(recipes);
  return recipes;
}

/** Replace (or add) one recipe inside the cache and broadcast */
export function upsertRecipe(recipe: Recipe) {
  const list = readCache() ?? [];
  const idx = list.findIndex((r) => r.id === recipe.id);
  if (idx >= 0) list[idx] = recipe;
  else list.push(recipe);
  recipeSearchIndex.upsert(recipe);
  persistCache(list);
}

/** Remove one recipe from the cache and the derived in-memory search index. */
export function removeRecipe(id: string): void {
  const list = (readCache() ?? []).filter((recipe) => recipe.id !== id);
  recipeSearchIndex.remove(id);
  persistCache(list);
}

/** Fetch a single recipe, write-through the cache, return it */
export async function fetchOneAndCache(id: string, signal?: AbortSignal): Promise<Recipe> {
  const res = await apiFetch(`/api/recipe/${id}`, { signal });
  if (!res.ok) throw new ApiError(res.status, res.statusText || `HTTP ${res.status}`);
  const json: Recipe = await res.json();
  upsertRecipe(json);
  return json;
}
