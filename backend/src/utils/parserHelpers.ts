import { readImportConfig } from './fileService.js';
import type { Ingredient, SpiceRules } from './fileService.js';

export type RenameRulesMap = Record<string, string>;

/**
 * Convert "1", "0,5", "1 1/2", "1/2", "1½", "½" … → number
 */
export function toNumber(str = ''): number | undefined {
  const unicode: Record<string, number> = { '⅕': 0.2, '¼': 0.25, '⅖': 0.4, '½': 0.5, '⅗': 0.6, '¾': 0.75, '⅘': 0.8 };

  str = str.trim().replace(',', '.');

  // 1 1/2   (mixed fraction with space)
  let m = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);

  // 3/4
  m = str.match(/^(\d+)\/(\d+)$/);
  if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);

  // 1½   /   1¾  …
  m = str.match(/^(\d+)([⅕¼⅖½⅗¾⅘])$/u);
  if (m) return parseInt(m[1], 10) + unicode[m[2]];

  // ½  …
  if (unicode[str] !== undefined) return unicode[str];

  // 1     0.5
  const n = parseFloat(str);
  return isNaN(n) ? undefined : n;
}

export function formatIngredientName(raw = '', renameRules: RenameRulesMap = {}): string {
  const matchArray = raw.match(/^\s*(.+?)\s+\(+\s*([^)]+?)\s*\)+\s*$/);
  if (matchArray) {
    let base = matchArray[1].trim();
    const note = matchArray[2].trim();

    if (renameRules[base]) {
      base = renameRules[base];
    }

    return base ? `${base}, ${note}` : note;
  }

  return renameRules[raw.trim()] || raw.trim();
}

/**
 * Parse a single ingredient line into amount, unit, and name.
 *  – supports decimals with "," or "."
 *  – supports ASCII and Unicode fractions
 *  – keeps everything after the unit together in `name`
 */
export function parseIngredientLine(text = '', renameRules: RenameRulesMap = {}): Ingredient {
  const ingredient: Ingredient = {
    name: '',
    amount: undefined,
    unit: undefined,
    note: undefined, // not split out (current test-suite doesn't expect it)
  };

  let line = text.trim();

  /* ---------- amount ---------- */
  // 1, 0,5, 1 1/2, 1/2, ½, 1½ …
  const amtRe = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+[.,]\d+|\d+[⅕¼⅖½⅗¾⅘]|\d+|[⅕¼⅖½⅗¾⅘])\s*/u;
  const amtMatch = line.match(amtRe);
  if (amtMatch) {
    ingredient.amount = toNumber(amtMatch[1]);
    line = line.slice(amtMatch[0].length);
  }

  /* ---------- unit ---------- */
  // letters only – stops before first space
  const unitMatch = line.match(/^([A-Za-zÄÖÜäöü]+)\s+/);
  if (unitMatch) {
    ingredient.unit = unitMatch[1];
    line = line.slice(unitMatch[0].length);
  }

  ingredient.name = formatIngredientName(line, renameRules);
  return ingredient;
}

/**
 * Turns raw ingredient strings into our Ingredient shape,
 * attempting to extract amounts and units.
 */
export function parseIngredients(rawIngredients: string[] = [], renameRules: RenameRulesMap = {}): Ingredient[] {
  return rawIngredients.map((line) => parseIngredientLine(line, renameRules));
}

export function parseSpiceFromIngredient(
  ingredient: Ingredient | undefined,
  spice_rules: SpiceRules | Record<string, never> = {},
): string | string[] | undefined {
  if (!ingredient) return;
  if (ingredient.name === '') return;
  if (ingredient.amount !== undefined) return;
  if (ingredient.unit !== undefined) return;
  if (ingredient.note !== undefined) return;

  const spices = (spice_rules as SpiceRules).spices || [];
  const spiceMap = (spice_rules as SpiceRules).spice_map || {};

  const isSpice = spices.includes(ingredient.name);
  if (isSpice) {
    return ingredient.name;
  }

  return spiceMap[ingredient.name];
}

export async function parseSpicesAndIngredients(
  rawIngredients: string[] = [],
  renameRules: RenameRulesMap = {},
): Promise<{ spices: string[]; ingredients: Ingredient[] }> {
  const ingredients = parseIngredients(rawIngredients, renameRules);
  const spices: string[] = [];
  const { spice_rules } = await readImportConfig();
  for (let i = ingredients.length - 1; i >= 0; i--) {
    const spice = parseSpiceFromIngredient(ingredients[i], spice_rules);
    if (spice) {
      Array.isArray(spice) ? spices.push(...spice) : spices.push(spice);
      ingredients.splice(i, 1);
    }
  }

  return { spices, ingredients };
}

interface HowToStep {
  '@type'?: string;
  text?: string;
  itemListElement?: Array<string | { text?: string }>;
}

/**
 * Turns JSON-LD recipeInstructions into an array of strings
 */
export function parseInstructions(rawInstructions: string | Array<string | HowToStep> = []): string[] {
  if (typeof rawInstructions === 'string') {
    return rawInstructions
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }
  if (Array.isArray(rawInstructions)) {
    return rawInstructions
      .map((step) => {
        if (typeof step === 'string') return step.trim();
        if (step.text) return step.text.trim();
        if (step['@type'] === 'HowToSection' && Array.isArray(step.itemListElement)) {
          return step.itemListElement
            .map((si) => (typeof si === 'string' ? si : si.text || ''))
            .join(' ')
            .trim();
        }
        return '';
      })
      .filter(Boolean);
  }
  return [];
}

export async function loadRenameRules(): Promise<RenameRulesMap> {
  const rules: RenameRulesMap = {};
  const config = await readImportConfig();

  (config.rename_rules || []).forEach((rule) => {
    rule.from.forEach((f) => (rules[f] = rule.to));
  });

  return rules;
}
