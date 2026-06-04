import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeFormBase, { type RecipeFormValues } from '../components/RecipeForm/RecipeFormBase';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('../utils/apiService', () => ({ apiFetch: vi.fn() }));
vi.mock('../components/ImageUpload', () => ({ default: () => null }));
vi.mock('../components/InstructionsEditor', () => ({
  default: ({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) => (
    <input aria-label="instructions" value={value.join('|')} onChange={(e) => onChange(e.target.value.split('|'))} />
  ),
}));

function makeOnSubmit() {
  return vi.fn<(values: RecipeFormValues) => Promise<Response>>().mockResolvedValue({ ok: true } as Response);
}

async function addIngredient(
  scope: HTMLElement,
  { amount, unit, name, note }: { amount?: string; unit?: string; name: string; note?: string },
) {
  const user = userEvent.setup();
  const amountInput = within(scope).getByPlaceholderText('Menge');
  if (amount !== undefined) await user.type(amountInput, amount);
  if (unit !== undefined) await user.type(within(scope).getByPlaceholderText('Einheit'), unit);
  await user.type(within(scope).getByPlaceholderText('Name'), name);
  if (note !== undefined) await user.type(within(scope).getByPlaceholderText('Anmerkung (optional)'), note);
  // the add button lives in the same add-row as the "Menge" input
  const addRow = amountInput.closest('div')!.parentElement!;
  const addBtn = within(addRow)
    .getAllByRole('button')
    .find((b) => b.querySelector('i.fa-plus, i.fa-solid.fa-plus'))!;
  await user.click(addBtn);
}

describe('RecipeFormBase submit payload', () => {
  it('submits an empty flat ingredient_sections by default (snake_case key)', async () => {
    const onSubmit = makeOnSubmit();
    render(<RecipeFormBase submitLabel="Speichern" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Titel'), 'Brot');
    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toHaveProperty('ingredient_sections');
    expect(payload.ingredient_sections).toEqual([{ ingredients: [] }]);
    expect(payload.title).toBe('Brot');
  });

  it('includes added ingredients in the flat section, stripping the title', async () => {
    const onSubmit = makeOnSubmit();
    const { container } = render(<RecipeFormBase submitLabel="Speichern" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Titel'), 'Brot');
    await addIngredient(container, { amount: '500', unit: 'g', name: 'Mehl', note: 'Typ 550' });

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    const payload = onSubmit.mock.calls[0][0];
    expect(payload.ingredient_sections).toEqual([{ ingredients: [{ name: 'Mehl', amount: 500, unit: 'g', note: 'Typ 550' }] }]);
    // flat mode -> no title key
    expect(payload.ingredient_sections[0]).not.toHaveProperty('title');
  });

  it('parses comma decimals and omits empty optional fields', async () => {
    const onSubmit = makeOnSubmit();
    const { container } = render(<RecipeFormBase submitLabel="Speichern" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Titel'), 'X');
    await addIngredient(container, { amount: '1,5', name: 'Zucker' });

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));

    const payload = onSubmit.mock.calls[0][0];
    const ing = payload.ingredient_sections[0].ingredients[0];
    expect(ing.amount).toBe(1.5);
    expect(ing.name).toBe('Zucker');
    // empty optional fields are normalized to undefined (key may be present)
    expect(ing.unit).toBeUndefined();
    expect(ing.note).toBeUndefined();
  });

  it('removes an ingredient before submitting', async () => {
    const onSubmit = makeOnSubmit();
    const { container } = render(<RecipeFormBase submitLabel="Speichern" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Titel'), 'X');
    await addIngredient(container, { name: 'A' });
    await addIngredient(container, { name: 'B' });

    // remove first ingredient (minus button)
    const removeBtns = Array.from(container.querySelectorAll('button')).filter((b) => b.querySelector('i.fa-minus, i.fa-solid.fa-minus'));
    await userEvent.click(removeBtns[0]);

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.ingredient_sections[0].ingredients.map((i) => i.name)).toEqual(['B']);
  });

  it('switches to section mode on "Sektion hinzufügen" and submits titled sections', async () => {
    const onSubmit = makeOnSubmit();
    render(<RecipeFormBase submitLabel="Speichern" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Titel'), 'X');
    await userEvent.click(screen.getByRole('button', { name: /sektion hinzufügen/i }));

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.ingredient_sections).toHaveLength(2);
    expect(payload.ingredient_sections[0].title).toBe('Sektion 1');
    expect(payload.ingredient_sections[1].title).toBe('Sektion 2');
  });

  it('collapses back to flat mode (no title) when a section is removed', async () => {
    const onSubmit = makeOnSubmit();
    render(<RecipeFormBase submitLabel="Speichern" onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('Titel'), 'X');
    await userEvent.click(screen.getByRole('button', { name: /sektion hinzufügen/i }));
    await userEvent.click(screen.getAllByRole('button', { name: /sektion entfernen/i })[0]);

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.ingredient_sections).toEqual([{ ingredients: [] }]);
  });

  it('includes spices, recipeType, dietaryRestrictions and url when set', async () => {
    const onSubmit = makeOnSubmit();
    render(
      <RecipeFormBase
        submitLabel="Speichern"
        onSubmit={onSubmit}
        initial={{
          title: 'X',
          instructions: ['step'],
          url: 'https://example.com',
          ingredient_sections: [],
          spices: ['Salz'],
          recipeType: 'baking',
          dietaryRestrictions: ['vegan'],
        }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Speichern' }));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.url).toBe('https://example.com');
    expect(payload.spices).toEqual(['Salz']);
    expect(payload.recipeType).toBe('baking');
    expect(payload.dietaryRestrictions).toEqual(['vegan']);
    expect(payload.instructions).toEqual(['step']);
  });
});
