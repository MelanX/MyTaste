import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/utils/fileService.js');

import request from 'supertest';
import * as fileService from '../src/utils/fileService.js';
import { makeApp } from './testUtils.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');

const app = makeApp();
const agent = request(app);

const seedRecipes = [
  {
    id: 'r1',
    title: 'Kuchen',
    url: '',
    image: '',
    ingredient_sections: [
      {
        ingredients: [
          { name: 'Mehl', amount: 200, unit: 'g' },
          { name: 'Zucker', amount: 100, unit: 'g' },
        ],
      },
    ],
    spices: ['Salz'],
    instructions: [],
    status: { favorite: false, cookState: false },
  },
  {
    id: 'r2',
    title: 'Brot',
    url: '',
    image: '',
    ingredient_sections: [
      {
        ingredients: [
          { name: 'Mehl', amount: 300, unit: 'g' },
          { name: 'Wasser', amount: 250, unit: 'ml' },
        ],
      },
    ],
    spices: ['Salz'],
    instructions: [],
    status: { favorite: false, cookState: false },
  },
  {
    id: 'r3',
    title: 'Nudeln',
    url: '',
    image: '',
    ingredient_sections: [
      {
        ingredients: [
          { name: 'mehl', amount: 100, unit: 'g' },
          { name: 'Mehl', amount: 50, unit: 'kg' },
        ],
      },
    ],
    spices: [],
    instructions: [],
    status: { favorite: false, cookState: false },
  },
];

beforeEach(() => {
  fs.__setRecipeData({ recipes: seedRecipes } as never);
  fs.__setImportConfig({ bring_rules: [], rename_rules: [], spice_rules: { spices: [], spice_map: {} } });
});

describe('GET /api/bring-bulk', () => {
  it('returns 400 when ids param is missing', async () => {
    const res = await agent.get('/api/bring-bulk');
    expect(res.status).toBe(400);
  });

  it('returns 400 when ids param is empty string', async () => {
    const res = await agent.get('/api/bring-bulk?ids=');
    expect(res.status).toBe(400);
  });

  it('returns 404 when any ID does not exist', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1,unknown');
    expect(res.status).toBe(404);
  });

  it('returns correct items for a single recipe', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ author: 'MelanX', name: 'Next Up' });
    const items = res.body.items;
    expect(items).toContainEqual({ itemId: 'Mehl', spec: '200 g' });
    expect(items).toContainEqual({ itemId: 'Zucker', spec: '100 g' });
    expect(items).toContainEqual({ itemId: 'Salz', stock: true });
  });

  it('sums amounts for same name+unit across recipes (r1+r2)', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1,r2');
    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items).toContainEqual({ itemId: 'Mehl', spec: '500 g' });
    expect(items).toContainEqual({ itemId: 'Zucker', spec: '100 g' });
    expect(items).toContainEqual({ itemId: 'Wasser', spec: '250 ml' });
    // Salz appears in both r1 and r2 but should be deduplicated
    const salzItems = items.filter((i: { itemId: string }) => i.itemId === 'Salz');
    expect(salzItems).toHaveLength(1);
    expect(salzItems[0]).toEqual({ itemId: 'Salz', stock: true });
  });

  it('does not merge case-differing names or different units (r1+r3)', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1,r3');
    expect(res.status).toBe(200);
    const items = res.body.items;
    // Mehl 200g from r1 (unchanged — r3 has mehl g and Mehl kg, not Mehl g)
    expect(items).toContainEqual({ itemId: 'Mehl', spec: '200 g' });
    // mehl 100g from r3 — case-sensitive, separate
    expect(items).toContainEqual({ itemId: 'mehl', spec: '100 g' });
    // Mehl 50kg from r3 — different unit, separate
    expect(items).toContainEqual({ itemId: 'Mehl', spec: '50 kg' });
  });

  it('shows three separate Mehl rows for r2+r3', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r2,r3');
    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items).toContainEqual({ itemId: 'Mehl', spec: '300 g' });
    expect(items).toContainEqual({ itemId: 'mehl', spec: '100 g' });
    expect(items).toContainEqual({ itemId: 'Mehl', spec: '50 kg' });
  });

  it('has correct response shape', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('author', 'MelanX');
    expect(res.body).toHaveProperty('name', 'Next Up');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('spice items have stock:true and no spec field', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1');
    expect(res.status).toBe(200);
    const spice = res.body.items.find((i: { itemId: string }) => i.itemId === 'Salz');
    expect(spice).toBeDefined();
    expect(spice.stock).toBe(true);
    expect(spice.spec).toBeUndefined();
  });

  it('each unique {name, unit} pair appears at most once', async () => {
    const res = await agent.get('/api/bring-bulk?ids=r1,r2');
    expect(res.status).toBe(200);
    const items = res.body.items.filter((i: { stock?: boolean }) => !i.stock);
    const keys = items.map((i: { itemId: string; spec?: string }) => `${i.itemId}\0${i.spec ?? ''}`);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });
});

describe('GET /api/bring-recipe with bring_rules normalization', () => {
  const mixedRecipe = {
    id: 'mix1',
    title: 'Käsekuchen',
    url: '',
    image: '',
    ingredient_sections: [
      { ingredients: [{ name: 'Ei', amount: 1, unit: 'Stück' }] },
      { ingredients: [{ name: 'Eier', amount: 3, unit: 'Stück' }] },
    ],
    spices: [],
    instructions: [],
    status: { favorite: false, cookState: false },
  };

  beforeEach(() => {
    fs.__setRecipeData({ recipes: [mixedRecipe] } as never);
    fs.__setImportConfig({
      bring_rules: [{ from: ['Ei'], to: 'Eier' }],
      rename_rules: [],
      spice_rules: { spices: [], spice_map: {} },
    });
  });

  it('merges "Ei" and "Eier" within the same recipe', async () => {
    const res = await agent.get('/api/bring-recipe/mix1');
    expect(res.status).toBe(200);
    const items = res.body.items;
    const eierItem = items.find((i: { itemId: string }) => i.itemId === 'Eier');
    expect(eierItem).toBeDefined();
    expect(eierItem.spec).toBe('4 Stück');
    expect(items.find((i: { itemId: string }) => i.itemId === 'Ei')).toBeUndefined();
  });

  it('without bring_rules, Ei and Eier in same recipe stay separate', async () => {
    fs.__setImportConfig({ bring_rules: [], rename_rules: [], spice_rules: { spices: [], spice_map: {} } });
    const res = await agent.get('/api/bring-recipe/mix1');
    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items.find((i: { itemId: string }) => i.itemId === 'Ei')).toBeDefined();
    expect(items.find((i: { itemId: string }) => i.itemId === 'Eier')).toBeDefined();
  });
});

describe('GET /api/bring-bulk with bring_rules normalization', () => {
  const eierRecipe = {
    id: 'egg1',
    title: 'Eierkuchen',
    url: '',
    image: '',
    ingredient_sections: [{ ingredients: [{ name: 'Eier', amount: 2, unit: 'Stück' }] }],
    spices: [],
    instructions: [],
    status: { favorite: false, cookState: false },
  };
  const eiRecipe = {
    id: 'egg2',
    title: 'Rührei',
    url: '',
    image: '',
    ingredient_sections: [{ ingredients: [{ name: 'Ei', amount: 3, unit: 'Stück' }] }],
    spices: [],
    instructions: [],
    status: { favorite: false, cookState: false },
  };

  beforeEach(() => {
    fs.__setRecipeData({ recipes: [eierRecipe, eiRecipe] } as never);
    fs.__setImportConfig({
      bring_rules: [{ from: ['Ei'], to: 'Eier' }],
      rename_rules: [],
      spice_rules: { spices: [], spice_map: {} },
    });
  });

  it('normalizes "Ei" to "Eier" and merges amounts', async () => {
    const res = await agent.get('/api/bring-bulk?ids=egg1,egg2');
    expect(res.status).toBe(200);
    const items = res.body.items;
    const eierItem = items.find((i: { itemId: string }) => i.itemId === 'Eier');
    expect(eierItem).toBeDefined();
    expect(eierItem.spec).toBe('5 Stück');
    // "Ei" should not appear as a separate item
    expect(items.find((i: { itemId: string }) => i.itemId === 'Ei')).toBeUndefined();
  });

  it('does not duplicate "Eier" when recipe already uses canonical name', async () => {
    const res = await agent.get('/api/bring-bulk?ids=egg1');
    expect(res.status).toBe(200);
    const eierItems = res.body.items.filter((i: { itemId: string }) => i.itemId === 'Eier');
    expect(eierItems).toHaveLength(1);
    expect(eierItems[0].spec).toBe('2 Stück');
  });

  it('without bring_rules, Ei and Eier remain separate', async () => {
    fs.__setImportConfig({ bring_rules: [], rename_rules: [], spice_rules: { spices: [], spice_map: {} } });
    const res = await agent.get('/api/bring-bulk?ids=egg1,egg2');
    expect(res.status).toBe(200);
    const items = res.body.items;
    expect(items.find((i: { itemId: string }) => i.itemId === 'Eier')).toBeDefined();
    expect(items.find((i: { itemId: string }) => i.itemId === 'Ei')).toBeDefined();
  });
});
