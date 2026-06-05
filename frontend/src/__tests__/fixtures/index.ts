import type { Collection } from '../../types/Collections';
import type { Recipe } from '../../types/Recipe';

export const sampleCollections: Collection[] = [
  { id: 'c1', name: 'Weeknight', recipeIds: ['r1', 'r2'] },
  { id: 'c2', name: 'Desserts', recipeIds: [] },
];

export const sampleRecipe: Recipe = {
  id: 'r1',
  title: 'Pancakes',
} as Recipe;

export const sampleRecipes: Recipe[] = [{ id: 'r1', title: 'Pancakes' } as Recipe, { id: 'r2', title: 'Waffles' } as Recipe];
