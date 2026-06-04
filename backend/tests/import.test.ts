import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/utils/importer.js', () => ({
  importGeneric: vi.fn(),
}));

import { importGeneric } from '../src/utils/importer.js';
import request from 'supertest';
import { makeApp, authHeader } from './testUtils.js';

const app = makeApp();
const mockedImportGeneric = vi.mocked(importGeneric);

describe('Import route', () => {
  const endpoint = '/api/import';
  const goodBody = { url: 'https://example.com/recipe' };

  it('401 when user is not authenticated', async () => {
    const res = await request(app).post(endpoint).send(goodBody);
    expect(res.status).toBe(401);
  });

  it('400 when body fails validation', async () => {
    const res = await request(app).post(endpoint).set(authHeader()).send({}); // missing url
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
  });

  it('400 when importer throws', async () => {
    mockedImportGeneric.mockRejectedValueOnce(new Error('Parse failed'));

    const res = await request(app).post(endpoint).set(authHeader()).send(goodBody);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Import failed');
    expect(mockedImportGeneric).toHaveBeenCalledWith(goodBody.url);
  });

  it('200 and returns recipe on success', async () => {
    const fakeRecipe = { id: '123', title: 'Imported' };
    mockedImportGeneric.mockResolvedValueOnce(fakeRecipe as never);

    const res = await request(app).post(endpoint).set(authHeader()).send(goodBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeRecipe);
  });

  it.each([
    'http://127.0.0.1/admin',
    'http://10.0.0.1/secret',
    'http://172.16.0.1/internal',
    'http://192.168.1.1/router',
    'http://169.254.169.254/latest/meta-data',
    'http://localhost/admin',
  ])('400 when URL targets private address: %s', async (url) => {
    const res = await request(app).post(endpoint).set(authHeader()).send({ url });
    expect(res.status).toBe(400);
    expect(mockedImportGeneric).not.toHaveBeenCalled();
  });
});
