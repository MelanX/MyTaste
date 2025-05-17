let config: { API_URL: string } = {API_URL: '',};

export async function loadConfig() {
    if (process.env.NODE_ENV === 'development') {
        config = {API_URL: process.env.REACT_APP_API_URL || ''};
        return;
    }

    const response = await fetch('/config.json');
    config = await response.json();
}

export function getConfig() {
    return config;
}
