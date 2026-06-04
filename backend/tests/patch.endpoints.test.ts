import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/utils/fileService.js');
vi.mock('../src/utils/importer.js');

import request from 'supertest';
import jwt from 'jsonwebtoken';
import * as fileService from '../src/utils/fileService.js';
import { makeApp } from './testUtils.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');

let mockCfg: Record<string, unknown>;
const app = makeApp();
const agent = request(app);

const token = jwt.sign({ user: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
const auth = { Authorization: `Bearer ${token}` };

describe('PATCH /api/config-rules', () => {
  beforeEach(() => {
    mockCfg = {
      rename_rules: [{ from: ['Foo'], to: 'Bar' }],
      spice_rules: { spices: ['Salz'], spice_map: {} },
    };
    fs.__setImportConfig(JSON.parse(JSON.stringify(mockCfg)));
  });

  it('merges when only rename_rules are sent', async () => {
    const patch = { rename_rules: [{ from: ['A'], to: 'Alpha' }] };
    const { status, body } = await agent.patch('/api/config-rules').set(auth).send(patch);

    expect(status).toBe(200);
    expect(body.rename_rules).toEqual(patch.rename_rules);
    // ✔  spice_rules kept intact
    expect(body.spice_rules).toEqual(mockCfg.spice_rules);
  });

  it('merges when only spice_rules are sent', async () => {
    const patch = { spice_rules: { spices: ['Muskat'], spice_map: {} } };
    const res = await agent.patch('/api/config-rules').set(auth).send(patch);

    expect(res.status).toBe(200);
    expect(res.body.spice_rules).toEqual(patch.spice_rules);
    // ✔  rename_rules kept intact
    expect(res.body.rename_rules).toEqual(mockCfg.rename_rules);
  });

  it('401 without credentials', async () => {
    await agent.patch('/api/config-rules').send({ rename_rules: [] }).expect(401);
  });

  it('400 when payload type is invalid   ⟵ expected to fail', async () => {
    const bad = { rename_rules: 'not an array' };
    const res = await agent.patch('/api/config-rules').set(auth).send(bad);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/recipe/:id/status', () => {
  beforeEach(() => {
    fs.__setRecipeData({
      recipes: [
        {
          id: '1',
          title: 'Patch',
          ingredients: [{ name: 'X' }],
          spices: [],
          instructions: [],
          status: { favorite: false, cookState: false },
        },
      ],
    } as never);
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
