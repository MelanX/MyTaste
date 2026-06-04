import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Types ───────────────────────────────────────────────────────────────────

export interface Ingredient {
  name: string;
  amount?: number;
  unit?: string | null;
  note?: string | null;
}

export interface IngredientSection {
  title?: string | null;
  ingredients: Ingredient[];
}

export interface RecipeStatus {
  favorite?: boolean;
  cookState?: boolean;
}

export interface Recipe {
  id: string;
  title: string;
  url?: string | null;
  image?: string | null;
  ingredient_sections: IngredientSection[];
  recipeType?: string | null;
  dietaryRestrictions?: string[];
  spices?: string[];
  instructions: string[];
  status?: RecipeStatus;
  // legacy / passthrough fields
  ingredients?: Ingredient[];
  [key: string]: unknown;
}

export interface RecipeData {
  version?: string;
  recipes: Recipe[];
}

export interface RenameRule {
  from: string[];
  to: string;
}

export interface SpiceRules {
  spices: string[];
  spice_map?: Record<string, string[]>;
}

export interface BringRule {
  from: string[];
  to: string;
}

export interface ImportConfig {
  rename_rules?: RenameRule[];
  spice_rules?: SpiceRules;
  bring_rules?: BringRule[];
}

export interface Collection {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionsData {
  nextUp: string[];
  collections: Collection[];
}

// ── Paths ───────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '..', '..', 'data');
const RECIPE_FILE = path.join(DATA_DIR, 'recipes.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const COLLECTIONS_FILE = path.join(DATA_DIR, 'collections.json');
const RECIPE_FILE_VERSION = '2';

// Queues serialize concurrent read-modify-write cycles so they never interleave.
let recipeQueue: Promise<unknown> = Promise.resolve();
let configQueue: Promise<unknown> = Promise.resolve();
let collectionsQueue: Promise<unknown> = Promise.resolve();

async function ensureFile(): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.writeFile(RECIPE_FILE, JSON.stringify({ version: RECIPE_FILE_VERSION, recipes: [] }, null, 2), { flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
}

async function ensureImportConfigFile(): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.writeFile(
      CONFIG_FILE,
      JSON.stringify({ rename_rules: [], spice_rules: { spices: [], spice_map: {} }, bring_rules: [] }, null, 2),
      { flag: 'wx' },
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
}

async function ensureCollectionsFile(): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.writeFile(COLLECTIONS_FILE, JSON.stringify({ nextUp: [], collections: [] }, null, 2), { flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
  }
}

export async function readData(): Promise<RecipeData> {
  await ensureFile();
  const raw = await fs.promises.readFile(RECIPE_FILE, 'utf8');
  return checkAndUpgradeRecipesFileVersion(JSON.parse(raw));
}

export async function writeData(data: RecipeData): Promise<void> {
  await ensureFile();
  await fs.promises.writeFile(RECIPE_FILE, JSON.stringify(data, null, 2));
}

export async function readImportConfig(): Promise<ImportConfig> {
  await ensureImportConfigFile();
  const raw = await fs.promises.readFile(CONFIG_FILE, 'utf8');
  return JSON.parse(raw);
}

export async function writeImportConfig(data: ImportConfig): Promise<void> {
  await ensureImportConfigFile();
  await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2));
}

export async function readCollections(): Promise<CollectionsData> {
  await ensureCollectionsFile();
  const raw = await fs.promises.readFile(COLLECTIONS_FILE, 'utf8');
  const data = JSON.parse(raw) as CollectionsData;
  if (!Array.isArray(data.collections)) data.collections = [];
  return data;
}

export async function writeCollections(data: CollectionsData): Promise<void> {
  await ensureCollectionsFile();
  await fs.promises.writeFile(COLLECTIONS_FILE, JSON.stringify(data, null, 2));
}

export async function modifyCollections(
  fn: (data: CollectionsData) => CollectionsData | null | undefined | Promise<CollectionsData | null | undefined>,
): Promise<CollectionsData | null | undefined> {
  return new Promise((resolve, reject) => {
    collectionsQueue = collectionsQueue.then(async () => {
      try {
        const data = await readCollections();
        const newData = await fn(data);
        if (newData != null) await writeCollections(newData);
        resolve(newData);
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function checkAndUpgradeRecipesFileVersion(data: RecipeData): Promise<RecipeData> {
  if (data.version === RECIPE_FILE_VERSION) {
    return data;
  }

  console.log(`Wrong file version: ${data.version}`);
  await backup(RECIPE_FILE);
  if (data.version === undefined) {
    console.log('This file is from a time before the versioning, upgrade to version 1 by just adding 1.');
    data.version = '1';
    await writeData(data);
  }

  if (data.version === '1') {
    console.log('Upgrading to version 2');
    data.version = '2';
    data.recipes.forEach((recipe) => {
      recipe.ingredient_sections = [{ ingredients: [...(recipe.ingredients ?? [])] }];
      delete recipe.ingredients;
    });
    await writeData(data);
    console.log('Done');
  }

  return data;
}

async function backup(filePath: string): Promise<void> {
  const dest = filePath + '_bak_' + new Date().toISOString().replace(/[:.T]/g, '-').replace('Z', '');
  await fs.promises.copyFile(filePath, dest);
  console.log(`Backed up ${filePath} to ${dest}`);
}

/**
 * Atomically read-modify-write recipes.json.
 * fn receives the current data object and must return the (modified) data to
 * persist, or null/undefined to abort the write without an error.
 * Concurrent calls are serialized — no two fn bodies ever overlap.
 */
export async function modifyData(
  fn: (data: RecipeData) => RecipeData | null | undefined | Promise<RecipeData | null | undefined>,
): Promise<RecipeData | null | undefined> {
  return new Promise((resolve, reject) => {
    recipeQueue = recipeQueue.then(async () => {
      try {
        const data = await readData();
        const newData = await fn(data);
        if (newData != null) await writeData(newData);
        resolve(newData);
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Atomically read-modify-write config.json.
 * fn receives the current config and must return the new config to persist,
 * or null/undefined to abort the write without an error.
 * Concurrent calls are serialized.
 */
export async function modifyImportConfig(
  fn: (data: ImportConfig) => ImportConfig | null | undefined | Promise<ImportConfig | null | undefined>,
): Promise<ImportConfig | null | undefined> {
  return new Promise((resolve, reject) => {
    configQueue = configQueue.then(async () => {
      try {
        const data = await readImportConfig();
        const newData = await fn(data);
        if (newData != null) await writeImportConfig(newData);
        resolve(newData);
      } catch (err) {
        reject(err);
      }
    });
  });
}
