vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeList from '../components/RecipeList';
import { ApiError } from '../utils/apiService';
import { Recipe } from '../types/Recipe';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../context/AuthContext';
import { useRecipeFilters } from '../context/RecipeFiltersContext';

vi.mock('../hooks/useRecipes');
vi.mock('../context/AuthContext');
vi.mock('../context/RecipeFiltersContext');
vi.mock('../context/NextUpContext', async () => ({
  useNextUpContext: () => ({
    ids: [],
    loading: false,
    error: null,
    add: () => Promise.resolve(),
    remove: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }),
}));
vi.mock('../config', async () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
vi.mock('../utils/apiService', async () => ({
  ...(await vi.importActual('../utils/apiService')),
  updateRecipeStatus: vi.fn(),
}));
vi.mock('../components/BringButton', () => ({ default: () => null }));
vi.mock('../components/FilterSection', () => ({ default: () => null }));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const mockUseRecipes = useRecipes as Mock;
const mockUseAuth = useAuth as Mock;
const mockUseRecipeFilters = useRecipeFilters as Mock;

const mockLogout = vi.fn();

const sampleRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Pasta',
    instructions: [],
    ingredient_sections: [],
  },
];

const defaultFilters = {
  titleFilter: '',
  setTitleFilter: vi.fn(),
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
  sortMode: 'alpha-asc' as const,
  setSortMode: vi.fn(),
  resetFilters: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: mockLogout });
  mockUseRecipeFilters.mockReturnValue(defaultFilters);
});

describe('RecipeList error handling', () => {
  it('shows cached recipes when background fetch fails (not an auth error)', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new Error('Network error'),
    });
    render(<RecipeList />);
    expect(screen.getByText('Pasta')).toBeInTheDocument();
  });

  it('shows a toast containing the error message when background fetch fails with cached data', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new Error('Network error'),
    });
    render(<RecipeList />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Network error');
  });

  it('dismisses the toast when the close button is clicked', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new Error('Network error'),
    });
    render(<RecipeList />);
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: /schließen/i }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('calls logout on a 401 ApiError', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new ApiError(401, 'Unauthorized'),
    });
    render(<RecipeList />);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it('calls logout on a 403 ApiError', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new ApiError(403, 'Forbidden'),
    });
    render(<RecipeList />);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it('does not call logout for non-auth errors', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new Error('Server error'),
    });
    render(<RecipeList />);
    await screen.findByRole('alert');
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('shows inline error paragraph when there is no cached data', () => {
    mockUseRecipes.mockReturnValue({
      recipes: null,
      loading: false,
      error: new Error('Server error'),
    });
    render(<RecipeList />);
    expect(screen.getByText(/Fehler/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not show toast for auth error (only redirects)', async () => {
    mockUseRecipes.mockReturnValue({
      recipes: sampleRecipes,
      loading: false,
      error: new ApiError(401, 'Unauthorized'),
    });
    render(<RecipeList />);
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows loading state when recipes are null and loading', () => {
    mockUseRecipes.mockReturnValue({ recipes: null, loading: true, error: null });
    render(<RecipeList />);
    expect(screen.getByText(/Lade Rezepte/)).toBeInTheDocument();
  });

  it('shows recipe list without toast when there is no error', () => {
    mockUseRecipes.mockReturnValue({ recipes: sampleRecipes, loading: false, error: null });
    render(<RecipeList />);
    expect(screen.getByText('Pasta')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
