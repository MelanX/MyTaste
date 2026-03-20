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
            <button onClick={ logout }>Logout</button>
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
});

describe('AuthProvider', () => {
    it('renders a loading placeholder while the initial refresh is in flight', () => {
        mockApiFetch.mockReturnValue(new Promise(() => {}));
        const { container } = renderWithProvider();
        expect(container.querySelector('.app-loading')).toBeInTheDocument();
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
        await waitFor(() => screen.getByTestId('status'));
        await userEvent.click(screen.getByText('Login'));
        expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });

    it('login() does not set isAuthenticated to true on failure', async () => {
        const onError = jest.fn();
        mockApiFetch
            .mockResolvedValueOnce({ ok: false })  // initial refresh
            .mockResolvedValueOnce({ ok: false });  // failed login
        renderWithProvider(onError);
        await waitFor(() => screen.getByTestId('status'));
        await userEvent.click(screen.getByText('Login'));
        expect(screen.getByTestId('status')).toHaveTextContent('guest');
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
        expect(screen.getByTestId('status')).toHaveTextContent('guest');
    });
});
