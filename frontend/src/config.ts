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

    apiUrl = apiUrl.endsWith('/') ? apiUrl.substring(0, apiUrl.length - 1) : apiUrl;
    let requireLogin = false;
    try {
        // We need to call fetch instead of apiFetch because the config isn't loaded yet
        const res = await fetch(`${ apiUrl }/api/config`);
        const json = await res.json();
        requireLogin = !!json.requireLogin;
    } catch { }

    config = {API_URL: apiUrl, requireLogin};
}

export function getConfig() {
    return config;
}
