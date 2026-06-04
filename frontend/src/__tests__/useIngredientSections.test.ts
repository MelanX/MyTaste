import { act, renderHook } from '@testing-library/react';
import { useIngredientSections } from '../components/RecipeForm/useIngredientSections';
import type { Ingredient } from '../types/Recipe';

const ing = (name: string): Ingredient => ({ name });

describe('useIngredientSections', () => {
  it('defaults to a single flat section with no ingredients', () => {
    const { result } = renderHook(() => useIngredientSections([]));
    expect(result.current.ingredientSections).toEqual([{ ingredients: [] }]);
    expect(result.current.isSectionMode).toBe(false);
  });

  it('adds and removes ingredients in the flat section', () => {
    const { result } = renderHook(() => useIngredientSections([]));
    act(() => result.current.addIngredientToSection(0, ing('A')));
    act(() => result.current.addIngredientToSection(0, ing('B')));
    expect(result.current.ingredientSections[0].ingredients.map((i) => i.name)).toEqual(['A', 'B']);

    act(() => result.current.removeIngredientFromSection(0, 0));
    expect(result.current.ingredientSections[0].ingredients.map((i) => i.name)).toEqual(['B']);
  });

  it('reorders ingredients within a section when dragged downward', () => {
    const { result } = renderHook(() => useIngredientSections([{ ingredients: [ing('A'), ing('B'), ing('C')] }]));
    // drag A (index 0) to before C (index 2) -> downward move adjusts insert index
    act(() => result.current.handleIngredientDragStart(0, 0));
    act(() => result.current.handleIngredientDrop(0, 2));
    expect(result.current.ingredientSections[0].ingredients.map((i) => i.name)).toEqual(['B', 'A', 'C']);
  });

  it('reorders ingredients to the end when dropped on the end zone', () => {
    const { result } = renderHook(() => useIngredientSections([{ ingredients: [ing('A'), ing('B'), ing('C')] }]));
    act(() => result.current.handleIngredientDragStart(0, 0));
    act(() => result.current.handleIngredientDrop(0, null));
    expect(result.current.ingredientSections[0].ingredients.map((i) => i.name)).toEqual(['B', 'C', 'A']);
  });

  it('addSection enters section mode and titles section 1 + 2', () => {
    const { result } = renderHook(() => useIngredientSections([]));
    act(() => result.current.addSection());
    expect(result.current.isSectionMode).toBe(true);
    expect(result.current.ingredientSections.map((s) => s.title)).toEqual(['Sektion 1', 'Sektion 2']);
  });

  it('removeSection collapses back to a titleless flat section', () => {
    const { result } = renderHook(() => useIngredientSections([]));
    act(() => result.current.addSection());
    act(() => result.current.removeSection(1));
    expect(result.current.ingredientSections).toEqual([{ ingredients: [] }]);
  });

  it('buildNormalizedSections strips title in flat mode', () => {
    const { result } = renderHook(() => useIngredientSections([{ title: 'whatever', ingredients: [ing('A')] }]));
    expect(result.current.buildNormalizedSections()).toEqual([{ ingredients: [ing('A')] }]);
  });

  it('buildNormalizedSections ensures titles in section mode', () => {
    const { result } = renderHook(() =>
      useIngredientSections([
        { title: '  ', ingredients: [] },
        { title: 'Teig', ingredients: [ing('A')] },
      ]),
    );
    const normalized = result.current.buildNormalizedSections();
    expect(normalized).toEqual([
      { title: 'Sektion 1', ingredients: [] },
      { title: 'Teig', ingredients: [ing('A')] },
    ]);
  });
});
