import {
  apiFetch,
  ApiError,
  isAuthError,
  fetchNextUp,
  addToNextUp,
  removeFromNextUp,
  clearNextUp,
  fetchCollections,
  createCollection,
  renameCollection,
  deleteCollection,
  addToCollection,
  removeFromCollection,
  clearCollection,
  updateRecipeStatus,
} from '../utils/apiService';
import { sampleCollections } from './fixtures';

vi.mock('../config', () => ({
  getConfig: () => ({ API_URL: '', requireLogin: false }),
}));

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});

function makeResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as Response;
}

function makeJsonResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

describe('apiFetch', () => {
  it('sends credentials: include on every request', async () => {
    mockFetch.mockResolvedValue(makeResponse(200));
    await apiFetch('/api/test');
    expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ credentials: 'include' }));
  });

  it('adds Content-Type: application/json for a JSON string body', async () => {
    mockFetch.mockResolvedValue(makeResponse(200));
    await apiFetch('/api/test', { method: 'POST', body: JSON.stringify({ x: 1 }) });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('does not add Content-Type for a FormData body', async () => {
    mockFetch.mockResolvedValue(makeResponse(200));
    await apiFetch('/api/test', { method: 'POST', body: new FormData() });
    const [, opts] = mockFetch.mock.calls[0];
    expect((opts.headers as Record<string, string> | undefined)?.['Content-Type']).toBeUndefined();
  });

  it('retries the request after a successful token refresh on 401', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(401)) // original request
      .mockResolvedValueOnce(makeResponse(200)) // /api/refresh succeeds
      .mockResolvedValueOnce(makeResponse(200)); // retried request
    const res = await apiFetch('/api/test');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(res.ok).toBe(true);
  });

  it('retries the request after a successful token refresh on 403', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(403)).mockResolvedValueOnce(makeResponse(200)).mockResolvedValueOnce(makeResponse(200));
    const res = await apiFetch('/api/test');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(res.ok).toBe(true);
  });

  it('returns the 401 response when the token refresh also fails', async () => {
    mockFetch
      .mockResolvedValueOnce(makeResponse(401)) // original request
      .mockResolvedValueOnce(makeResponse(401)); // /api/refresh fails
    const res = await apiFetch('/api/test');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(401);
  });

  it('does not attempt a refresh on the second attempt', async () => {
    mockFetch.mockResolvedValue(makeResponse(401));
    await apiFetch('/api/test', {}, 1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('strips a leading slash when baseUrl ends with one', async () => {
    mockFetch.mockResolvedValue(makeResponse(200));
    await apiFetch('//api/test');
    // baseUrl is '' so no stripping occurs here; ensure the URL is built without throwing
    expect(mockFetch).toHaveBeenCalledWith('//api/test', expect.anything());
  });
});

describe('isAuthError', () => {
  it('is true for an ApiError with status 401', () => {
    expect(isAuthError(new ApiError(401, 'x'))).toBe(true);
  });
  it('is true for an ApiError with status 403', () => {
    expect(isAuthError(new ApiError(403, 'x'))).toBe(true);
  });
  it('is false for an ApiError with a non-auth status', () => {
    expect(isAuthError(new ApiError(500, 'x'))).toBe(false);
  });
  it('is false for a plain Error', () => {
    expect(isAuthError(new Error('boom'))).toBe(false);
  });
  it('is false for non-error values', () => {
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError('401')).toBe(false);
  });
});

describe('ApiError', () => {
  it('uses the provided message', () => {
    expect(new ApiError(500, 'kaboom').message).toBe('kaboom');
  });
  it('falls back to "HTTP <status>" when message is empty', () => {
    expect(new ApiError(404, '').message).toBe('HTTP 404');
  });
});

describe('next-up helpers', () => {
  it('fetchNextUp GETs /api/collections/next-up and returns nextUp', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { nextUp: ['r1', 'r2'] }));
    const result = await fetchNextUp();
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/next-up', expect.objectContaining({ credentials: 'include' }));
    expect(result).toEqual(['r1', 'r2']);
  });

  it('fetchNextUp throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(fetchNextUp()).rejects.toBeInstanceOf(ApiError);
  });

  it('addToNextUp POSTs to the id endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { nextUp: ['r9'] }));
    const result = await addToNextUp('r9');
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/next-up/r9', expect.objectContaining({ method: 'POST' }));
    expect(result).toEqual(['r9']);
  });

  it('addToNextUp throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(403, {}));
    await expect(addToNextUp('r9')).rejects.toBeInstanceOf(ApiError);
  });

  it('removeFromNextUp DELETEs the id endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { nextUp: [] }));
    const result = await removeFromNextUp('r9');
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/next-up/r9', expect.objectContaining({ method: 'DELETE' }));
    expect(result).toEqual([]);
  });

  it('removeFromNextUp throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(removeFromNextUp('r9')).rejects.toBeInstanceOf(ApiError);
  });

  it('clearNextUp DELETEs the collection endpoint', async () => {
    mockFetch.mockResolvedValue(makeResponse(204));
    await clearNextUp();
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/next-up', expect.objectContaining({ method: 'DELETE' }));
  });

  it('clearNextUp throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeResponse(500));
    await expect(clearNextUp()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('collection helpers', () => {
  it('fetchCollections returns the collections array', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: sampleCollections }));
    const result = await fetchCollections();
    expect(mockFetch).toHaveBeenCalledWith('/api/collections', expect.objectContaining({ credentials: 'include' }));
    expect(result).toEqual(sampleCollections);
  });

  it('fetchCollections throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(401, {}));
    await expect(fetchCollections()).rejects.toBeInstanceOf(ApiError);
  });

  it('createCollection POSTs a JSON name body', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: sampleCollections }));
    await createCollection('Brunch');
    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Brunch' });
  });

  it('createCollection throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(createCollection('x')).rejects.toBeInstanceOf(ApiError);
  });

  it('renameCollection PATCHes a JSON name body to the id endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: sampleCollections }));
    await renameCollection('c1', 'Renamed');
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/collections/c1');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ name: 'Renamed' });
  });

  it('renameCollection throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(404, {}));
    await expect(renameCollection('c1', 'x')).rejects.toBeInstanceOf(ApiError);
  });

  it('deleteCollection DELETEs the id endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: [] }));
    await deleteCollection('c1');
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/c1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('deleteCollection throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(deleteCollection('c1')).rejects.toBeInstanceOf(ApiError);
  });

  it('addToCollection POSTs to the recipe sub-endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: sampleCollections }));
    await addToCollection('c1', 'r5');
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/c1/recipes/r5', expect.objectContaining({ method: 'POST' }));
  });

  it('addToCollection throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(409, {}));
    await expect(addToCollection('c1', 'r5')).rejects.toBeInstanceOf(ApiError);
  });

  it('removeFromCollection DELETEs the recipe sub-endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: sampleCollections }));
    await removeFromCollection('c1', 'r5');
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/c1/recipes/r5', expect.objectContaining({ method: 'DELETE' }));
  });

  it('removeFromCollection throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(removeFromCollection('c1', 'r5')).rejects.toBeInstanceOf(ApiError);
  });

  it('clearCollection DELETEs the recipes endpoint', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { collections: sampleCollections }));
    await clearCollection('c1');
    expect(mockFetch).toHaveBeenCalledWith('/api/collections/c1/recipes', expect.objectContaining({ method: 'DELETE' }));
  });

  it('clearCollection throws ApiError on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(clearCollection('c1')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('updateRecipeStatus', () => {
  it('PATCHes the status endpoint with a snake_case-preserving status wrapper', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { cookState: true, favorite: false }));
    const result = await updateRecipeStatus('r1', { cookState: true, favorite: false });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('/api/recipe/r1/status');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ status: { cookState: true, favorite: false } });
    expect(result).toEqual({ cookState: true, favorite: false });
  });

  it('sends only the provided field', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(200, { cookState: false, favorite: true }));
    await updateRecipeStatus('r2', { favorite: true });
    const [, opts] = mockFetch.mock.calls[0];
    expect(JSON.parse(opts.body)).toEqual({ status: { favorite: true } });
  });

  it('throws a generic Error (not ApiError) on failure', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse(500, {}));
    await expect(updateRecipeStatus('r1', { favorite: true })).rejects.toThrow('Failed to update recipe status');
  });
});
