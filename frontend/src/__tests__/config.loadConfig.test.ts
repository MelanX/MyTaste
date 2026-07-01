import { loadConfig, getConfig } from '../config';

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function jsonResponse(status: number, data: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as unknown as Response;
}

/**
 * Under vitest import.meta.env.DEV is true, so loadConfig reads VITE_API_URL
 * (skipping /config.json) and then fetches <apiUrl>/api/config for requireLogin.
 */
describe('loadConfig (dev path)', () => {
  it('reads API_URL from VITE_API_URL and requireLogin from /api/config', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { requireLogin: true }));

    await loadConfig();

    expect(getConfig()).toEqual({ API_URL: 'https://api.example.com', requireLogin: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/api/config');
  });

  it('strips a trailing slash from VITE_API_URL before building /api/config', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { requireLogin: false }));

    await loadConfig();

    expect(getConfig().API_URL).toBe('https://api.example.com');
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.example.com/api/config');
  });

  it('defaults API_URL to empty when VITE_API_URL is unset', async () => {
    vi.stubEnv('VITE_API_URL', '');
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { requireLogin: false }));

    await loadConfig();

    expect(getConfig().API_URL).toBe('');
    expect(mockFetch.mock.calls[0][0]).toBe('/api/config');
  });

  it('defaults requireLogin to false when /api/config fails', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    mockFetch.mockResolvedValueOnce(jsonResponse(503, {}));

    await loadConfig();

    expect(getConfig().requireLogin).toBe(false);
  });

  it('defaults requireLogin to false when /api/config rejects', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com');
    mockFetch.mockRejectedValueOnce(new Error('network down'));

    await loadConfig();

    expect(getConfig().requireLogin).toBe(false);
  });

  it('coerces a truthy requireLogin value to a boolean', async () => {
    vi.stubEnv('VITE_API_URL', '');
    mockFetch.mockResolvedValueOnce(jsonResponse(200, { requireLogin: 1 }));

    await loadConfig();

    expect(getConfig().requireLogin).toBe(true);
  });

  it('aborts the /api/config fetch when it exceeds the timeout', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_API_URL', '');
    let abortSignal: AbortSignal | undefined;
    mockFetch.mockImplementationOnce((_url, opts: RequestInit) => {
      abortSignal = opts.signal ?? undefined;
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      });
    });

    const promise = loadConfig();
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(abortSignal?.aborted).toBe(true);
    expect(getConfig().requireLogin).toBe(false);
    vi.useRealTimers();
  });
});
