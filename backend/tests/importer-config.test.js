jest.mock('../utils/fileService');
const fileService = require('../utils/fileService');
let mockMainConfig = { rename_rules: [] }
const request = require('supertest');
const { makeApp, authHeader } = require('./testUtils');

const app = makeApp();
const agent = request(app);

beforeEach(() => {
    mockMainConfig = {
        rename_rules: [ { from: [ 'Foo' ], to: 'Bar' } ],
        spice_rules: { spices: [], spice_map: {} },
    };
    fileService.__setImportConfig(JSON.parse(JSON.stringify(mockMainConfig)));
});

describe('Importer-config endpoints', () => {
    it('GET /api/importer-config returns the current importer configuration', async () => {
        const res = await agent.get('/api/importer-config');
        expect(res.status).toBe(200);
        expect(res.body).toEqual(mockMainConfig);
        // ensure the mock helper was called
        const { readImportConfig } = fileService;
        expect(readImportConfig).toHaveBeenCalledTimes(1);
    });

    it('PATCH /api/importer-config is unauthorized without credentials', async () => {
        const newCfg = {
            rename_rules: [
                { from: [ 'A', 'B' ], to: 'Alpha' },
                { from: [ 'X' ], to: 'Ex' },
            ],
        };

        const res = await agent.patch('/api/importer-config').send(newCfg);
        expect(res.status).toBe(401);
    });

    it('PATCH /api/importer-config writes the new config and echoes it back', async () => {
        const newCfg = {
            rename_rules: [
                { from: [ 'A', 'B' ], to: 'Alpha' },
                { from: [ 'X' ], to: 'Ex' },
            ],
        };

        const res = await agent
            .patch('/api/importer-config')
            .set(authHeader())
            .send(newCfg);
        expect(res.status).toBe(200);
        const mergedConfig = { ...mockMainConfig, ...newCfg };
        expect(res.body).toEqual(mergedConfig);

        const { writeImportConfig } = require('../utils/fileService');
        expect(writeImportConfig).toHaveBeenCalledWith(mergedConfig);
        expect(writeImportConfig).toHaveBeenCalledTimes(1);

        // subsequent GET should return the new config
        const followUp = await agent.get('/api/importer-config');
        expect(followUp.body).toEqual(mergedConfig);
    });
});
