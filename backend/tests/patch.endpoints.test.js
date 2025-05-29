const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

const configRouter = require('../routes/config');
const recipesRouter = require('../routes/recipes');

// mock FS helpers – identical technique used in routes.test.js
let mockCfg = {
    rename_rules: [ { from: [ 'Foo' ], to: 'Bar' } ],
    spice_rules: { spices: [ 'Salz' ], spice_map: [] },
};
jest.mock('../utils/fileService', () => ({
    readImportConfig: jest.fn(async () => JSON.parse(JSON.stringify(mockCfg))),
    writeImportConfig: jest.fn(async (c) => { mockCfg = c; }),

    /* the recipe helpers are needed for /recipe/:id/status */
    readData: jest.fn(async () => ({
        recipes: [ {
            id: '1', title: 'Patch', ingredients: [ { name: 'X' } ], spices: [], instructions: [],
            status: { favorite: false, cookState: false }
        } ]
    })),
    writeData: jest.fn(async () => {}),
}));

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use('/api', configRouter, recipesRouter);
    return app;
}

const app = makeApp();

const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${ token }` };

describe('PATCH /api/importer-config', () => {
    beforeEach(() => {
        mockCfg = {
            rename_rules: [ { from: [ 'Foo' ], to: 'Bar' } ],
            spice_rules: { spices: [ 'Salz' ], spice_map: {} },
        };
        jest.clearAllMocks();
    });

    it('merges when only rename_rules are sent', async () => {
        const patch = { rename_rules: [ { from: [ 'A' ], to: 'Alpha' } ] };
        const { status, body } = await request(app)
            .patch('/api/importer-config')
            .set(auth)
            .send(patch);

        expect(status).toBe(200);
        expect(body.rename_rules).toEqual(patch.rename_rules);
        // ✔  spice_rules kept intact
        expect(body.spice_rules).toEqual(mockCfg.spice_rules);
    });

    it('merges when only spice_rules are sent', async () => {
        const patch = { spice_rules: { spices: [ 'Muskat' ], spice_map: {} } };
        const res = await request(app).patch('/api/importer-config').set(auth).send(patch);

        expect(res.status).toBe(200);
        expect(res.body.spice_rules).toEqual(patch.spice_rules);
        // ✔  rename_rules kept intact
        expect(res.body.rename_rules).toEqual(mockCfg.rename_rules);
    });

    it('401 without credentials', async () => {
        await request(app).patch('/api/importer-config').send({ rename_rules: [] }).expect(401);
    });

    it('400 when payload type is invalid   ⟵ expected to fail', async () => {
        const bad = { rename_rules: 'not an array' };
        const res = await request(app).patch('/api/importer-config').set(auth).send(bad);
        expect(res.status).toBe(400);
    });
});

describe('PATCH /api/recipe/:id/status', () => {
    it('updates both flags at once', async () => {
        const { body, status } = await request(app)
            .patch('/api/recipe/1/status')
            .set(auth)
            .send({ status: { favorite: true, cookState: true } });

        expect(status).toBe(200);
        expect(body).toEqual({ favorite: true, cookState: true });
    });

    it('rejects unknown keys inside status   ⟵ expected to fail', async () => {
        const res = await request(app)
            .patch('/api/recipe/1/status')
            .set(auth)
            .send({ status: { unknown: true } });
        expect(res.status).toBe(400);
    });
});
