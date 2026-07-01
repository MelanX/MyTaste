import { type Mock } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CollectionPicker from '../components/CollectionPicker';
import { useCollectionsContext } from '../context/CollectionsContext';

vi.mock('../context/CollectionsContext');

const mockUseCollections = useCollectionsContext as Mock;
const mockAddRecipe = vi.fn();
const mockRemoveRecipe = vi.fn();
const mockCreate = vi.fn();

const sampleCollections = [
  { id: 'c1', name: 'Sunday Dinners', recipeIds: ['r1'], createdAt: 'x', updatedAt: 'x' },
  { id: 'c2', name: 'Quick Meals', recipeIds: [], createdAt: 'x', updatedAt: 'x' },
];

function setupMocks({ collections = sampleCollections } = {}) {
  mockUseCollections.mockReturnValue({
    collections,
    addRecipe: mockAddRecipe,
    removeRecipe: mockRemoveRecipe,
    create: mockCreate,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('CollectionPicker', () => {
  it('renders a trigger button and no dropdown initially', () => {
    render(<CollectionPicker recipeId="r1" />);
    expect(screen.getByRole('button', { name: /zu sammlung hinzufügen/i })).toBeInTheDocument();
    expect(screen.queryByText('Sunday Dinners')).not.toBeInTheDocument();
  });

  it('opens the dropdown listing all collections on click', async () => {
    const user = userEvent.setup();
    render(<CollectionPicker recipeId="r1" />);
    await user.click(screen.getByRole('button', { name: /zu sammlung hinzufügen/i }));
    expect(screen.getByText('Sunday Dinners')).toBeInTheDocument();
    expect(screen.getByText('Quick Meals')).toBeInTheDocument();
  });

  it('checkboxes reflect whether the recipe is in each collection', async () => {
    const user = userEvent.setup();
    render(<CollectionPicker recipeId="r1" />);
    await user.click(screen.getByRole('button', { name: /zu sammlung hinzufügen/i }));
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
    // c1 contains r1 -> checked; c2 does not -> unchecked
    expect(checkboxes[0].checked).toBe(true);
    expect(checkboxes[1].checked).toBe(false);
  });

  it('toggling an unchecked collection calls addRecipe', async () => {
    const user = userEvent.setup();
    render(<CollectionPicker recipeId="r1" />);
    await user.click(screen.getByRole('button', { name: /zu sammlung hinzufügen/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    expect(mockAddRecipe).toHaveBeenCalledWith('c2', 'r1');
  });

  it('toggling a checked collection calls removeRecipe', async () => {
    const user = userEvent.setup();
    render(<CollectionPicker recipeId="r1" />);
    await user.click(screen.getByRole('button', { name: /zu sammlung hinzufügen/i }));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    expect(mockRemoveRecipe).toHaveBeenCalledWith('c1', 'r1');
  });

  it('button variant shows a label reflecting how many collections contain the recipe', () => {
    render(<CollectionPicker recipeId="r1" variant="button" />);
    expect(screen.getByText(/In 1 Sammlung/i)).toBeInTheDocument();
  });

  it('creating a new collection from the dropdown calls create', async () => {
    const user = userEvent.setup();
    render(<CollectionPicker recipeId="r1" />);
    await user.click(screen.getByRole('button', { name: /zu sammlung hinzufügen/i }));
    await user.click(screen.getByRole('button', { name: /neue sammlung/i }));
    await user.type(screen.getByPlaceholderText(/name/i), 'Desserts');
    const submit = screen.getAllByRole('button').find((b) => b.getAttribute('type') === 'submit')!;
    await user.click(submit);
    expect(mockCreate).toHaveBeenCalledWith('Desserts');
  });
});
