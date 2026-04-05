import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api_service';

jest.mock('../utils/api_service', () => ({
    apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as jest.Mock;

const TestConsumer: React.FC<{ onError?: (e: Error) => void }> = ({ onError }) => {
    const { isAuthenticated, login, logout } = useAuth();
    return (
        <div>
            <span data-testid="status">{ isAuthenticated ? 'authenticated' : 'guest' }</span>
            <button onClick={ () => login('user', 'pass').catch(e => onError?.(e)) }>Login</button>
            <button onClick={ () => logout() }>Logout</button>
        </div>
    );
};

function renderWithProvider(onError?: (e: Error) => void) {
    return render(
        <AuthProvider>
            <TestConsumer onError={ onError } />
        </AuthProvider>
    );
}

beforeEach(() => {
    mockApiFetch.mockReset();
    localStorage.clear();
});

describe('AuthProvider', () => {
    it('renders a loading placeholder while the initial refresh is in flight', () => {
        mockApiFetch.mockReturnValue(new Promise(() => {}));
        renderWithProvider();
        expect(screen.getByTestId('app-loading')).toBeInTheDocument();
    });

    it('sets isAuthenticated to true when the initial refresh succeeds', async () => {
        mockApiFetch.mockResolvedValue({ ok: true });
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
    });

    it('sets isAuthenticated to false when the initial refresh fails', async () => {
        mockApiFetch.mockResolvedValue({ ok: false });
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('guest')
        );
    });

    it('login() sets isAuthenticated to true on success', async () => {
        mockApiFetch
            .mockResolvedValueOnce({ ok: false })  // initial refresh
            .mockResolvedValueOnce({ ok: true });   // login
        renderWithProvider();
        await screen.findByTestId('status');
        await userEvent.click(screen.getByText('Login'));
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
    });

    it('login() does not set isAuthenticated to true on failure', async () => {
        const onError = jest.fn();
        mockApiFetch
            .mockResolvedValueOnce({ ok: false })  // initial refresh
            .mockResolvedValueOnce({ ok: false });  // failed login
        renderWithProvider(onError);
        await screen.findByTestId('status');
        await userEvent.click(screen.getByText('Login'));
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('guest')
        );
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Login failed' }));
    });

    it('logout() sets isAuthenticated to false', async () => {
        mockApiFetch
            .mockResolvedValueOnce({ ok: true })   // initial refresh → authenticated
            .mockResolvedValueOnce({ ok: true });   // logout call
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
        await userEvent.click(screen.getByText('Logout'));
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('guest')
        );
    });

    it('successful refresh sets localStorage.auth to "true"', async () => {
        mockApiFetch.mockResolvedValue({ ok: true });
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
        expect(localStorage.getItem('auth')).toBe('true');
    });

    it('offline with localStorage.auth=true → isAuthenticated becomes true', async () => {
        localStorage.setItem('auth', 'true');
        mockApiFetch.mockRejectedValue(new TypeError('Failed to fetch'));
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
    });

    it('offline with no localStorage entry → isAuthenticated becomes false', async () => {
        mockApiFetch.mockRejectedValue(new TypeError('Failed to fetch'));
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('guest')
        );
    });

    it('login() sets localStorage.auth to "true"', async () => {
        mockApiFetch
            .mockResolvedValueOnce({ ok: false })  // initial refresh
            .mockResolvedValueOnce({ ok: true });   // login
        renderWithProvider();
        await screen.findByTestId('status');
        await userEvent.click(screen.getByText('Login'));
        await waitFor(() =>
            expect(localStorage.getItem('auth')).toBe('true')
        );
    });

    it('logout() removes localStorage.auth', async () => {
        localStorage.setItem('auth', 'true');
        mockApiFetch
            .mockResolvedValueOnce({ ok: true })   // initial refresh
            .mockResolvedValueOnce({ ok: true });   // logout call
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
        await userEvent.click(screen.getByText('Logout'));
        await waitFor(() =>
            expect(localStorage.getItem('auth')).toBeNull()
        );
    });

    it('server 401 on refresh → localStorage.auth removed and isAuthenticated false', async () => {
        localStorage.setItem('auth', 'true');
        mockApiFetch.mockResolvedValue({ ok: false });
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('guest')
        );
        expect(localStorage.getItem('auth')).toBeNull();
    });

    it('timeout on refresh with localStorage.auth=true → isAuthenticated becomes true', async () => {
        localStorage.setItem('auth', 'true');
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        mockApiFetch.mockRejectedValue(abortError);
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('authenticated')
        );
    });

    it('timeout on refresh with no localStorage → isAuthenticated becomes false', async () => {
        const abortError = new DOMException('The operation was aborted', 'AbortError');
        mockApiFetch.mockRejectedValue(abortError);
        renderWithProvider();
        await waitFor(() =>
            expect(screen.getByTestId('status')).toHaveTextContent('guest')
        );
    });
});
