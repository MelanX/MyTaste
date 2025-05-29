import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './styles.module.css';
import ErrorSection from "../ErrorSection";

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const {login} = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(username, password);
            const urlParams = new URLSearchParams(window.location.search);
            navigate(urlParams.get('redir') || '/');
        } catch {
            setError('Invalid username or password');
        }
    };

    return (
        <div className={styles.loginContainer}>
            <h2>Login</h2>
            <ErrorSection title={error} />
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Benutzername"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Passwort"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default Login;
