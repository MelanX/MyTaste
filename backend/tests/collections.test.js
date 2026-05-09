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
    fileService.__setCollectionsData({ nextUp: [] });
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
        fileService.__setCollectionsData({ nextUp: [ 'r1' ] });
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
