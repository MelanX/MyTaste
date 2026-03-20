let config: {
    API_URL: string;
    requireLogin: boolean
} = {
    API_URL: '',
    requireLogin: false
};

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export async function loadConfig() {
    let apiUrl = '';
    if (process.env.NODE_ENV === 'development') {
        apiUrl = process.env.REACT_APP_API_URL || '';
    } else {
        try {
            const res = await fetchWithTimeout('/config.json', 3000);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            apiUrl = json.API_URL ?? '';
        } catch (err) {
            console.warn('Failed to load /config.json — all API calls will fail. Check your deployment configuration.', err);
        }
    }

    apiUrl = apiUrl.endsWith('/') ? apiUrl.substring(0, apiUrl.length - 1) : apiUrl;
    let requireLogin = false;
    try {
        // We need to call fetch instead of apiFetch because the config isn't loaded yet
        const res = await fetchWithTimeout(`${apiUrl}/api/config`, 5000);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        requireLogin = !!json.requireLogin;
    } catch (err) {
        console.warn('Failed to fetch /api/config — requireLogin defaults to false.', err);
    }

    config = {API_URL: apiUrl, requireLogin};
}

export function getConfig() {
    return config;
}
