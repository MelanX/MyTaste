import { type Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CollectionList from '../components/CollectionList';
import { useCollectionsContext } from '../context/CollectionsContext';
import { useRecipes } from '../hooks/useRecipes';

vi.mock('../context/CollectionsContext');
vi.mock('../hooks/useRecipes');
vi.mock('../config', () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const mockUseCollections = useCollectionsContext as Mock;
const mockUseRecipes = useRecipes as Mock;

const mockCreate = vi.fn();
const mockRemove = vi.fn();

const sampleCollections = [
  { id: 'c1', name: 'Sunday Dinners', recipeIds: ['r1'], createdAt: 'x', updatedAt: 'x' },
  { id: 'c2', name: 'Quick Meals', recipeIds: [], createdAt: 'x', updatedAt: 'x' },
];

const sampleRecipes = [{ id: 'r1', title: 'Kuchen', instructions: [], ingredient_sections: [], image: '/test.jpg' }];

function setupMocks({ collections = [] as typeof sampleCollections, loading = false, error = null as Error | null } = {}) {
  mockUseCollections.mockReturnValue({
    collections,
    loading,
    error,
    create: mockCreate,
    remove: mockRemove,
    rename: vi.fn(),
    addRecipe: vi.fn(),
    removeRecipe: vi.fn(),
    clearRecipes: vi.fn(),
  });
  mockUseRecipes.mockReturnValue({ recipes: sampleRecipes, loading: false, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
});

describe('CollectionList', () => {
  it('shows "Keine Sammlungen" when empty', () => {
    setupMocks({ collections: [] });
    render(<CollectionList />);
    expect(screen.getByText(/Keine Sammlungen/i)).toBeInTheDocument();
  });

  it('renders one card per collection', () => {
    setupMocks({ collections: sampleCollections });
    render(<CollectionList />);
    expect(screen.getByText('Sunday Dinners')).toBeInTheDocument();
    expect(screen.getByText('Quick Meals')).toBeInTheDocument();
  });

  it('"Neue Sammlung" button reveals a name input', async () => {
    const user = userEvent.setup();
    setupMocks({ collections: [] });
    render(<CollectionList />);
    await user.click(screen.getByRole('button', { name: /neue sammlung/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('submitting the new-collection form calls create with the entered name', async () => {
    const user = userEvent.setup();
    setupMocks({ collections: [] });
    render(<CollectionList />);
    await user.click(screen.getByRole('button', { name: /neue sammlung/i }));
    await user.type(screen.getByRole('textbox'), 'My List');
    await user.click(screen.getByRole('button', { name: /erstellen/i }));
    expect(mockCreate).toHaveBeenCalledWith('My List');
  });

  it('shows loading spinner while loading=true', () => {
    setupMocks({ loading: true });
    render(<CollectionList />);
    expect(screen.getByText(/lade/i)).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    setupMocks({ error: new Error('Netzwerkfehler') });
    render(<CollectionList />);
    expect(screen.getByText(/netzwerkfehler/i)).toBeInTheDocument();
  });
});
