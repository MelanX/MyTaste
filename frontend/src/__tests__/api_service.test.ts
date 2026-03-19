import { apiFetch } from '../utils/api_service';

jest.mock('../config', () => ({
    getConfig: () => ({ API_URL: '', requireLogin: false }),
}));

const mockFetch = jest.fn();

beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockReset();
});

function makeResponse(status: number): Response {
    return { ok: status >= 200 && status < 300, status } as Response;
}

describe('apiFetch', () => {
    it('sends credentials: include on every request', async () => {
        mockFetch.mockResolvedValue(makeResponse(200));
        await apiFetch('/api/test');
        expect(mockFetch).toHaveBeenCalledWith(
            '/api/test',
            expect.objectContaining({ credentials: 'include' })
        );
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
            .mockResolvedValueOnce(makeResponse(401))  // original request
            .mockResolvedValueOnce(makeResponse(200))  // /api/refresh succeeds
            .mockResolvedValueOnce(makeResponse(200)); // retried request
        const res = await apiFetch('/api/test');
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(res.ok).toBe(true);
    });

    it('retries the request after a successful token refresh on 403', async () => {
        mockFetch
            .mockResolvedValueOnce(makeResponse(403))
            .mockResolvedValueOnce(makeResponse(200))
            .mockResolvedValueOnce(makeResponse(200));
        const res = await apiFetch('/api/test');
        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(res.ok).toBe(true);
    });

    it('returns the 401 response when the token refresh also fails', async () => {
        mockFetch
            .mockResolvedValueOnce(makeResponse(401))  // original request
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
});
