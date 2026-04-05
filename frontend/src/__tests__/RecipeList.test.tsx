import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeList from '../components/RecipeList';
import { ApiError } from '../utils/api_service';
import { Recipe } from '../types/Recipe';

jest.mock('../hooks/useRecipes');
jest.mock('../context/AuthContext');
jest.mock('../context/RecipeFiltersContext');
jest.mock('../config', () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
jest.mock('../utils/api_service', () => ({
    ...jest.requireActual('../utils/api_service'),
    updateRecipeStatus: jest.fn(),
}));
jest.mock('../components/BringButton', () => () => null);
jest.mock('../components/FilterSection', () => () => null);
jest.mock('react-router-dom', () => ({
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}), { virtual: true });

import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../context/AuthContext';
import { useRecipeFilters } from '../context/RecipeFiltersContext';

const mockUseRecipes = useRecipes as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;
const mockUseRecipeFilters = useRecipeFilters as jest.Mock;

const mockLogout = jest.fn();

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
    setTitleFilter: jest.fn(),
    selectedTypes: [],
    setSelectedTypes: jest.fn(),
    typeMode: 'or' as const,
    setTypeMode: jest.fn(),
    selectedDietary: [],
    setSelectedDietary: jest.fn(),
    dietaryMode: 'or' as const,
    setDietaryMode: jest.fn(),
    favFilter: false,
    setFavFilter: jest.fn(),
    cookFilter: null,
    setCookFilter: jest.fn(),
    sortMode: 'alpha-asc' as const,
    setSortMode: jest.fn(),
    resetFilters: jest.fn(),
};

beforeEach(() => {
    jest.clearAllMocks();
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
