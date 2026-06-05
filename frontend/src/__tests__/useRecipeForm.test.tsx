import { act, renderHook } from '@testing-library/react';
import type { FormEvent } from 'react';
import { useRecipeForm } from '../components/RecipeForm/useRecipeForm';
import type { RecipeFormValues } from '../components/RecipeForm/types';

const navigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));

const apiFetchMock = vi.fn();
vi.mock('../utils/apiService', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

beforeEach(() => {
  navigate.mockReset();
  apiFetchMock.mockReset();
});

const initial: RecipeFormValues = {
  title: 'Soup',
  instructions: ['boil water', ''],
  url: '',
  image: '',
  ingredient_sections: [{ ingredients: [{ name: 'Water', amount: 1, unit: 'l' }] }],
  spices: [],
  recipeType: '',
  dietaryRestrictions: [],
};

function setup(overrides: Partial<Parameters<typeof useRecipeForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) } as Response);
  const hook = renderHook(() => useRecipeForm({ initial, onSubmit, redirectTo: '/recipes', ...overrides }));
  return { ...hook, onSubmit };
}

const fakeEvent = { preventDefault: vi.fn() } as unknown as FormEvent;

describe('useRecipeForm spice handling', () => {
  it('adds a trimmed spice and clears the input', () => {
    const { result } = setup();
    act(() => result.current.setNewSpice('Cumin'));
    act(() => result.current.handleAddSpice());
    expect(result.current.spices).toEqual(['Cumin']);
    expect(result.current.newSpice).toBe('');
  });

  it('ignores a blank spice', () => {
    const { result } = setup();
    act(() => result.current.setNewSpice('   '));
    act(() => result.current.handleAddSpice());
    expect(result.current.spices).toEqual([]);
  });

  it('removes a spice by index', () => {
    const { result } = setup();
    act(() => result.current.setNewSpice('A'));
    act(() => result.current.handleAddSpice());
    act(() => result.current.setNewSpice('B'));
    act(() => result.current.handleAddSpice());
    act(() => result.current.handleRemoveSpice(0));
    expect(result.current.spices).toEqual(['B']);
  });
});

describe('useRecipeForm dietary toggling', () => {
  it('toggles a dietary restriction on and off', () => {
    const { result } = setup();
    act(() => result.current.toggleDietary('vegan'));
    expect(result.current.dietaryRestrictions).toEqual(['vegan']);
    act(() => result.current.toggleDietary('vegan'));
    expect(result.current.dietaryRestrictions).toEqual([]);
  });
});

describe('useRecipeForm submit', () => {
  it('builds a snake_case-preserving payload, drops empty instructions, navigates on success', async () => {
    const { result, onSubmit } = setup();
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    const payload = onSubmit.mock.calls[0][0] as RecipeFormValues;
    expect(payload).toHaveProperty('ingredient_sections');
    expect(payload.instructions).toEqual(['boil water']);
    expect(payload.title).toBe('Soup');
    // empty/undefined optionals collapse
    expect(payload.url).toBeUndefined();
    expect(payload.image).toBeUndefined();
    expect(payload.spices).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/recipes');
  });

  it('includes spices/url/recipeType/dietary when present', async () => {
    const { result, onSubmit } = setup();
    act(() => result.current.setUrl(' https://x.test '));
    act(() => result.current.setRecipeType('baking'));
    act(() => result.current.toggleDietary('vegan'));
    act(() => result.current.setNewSpice('Salt'));
    act(() => result.current.handleAddSpice());
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    const payload = onSubmit.mock.calls[0][0] as RecipeFormValues;
    expect(payload.url).toBe('https://x.test');
    expect(payload.recipeType).toBe('baking');
    expect(payload.dietaryRestrictions).toEqual(['vegan']);
    expect(payload.spices).toEqual(['Salt']);
  });

  it('surfaces server validation errors and does not navigate', async () => {
    const onSubmit = vi
      .fn()
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({ message: 'Bad', details: ['title required'] }) } as Response);
    const { result } = renderHook(() => useRecipeForm({ initial, onSubmit, redirectTo: '/recipes' }));
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    expect(result.current.errors).toEqual(['Bad', 'title required']);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when redirectTo is absent', async () => {
    const { result } = setup({ redirectTo: undefined });
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('useRecipeForm image upload', () => {
  it('uploads the image file and uses the returned url', async () => {
    apiFetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: '/img/123.png' }) } as Response);
    const { result, onSubmit } = setup();
    const file = new File(['x'], 'pic.png', { type: 'image/png' });
    act(() => result.current.setImageFile(file));
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    expect(apiFetchMock).toHaveBeenCalledWith('/api/upload-image', expect.objectContaining({ method: 'POST' }));
    const payload = onSubmit.mock.calls[0][0] as RecipeFormValues;
    expect(payload.image).toBe('/img/123.png');
  });

  it('surfaces upload errors and aborts the submit', async () => {
    apiFetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({ message: 'Too big', details: ['max 5mb'] }) } as Response);
    const { result, onSubmit } = setup();
    act(() => result.current.setImageFile(new File(['x'], 'pic.png', { type: 'image/png' })));
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    expect(result.current.errors).toEqual(['Too big', 'max 5mb']);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('aborts silently when the upload throws', async () => {
    apiFetchMock.mockRejectedValue(new Error('network'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result, onSubmit } = setup();
    act(() => result.current.setImageFile(new File(['x'], 'pic.png', { type: 'image/png' })));
    await act(async () => {
      await result.current.handleSubmit(fakeEvent);
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('useRecipeForm delete + import', () => {
  it('delegates handleDelete to onDelete', async () => {
    const onDelete = vi.fn().mockResolvedValue({ ok: true } as Response);
    const { result } = setup({ onDelete });
    await act(async () => {
      await result.current.handleDelete();
    });
    expect(onDelete).toHaveBeenCalled();
  });

  it('redirectToImport navigates to /import-recipe', async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.redirectToImport();
    });
    expect(navigate).toHaveBeenCalledWith('/import-recipe');
  });
});
