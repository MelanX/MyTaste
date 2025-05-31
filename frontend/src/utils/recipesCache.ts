import { Recipe } from '../types/Recipe';
import { apiFetch } from "./api_service";

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
    try {
        localStorage.setItem(KEY, JSON.stringify(data));
        /* wake up any other tabs */
        window.dispatchEvent(new Event('recipes-updated'));
    } catch {}
}

/** Fetch from network **and** update cache */
export async function fetchAndCache(signal?: AbortSignal): Promise<Recipe[]> {
    const res = await apiFetch('/api/recipes', { signal });
    if (!res.ok) throw new Error(res.statusText);

    const { recipes } = await res.json();
    writeCache(recipes);
    return recipes;
}

/** Replace (or add) one recipe inside the cache and broadcast */
export function upsertRecipe(recipe: Recipe) {
    const list = readCache() ?? [];
    const idx = list.findIndex(r => r.id === recipe.id);
    if (idx >= 0) list[idx] = recipe; else list.push(recipe);
    writeCache(list);
}

/** Fetch a single recipe, write-through the cache, return it */
export async function fetchOneAndCache(id: string, signal?: AbortSignal): Promise<Recipe> {
    const res = await apiFetch(`/api/recipe/${ id }`, { signal });
    if (!res.ok) throw new Error(res.statusText);
    const json: Recipe = await res.json();
    upsertRecipe(json);
    return json;
}
