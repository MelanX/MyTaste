jest.mock('../utils/fileService');

const request = require('supertest');
const fileService = require('../utils/fileService');
const { makeApp } = require('./testUtils');

const app = makeApp();
const agent = request(app);

const seedRecipes = [
    {
        id: 'r1',
        title: 'Kuchen',
        url: '',
        image: '',
        ingredient_sections: [ {
            ingredients: [
                { name: 'Mehl', amount: 200, unit: 'g' },
                { name: 'Zucker', amount: 100, unit: 'g' },
            ]
        } ],
        spices: [ 'Salz' ],
        instructions: [],
        status: { favorite: false, cookState: false },
    },
    {
        id: 'r2',
        title: 'Brot',
        url: '',
        image: '',
        ingredient_sections: [ {
            ingredients: [
                { name: 'Mehl', amount: 300, unit: 'g' },
                { name: 'Wasser', amount: 250, unit: 'ml' },
            ]
        } ],
        spices: [ 'Salz' ],
        instructions: [],
        status: { favorite: false, cookState: false },
    },
    {
        id: 'r3',
        title: 'Nudeln',
        url: '',
        image: '',
        ingredient_sections: [ {
            ingredients: [
                { name: 'mehl', amount: 100, unit: 'g' },
                { name: 'Mehl', amount: 50, unit: 'kg' },
            ]
        } ],
        spices: [],
        instructions: [],
        status: { favorite: false, cookState: false },
    },
];

beforeEach(() => {
    fileService.__setRecipeData({ recipes: seedRecipes });
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
        const salzItems = items.filter(i => i.itemId === 'Salz');
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
        const spice = res.body.items.find(i => i.itemId === 'Salz');
        expect(spice).toBeDefined();
        expect(spice.stock).toBe(true);
        expect(spice.spec).toBeUndefined();
    });

    it('each unique {name, unit} pair appears at most once', async () => {
        const res = await agent.get('/api/bring-bulk?ids=r1,r2');
        expect(res.status).toBe(200);
        const items = res.body.items.filter(i => !i.stock);
        const keys = items.map(i => `${ i.itemId }\0${ i.spec ?? '' }`);
        const uniqueKeys = new Set(keys);
        expect(keys.length).toBe(uniqueKeys.size);
    });
});
