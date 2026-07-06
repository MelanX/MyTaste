import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/utils/fileService.js');

import request from 'supertest';
import * as fileService from '../src/utils/fileService.js';
import { recipeTags } from '../src/routes/pdf.js';
import { makeApp } from './testUtils.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');

const app = makeApp();
const agent = request(app);

const seedRecipes = [
  {
    id: 'r1',
    title: 'Kartoffelsuppe',
    url: 'https://example.com/orig',
    image: '', // empty -> no image fetch, keeps the test offline
    ingredient_sections: [
      {
        title: 'Suppe',
        ingredients: [
          { name: 'Kartoffeln', amount: 2, unit: 'kg', note: 'mehlig' },
          { name: 'Suppengrün', amount: 1, unit: 'Bund' },
        ],
      },
    ],
    spices: ['Salz', 'Pfeffer'],
    instructions: ['**Kartoffeln** schälen und schneiden.', 'Alles kochen.'],
    status: { favorite: false, cookState: false },
  },
];

// Collect the binary response body into a Buffer (supertest has no PDF parser).
const collectPdf = (path: string) =>
  agent
    .get(path)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });

beforeEach(() => {
  fs.__setRecipeData({ recipes: seedRecipes } as never);
});

describe('GET /api/recipe/:id/pdf', () => {
  it('returns a PDF for an existing recipe', async () => {
    const res = await collectPdf('/api/recipe/r1/pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
    expect((res.body as Buffer).length).toBeGreaterThan(0);
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('returns 404 for an unknown recipe', async () => {
    const res = await agent.get('/api/recipe/does-not-exist/pdf');
    expect(res.status).toBe(404);
  });

  it('embeds Indie Flower (the app title font) so the PDF title matches the app', async () => {
    const res = await collectPdf('/api/recipe/r1/pdf');
    expect(res.status).toBe(200);
    // pdfkit subsets embedded fonts as `XXXXXX+IndieFlower`; the base name survives.
    expect((res.body as Buffer).toString('latin1')).toContain('IndieFlower');
  });
});

describe('recipeTags', () => {
  it('maps recipe type + dietary codes to German labels, type first', () => {
    const tags = recipeTags({ recipeType: 'cooking', dietaryRestrictions: ['vegan', 'dairyfree', 'vegetarian'] } as never);
    expect(tags).toEqual([
      { label: 'Kochen', kind: 'type' },
      { label: 'Vegan', kind: 'dietary' },
      { label: 'Laktosefrei', kind: 'dietary' },
      { label: 'Vegetarisch', kind: 'dietary' },
    ]);
  });

  it('returns [] when no type or dietary restrictions are set', () => {
    expect(recipeTags({} as never)).toEqual([]);
  });

  it('passes unknown codes through unchanged', () => {
    expect(recipeTags({ recipeType: 'grill', dietaryRestrictions: ['nutfree'] } as never)).toEqual([
      { label: 'grill', kind: 'type' },
      { label: 'nutfree', kind: 'dietary' },
    ]);
  });
});
