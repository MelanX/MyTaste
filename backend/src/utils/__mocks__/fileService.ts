import { vi } from 'vitest';
import type { RecipeData, ImportConfig, CollectionsData } from '../fileService.js';

let recipeData: RecipeData = { recipes: [] };
let importConfig: ImportConfig = { rename_rules: [], spice_rules: { spices: [], spice_map: {} }, bring_rules: [] };
let collectionsData: CollectionsData = { nextUp: [], collections: [] };

export const readData = vi.fn(async () => JSON.parse(JSON.stringify(recipeData)) as RecipeData);
export const writeData = vi.fn(async (d: RecipeData) => {
  recipeData = d;
});
export const readImportConfig = vi.fn(async () => JSON.parse(JSON.stringify(importConfig)) as ImportConfig);
export const writeImportConfig = vi.fn(async (c: ImportConfig) => {
  importConfig = c;
});
export const readCollections = vi.fn(async () => JSON.parse(JSON.stringify(collectionsData)) as CollectionsData);
export const writeCollections = vi.fn(async (d: CollectionsData) => {
  collectionsData = d;
});
export const modifyData = vi.fn(async (fn: (data: RecipeData) => unknown) => {
  const data = await readData();
  const newData = await fn(data);
  if (newData != null) await writeData(newData as RecipeData);
  return newData;
});
export const modifyImportConfig = vi.fn(async (fn: (data: ImportConfig) => unknown) => {
  const data = await readImportConfig();
  const newData = await fn(data);
  if (newData != null) await writeImportConfig(newData as ImportConfig);
  return newData;
});
export const modifyCollections = vi.fn(async (fn: (data: CollectionsData) => unknown) => {
  const data = await readCollections();
  const newData = await fn(data);
  if (newData != null) await writeCollections(newData as CollectionsData);
  return newData;
});

// helpers for your tests:
export const __setRecipeData = (d: RecipeData) => {
  recipeData = d;
};
export const __setImportConfig = (c: ImportConfig) => {
  importConfig = c;
};
export const __setCollectionsData = (d: CollectionsData) => {
  collectionsData = d;
};
