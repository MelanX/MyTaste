import { getConfig } from "../config";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const {API_URL: baseUrl, requireLogin} = getConfig();

    if (requireLogin && !!localStorage.getItem('authToken')) {
        const token = localStorage.getItem('authToken')!;

        const headers: Record<string, string> = {
            Authorization: `Bearer ${token}`,
            ...(options.headers as Record<string, string> | undefined)
        }

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        options.headers = headers;
    }
    if (baseUrl.endsWith('/') && path.startsWith('/')) {
        path = path.substring(1);
    }

    const url = `${baseUrl}${path}`;
    console.debug('API URL:', url);
    return fetch(url, options);
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
