import type { Recipe } from '../../types/Recipe';

export type RecipeType = NonNullable<Recipe['recipeType']>;
export type Dietary = NonNullable<Recipe['dietaryRestrictions']>[number];

export const knownTypes: RecipeType[] = ['cooking', 'baking', 'snack', 'dessert'];
export const knownDietary: Dietary[] = ['vegan', 'vegetarian', 'glutenfree', 'dairyfree'];

export const typeLabels: Record<RecipeType, string> = {
  cooking: 'Kochen',
  baking: 'Backen',
  snack: 'Snack',
  dessert: 'Dessert',
};

export const dietaryLabels: Record<Dietary, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarisch',
  glutenfree: 'Glutenfrei',
  dairyfree: 'Laktosefrei',
};
