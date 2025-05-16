const BASE_URL = process.env.REACT_APP_API_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
    if (path.startsWith('/')) {
        path = path.substring(1);
    }

    const url = `${BASE_URL}${path}`;
    console.log('API URL:', url);
    return fetch(url, options);
}
