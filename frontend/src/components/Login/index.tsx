import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ErrorSection from '../ErrorSection';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(username, password);
      const urlParams = new URLSearchParams(window.location.search);
      let redirectDestination = urlParams.get('redir');
      if (!redirectDestination?.startsWith('/')) {
        redirectDestination = '/';
      }
      navigate(redirectDestination);
    } catch {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="mx-auto my-8 max-w-[400px] rounded-lg bg-surface p-8 shadow-[0_2px_6px_var(--color-shadow-soft)]">
      <h2 className="mb-4 text-fg">Login</h2>
      <ErrorSection title={error} />
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Benutzername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="mb-4 w-full rounded-[4px] border border-line p-2"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mb-4 w-full rounded-[4px] border border-line p-2"
        />
        <button type="submit" className="my-[10px] w-full rounded-[4px] border-none p-4 text-base">
          Login
        </button>
      </form>
    </div>
  );
};

export default Login;
