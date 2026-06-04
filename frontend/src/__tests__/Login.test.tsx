import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../components/Login';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login', () => {
  it('renders username and password fields and a submit button', () => {
    render(<Login />);
    expect(screen.getByPlaceholderText('Benutzername')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Passwort')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('calls login with the entered credentials on submit', async () => {
    mockLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByPlaceholderText('Benutzername'), 'alice');
    await user.type(screen.getByPlaceholderText('Passwort'), 'secret');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(mockLogin).toHaveBeenCalledWith('alice', 'secret');
  });

  it('shows an error message when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('nope'));
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByPlaceholderText('Benutzername'), 'alice');
    await user.type(screen.getByPlaceholderText('Passwort'), 'bad');
    await user.click(screen.getByRole('button', { name: /login/i }));
    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });
});
