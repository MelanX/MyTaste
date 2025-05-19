import { apiFetch } from "./utils/api_service";

let config: {
    API_URL: string;
    requireLogin: boolean
} = {
    API_URL: '',
    requireLogin: false
};

export async function loadConfig() {
    let apiUrl = '';
    if (process.env.NODE_ENV === 'development') {
        apiUrl = process.env.REACT_APP_API_URL || '';
    } else {
        try {
            const res = await fetch('/config.json');
            const json = await res.json();
            apiUrl = json.API_URL ?? '';
        } catch { }
    }

    let requireLogin = false;
    try {
        const res = await apiFetch('/api/config');
        const json = await res.json();
        requireLogin = !!json.requireLogin;
    } catch { }

    config = {API_URL: apiUrl, requireLogin};
}

export function getConfig() {
    return config;
}
