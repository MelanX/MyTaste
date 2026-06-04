import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NextUpList from '../components/NextUpList';
import { useNextUpContext } from '../context/NextUpContext';
import { useCollectionsContext } from '../context/CollectionsContext';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../context/AuthContext';

jest.mock('../context/NextUpContext');
jest.mock('../context/CollectionsContext');
jest.mock('../hooks/useRecipes');
jest.mock('../context/AuthContext');
jest.mock('../config', () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
jest.mock(
  '../components/BringButton',
  () =>
    ({ ids, recipeId }: { ids?: string[]; recipeId?: string }) =>
      ids !== undefined ? <div data-testid="bring-bulk-button" data-ids={ids.join(',')} /> : null,
);
jest.mock(
  'react-router-dom',
  () => ({
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
    useNavigate: () => jest.fn(),
  }),
  { virtual: true },
);

const mockUseNextUp = useNextUpContext as jest.Mock;
const mockUseCollections = useCollectionsContext as jest.Mock;
const mockUseRecipes = useRecipes as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

const mockRemove = jest.fn();
const mockClear = jest.fn();
const mockAdd = jest.fn();

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
    create: jest.fn().mockResolvedValue([]),
    addRecipe: jest.fn(),
    removeRecipe: jest.fn(),
    rename: jest.fn(),
    remove: jest.fn(),
    clearRecipes: jest.fn(),
  });
  mockUseRecipes.mockReturnValue({ recipes, loading: false, error: null });
  mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
  window.confirm = jest.fn(() => true);
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
