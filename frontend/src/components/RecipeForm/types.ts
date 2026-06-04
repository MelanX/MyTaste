import type { IngredientSection } from '../../types/Recipe';

export interface RecipeFormValues {
  title: string;
  instructions: string[];
  url?: string;
  image?: string;
  ingredient_sections: IngredientSection[];
  spices?: string[];
  recipeType?: string;
  dietaryRestrictions?: string[];
}

export type DragInfo = {
  fromSectionIndex: number;
  fromIngredientIndex: number;
};

export type DragTarget = {
  sectionIndex: number;
  ingredientIndex: number | null;
} | null;

export const parseAmount = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
};
