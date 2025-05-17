import {getConfig} from "../config";

export async function apiFetch(path: string, options: RequestInit = {}) {
    const baseUrl = getConfig().API_URL;
    if (baseUrl.endsWith('/') && path.startsWith('/')) {
        path = path.substring(1);
    }

    const url = `${baseUrl}${path}`;
    console.log('API URL:', url);
    return fetch(url, options);
}
