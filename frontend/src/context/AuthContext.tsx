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
        (async () => {
            try {
                const res = await apiFetch('/api/refresh', { method: 'POST' });
                if (res.ok) {
                    localStorage.setItem('auth', 'true');
                } else {
                    localStorage.removeItem('auth');
                }
                setAuth(res.ok);
            } catch (err) {
                // Network error (offline) — trust last-known auth state
                setAuth(localStorage.getItem('auth') === 'true');
            }
        })();
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
