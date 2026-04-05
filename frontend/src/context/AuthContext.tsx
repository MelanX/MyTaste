import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api_service';

interface AuthContextType {
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [ isAuthenticated, setAuth ] = useState<boolean | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        (async () => {
            try {
                const res = await apiFetch('/api/refresh', { method: 'POST', signal: controller.signal });
                if (res.ok) {
                    localStorage.setItem('auth', 'true');
                    console.log('[AuthContext] Refresh OK');
                } else {
                    localStorage.removeItem('auth');
                    console.warn('[AuthContext] Refresh rejected', { status: res.status });
                }
                setAuth(res.ok);
            } catch (err) {
                // Network error or timeout — trust last-known auth state
                console.warn('[AuthContext] Refresh failed (network/timeout), using cached auth state', err);
                setAuth(localStorage.getItem('auth') === 'true');
            } finally {
                clearTimeout(timer);
            }
        })();
        return () => { controller.abort(); clearTimeout(timer); };
    }, []);

    const login = async (username: string, password: string) => {
        const res = await apiFetch('/api/login', {
            method: 'POST',
            body: JSON.stringify({username, password}),
        });
        if (!res.ok) throw new Error('Login failed');
        setAuth(true);                // cookies are now set
        localStorage.setItem('auth', 'true');
    };

    const logout = async () => {
        await apiFetch('/api/logout', { method: 'POST' }).catch(() => {});
        setAuth(false);
        localStorage.removeItem('auth');
    };

    if (isAuthenticated === null) return <div className="app-loading" data-testid="app-loading" />;

    return (
        <AuthContext.Provider value={ { login, logout, isAuthenticated } }>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
