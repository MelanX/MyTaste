import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const mockLogout = vi.fn();
let authed = true;

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: authed, logout: mockLogout }),
}));

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    authed = true;
    mockLogout.mockReset();
    localStorage.clear();
  });

  it('renders the hamburger toggle button', () => {
    renderSidebar();
    expect(document.querySelector('button')).toBeTruthy();
  });

  it('shows authed nav links and logout when authenticated', () => {
    authed = true;
    renderSidebar();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Next Up')).toBeInTheDocument();
    expect(screen.getByText('Einstellungen')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('shows Login and hides authed-only links when logged out', () => {
    authed = false;
    renderSidebar();
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.queryByText('Einstellungen')).not.toBeInTheDocument();
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('renders the theme toggle control', () => {
    renderSidebar();
    expect(screen.getByLabelText(/switch to (dark|light) mode/i)).toBeInTheDocument();
  });
});
