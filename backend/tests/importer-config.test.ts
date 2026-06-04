import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/utils/fileService.js');

import * as fileService from '../src/utils/fileService.js';
import request from 'supertest';
import { makeApp, authHeader } from './testUtils.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');

let mockMainConfig: Record<string, unknown> = { rename_rules: [] };

const app = makeApp();
const agent = request(app);

beforeEach(() => {
  mockMainConfig = {
    rename_rules: [{ from: ['Foo'], to: 'Bar' }],
    spice_rules: { spices: [], spice_map: {} },
    bring_rules: [],
  };
  fs.__setImportConfig(JSON.parse(JSON.stringify(mockMainConfig)));
});

describe('Config-rules endpoints', () => {
  it('GET /api/config-rules returns the current importer configuration', async () => {
    const res = await agent.get('/api/config-rules');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(mockMainConfig);
    // ensure the mock helper was called
    expect(fs.readImportConfig).toHaveBeenCalledTimes(1);
  });

  it('PATCH /api/config-rules is unauthorized without credentials', async () => {
    const newCfg = {
      rename_rules: [
        { from: ['A', 'B'], to: 'Alpha' },
        { from: ['X'], to: 'Ex' },
      ],
    };

    const res = await agent.patch('/api/config-rules').send(newCfg);
    expect(res.status).toBe(401);
  });

  it('PATCH /api/config-rules writes the new config and echoes it back', async () => {
    const newCfg = {
      rename_rules: [
        { from: ['A', 'B'], to: 'Alpha' },
        { from: ['X'], to: 'Ex' },
      ],
    };

    const res = await agent.patch('/api/config-rules').set(authHeader()).send(newCfg);
    expect(res.status).toBe(200);
    const mergedConfig = { ...mockMainConfig, ...newCfg };
    expect(res.body).toEqual(mergedConfig);

    expect(fs.writeImportConfig).toHaveBeenCalledWith(mergedConfig);
    expect(fs.writeImportConfig).toHaveBeenCalledTimes(1);

    // subsequent GET should return the new config
    const followUp = await agent.get('/api/config-rules');
    expect(followUp.body).toEqual(mergedConfig);
  });

  it('PATCH /api/config-rules writes bring_rules and echoes them back', async () => {
    const newCfg = {
      bring_rules: [{ from: ['Ei'], to: 'Eier' }],
    };

    const res = await agent.patch('/api/config-rules').set(authHeader()).send(newCfg);
    expect(res.status).toBe(200);
    expect(res.body.bring_rules).toEqual(newCfg.bring_rules);
  });

  it('PATCH /api/config-rules rejects malformed bring_rules', async () => {
    const badCfg = {
      bring_rules: [{ from: 'not-an-array', to: 'Eier' }],
    };

    const res = await agent.patch('/api/config-rules').set(authHeader()).send(badCfg);
    expect(res.status).toBe(400);
  });
});
