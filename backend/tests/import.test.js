jest.mock('../utils/importer', () => ({
    importGeneric: jest.fn(),
}));

const { importGeneric } = require('../utils/importer');
const request = require('supertest');
const { makeApp, authHeader } = require('./testUtils');
const app = makeApp();

describe('Import route', () => {
    const endpoint = '/api/import';
    const goodBody = { url: 'https://example.com/recipe' };

    it('401 when user is not authenticated', async () => {
        const res = await request(app).post(endpoint).send(goodBody);
        expect(res.status).toBe(401);
    });

    it('400 when body fails validation', async () => {
        const res = await request(app)
            .post(endpoint)
            .set(authHeader())
            .send({});                              // missing url
        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Validation failed');
    });

    it('400 when importer throws', async () => {
        importGeneric.mockRejectedValueOnce(new Error('Parse failed'));

        const res = await request(app)
            .post(endpoint)
            .set(authHeader())
            .send(goodBody);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Import failed');
        expect(importGeneric).toHaveBeenCalledWith(goodBody.url);
    });

    it('200 and returns recipe on success', async () => {
        const fakeRecipe = { id: '123', title: 'Imported' };
        importGeneric.mockResolvedValueOnce(fakeRecipe);

        const res = await request(app)
            .post(endpoint)
            .set(authHeader())
            .send(goodBody);

        expect(res.status).toBe(200);
        expect(res.body).toEqual(fakeRecipe);
    });
});
