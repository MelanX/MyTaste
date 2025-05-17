import {getConfig} from "../config";

export async function apiFetch(path: string, options: RequestInit = {}) {
    if (path.startsWith('/')) {
        path = path.substring(1);
    }

    const baseUrl = getConfig().API_URL;
    const url = `${baseUrl}${path}`;
    console.log('API URL:', url);
    return fetch(url, options);
}
