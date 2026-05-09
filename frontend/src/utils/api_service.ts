import { getConfig } from "../config";

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message || `HTTP ${status}`);
        this.name = 'ApiError';
    }
}

/**
 * Thin wrapper around `fetch` that
 *   - always sends credentials (cookies) to the API
 *   - on 401/403 tries `/api/refresh` **once** and re-runs the original request
 */
export async function apiFetch(
    path: string,
    options: RequestInit = {},
    _attempt: 0 | 1 = 0
): Promise<Response> {
    const { API_URL: baseUrl } = getConfig();

    // Build final URL (robust against "//")
    if (baseUrl.endsWith("/") && path.startsWith("/")) {
        path = path.slice(1);
    }
    const url = `${baseUrl}${path}`;

    // Always send cookies
    const opts: RequestInit = {
        credentials: "include",
        ...options,
    };

    // Add default JSON Content-Type if body is plain object / string
    if (opts.body && !(opts.body instanceof FormData)) {
        opts.headers = {
            "Content-Type": "application/json",
            ...(opts.headers as Record<string, string> | undefined),
        };
    }

    const res = await fetch(url, opts);

    // ---- Automatic token refresh (max. 1 retry) -------------------------
    if (_attempt === 0 && (res.status === 401 || res.status === 403)) {
        const refresh = await fetch(`${ baseUrl }/api/refresh`, {
            method: "POST",
            credentials: "include",
        });
        if (refresh.ok) {
            return apiFetch(path, options, 1);
        }
        console.warn('[apiFetch] Token refresh failed', { status: refresh.status, url });
    }

    return res;
}

export async function fetchNextUp(): Promise<string[]> {
    const res = await apiFetch('/api/collections/next-up');
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const data = await res.json();
    return data.nextUp;
}

export async function addToNextUp(id: string): Promise<string[]> {
    const res = await apiFetch(`/api/collections/next-up/${ id }`, { method: 'POST' });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const data = await res.json();
    return data.nextUp;
}

export async function removeFromNextUp(id: string): Promise<string[]> {
    const res = await apiFetch(`/api/collections/next-up/${ id }`, { method: 'DELETE' });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const data = await res.json();
    return data.nextUp;
}

export async function clearNextUp(): Promise<void> {
    const res = await apiFetch('/api/collections/next-up', { method: 'DELETE' });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
}

export async function updateRecipeStatus(recipeId: string, updates: {
    cookState?: boolean;
    favorite?: boolean
}): Promise<{ cookState: boolean; favorite: boolean }> {
    const res = await apiFetch(`/api/recipe/${recipeId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({status: updates}),
    });
    if (!res.ok) throw new Error('Failed to update recipe status');
    return res.json();
}
