import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/utils/fileService.js');

import * as fileService from '../src/utils/fileService.js';
import {
  toNumber,
  formatIngredientName,
  parseIngredientLine,
  parseIngredients,
  parseSpiceFromIngredient,
  parseSpicesAndIngredients,
  parseInstructions,
  loadRenameRules,
} from '../src/utils/parserHelpers.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');

beforeEach(() => {
  fs.__setImportConfig({
    rename_rules: [],
    spice_rules: { spices: [], spice_map: {} },
    bring_rules: [],
  });
});

describe('toNumber()', () => {
  const cases: Array<[string, number | undefined]> = [
    ['1', 1],
    ['0,5', 0.5],
    ['0.5', 0.5],
    ['1 1/2', 1.5],
    ['3/4', 0.75],
    ['1½', 1.5],
    ['½', 0.5],
    ['¼', 0.25],
    ['⅘', 0.8],
    ['', undefined],
    ['abc', undefined],
  ];
  it.each(cases)('toNumber("%s") === %s', (input, expected) => {
    expect(toNumber(input)).toBe(expected);
  });

  it('defaults to empty string', () => {
    expect(toNumber()).toBeUndefined();
  });
});

describe('formatIngredientName()', () => {
  it('splits a parenthesised note into "base, note"', () => {
    expect(formatIngredientName('Mehl (gesiebt)')).toBe('Mehl, gesiebt');
  });

  it('applies rename rules to the base part', () => {
    expect(formatIngredientName('Zucker (braun)', { Zucker: 'Rohrzucker' })).toBe('Rohrzucker, braun');
  });

  it('renames a plain name', () => {
    expect(formatIngredientName('Foo', { Foo: 'Bar' })).toBe('Bar');
  });

  it('renames the base and keeps the note', () => {
    expect(formatIngredientName('Tomate (geschält)', { Tomate: 'Tomaten' })).toBe('Tomaten, geschält');
  });

  it('trims a plain name with no rename', () => {
    expect(formatIngredientName('  Salz  ')).toBe('Salz');
  });
});

describe('parseIngredients()', () => {
  it('maps each raw line', () => {
    const out = parseIngredients(['1 kg Zucker', 'Salz']);
    expect(out).toEqual([
      { name: 'Zucker', amount: 1, unit: 'kg', note: undefined },
      { name: 'Salz', amount: undefined, unit: undefined, note: undefined },
    ]);
  });

  it('defaults to empty array', () => {
    expect(parseIngredients()).toEqual([]);
  });

  it('uses rename rules', () => {
    const out = parseIngredients(['200 g Mehl'], { Mehl: 'Weizenmehl' });
    expect(out[0].name).toBe('Weizenmehl');
  });
});

describe('parseSpiceFromIngredient()', () => {
  it('returns undefined for missing ingredient', () => {
    expect(parseSpiceFromIngredient(undefined)).toBeUndefined();
  });

  it('returns undefined for empty name', () => {
    expect(parseSpiceFromIngredient({ name: '' })).toBeUndefined();
  });

  it('returns undefined when an amount is present', () => {
    expect(parseSpiceFromIngredient({ name: 'Salz', amount: 1 }, { spices: ['Salz'] })).toBeUndefined();
  });

  it('returns undefined when a unit is present', () => {
    expect(parseSpiceFromIngredient({ name: 'Salz', unit: 'g' }, { spices: ['Salz'] })).toBeUndefined();
  });

  it('returns undefined when a note is present', () => {
    expect(parseSpiceFromIngredient({ name: 'Salz', note: 'fein' }, { spices: ['Salz'] })).toBeUndefined();
  });

  it('matches a plain spice', () => {
    expect(parseSpiceFromIngredient({ name: 'Pfeffer' }, { spices: ['Pfeffer'] })).toBe('Pfeffer');
  });

  it('maps an alias via spice_map', () => {
    expect(
      parseSpiceFromIngredient(
        { name: 'Salz und Pfeffer' },
        { spices: ['Salz', 'Pfeffer'], spice_map: { 'Salz und Pfeffer': ['Salz', 'Pfeffer'] } },
      ),
    ).toEqual(['Salz', 'Pfeffer']);
  });

  it('returns undefined for an unknown name', () => {
    expect(parseSpiceFromIngredient({ name: 'Banane' }, { spices: ['Salz'] })).toBeUndefined();
  });

  it('tolerates empty spice_rules', () => {
    expect(parseSpiceFromIngredient({ name: 'Salz' }, {})).toBeUndefined();
  });
});

describe('parseSpicesAndIngredients()', () => {
  it('separates spices from real ingredients', async () => {
    fs.__setImportConfig({
      rename_rules: [],
      spice_rules: { spices: ['Salz', 'Pfeffer'], spice_map: {} },
      bring_rules: [],
    });

    const { spices, ingredients } = await parseSpicesAndIngredients(['200 g Mehl', 'Salz', 'Pfeffer', '2 Eier']);

    expect(spices.sort()).toEqual(['Pfeffer', 'Salz']);
    expect(ingredients.map((i) => i.name)).toEqual(['Mehl', 'Eier']);
  });

  it('flattens single-word spice_map aliases into the spice list', async () => {
    // NOTE: the line parser strips a leading word as a "unit", so only
    // single-token alias names survive intact as an ingredient name.
    fs.__setImportConfig({
      rename_rules: [],
      spice_rules: { spices: ['Salz', 'Pfeffer'], spice_map: { Würzmischung: ['Salz', 'Pfeffer'] } },
      bring_rules: [],
    });

    const { spices, ingredients } = await parseSpicesAndIngredients(['Würzmischung', '1 Zwiebel']);
    expect(spices.sort()).toEqual(['Pfeffer', 'Salz']);
    expect(ingredients.map((i) => i.name)).toEqual(['Zwiebel']);
  });

  it('defaults to empty input', async () => {
    const { spices, ingredients } = await parseSpicesAndIngredients();
    expect(spices).toEqual([]);
    expect(ingredients).toEqual([]);
  });
});

describe('parseInstructions()', () => {
  it('returns [] for unexpected input type', () => {
    expect(parseInstructions(undefined as never)).toEqual([]);
    expect(parseInstructions(42 as never)).toEqual([]);
  });

  it('handles string arrays', () => {
    expect(parseInstructions(['  a ', 'b'])).toEqual(['a', 'b']);
  });

  it('handles plain string steps mixed with HowToStep', () => {
    expect(parseInstructions(['erst', { '@type': 'HowToStep', text: 'dann' }])).toEqual(['erst', 'dann']);
  });

  it('filters out empty entries', () => {
    expect(parseInstructions(['', { '@type': 'HowToStep' }, 'x'])).toEqual(['x']);
  });

  it('joins HowToSection itemListElement of plain strings', () => {
    expect(parseInstructions([{ '@type': 'HowToSection', itemListElement: ['a', 'b'] }])).toEqual(['a b']);
  });
});

describe('loadRenameRules()', () => {
  it('flattens rename_rules into a from→to map', async () => {
    fs.__setImportConfig({
      rename_rules: [
        { from: ['A', 'B'], to: 'Alpha' },
        { from: ['C'], to: 'Gamma' },
      ],
      spice_rules: { spices: [], spice_map: {} },
      bring_rules: [],
    });

    const rules = await loadRenameRules();
    expect(rules).toEqual({ A: 'Alpha', B: 'Alpha', C: 'Gamma' });
  });

  it('returns {} when there are no rules', async () => {
    fs.__setImportConfig({ spice_rules: { spices: [], spice_map: {} }, bring_rules: [] });
    expect(await loadRenameRules()).toEqual({});
  });
});
