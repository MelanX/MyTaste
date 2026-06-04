import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Revoked JWT refresh-token IDs are persisted to a JSON file (storage stays
// JSON files — no SQLite). Shape: { "<jti>": <expiresEpochMs>, ... }.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(__dirname, '..', '..', 'data');
const REVOKED_FILE = path.join(DATA_DIR, 'revoked_tokens.json');

type RevokedStore = Record<string, number>;

// Serializes concurrent read-modify-write cycles so they never interleave.
let queue: Promise<unknown> = Promise.resolve();

async function readStore(): Promise<RevokedStore> {
  try {
    const raw = await fs.promises.readFile(REVOKED_FILE, 'utf8');
    const data = JSON.parse(raw) as RevokedStore;
    return data && typeof data === 'object' ? data : {};
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
}

async function writeStore(data: RevokedStore): Promise<void> {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  await fs.promises.writeFile(REVOKED_FILE, JSON.stringify(data, null, 2));
}

/**
 * Atomically read-modify-write the revoked-tokens file.
 * fn returns the new store to persist, or null/undefined to abort the write.
 */
function modifyStore(fn: (data: RevokedStore) => RevokedStore | null | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    queue = queue.then(async () => {
      try {
        const data = await readStore();
        const next = fn(data);
        if (next != null) await writeStore(next);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function revoke(jti: string, expires: number): Promise<void> {
  await modifyStore((store) => {
    store[jti] = expires;
    return store;
  });
}

export async function isRevoked(jti: string): Promise<boolean> {
  const store = await readStore();
  return Object.prototype.hasOwnProperty.call(store, jti);
}

async function purgeExpired(): Promise<void> {
  await modifyStore((store) => {
    const now = Date.now();
    let changed = false;
    for (const [jti, expires] of Object.entries(store)) {
      if (expires < now) {
        delete store[jti];
        changed = true;
      }
    }
    return changed ? store : null; // abort write when nothing expired
  });
}

// Purge on startup and every 24 hours.
// .unref() prevents the interval from keeping the process alive during shutdown.
void purgeExpired().catch(() => {});
setInterval(() => void purgeExpired().catch(() => {}), 24 * 60 * 60 * 1000).unref();
