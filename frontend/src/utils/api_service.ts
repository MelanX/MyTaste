import { getConfig } from "../config";

/**
 * Thin wrapper around `fetch` that
 *   • always sends credentials (cookies) to the API
 *   • on 401/403 tries `/api/refresh` **once** and re-runs the original request
 */
export async function apiFetch(
    path: string,
    options: RequestInit = {},
    _attempt: 0 | 1 = 0
): Promise<Response> {
    const { API_URL: baseUrl } = getConfig();

    // Build final URL (robust against “//”)
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
            return apiFetch(path, options, 1);       // second (and final) try
        }
    }

    return res;
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
