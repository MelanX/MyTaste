import { type Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NextUpList from '../components/NextUpList';
import { useNextUpContext } from '../context/NextUpContext';
import { useCollectionsContext } from '../context/CollectionsContext';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../context/AuthContext';

vi.mock('../context/NextUpContext');
vi.mock('../context/CollectionsContext');
vi.mock('../hooks/useRecipes');
vi.mock('../context/AuthContext');
vi.mock('../config', () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
vi.mock('../components/BringButton', () => ({
  default: ({ ids }: { ids?: string[]; recipeId?: string }) =>
    ids !== undefined ? <div data-testid="bring-bulk-button" data-ids={ids.join(',')} /> : null,
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

const mockUseNextUp = useNextUpContext as Mock;
const mockUseCollections = useCollectionsContext as Mock;
const mockUseRecipes = useRecipes as Mock;
const mockUseAuth = useAuth as Mock;

const mockRemove = vi.fn();
const mockClear = vi.fn();
const mockAdd = vi.fn();

const sampleRecipes = [
  { id: 'r1', title: 'Kuchen', instructions: [], ingredient_sections: [] },
  { id: 'r2', title: 'Brot', instructions: [], ingredient_sections: [] },
];

function setupMocks({ ids = [] as string[], loading = false, error = null as Error | null, recipes = sampleRecipes } = {}) {
  mockUseNextUp.mockReturnValue({ ids, loading, error, add: mockAdd, remove: mockRemove, clear: mockClear });
  mockUseCollections.mockReturnValue({
    collections: [],
    loading: false,
    error: null,
    create: vi.fn().mockResolvedValue([]),
    addRecipe: vi.fn(),
    removeRecipe: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
    clearRecipes: vi.fn(),
  });
  mockUseRecipes.mockReturnValue({ recipes, loading: false, error: null });
  mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
});

describe('NextUpList', () => {
  it('shows "Liste ist leer" when ids is empty', () => {
    setupMocks({ ids: [] });
    render(<NextUpList />);
    expect(screen.getByText(/Liste ist leer/i)).toBeInTheDocument();
  });

  it('renders one card per recipe in the list', () => {
    setupMocks({ ids: ['r1', 'r2'] });
    render(<NextUpList />);
    expect(screen.getByText('Kuchen')).toBeInTheDocument();
    expect(screen.getByText('Brot')).toBeInTheDocument();
  });

  it('renders the Next Up bookmark icon in the active (blue) color', () => {
    setupMocks({ ids: ['r1'] });
    render(<NextUpList />);
    const bookmark = screen.getByTitle('Aus Next Up entfernen');
    expect(bookmark).toHaveClass('text-action');
  });

  it('each card has a remove button that calls remove', async () => {
    const user = userEvent.setup();
    setupMocks({ ids: ['r1'] });
    render(<NextUpList />);
    const removeBtn = screen.getAllByRole('button', { name: /entfernen/i })[0];
    await user.click(removeBtn);
    expect(mockRemove).toHaveBeenCalledWith('r1');
  });

  it('"Leeren" button calls clear after confirm', async () => {
    const user = userEvent.setup();
    setupMocks({ ids: ['r1'] });
    render(<NextUpList />);
    const clearBtn = screen.getByRole('button', { name: /leeren/i });
    await user.click(clearBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
  });

  it('BringBulkButton receives current ids as prop', () => {
    setupMocks({ ids: ['r1', 'r2'] });
    render(<NextUpList />);
    const btn = screen.getByTestId('bring-bulk-button');
    expect(btn.getAttribute('data-ids')).toBe('r1,r2');
  });

  it('shows loading spinner while loading=true', () => {
    setupMocks({ loading: true });
    render(<NextUpList />);
    expect(screen.getByText(/lade/i)).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    setupMocks({ error: new Error('Netzwerkfehler') });
    render(<NextUpList />);
    expect(screen.getByText(/netzwerkfehler/i)).toBeInTheDocument();
  });
});
