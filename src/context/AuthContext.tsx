import React, { createContext, useState, useContext, ReactNode } from 'react';

interface AuthContextType {
    token: string | null;
    tokenExpirationTime: number | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('authToken'));
    const [tokenExpirationTime, setTokenExpirationTime] = useState<number | null>(() => {
        const stored = localStorage.getItem('tokenExpirationTime');
        return stored ? Number(stored) : null;
    });

    const login = async (username: string, password: string) => {
        const response = await fetch('api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!response.ok) throw new Error('Login failed');
        const authentication = await response.json();

        setToken(authentication.token);
        setTokenExpirationTime(authentication.expirationTime);
        localStorage.setItem('authToken', authentication.token);
        localStorage.setItem('tokenExpirationTime', authentication.expirationTime);
    };

    const logout = () => {
        setToken(null);
        setTokenExpirationTime(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpirationTime');
    };

    const hasValidToken = (token: string | null, expirationTime: number | null) => !!token && !!expirationTime && expirationTime > Date.now();

    const isAuthenticated = hasValidToken(token, tokenExpirationTime);

    return (
        <AuthContext.Provider value={{ token, tokenExpirationTime, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
}
