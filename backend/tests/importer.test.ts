import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

vi.mock('axios');
vi.mock('../src/utils/fileService.js');

import axios from 'axios';
import * as fileService from '../src/utils/fileService.js';
import { extractRecipeLd, importGeneric } from '../src/utils/importer.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');
const mockedAxios = vi.mocked(axios, true);

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8');

beforeEach(() => {
  fs.__setImportConfig({
    rename_rules: [],
    spice_rules: { spices: ['Salz', 'Pfeffer'], spice_map: {} },
    bring_rules: [],
  });
});

describe('extractRecipeLd()', () => {
  it('extracts the Recipe from an @graph block', () => {
    const ld = extractRecipeLd(fixture('jsonld-graph.html'));
    expect(ld?.name).toBe('Saftiger Schokokuchen');
  });

  it('extracts the Recipe from a top-level array', () => {
    const ld = extractRecipeLd(fixture('jsonld-array.html'));
    expect(ld?.name).toBe('Tomatensuppe');
  });

  it('extracts a single Recipe object', () => {
    const ld = extractRecipeLd(fixture('jsonld-single.html'));
    expect(ld?.name).toBe('Pfannkuchen');
  });

  it('returns null when no Recipe JSON-LD exists (and ignores malformed JSON)', () => {
    expect(extractRecipeLd(fixture('no-jsonld.html'))).toBeNull();
  });
});

describe('importGeneric() URL validation', () => {
  it.each([['ftp://example.com/file'], ['file:///etc/passwd']])('rejects non-http(s) protocol: %s', async (url) => {
    await expect(importGeneric(url)).rejects.toThrow('Only http and https URLs are allowed.');
  });

  it.each([
    ['http://localhost/x'],
    ['http://api.localhost/x'],
    ['http://127.0.0.1/x'],
    ['http://10.1.2.3/x'],
    ['http://192.168.0.1/x'],
    ['http://169.254.169.254/x'],
  ])('rejects private/loopback host: %s', async (url) => {
    await expect(importGeneric(url)).rejects.toThrow('Requests to private addresses are not allowed.');
  });
});

describe('importGeneric() via JSON-LD', () => {
  it('parses an @graph recipe (image array, mixed instructions, spice extraction)', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('jsonld-graph.html') });

    const recipe = await importGeneric('https://example.com/schokokuchen');

    expect(recipe.title).toBe('Saftiger Schokokuchen');
    expect(recipe.url).toBe('https://example.com/schokokuchen');
    expect(recipe.image).toBe('https://example.com/cake-1.jpg');
    expect(recipe.instructions).toEqual([
      'Ofen auf 180 Grad vorheizen.',
      'Alle Zutaten verrühren.',
      'In die Form geben. 30 Minuten backen.',
    ]);
    expect(recipe.spices).toContain('Salz');
    const names = recipe.ingredient_sections[0].ingredients.map((i) => i.name);
    expect(names).toEqual(['Mehl', 'Backpulver', 'Zucker', 'Eier']);
  });

  it('unwraps an ImageObject and splits a string instruction', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('jsonld-array.html') });

    const recipe = await importGeneric('https://example.com/suppe');
    expect(recipe.image).toBe('https://example.com/soup.jpg');
    expect(recipe.instructions).toEqual(['Tomaten schneiden.', 'Zwiebel anbraten.', 'Alles köcheln lassen.']);
    expect(recipe.spices).toContain('Pfeffer');
  });

  it('handles a plain string image', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('jsonld-single.html') });
    const recipe = await importGeneric('https://example.com/pfannkuchen');
    expect(recipe.image).toBe('https://example.com/pancake.jpg');
    expect(recipe.ingredient_sections[0].ingredients.map((i) => i.name)).toEqual(['Mehl', 'Milch']);
  });
});

describe('importGeneric() custom-parser fallback', () => {
  it('routes leckerabnehmen.com through the paragraph parser', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('leckerabnehmen.html') });

    const recipe = await importGeneric('https://leckerabnehmen.com/protein-pancakes');
    expect(recipe.title).toBe('Protein Pancakes');
    expect(recipe.image).toBe('https://leckerabnehmen.com/img/pancakes.jpg');
    expect(recipe.instructions).toEqual([
      'Alle Zutaten vermengen.',
      'In einer Pfanne von beiden Seiten anbraten.',
      'Mit Früchten servieren.',
    ]);
    const names = recipe.ingredient_sections[0].ingredients.map((i) => i.name);
    expect(names).toEqual(['Haferflocken', 'Eier', 'Banane', 'Zimt']);
  });

  it('routes lilya.momycooks.com through the list parser (ol instructions)', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('lilya-momycooks.html') });

    const recipe = await importGeneric('https://lilya.momycooks.com/linsencurry');
    expect(recipe.title).toBe('Linsencurry');
    expect(recipe.instructions).toEqual(['Zwiebel anbraten.', 'Linsen und Kokosmilch hinzufügen.', '20 Minuten köcheln lassen.']);
    expect(recipe.spices).toContain('Salz');
    const names = recipe.ingredient_sections[0].ingredients.map((i) => i.name);
    expect(names).toEqual(['rote Linsen', 'Kokosmilch', 'Zwiebel']);
  });

  it('falls back to paragraph instructions when no ol/ul present', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('lilya-paragraph-instructions.html') });

    const recipe = await importGeneric('https://lilya.momycooks.com/bowl');
    expect(recipe.title).toBe('Schnelle Bowl');
    expect(recipe.image).toBe('https://lilya.momycooks.com/img/bowl.jpg');
    expect(recipe.instructions).toEqual(['Reis kochen.', 'Avocado schneiden und anrichten.']);
  });

  it('throws for an unsupported site without JSON-LD', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: fixture('no-jsonld.html') });
    await expect(importGeneric('https://unknown-site.example/recipe')).rejects.toThrow('Unsupported Website');
  });
});
