import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImportRecipe from '../components/ImportRecipe';
import { apiFetch } from '../utils/apiService';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../utils/apiService', () => ({ apiFetch: vi.fn() }));
// RecipeFormBase pulls in ImageUpload (dropzone) — keep it light for the imported view.
vi.mock('../components/RecipeForm/RecipeFormBase', () => ({
  default: ({ submitLabel }: { submitLabel: string }) => <div>{submitLabel}</div>,
}));

const mockedApiFetch = vi.mocked(apiFetch);

describe('ImportRecipe', () => {
  beforeEach(() => mockedApiFetch.mockReset());

  it('renders the heading and url input', () => {
    render(<ImportRecipe />);
    expect(screen.getByRole('heading', { name: 'Rezept importieren' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders the import submit button', () => {
    render(<ImportRecipe />);
    expect(screen.getByRole('button', { name: /import starten/i })).toBeInTheDocument();
  });

  it('shows an error section when the import request fails', async () => {
    mockedApiFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Import fehlgeschlagen', details: [] }),
    } as Response);

    render(<ImportRecipe />);
    await userEvent.type(screen.getByRole('textbox'), 'https://example.com/rezept');
    await userEvent.click(screen.getByRole('button', { name: /import starten/i }));

    await waitFor(() => expect(screen.getByText('Import fehlgeschlagen')).toBeInTheDocument());
  });

  it('renders the recipe form after a successful import', async () => {
    mockedApiFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Pasta', instructions: ['kochen'], ingredient_sections: [] }),
    } as Response);

    render(<ImportRecipe />);
    await userEvent.type(screen.getByRole('textbox'), 'https://example.com/rezept');
    await userEvent.click(screen.getByRole('button', { name: /import starten/i }));

    await waitFor(() => expect(screen.getByText('Importiertes Rezept speichern')).toBeInTheDocument());
  });
});
