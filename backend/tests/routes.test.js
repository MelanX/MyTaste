const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Routers under test
const authRouter = require('../routes/auth');
const recipesRouter = require('../routes/recipes');
const importRouter = require('../routes/import');

// Mock fileService so tests never touch the real recipes.json
jest.mock('../utils/fileService', () => {
    let data;
    try {
        data = require('../data/recipes.json')
    } catch {
        data = {
            recipes: [ {
                id: '1',
                title: 'Dummy',
                url: 'https://example.com',
                image: '',
                ingredients: [ { name: 'Schokolade' } ],
                spices: [ 'Salz' ],
                instructions: [],
                author: 'MelanX',
                linkOutUrl: 'https://ex.com',
            } ]
        };
    }
    return {
        readData: jest.fn(async () => JSON.parse(JSON.stringify(data))),
        writeData: jest.fn(async (newData) => {
            data = newData;
        }),
    };
});

// Mock importer to avoid real HTTP calls
jest.mock('../utils/importer', () => ({
    importGeneric: jest.fn(async (url) => ({
        title: 'Dummy',
        url,
        image: '',
        ingredients: [],
        spices: [],
        instructions: [],
    })),
}));

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', authRouter, recipesRouter, importRouter);
    // default error handler mimic
    app.use((err, req, res, next) => res.status(500).json({ message: err.message }));
    return app;
}

const app = makeApp();

/** helper for auth’d routes */
function authHeader() {
    const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { Authorization: `Bearer ${ token }` };
}

describe('Auth flow', () => {
    it('returns a token for valid credentials', async () => {
        const { body, status } = await request(app)
            .post('/api/login')
            .send({ username: 'admin', password: 'password' });
        expect(status).toBe(200);
        expect(body.token).toBeDefined();
    });

    it('401s on wrong credentials', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ username: 'foo', password: 'bar' });
        expect(res.status).toBe(401);
    });
});

describe('Recipes endpoints', () => {
    it('GET /recipes returns full collection', async () => {
        const res = await request(app).get('/api/recipes');
        expect(res.body.recipes.length).toBeGreaterThan(0);
    });

    it('GET /recipe/:id returns one recipe', async () => {
        const res = await request(app).get('/api/recipe/1');
        expect(res.status).toBe(200);
        expect(res.body.id).toBe('1');
    });

    it('GET /recipe/:id 404s for unknown id', async () => {
        const res = await request(app).get('/api/recipe/__nope__');
        expect(res.status).toBe(404);
    });

    it('GET /bring-recipe converts data for Bring! app', async () => {
        const res = await request(app).get('/api/bring-recipe/1');
        expect(res.body).toHaveProperty('items');
        expect(res.body.items.some((i) => i.itemId === 'Salz' && i.stock)).toBe(true);
    });

    it('POST /recipes without token → 401', async () => {
        const res = await request(app).post('/api/recipes').send({ title: 'x' });
        expect(res.status).toBe(401);
    });

    it('POST /recipes with bad token → 403', async () => {
        const res = await request(app)
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
        const res = await request(app)
            .post('/api/recipes')
            .set(authHeader())
            .send(body);
        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ title: 'Test-Recipe' });
    });

    it('Rejects recipe without title', async () => {
        const res = await request(app)
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
