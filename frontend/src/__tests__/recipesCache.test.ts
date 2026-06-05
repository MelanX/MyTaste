import { fetchAndCache, readCache, writeCache, upsertRecipe, fetchOneAndCache } from '../utils/recipesCache';
import { ApiError } from '../utils/apiService';
import type { Recipe } from '../types/Recipe';

vi.mock('../config', () => ({
  getConfig: () => ({ API_URL: '', requireLogin: false }),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  localStorage.clear();
});

function makeResponse(status: number, contentType: string = 'application/json', body: string = ''): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: () => (body ? Promise.resolve(JSON.parse(body)) : Promise.reject(new SyntaxError('No body'))),
  } as unknown as Response;
}

function makeJsonResponse(status: number, data: unknown): Response {
  return makeResponse(status, 'application/json', JSON.stringify(data));
}

describe('fetchAndCache', () => {
  it('returns recipes array on successful JSON response', async () => {
    const recipes = [{ id: '1', title: 'Test' }];
    mockFetch.mockResolvedValue(makeJsonResponse(200, { recipes }));
    const result = await fetchAndCache();
    expect(result).toEqual(recipes);
  });

  it('throws ApiError with status code when response is not ok', async () => {
    mockFetch.mockResolvedValue(makeResponse(503, 'text/html', ''));
    await expect(fetchAndCache()).rejects.toMatchObject({ name: 'ApiError', status: 503 });
  });

  it('throws ApiError with status 401 when access is unauthorized', async () => {
    mockFetch.mockResolvedValue(makeResponse(401, 'text/html', ''));
    await expect(fetchAndCache()).rejects.toMatchObject({ name: 'ApiError', status: 401 });
  });

  it('throws ApiError with status 403 when access is forbidden', async () => {
    mockFetch.mockResolvedValue(makeResponse(403, 'text/html', ''));
    await expect(fetchAndCache()).rejects.toMatchObject({ name: 'ApiError', status: 403 });
  });

  it('throws with descriptive message when response is HTML (not JSON)', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, 'text/html', '<!doctype html><html>'));
    await expect(fetchAndCache()).rejects.toThrow(/non-JSON/);
  });

  it('does not throw ApiError for HTML content-type on 200 (only generic Error)', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, 'text/html', '<!doctype html><html>'));
    await expect(fetchAndCache()).rejects.not.toBeInstanceOf(ApiError);
  });

  it('error message is not empty when statusText is empty (HTTP/2 case)', async () => {
    mockFetch.mockResolvedValue(makeResponse(503, 'text/html', ''));
    try {
      await fetchAndCache();
    } catch (err) {
      expect((err as Error).message).toBeTruthy();
    }
  });

  it('writes the fetched recipes into the cache', async () => {
    const recipes = [{ id: '1', title: 'Test' }];
    mockFetch.mockResolvedValue(makeJsonResponse(200, { recipes }));
    await fetchAndCache();
    expect(readCache()).toEqual(recipes);
  });
});

const r = (id: string, title: string): Recipe => ({ id, title }) as Recipe;

describe('readCache / writeCache', () => {
  it('returns null when the cache is empty', () => {
    expect(readCache()).toBeNull();
  });

  it('round-trips a recipe array', () => {
    const data = [r('1', 'A'), r('2', 'B')];
    writeCache(data);
    expect(readCache()).toEqual(data);
  });

  it('writeCache dispatches a recipes-updated event', () => {
    const listener = vi.fn();
    window.addEventListener('recipes-updated', listener);
    writeCache([r('1', 'A')]);
    expect(listener).toHaveBeenCalled();
    window.removeEventListener('recipes-updated', listener);
  });

  it('returns null when the stored JSON is corrupt', () => {
    localStorage.setItem('recipes-cache-v1', '{not valid json');
    expect(readCache()).toBeNull();
  });
});

describe('upsertRecipe', () => {
  it('adds a recipe when none exists', () => {
    upsertRecipe(r('1', 'A'));
    expect(readCache()).toEqual([r('1', 'A')]);
  });

  it('replaces an existing recipe by id', () => {
    writeCache([r('1', 'Old'), r('2', 'B')]);
    upsertRecipe(r('1', 'New'));
    expect(readCache()).toEqual([r('1', 'New'), r('2', 'B')]);
  });
});

describe('fetchOneAndCache', () => {
  it('returns the recipe and writes it through to the cache', async () => {
    const recipe = r('42', 'Cake');
    mockFetch.mockResolvedValue(makeJsonResponse(200, recipe));
    const result = await fetchOneAndCache('42');
    expect(mockFetch).toHaveBeenCalledWith('/api/recipe/42', expect.objectContaining({ credentials: 'include' }));
    expect(result).toEqual(recipe);
    expect(readCache()).toEqual([recipe]);
  });

  it('throws ApiError when the response is not ok', async () => {
    mockFetch.mockResolvedValue(makeResponse(404, 'application/json', ''));
    await expect(fetchOneAndCache('42')).rejects.toBeInstanceOf(ApiError);
  });
});
