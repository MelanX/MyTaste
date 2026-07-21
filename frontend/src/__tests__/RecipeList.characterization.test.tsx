vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeList from '../components/RecipeList';
import { Recipe } from '../types/Recipe';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../context/AuthContext';
import { useRecipeFilters } from '../context/RecipeFiltersContext';
import { useNextUpContext } from '../context/NextUpContext';
import { updateRecipeStatus } from '../utils/apiService';

vi.mock('../hooks/useRecipes');
vi.mock('../context/AuthContext');
vi.mock('../context/RecipeFiltersContext');
vi.mock('../context/NextUpContext');
vi.mock('../config', async () => ({ getConfig: () => ({ API_URL: 'http://api', requireLogin: false }) }));
vi.mock('../utils/apiService', async () => ({
  ...(await vi.importActual('../utils/apiService')),
  updateRecipeStatus: vi.fn(),
}));
vi.mock('../components/BringButton', () => ({ default: () => <div data-testid="bring-button" /> }));
vi.mock('../components/FilterSection', () => ({ default: () => <div data-testid="filter-section" /> }));
vi.mock('../components/CollectionPicker', () => ({ default: () => <div data-testid="collection-picker" /> }));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...rest }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const mockUseRecipes = useRecipes as Mock;
const mockUseAuth = useAuth as Mock;
const mockUseRecipeFilters = useRecipeFilters as Mock;
const mockUseNextUp = useNextUpContext as Mock;
const mockUpdateStatus = updateRecipeStatus as Mock;

const mockAdd = vi.fn(() => Promise.resolve());
const mockRemove = vi.fn(() => Promise.resolve());

const recipe = (overrides: Partial<Recipe> = {}): Recipe => ({
  id: '1',
  title: 'Pasta',
  instructions: [],
  ingredient_sections: [],
  ...overrides,
});

const defaultFilters = {
  searchQuery: '',
  setSearchQuery: vi.fn(),
  selectedTypes: [],
  setSelectedTypes: vi.fn(),
  typeMode: 'or' as const,
  setTypeMode: vi.fn(),
  selectedDietary: [],
  setSelectedDietary: vi.fn(),
  dietaryMode: 'or' as const,
  setDietaryMode: vi.fn(),
  favFilter: false,
  setFavFilter: vi.fn(),
  cookFilter: null,
  setCookFilter: vi.fn(),
  sortMode: 'relevance' as const,
  setSortMode: vi.fn(),
  resetFilters: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: vi.fn() });
  mockUseRecipeFilters.mockReturnValue({ ...defaultFilters });
  mockUseNextUp.mockReturnValue({ ids: [], loading: false, error: null, add: mockAdd, remove: mockRemove, clear: vi.fn() });
  mockUseRecipes.mockReturnValue({ recipes: [recipe()], loading: false, error: null });
});

describe('RecipeList card rendering', () => {
  it('renders the recipe title and the view-recipe link', () => {
    render(<RecipeList />);
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rezept ansehen' })).toHaveAttribute('href', '/recipe/1');
  });

  it('renders the placeholder image when recipe has no image', () => {
    render(<RecipeList />);
    expect(screen.getByAltText('Pasta')).toHaveAttribute('src', '/placeholder.webp');
  });

  it('prefixes API_URL for /uploads images', () => {
    mockUseRecipes.mockReturnValue({ recipes: [recipe({ image: '/uploads/x.png' })], loading: false, error: null });
    render(<RecipeList />);
    expect(screen.getByAltText('Pasta')).toHaveAttribute('src', 'http://api/uploads/x.png');
  });

  it('keeps absolute image urls untouched', () => {
    mockUseRecipes.mockReturnValue({ recipes: [recipe({ image: 'https://x/y.png' })], loading: false, error: null });
    render(<RecipeList />);
    expect(screen.getByAltText('Pasta')).toHaveAttribute('src', 'https://x/y.png');
  });

  it('renders the recipe type tag with a translated label', () => {
    mockUseRecipes.mockReturnValue({ recipes: [recipe({ recipeType: 'baking' })], loading: false, error: null });
    render(<RecipeList />);
    expect(screen.getByRole('button', { name: 'Backen' })).toBeInTheDocument();
  });

  it('renders dietary tags with translated labels', () => {
    mockUseRecipes.mockReturnValue({
      recipes: [recipe({ dietaryRestrictions: ['vegan', 'glutenfree'] })],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.getByRole('button', { name: 'Vegan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Glutenfrei' })).toBeInTheDocument();
  });

  it('clicking a type tag activates that type filter', async () => {
    const setSelectedTypes = vi.fn();
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, setSelectedTypes });
    mockUseRecipes.mockReturnValue({ recipes: [recipe({ recipeType: 'cooking' })], loading: false, error: null });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: 'Kochen' }));
    expect(setSelectedTypes).toHaveBeenCalled();
  });

  it('shows "Keine Rezepte gefunden" when list is empty', () => {
    mockUseRecipes.mockReturnValue({ recipes: [], loading: false, error: null });
    render(<RecipeList />);
    expect(screen.getByText('Keine Rezepte gefunden')).toBeInTheDocument();
  });
});

describe('RecipeList corner icons', () => {
  it('shows the not-cooked question icon and marks cooked on click', async () => {
    mockUpdateStatus.mockResolvedValue({ cookState: true });
    render(<RecipeList />);
    const icon = screen.getByRole('button', { name: 'Als gekocht markieren' });
    await userEvent.click(icon);
    expect(mockUpdateStatus).toHaveBeenCalledWith('1', { cookState: true });
  });

  it('hides the not-cooked icon when already cooked', () => {
    mockUseRecipes.mockReturnValue({
      recipes: [recipe({ status: { cookState: true } })],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.queryByRole('button', { name: 'Als gekocht markieren' })).toBeNull();
  });

  it('toggles favorite on (empty heart) via updateRecipeStatus', async () => {
    mockUpdateStatus.mockResolvedValue({ favorite: true });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: 'Als Favorit markieren' }));
    expect(mockUpdateStatus).toHaveBeenCalledWith('1', { favorite: true });
  });

  it('toggles favorite off (filled heart) via updateRecipeStatus', async () => {
    mockUpdateStatus.mockResolvedValue({ favorite: false });
    mockUseRecipes.mockReturnValue({
      recipes: [recipe({ status: { favorite: true } })],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: 'Favorit entfernen' }));
    expect(mockUpdateStatus).toHaveBeenCalledWith('1', { favorite: false });
  });

  it('shows the add-to-next-up bookmark and calls add on click', async () => {
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: 'Zu Next Up hinzufügen' }));
    expect(mockAdd).toHaveBeenCalledWith('1');
  });

  it('shows the remove-from-next-up bookmark when recipe is in next-up', async () => {
    mockUseNextUp.mockReturnValue({ ids: ['1'], loading: false, error: null, add: mockAdd, remove: mockRemove, clear: vi.fn() });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: 'Aus Next Up entfernen' }));
    expect(mockRemove).toHaveBeenCalledWith('1');
  });

  it('renders the collection picker only when authenticated', () => {
    render(<RecipeList />);
    expect(screen.getByTestId('collection-picker')).toBeInTheDocument();
    mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
    const { container } = render(<RecipeList />);
    expect(within(container).queryByTestId('collection-picker')).toBeNull();
  });
});

describe('RecipeList quick filters and search', () => {
  it('toggles the favorite quick filter', async () => {
    const setFavFilter = vi.fn();
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, setFavFilter });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: /Favoriten/ }));
    expect(setFavFilter).toHaveBeenCalled();
  });

  it('toggles the cooked quick filter', async () => {
    const setCookFilter = vi.fn();
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, setCookFilter });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: /^Gekocht/ }));
    expect(setCookFilter).toHaveBeenCalled();
  });

  it('updates the search field', async () => {
    const setSearchQuery = vi.fn();
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, setSearchQuery });
    render(<RecipeList />);
    await userEvent.type(screen.getByPlaceholderText('Titel, Zutaten oder Gewürze suchen...'), 'a');
    expect(setSearchQuery).toHaveBeenCalledWith('a');
  });

  it('shows the clear-search button when there is a search query and clears it', async () => {
    const setSearchQuery = vi.fn();
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, searchQuery: 'pas', setSearchQuery });
    render(<RecipeList />);
    await userEvent.click(screen.getByRole('button', { name: 'Suche löschen' }));
    expect(setSearchQuery).toHaveBeenCalledWith('');
  });

  it('shows the reset button only when filters are active and resets them', async () => {
    const resetFilters = vi.fn();
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, favFilter: true, resetFilters });
    render(<RecipeList />);
    const reset = screen.getByTitle('Alle Filter zurücksetzen');
    await userEvent.click(reset);
    expect(resetFilters).toHaveBeenCalled();
  });

  it('searches recipes by ingredients and displays a match explanation', () => {
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, searchQuery: 'kartoffel' });
    mockUseRecipes.mockReturnValue({
      recipes: [
        recipe({ id: '1', title: 'Pasta' }),
        recipe({ id: '2', title: 'Suppe', ingredient_sections: [{ ingredients: [{ name: 'Kartoffeln' }] }] }),
      ],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.getByText('Suppe')).toBeInTheDocument();
    expect(screen.getByText('Gefunden über')).toBeInTheDocument();
    expect(screen.getByText('Zutat: Kartoffeln')).toBeInTheDocument();
    expect(screen.getByLabelText('Treffergrund')).toHaveClass('border-accent');
    expect(screen.queryByText('Pasta')).toBeNull();
  });

  it('shows the matching recipe count', () => {
    mockUseRecipes.mockReturnValue({
      recipes: [recipe({ id: '1', title: 'Pasta' }), recipe({ id: '2', title: 'Pizza' })],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.getByText('2 Rezepte')).toBeInTheDocument();
  });

  it('applies recipe filters alongside full-text search', () => {
    mockUseRecipeFilters.mockReturnValue({
      ...defaultFilters,
      searchQuery: 'paprika',
      selectedTypes: ['cooking'],
      selectedDietary: ['vegan'],
      favFilter: true,
      cookFilter: 'cooked',
    });
    mockUseRecipes.mockReturnValue({
      recipes: [
        recipe({
          id: '1',
          title: 'Suppe',
          spices: ['Paprika'],
          recipeType: 'cooking',
          dietaryRestrictions: ['vegan'],
          status: { favorite: true, cookState: true },
        }),
        recipe({
          id: '2',
          title: 'Paprika-Hähnchen',
          recipeType: 'cooking',
          dietaryRestrictions: ['vegan'],
          status: { favorite: false, cookState: true },
        }),
      ],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.getByText('Suppe')).toBeInTheDocument();
    expect(screen.queryByText('Paprika-Hähnchen')).toBeNull();
  });

  it('offers relevance as the default sort and keeps explicit alphabetical sorting', () => {
    mockUseRecipes.mockReturnValue({
      recipes: [recipe({ id: '2', title: 'Zucchini' }), recipe({ id: '1', title: 'Apfel' })],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.getByRole('option', { name: 'Relevanz' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Apfel', 'Zucchini']);
  });

  it('filters recipes by selected dietary restriction', () => {
    mockUseRecipeFilters.mockReturnValue({ ...defaultFilters, selectedDietary: ['vegan'] });
    mockUseRecipes.mockReturnValue({
      recipes: [recipe({ id: '1', title: 'Pasta', dietaryRestrictions: ['vegan'] }), recipe({ id: '2', title: 'Steak' })],
      loading: false,
      error: null,
    });
    render(<RecipeList />);
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.queryByText('Steak')).toBeNull();
  });
});

describe('RecipeList next-up FAB', () => {
  it('renders the FAB when authenticated', () => {
    render(<RecipeList />);
    expect(screen.getByRole('link', { name: 'Next Up öffnen' })).toHaveAttribute('href', '/next-up');
  });

  it('does not render the FAB when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
    render(<RecipeList />);
    expect(screen.queryByRole('link', { name: 'Next Up öffnen' })).toBeNull();
  });

  it('shows a count badge when there are next-up recipes', () => {
    mockUseNextUp.mockReturnValue({ ids: ['1', '2'], loading: false, error: null, add: mockAdd, remove: mockRemove, clear: vi.fn() });
    render(<RecipeList />);
    expect(screen.getByRole('link', { name: 'Next Up öffnen' })).toHaveTextContent('2');
  });

  it('renders the add-new-recipe link when authenticated', () => {
    const { container } = render(<RecipeList />);
    expect(container.querySelector('a[href="/new-recipe"]')).toBeTruthy();
  });

  it('does not render the add-new-recipe link when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
    const { container } = render(<RecipeList />);
    expect(container.querySelector('a[href="/new-recipe"]')).toBeNull();
  });
});
