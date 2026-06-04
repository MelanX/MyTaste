import { type Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CollectionDetail from '../components/CollectionDetail';
import { useCollectionsContext } from '../context/CollectionsContext';
import { useNextUpContext } from '../context/NextUpContext';
import { useRecipes } from '../hooks/useRecipes';

vi.mock('../context/CollectionsContext');
vi.mock('../context/NextUpContext');
vi.mock('../hooks/useRecipes');
vi.mock('../config', () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
vi.mock('../components/BringButton', () => ({
  default: ({ ids }: { ids?: string[]; recipeId?: string }) =>
    ids !== undefined ? <div data-testid="bring-bulk-button" data-ids={ids.join(',')} /> : null,
}));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useParams: () => ({ id: 'c1' }),
  useNavigate: () => mockNavigate,
}));

const mockUseCollections = useCollectionsContext as Mock;
const mockUseNextUp = useNextUpContext as Mock;
const mockUseRecipes = useRecipes as Mock;

const mockNavigate = vi.fn();
const mockRemoveRecipe = vi.fn();
const mockClearRecipes = vi.fn();
const mockRename = vi.fn();
const mockRemove = vi.fn();

const sampleCollections = [{ id: 'c1', name: 'Sunday Dinners', recipeIds: ['r1', 'r2'], createdAt: 'x', updatedAt: 'x' }];

const sampleRecipes = [
  { id: 'r1', title: 'Kuchen', instructions: [], ingredient_sections: [] },
  { id: 'r2', title: 'Brot', instructions: [], ingredient_sections: [] },
];

function setupMocks({ collections = sampleCollections, loading = false, error = null as Error | null, recipes = sampleRecipes } = {}) {
  mockUseCollections.mockReturnValue({
    collections,
    loading,
    error,
    removeRecipe: mockRemoveRecipe,
    clearRecipes: mockClearRecipes,
    rename: mockRename,
    remove: mockRemove,
    create: vi.fn(),
    addRecipe: vi.fn(),
  });
  mockUseNextUp.mockReturnValue({
    ids: [],
    loading: false,
    error: null,
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  });
  mockUseRecipes.mockReturnValue({ recipes, loading: false, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn(() => true);
});

describe('CollectionDetail', () => {
  it('renders the collection name', () => {
    setupMocks();
    render(<CollectionDetail />);
    expect(screen.getByText('Sunday Dinners')).toBeInTheDocument();
  });

  it('renders one card per recipe in the collection', () => {
    setupMocks();
    render(<CollectionDetail />);
    expect(screen.getByText('Kuchen')).toBeInTheDocument();
    expect(screen.getByText('Brot')).toBeInTheDocument();
  });

  it('each card has a remove button that calls removeRecipe', async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<CollectionDetail />);
    const removeBtn = screen.getAllByRole('button', { name: /entfernen/i })[0];
    await user.click(removeBtn);
    expect(mockRemoveRecipe).toHaveBeenCalledWith('c1', 'r1');
  });

  it('"Leeren" button calls clearRecipes after confirm', async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<CollectionDetail />);
    await user.click(screen.getByRole('button', { name: /leeren/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockClearRecipes).toHaveBeenCalledWith('c1');
  });

  it('BringButton receives the collection recipeIds', () => {
    setupMocks();
    render(<CollectionDetail />);
    const btn = screen.getByTestId('bring-bulk-button');
    expect(btn.getAttribute('data-ids')).toBe('r1,r2');
  });

  it('shows "Sammlung nicht gefunden" when id is not in collections', () => {
    setupMocks({ collections: [] });
    render(<CollectionDetail />);
    expect(screen.getByText(/sammlung nicht gefunden/i)).toBeInTheDocument();
  });

  it('shows loading spinner while loading=true', () => {
    setupMocks({ loading: true });
    render(<CollectionDetail />);
    expect(screen.getByText(/lade/i)).toBeInTheDocument();
  });

  it('shows error message when error is set', () => {
    setupMocks({ error: new Error('Serverfehler') });
    render(<CollectionDetail />);
    expect(screen.getByText(/serverfehler/i)).toBeInTheDocument();
  });

  it('clicking the name reveals an inline rename input', async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<CollectionDetail />);
    await user.click(screen.getByText('Sunday Dinners'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('"Löschen" button calls remove and navigates back after confirm', async () => {
    const user = userEvent.setup();
    mockRemove.mockResolvedValue(undefined);
    setupMocks();
    render(<CollectionDetail />);
    await user.click(screen.getByRole('button', { name: /löschen/i }));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalledWith('c1');
    expect(mockNavigate).toHaveBeenCalledWith('/collections');
  });

  it('submitting the rename input calls rename', async () => {
    const user = userEvent.setup();
    setupMocks();
    render(<CollectionDetail />);
    await user.click(screen.getByText('Sunday Dinners'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.keyboard('{Enter}');
    expect(mockRename).toHaveBeenCalledWith('c1', 'New Name');
  });
});
