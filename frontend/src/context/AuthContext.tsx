import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api_service';

interface AuthContextType {
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({children}) => {
    const [ isAuthenticated, setAuth ] = useState<boolean | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch('/api/refresh', { method: 'POST' });
                setAuth(res.ok);
            } catch (err) {
                setAuth(false);
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
    };

    const logout = async () => {
        await apiFetch('/api/logout', { method: 'POST' }).catch(() => {});
        setAuth(false);
    };

    if (isAuthenticated === null) return null;

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
