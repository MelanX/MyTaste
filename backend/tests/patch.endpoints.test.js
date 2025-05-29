jest.mock('../utils/fileService');
jest.mock('../utils/importer');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const fileService = require('../utils/fileService');
const { makeApp } = require("./testUtils");

let mockCfg;
const app = makeApp();
const agent = request(app);

const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${ token }` };

describe('PATCH /api/importer-config', () => {
    beforeEach(() => {
        mockCfg = {
            rename_rules: [ { from: [ 'Foo' ], to: 'Bar' } ],
            spice_rules: { spices: [ 'Salz' ], spice_map: {} },
        };
        fileService.__setImportConfig(JSON.parse(JSON.stringify(mockCfg)));
    });

    it('merges when only rename_rules are sent', async () => {
        const patch = { rename_rules: [ { from: [ 'A' ], to: 'Alpha' } ] };
        const { status, body } = await agent
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
        const res = await agent.patch('/api/importer-config').set(auth).send(patch);

        expect(res.status).toBe(200);
        expect(res.body.spice_rules).toEqual(patch.spice_rules);
        // ✔  rename_rules kept intact
        expect(res.body.rename_rules).toEqual(mockCfg.rename_rules);
    });

    it('401 without credentials', async () => {
        await agent.patch('/api/importer-config').send({ rename_rules: [] }).expect(401);
    });

    it('400 when payload type is invalid   ⟵ expected to fail', async () => {
        const bad = { rename_rules: 'not an array' };
        const res = await agent.patch('/api/importer-config').set(auth).send(bad);
        expect(res.status).toBe(400);
    });
});

describe('PATCH /api/recipe/:id/status', () => {
    beforeEach(() => {
        fileService.__setRecipeData({
            recipes: [
                {
                    id: '1',
                    title: 'Patch',
                    ingredients: [ { name: 'X' } ],
                    spices: [],
                    instructions: [],
                    status: { favorite: false, cookState: false },
                },
            ],
        });
    });

    it('updates both flags at once', async () => {
        const { body, status } = await agent
            .patch('/api/recipe/1/status')
            .set(auth)
            .send({ status: { favorite: true, cookState: true } });

        expect(status).toBe(200);
        expect(body).toEqual({ favorite: true, cookState: true });
    });

    it('rejects unknown keys inside status   ⟵ expected to fail', async () => {
        const res = await agent
            .patch('/api/recipe/1/status')
            .set(auth)
            .send({ status: { unknown: true } });
        expect(res.status).toBe(400);
    });
});
