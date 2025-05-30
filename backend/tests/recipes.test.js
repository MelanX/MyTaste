jest.mock('../utils/fileService');
jest.mock('../utils/importer');

const fileService = require('../utils/fileService');
const request = require('supertest');
const { makeApp, authHeader } = require('./testUtils');

const app = makeApp();
const agent = request(app);

beforeEach(() => {
    fileService.__setRecipeData({
        recipes: [
            {
                id: '1', title: 'Dummy', url: 'https://example.com',
                image: '', ingredients: [ { name: 'Schokolade' } ],
                spices: [ 'Salz' ], instructions: [ 'Iss einfach die Schokolade' ],
                status: { favorite: false, cookState: false }
            }
        ]
    });
});

describe('Recipes endpoints', () => {
    it('GET /recipes returns full collection', async () => {
        const res = await agent.get('/api/recipes');
        expect(res.body.recipes.length).toBeGreaterThan(0);
    });

    it('GET /recipe/:id returns one recipe', async () => {
        const res = await agent.get('/api/recipe/1');
        expect(res.status).toBe(200);
        expect(res.body.id).toBe('1');
    });

    it('GET /recipe/:id 404s for unknown id', async () => {
        const res = await agent.get('/api/recipe/__nope__');
        expect(res.status).toBe(404);
    });

    it('GET /bring-recipe converts data for Bring! app', async () => {
        const res = await agent.get('/api/bring-recipe/1');
        expect(res.body).toHaveProperty('items');
        expect(res.body.items.some((i) => i.itemId === 'Salz' && i.stock)).toBe(true);
    });

    it('POST /recipes without token → 401', async () => {
        const res = await agent.post('/api/recipes').send({ title: 'x' });
        expect(res.status).toBe(401);
    });

    it('POST /recipes with bad token → 403', async () => {
        const res = await agent
            .post('/api/recipes')
            .set('Authorization', 'Bearer badtoken')
            .send({ title: 'x' });
        expect(res.status).toBe(403);
    });

    it('POST /recipes succeeds when authorised', async () => {
        const body = {
            title: 'Test-Recipe',
            url: 'https://ex.com',
            ingredients: [ { name: 'Schokolade' } ],
            spices: [],
            instructions: [ 'Iss die Schokolade' ],
        };
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send(body);
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ title: 'Test-Recipe' });
    });

    it('Rejects recipe without title', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({ url: 'https://ex.com' });
        expect(res.status).toBe(400);
    });
});

describe('DELETE /recipe/:id', () => {
    it('401s without a token', async () => {
        const res = await request(app).delete('/api/recipe/1');
        expect(res.status).toBe(401);
    });

    it('403s with a bad token', async () => {
        const res = await request(app)
            .delete('/api/recipe/1')
            .set('Authorization', 'Bearer invalidtoken');
        expect(res.status).toBe(403);
    });

    it('204s and removes the recipe when authorised', async () => {
        // first ensure the recipe exists
        let getRes = await request(app).get('/api/recipe/1');
        expect(getRes.status).toBe(200);

        // delete it
        const deleteRes = await request(app)
            .delete('/api/recipe/1')
            .set(authHeader());
        expect(deleteRes.status).toBe(204);

        // and now it should be gone
        getRes = await request(app).get('/api/recipe/1');
        expect(getRes.status).toBe(404);
    });

    it('404s for a non-existent id even when authorised', async () => {
        const res = await request(app)
            .delete('/api/recipe/does-not-exist')
            .set(authHeader());
        expect(res.status).toBe(404);
    });

    it('GET /recipes list shrinks after deleting a recipe', async () => {
        // create a new recipe
        const newRecipe = {
            title: 'TempRecipe',
            url: 'https://temp.com',
            ingredients: [ { name: 'TestZutat' } ],
            spices: [],
            instructions: [ 'Do it' ],
        };
        const createRes = await request(app)
            .post('/api/recipes')
            .set(authHeader())
            .send(newRecipe);
        expect(createRes.status).toBe(201);
        const createdId = createRes.body.id;

        // get full list length
        const listBefore = await request(app).get('/api/recipes');
        expect(listBefore.status).toBe(200);
        const countBefore = listBefore.body.recipes.length;

        // delete the new recipe
        const delRes = await request(app)
            .delete(`/api/recipe/${ createdId }`)
            .set(authHeader());
        expect(delRes.status).toBe(204);

        // list length should be one less
        const listAfter = await request(app).get('/api/recipes');
        expect(listAfter.status).toBe(200);
        expect(listAfter.body.recipes.length).toBe(countBefore - 1);
    });

    it('cannot delete twice (second delete → 404)', async () => {
        // create and delete
        const createRes = await request(app)
            .post('/api/recipes')
            .set(authHeader())
            .send({ title: 'DoubleDelete', ingredients: [ { name: 'Test' } ], spices: [], instructions: [ 'Test' ] });
        expect(createRes.status).toBe(201);
        const id = createRes.body.id;

        const firstDel = await request(app)
            .delete(`/api/recipe/${ id }`)
            .set(authHeader());
        expect(firstDel.status).toBe(204);

        // second delete should 404
        const secondDel = await request(app)
            .delete(`/api/recipe/${ id }`)
            .set(authHeader());
        expect(secondDel.status).toBe(404);
    });

    it('DELETE /recipe/:id does not accidentally delete other recipes', async () => {
        // create two recipes
        const resA = await request(app)
            .post('/api/recipes')
            .set(authHeader())
            .send({
                title: 'Delete',
                ingredients: [ { name: 'Foo' } ],
                spices: [],
                instructions: [ 'Step A' ],
            });
        expect(resA.status).toBe(201);
        const idA = resA.body.id;

        const resB = await request(app)
            .post('/api/recipes')
            .set(authHeader())
            .send({
                title: 'Keep',
                ingredients: [ { name: 'Bar' } ],
                spices: [],
                instructions: [ 'Step B' ],
            });
        expect(resB.status).toBe(201);
        const idB = resB.body.id;

        // delete only the first one
        const delA = await request(app)
            .delete(`/api/recipe/${ idA }`)
            .set(authHeader());
        expect(delA.status).toBe(204);

        // ensure the second one is still there
        const fetchB = await request(app).get(`/api/recipe/${ idB }`);
        expect(fetchB.status).toBe(200);
        expect(fetchB.body.title).toBe('Keep');
    });
});

describe('GET /api/recipes sorting', () => {
    it('puts favorites first, then cooked, then alphabetical by title', async () => {
        // Arrange: override the in‐memory data
        fileService.__setRecipeData({
            recipes: [
                { id: '1', title: 'Alpha', status: { favorite: false, cookState: false } },
                { id: '2', title: 'Bravo', status: { favorite: true, cookState: false } },
                { id: '3', title: 'Charlie', status: { favorite: false, cookState: true } },
                { id: '4', title: 'Delta', status: { favorite: true, cookState: true } },
            ],
        });

        // Act
        const res = await request(app).get('/api/recipes');

        // Assert
        expect(res.status).toBe(200);
        expect(res.body.recipes.map(r => r.id)).toEqual([
            '4', // favorite & cooked
            '2', // favorite only
            '3', // cooked only
            '1', // neither
        ]);
    });
});

describe('PUT /api/recipe/:id', () => {
    const validBody = {
        title: 'Updated recipe',
        url: 'https://example.org',
        ingredients: [ { name: 'Flour' } ],
        spices: [ 'Salt' ],
        instructions: [ 'Mix ingredients', 'Serve' ],
    };

    it('401 when no token is supplied', async () => {
        const res = await agent.put('/api/recipe/1').send(validBody);
        expect(res.status).toBe(401);
    });

    it('403 with an invalid token', async () => {
        const res = await agent
            .put('/api/recipe/1')
            .set('Authorization', 'Bearer bad.token.here')
            .send(validBody);
        expect(res.status).toBe(403);
    });

    it('404 when the recipe does not exist', async () => {
        const res = await agent
            .put('/api/recipe/not-there')
            .set(authHeader())
            .send(validBody);
        expect(res.status).toBe(404);
    });

    it('400 on validation error (e.g. missing title)', async () => {
        const { title, ...invalidBody } = validBody;
        const res = await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send(invalidBody);
        expect(res.status).toBe(400);
    });

    it('200 updates the recipe and returns the new data', async () => {
        const res = await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send(validBody);

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: '1', title: 'Updated recipe' });

        // follow-up GET should reflect the changes
        const followUp = await agent.get('/api/recipe/1');
        expect(followUp.status).toBe(200);
        expect(followUp.body.title).toBe('Updated recipe');
        expect(followUp.body.ingredients[0].name).toBe('Flour');
    });
});

describe('PATCH /api/recipe/:id/status', () => {
    beforeEach(() => {
        // reset to a single recipe with no status
        fileService.__setRecipeData({
            recipes: [
                {
                    id: '1',
                    title: 'Dummy',
                    url: 'https://example.com',
                    image: '',
                    ingredients: [ { name: 'Schokolade' } ],
                    spices: [ 'Salz' ],
                    instructions: [],
                    author: 'MelanX',
                    linkOutUrl: 'https://ex.com',
                    status: { favorite: false, cookState: false },
                },
            ],
        });
    });

    it('401 if no token is provided', async () => {
        const res = await request(app)
            .patch('/api/recipe/1/status')
            .send({ status: { favorite: true } });
        expect(res.status).toBe(401);
    });

    it('403 if token is invalid', async () => {
        const res = await request(app)
            .patch('/api/recipe/1/status')
            .set('Authorization', 'Bearer badtoken')
            .send({ status: { favorite: true } });
        expect(res.status).toBe(403);
    });

    it('404 for unknown recipe id', async () => {
        const res = await request(app)
            .patch('/api/recipe/999/status')
            .set(authHeader())
            .send({ status: { favorite: true } });
        expect(res.status).toBe(404);
    });

    it('200 updates favorite flag and returns new status', async () => {
        const res = await request(app)
            .patch('/api/recipe/1/status')
            .set(authHeader())
            .send({ status: { favorite: true } });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ favorite: true, cookState: false });

        // subsequent GET should reflect it
        const getRes = await request(app).get('/api/recipe/1');
        expect(getRes.body.status.favorite).toBe(true);
    });

    it('200 updates cookState and returns new status', async () => {
        const res = await request(app)
            .patch('/api/recipe/1/status')
            .set(authHeader())
            .send({ status: { cookState: true } });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ favorite: false, cookState: true });

        // subsequent GET should reflect it
        const getRes = await request(app).get('/api/recipe/1');
        expect(getRes.body.status.cookState).toBe(true);
    });

    it('400 if status is missing', async () => {
        await request(app)
            .patch('/api/recipe/1/status')
            .set(authHeader())
            .send({})
            .expect(400);
    })
});
