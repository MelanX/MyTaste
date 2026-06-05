import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

type TokenStore = typeof import('../src/utils/tokenStore.js');

let dir: string;
const origDataDir = process.env.DATA_DIR;
const revokedPath = () => path.join(dir, 'revoked_tokens.json');

async function loadStore(): Promise<TokenStore> {
  vi.resetModules();
  return import('../src/utils/tokenStore.js');
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mytaste-tok-'));
  process.env.DATA_DIR = dir;
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  process.env.DATA_DIR = origDataDir;
});

describe('revoke / isRevoked', () => {
  it('returns false for an unknown jti when no store exists yet', async () => {
    const store = await loadStore();
    expect(await store.isRevoked('missing')).toBe(false);
  });

  it('persists a revoked jti and reports it revoked', async () => {
    const store = await loadStore();
    await store.revoke('jti-1', Date.now() + 60_000);
    expect(await store.isRevoked('jti-1')).toBe(true);
    expect(JSON.parse(fs.readFileSync(revokedPath(), 'utf8'))).toHaveProperty('jti-1');
  });

  it('supports multiple revocations', async () => {
    const store = await loadStore();
    await store.revoke('a', Date.now() + 1000);
    await store.revoke('b', Date.now() + 1000);
    expect(await store.isRevoked('a')).toBe(true);
    expect(await store.isRevoked('b')).toBe(true);
    expect(await store.isRevoked('c')).toBe(false);
  });
});

describe('startup purgeExpired', () => {
  it('drops already-expired entries on module load', async () => {
    fs.writeFileSync(revokedPath(), JSON.stringify({ expired: Date.now() - 10_000, alive: Date.now() + 60_000 }));

    const store = await loadStore();
    // allow the fire-and-forget startup purge to settle
    await new Promise((r) => setTimeout(r, 20));

    expect(await store.isRevoked('expired')).toBe(false);
    expect(await store.isRevoked('alive')).toBe(true);
  });

  it('treats a corrupt/non-object store as empty', async () => {
    fs.writeFileSync(revokedPath(), JSON.stringify('not-an-object'));
    const store = await loadStore();
    await new Promise((r) => setTimeout(r, 20));
    expect(await store.isRevoked('anything')).toBe(false);
  });
});
