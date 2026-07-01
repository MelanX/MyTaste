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

describe('concurrent access', () => {
  it('writes via a temp file + rename instead of truncating the store file in place', async () => {
    // Regression test for a real crash: writeStore() used to write directly
    // to revoked_tokens.json with a truncating writeFile. isRevoked() reads
    // that same file without going through the revoke()/purgeExpired() write
    // queue, so a read landing mid-write would catch an empty/partial file
    // and throw "Unexpected end of JSON input", killing the whole process
    // (reproduced live: two near-simultaneous /api/refresh calls crashed the
    // dev server this way). The fix must never call writeFile directly on
    // the real store path — only on a temp path that then gets renamed
    // (atomic on the same filesystem) into place.
    const writeFileSpy = vi.spyOn(fs.promises, 'writeFile');
    const renameSpy = vi.spyOn(fs.promises, 'rename');

    const store = await loadStore();
    await store.revoke('some-jti', Date.now() + 60_000);

    for (const call of writeFileSpy.mock.calls) {
      expect(call[0]).not.toBe(revokedPath());
    }
    expect(renameSpy).toHaveBeenCalledWith(expect.stringContaining(revokedPath()), revokedPath());

    expect(await store.isRevoked('some-jti')).toBe(true);
    expect(fs.existsSync(revokedPath())).toBe(true);

    writeFileSpy.mockRestore();
    renameSpy.mockRestore();
  });
});
