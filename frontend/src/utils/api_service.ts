import { getConfig } from "../config";

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const {API_URL: baseUrl, requireLogin} = getConfig();

    if (requireLogin && !!localStorage.getItem('authToken')) {
        const token = localStorage.getItem('authToken')!;

        options.headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        };
    }
    if (baseUrl.endsWith('/') && path.startsWith('/')) {
        path = path.substring(1);
    }

    const url = `${baseUrl}${path}`;
    console.debug('API URL:', url);
    return fetch(url, options);
}
