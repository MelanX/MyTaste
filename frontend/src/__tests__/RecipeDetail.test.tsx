import { type Mock } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RecipeDetail from '../components/RecipeDetail';
import { useRecipe } from '../hooks/useRecipe';
import { useAuth } from '../context/AuthContext';
import { updateRecipeStatus } from '../utils/apiService';
import type { Recipe } from '../types/Recipe';

vi.mock('../hooks/useRecipe');
vi.mock('../context/AuthContext');
vi.mock('../config', () => ({ getConfig: () => ({ API_URL: '', requireLogin: false }) }));
vi.mock('../utils/apiService', async () => ({
  ...(await vi.importActual('../utils/apiService')),
  updateRecipeStatus: vi.fn(),
}));
vi.mock('../utils/recipesCache', () => ({ upsertRecipe: vi.fn() }));
vi.mock('../components/BringButton', () => ({ default: () => <div data-testid="bring-button" /> }));
vi.mock('../components/CollectionPicker', () => ({ default: () => <div data-testid="collection-picker" /> }));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg data-testid="qr" /> }));
vi.mock('react-router-dom', () => ({
  Link: ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: '/recipe/r1' }),
  useParams: () => ({ id: 'r1' }),
}));

const mockUseRecipe = useRecipe as Mock;
const mockUseAuth = useAuth as Mock;
const mockUpdateStatus = updateRecipeStatus as Mock;

const sampleRecipe: Recipe = {
  id: 'r1',
  title: 'Pfannkuchen',
  url: 'https://example.com/orig',
  recipeType: 'cooking',
  dietaryRestrictions: ['vegan'],
  instructions: ['Mehl mischen', 'Backen'],
  spices: ['Zimt', 'Salz'],
  ingredient_sections: [
    {
      title: 'Teig',
      ingredients: [{ name: 'Mehl, gesiebt', amount: 200, unit: 'g', note: 'Type 405' }],
    },
  ],
  status: { cookState: false, favorite: false },
} as unknown as Recipe;

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ isAuthenticated: false, logout: vi.fn() });
  mockUseRecipe.mockReturnValue({ recipe: sampleRecipe, loading: false, error: null });
});

describe('RecipeDetail', () => {
  it('shows loading text when loading and no recipe', () => {
    mockUseRecipe.mockReturnValue({ recipe: null, loading: true, error: null });
    render(<RecipeDetail />);
    expect(screen.getByText(/lade rezept/i)).toBeInTheDocument();
  });

  it('shows error text when error and no recipe', () => {
    mockUseRecipe.mockReturnValue({ recipe: null, loading: false, error: new Error('Boom') });
    render(<RecipeDetail />);
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it('renders the recipe title', () => {
    render(<RecipeDetail />);
    // Two h1s exist: the screen title and a print-only title in the left column.
    expect(screen.getAllByRole('heading', { name: 'Pfannkuchen', level: 1 }).length).toBeGreaterThan(0);
  });

  it('renders the instructions with step numbers', () => {
    render(<RecipeDetail />);
    expect(screen.getByText('Zubereitung')).toBeInTheDocument();
    expect(screen.getByText('Mehl mischen')).toBeInTheDocument();
    expect(screen.getByText('Backen')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders ingredients with amount, unit and name', () => {
    render(<RecipeDetail />);
    expect(screen.getByText('Zutaten')).toBeInTheDocument();
    expect(screen.getByText('200 g')).toBeInTheDocument();
    expect(screen.getByText('Mehl')).toBeInTheDocument();
    expect(screen.getByText('Type 405')).toBeInTheDocument();
  });

  it('renders spices', () => {
    render(<RecipeDetail />);
    expect(screen.getByText('Gewürze')).toBeInTheDocument();
    expect(screen.getByText('Zimt')).toBeInTheDocument();
    expect(screen.getByText('Salz')).toBeInTheDocument();
  });

  it('renders recipe type and dietary tags', () => {
    render(<RecipeDetail />);
    expect(screen.getByText('Kochen')).toBeInTheDocument();
    expect(screen.getByText('Vegan')).toBeInTheDocument();
  });

  it('renders a link to the original recipe', () => {
    render(<RecipeDetail />);
    const link = screen.getByRole('link', { name: /zum originalrezept/i });
    expect(link).toHaveAttribute('href', 'https://example.com/orig');
  });

  it('renders the print QR (labelled Originalrezept) when the recipe has a source url', () => {
    render(<RecipeDetail />);
    expect(screen.getByTestId('qr')).toBeInTheDocument();
    expect(screen.getByText(/originalrezept:/i)).toBeInTheDocument();
    expect(screen.queryByText(/im browser aufrufen/i)).toBeNull();
  });

  it('renders no print QR when the recipe has no source url', () => {
    mockUseRecipe.mockReturnValue({ recipe: { ...sampleRecipe, url: undefined }, loading: false, error: null });
    render(<RecipeDetail />);
    expect(screen.queryByTestId('qr')).toBeNull();
  });

  it('does not show edit button or cook/fav controls when not authenticated', () => {
    render(<RecipeDetail />);
    expect(screen.queryByTitle(/gekocht/i)).toBeNull();
    expect(screen.queryByTestId('collection-picker')).toBeNull();
  });

  it('shows cook and favorite controls and toggles cook state when authenticated', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, logout: vi.fn() });
    mockUpdateStatus.mockResolvedValue({ cookState: true });
    const user = userEvent.setup();
    render(<RecipeDetail />);
    const cookIcon = screen.getByTitle('Noch nicht gekocht');
    await user.click(cookIcon.parentElement as HTMLElement);
    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith('r1', { cookState: true }));
  });
});
