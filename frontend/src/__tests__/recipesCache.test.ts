import { fetchAndCache } from '../utils/recipesCache';
import { ApiError } from '../utils/api_service';

jest.mock('../config', () => ({
    getConfig: () => ({ API_URL: '', requireLogin: false }),
}));

const mockFetch = jest.fn();

beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
    localStorage.clear();
});

function makeResponse(
    status: number,
    contentType: string = 'application/json',
    body: string = ''
): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        headers: {
            get: (name: string) => name.toLowerCase() === 'content-type' ? contentType : null,
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
});
