jest.mock('../utils/fileService');

const request = require('supertest');
const fileService = require('../utils/fileService');
const { makeApp, authHeader } = require('./testUtils');

const app = makeApp();
const agent = request(app);

beforeEach(() => {
    fileService.__setRecipeData({
        recipes: [
            {
                id: 'r1',
                title: 'Kuchen',
                url: '',
                image: '',
                ingredient_sections: [ { ingredients: [ { name: 'Mehl', amount: 200, unit: 'g' } ] } ],
                spices: [],
                instructions: [],
                status: { favorite: false, cookState: false },
            },
        ],
    });
    fileService.__setCollectionsData({ nextUp: [], collections: [] });
});

describe('GET /api/collections/next-up', () => {
    it('returns 200 with empty list', async () => {
        const res = await agent.get('/api/collections/next-up');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ nextUp: [] });
    });

    it('returns current IDs after adds', async () => {
        fileService.__setCollectionsData({ nextUp: [ 'r1' ] });
        const res = await agent.get('/api/collections/next-up');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ nextUp: [ 'r1' ] });
    });
});

describe('POST /api/collections/next-up/:id', () => {
    it('returns 401 without token', async () => {
        const res = await agent.post('/api/collections/next-up/r1');
        expect(res.status).toBe(401);
    });

    it('returns 403 with bad token', async () => {
        const res = await agent
            .post('/api/collections/next-up/r1')
            .set('Authorization', 'Bearer badtoken');
        expect(res.status).toBe(403);
    });

    it('adds the ID and returns updated list', async () => {
        const res = await agent
            .post('/api/collections/next-up/r1')
            .set(authHeader());
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ nextUp: [ 'r1' ] });
    });

    it('is idempotent — adding the same ID twice keeps only one entry', async () => {
        await agent.post('/api/collections/next-up/r1').set(authHeader());
        const res = await agent.post('/api/collections/next-up/r1').set(authHeader());
        expect(res.status).toBe(200);
        expect(res.body.nextUp).toEqual([ 'r1' ]);
    });

    it('returns 404 when the recipe ID does not exist', async () => {
        const res = await agent
            .post('/api/collections/next-up/nonexistent')
            .set(authHeader());
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/collections/next-up/:id', () => {
    beforeEach(() => {
        fileService.__setCollectionsData({ nextUp: [ 'r1' ] });
    });

    it('returns 401 without token', async () => {
        const res = await agent.delete('/api/collections/next-up/r1');
        expect(res.status).toBe(401);
    });

    it('returns 403 with bad token', async () => {
        const res = await agent
            .delete('/api/collections/next-up/r1')
            .set('Authorization', 'Bearer badtoken');
        expect(res.status).toBe(403);
    });

    it('removes the ID and returns updated list', async () => {
        const res = await agent
            .delete('/api/collections/next-up/r1')
            .set(authHeader());
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ nextUp: [] });
    });

    it('returns 404 when the ID is not in the list', async () => {
        const res = await agent
            .delete('/api/collections/next-up/notinlist')
            .set(authHeader());
        expect(res.status).toBe(404);
    });
});

describe('DELETE /api/collections/next-up', () => {
    beforeEach(() => {
        fileService.__setCollectionsData({ nextUp: [ 'r1' ], collections: [] });
    });

    it('returns 401 without token', async () => {
        const res = await agent.delete('/api/collections/next-up');
        expect(res.status).toBe(401);
    });

    it('returns 403 with bad token', async () => {
        const res = await agent
            .delete('/api/collections/next-up')
            .set('Authorization', 'Bearer badtoken');
        expect(res.status).toBe(403);
    });

    it('clears the list and returns empty nextUp', async () => {
        const res = await agent
            .delete('/api/collections/next-up')
            .set(authHeader());
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ nextUp: [] });
    });
});

const seedCollection = (overrides = {}) => ({
    id: 'c1',
    name: 'Sunday Dinners',
    recipeIds: [],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
});

describe('Named Collections', () => {
    describe('GET /api/collections', () => {
        it('returns 200 with empty list', async () => {
            const res = await agent.get('/api/collections');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ collections: [] });
        });

        it('returns existing collections', async () => {
            fileService.__setCollectionsData({ nextUp: [], collections: [ seedCollection() ] });
            const res = await agent.get('/api/collections');
            expect(res.status).toBe(200);
            expect(res.body.collections).toHaveLength(1);
            expect(res.body.collections[0].name).toBe('Sunday Dinners');
        });
    });

    describe('POST /api/collections', () => {
        it('returns 401 without token', async () => {
            const res = await agent.post('/api/collections').send({ name: 'Test' });
            expect(res.status).toBe(401);
        });

        it('returns 403 with bad token', async () => {
            const res = await agent.post('/api/collections').send({ name: 'Test' })
                .set('Authorization', 'Bearer badtoken');
            expect(res.status).toBe(403);
        });

        it('creates a collection with id, recipeIds, createdAt, updatedAt', async () => {
            const res = await agent.post('/api/collections').send({ name: 'Weeknights' }).set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections).toHaveLength(1);
            const c = res.body.collections[0];
            expect(c.name).toBe('Weeknights');
            expect(c.id).toBeDefined();
            expect(c.recipeIds).toEqual([]);
            expect(c.createdAt).toBeDefined();
            expect(c.updatedAt).toBeDefined();
        });

        it('returns 400 when name is missing', async () => {
            const res = await agent.post('/api/collections').send({}).set(authHeader());
            expect(res.status).toBe(400);
        });
    });

    describe('PATCH /api/collections/:id', () => {
        beforeEach(() => {
            fileService.__setCollectionsData({ nextUp: [], collections: [ seedCollection() ] });
        });

        it('returns 401 without token', async () => {
            const res = await agent.patch('/api/collections/c1').send({ name: 'New' });
            expect(res.status).toBe(401);
        });

        it('returns 403 with bad token', async () => {
            const res = await agent.patch('/api/collections/c1').send({ name: 'New' })
                .set('Authorization', 'Bearer badtoken');
            expect(res.status).toBe(403);
        });

        it('renames the collection and refreshes updatedAt', async () => {
            const res = await agent.patch('/api/collections/c1').send({ name: 'New Name' }).set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections[0].name).toBe('New Name');
            expect(res.body.collections[0].updatedAt).not.toBe('2024-01-01T00:00:00Z');
        });

        it('returns 404 for unknown id', async () => {
            const res = await agent.patch('/api/collections/nope').send({ name: 'X' }).set(authHeader());
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/collections/:id', () => {
        beforeEach(() => {
            fileService.__setCollectionsData({ nextUp: [], collections: [ seedCollection() ] });
        });

        it('returns 401 without token', async () => {
            const res = await agent.delete('/api/collections/c1');
            expect(res.status).toBe(401);
        });

        it('returns 403 with bad token', async () => {
            const res = await agent.delete('/api/collections/c1')
                .set('Authorization', 'Bearer badtoken');
            expect(res.status).toBe(403);
        });

        it('deletes the collection', async () => {
            const res = await agent.delete('/api/collections/c1').set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections).toEqual([]);
        });

        it('returns 404 for unknown id', async () => {
            const res = await agent.delete('/api/collections/nope').set(authHeader());
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/collections/:id/recipes/:recipeId', () => {
        beforeEach(() => {
            fileService.__setCollectionsData({ nextUp: [], collections: [ seedCollection() ] });
        });

        it('returns 401 without token', async () => {
            const res = await agent.post('/api/collections/c1/recipes/r1');
            expect(res.status).toBe(401);
        });

        it('returns 403 with bad token', async () => {
            const res = await agent.post('/api/collections/c1/recipes/r1')
                .set('Authorization', 'Bearer badtoken');
            expect(res.status).toBe(403);
        });

        it('adds recipe to collection and updates updatedAt', async () => {
            const res = await agent.post('/api/collections/c1/recipes/r1').set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections[0].recipeIds).toEqual([ 'r1' ]);
            expect(res.body.collections[0].updatedAt).not.toBe('2024-01-01T00:00:00Z');
        });

        it('is idempotent — adding same recipe twice keeps only one entry', async () => {
            await agent.post('/api/collections/c1/recipes/r1').set(authHeader());
            const res = await agent.post('/api/collections/c1/recipes/r1').set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections[0].recipeIds).toEqual([ 'r1' ]);
        });

        it('returns 404 for unknown recipe', async () => {
            const res = await agent.post('/api/collections/c1/recipes/unknown').set(authHeader());
            expect(res.status).toBe(404);
        });

        it('returns 404 for unknown collection', async () => {
            const res = await agent.post('/api/collections/nope/recipes/r1').set(authHeader());
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/collections/:id/recipes/:recipeId', () => {
        beforeEach(() => {
            fileService.__setCollectionsData({ nextUp: [], collections: [ seedCollection({ recipeIds: [ 'r1' ] }) ] });
        });

        it('returns 401 without token', async () => {
            const res = await agent.delete('/api/collections/c1/recipes/r1');
            expect(res.status).toBe(401);
        });

        it('returns 403 with bad token', async () => {
            const res = await agent.delete('/api/collections/c1/recipes/r1')
                .set('Authorization', 'Bearer badtoken');
            expect(res.status).toBe(403);
        });

        it('removes recipe from collection', async () => {
            const res = await agent.delete('/api/collections/c1/recipes/r1').set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections[0].recipeIds).toEqual([]);
        });

        it('returns 404 when recipe not in collection', async () => {
            const res = await agent.delete('/api/collections/c1/recipes/nothere').set(authHeader());
            expect(res.status).toBe(404);
        });
    });

    describe('DELETE /api/collections/:id/recipes', () => {
        beforeEach(() => {
            fileService.__setCollectionsData({ nextUp: [], collections: [ seedCollection({ recipeIds: [ 'r1' ] }) ] });
        });

        it('returns 401 without token', async () => {
            const res = await agent.delete('/api/collections/c1/recipes');
            expect(res.status).toBe(401);
        });

        it('returns 403 with bad token', async () => {
            const res = await agent.delete('/api/collections/c1/recipes')
                .set('Authorization', 'Bearer badtoken');
            expect(res.status).toBe(403);
        });

        it('clears all recipes in the collection and updates updatedAt', async () => {
            const res = await agent.delete('/api/collections/c1/recipes').set(authHeader());
            expect(res.status).toBe(200);
            expect(res.body.collections[0].recipeIds).toEqual([]);
            expect(res.body.collections[0].updatedAt).not.toBe('2024-01-01T00:00:00Z');
        });

        it('returns 404 for unknown collection', async () => {
            const res = await agent.delete('/api/collections/nope/recipes').set(authHeader());
            expect(res.status).toBe(404);
        });
    });
});
