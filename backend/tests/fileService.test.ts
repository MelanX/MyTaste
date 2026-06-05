import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// fileService resolves DATA_DIR at module-eval time, so each test gets its own
// temp dir + a fresh module instance (the read-modify-write queue must also be
// fresh per test).
type FileService = typeof import('../src/utils/fileService.js');

let dir: string;
const origDataDir = process.env.DATA_DIR;

async function loadService(): Promise<FileService> {
  vi.resetModules();
  return import('../src/utils/fileService.js');
}

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mytaste-fs-'));
  process.env.DATA_DIR = dir;
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  process.env.DATA_DIR = origDataDir;
});

const recipesPath = () => path.join(dir, 'recipes.json');
const readRecipesFile = () => JSON.parse(fs.readFileSync(recipesPath(), 'utf8'));

describe('bootstrap / missing-file handling', () => {
  it('creates recipes.json with version 2 and empty recipes', async () => {
    const svc = await loadService();
    const data = await svc.readData();
    expect(data).toEqual({ version: '2', recipes: [] });
    expect(fs.existsSync(recipesPath())).toBe(true);
  });

  it('bootstraps config.json with empty rule sets', async () => {
    const svc = await loadService();
    const cfg = await svc.readImportConfig();
    expect(cfg).toEqual({ rename_rules: [], spice_rules: { spices: [], spice_map: {} }, bring_rules: [] });
  });

  it('bootstraps collections.json', async () => {
    const svc = await loadService();
    const c = await svc.readCollections();
    expect(c).toEqual({ nextUp: [], collections: [] });
  });

  it('repairs a non-array collections.collections field', async () => {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'collections.json'), JSON.stringify({ nextUp: [], collections: 'oops' }));
    const svc = await loadService();
    const c = await svc.readCollections();
    expect(c.collections).toEqual([]);
  });
});

describe('corrupt JSON handling', () => {
  it('throws when recipes.json is not valid JSON', async () => {
    fs.writeFileSync(recipesPath(), '{ not json');
    const svc = await loadService();
    await expect(svc.readData()).rejects.toThrow();
  });
});

describe('checkAndUpgradeRecipesFileVersion (v1 → v2 migration)', () => {
  it('migrates a pre-versioning file and creates a timestamped backup', async () => {
    fs.writeFileSync(
      recipesPath(),
      JSON.stringify({
        recipes: [{ id: 'a', title: 'Old', ingredients: [{ name: 'Mehl', amount: 1 }], instructions: ['x'] }],
      }),
    );

    const svc = await loadService();
    const data = await svc.readData();

    expect(data.version).toBe('2');
    const recipe = data.recipes[0];
    expect(recipe.ingredient_sections).toEqual([{ ingredients: [{ name: 'Mehl', amount: 1 }] }]);
    expect(recipe.ingredients).toBeUndefined();

    // backup file with _bak_ timestamp suffix exists
    const backups = fs.readdirSync(dir).filter((f) => f.startsWith('recipes.json_bak_'));
    expect(backups.length).toBe(1);

    // the persisted file is now v2
    expect(readRecipesFile().version).toBe('2');
  });

  it('migrates an explicit version "1" file directly to v2', async () => {
    fs.writeFileSync(
      recipesPath(),
      JSON.stringify({
        version: '1',
        recipes: [{ id: 'b', title: 'V1', ingredients: [{ name: 'Salz' }], instructions: ['y'] }],
      }),
    );

    const svc = await loadService();
    const data = await svc.readData();
    expect(data.version).toBe('2');
    expect(data.recipes[0].ingredient_sections).toEqual([{ ingredients: [{ name: 'Salz' }] }]);
  });

  it('handles a v1 recipe with no ingredients array', async () => {
    fs.writeFileSync(recipesPath(), JSON.stringify({ version: '1', recipes: [{ id: 'c', title: 'NoIng', instructions: ['z'] }] }));
    const svc = await loadService();
    const data = await svc.readData();
    expect(data.recipes[0].ingredient_sections).toEqual([{ ingredients: [] }]);
  });

  it('leaves a v2 file untouched (no backup)', async () => {
    fs.writeFileSync(recipesPath(), JSON.stringify({ version: '2', recipes: [] }));
    const svc = await loadService();
    await svc.readData();
    expect(fs.readdirSync(dir).filter((f) => f.includes('_bak_'))).toEqual([]);
  });
});

describe('modifyData atomic read-modify-write', () => {
  it('persists the returned data', async () => {
    const svc = await loadService();
    await svc.modifyData((d) => {
      d.recipes.push({ id: '1', title: 'T', ingredient_sections: [], instructions: [] });
      return d;
    });
    expect(readRecipesFile().recipes).toHaveLength(1);
  });

  it('aborts the write when fn returns null', async () => {
    const svc = await loadService();
    await svc.modifyData((d) => {
      d.recipes.push({ id: 'x', title: 'X', ingredient_sections: [], instructions: [] });
      return null;
    });
    expect(readRecipesFile().recipes).toHaveLength(0);
  });

  it('serializes concurrent calls without lost updates', async () => {
    const svc = await loadService();
    // Fire 25 concurrent increment-style appends. If reads/writes interleaved,
    // some appends would be lost.
    const N = 25;
    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        svc.modifyData(async (d) => {
          // force a microtask gap inside the critical section
          await Promise.resolve();
          d.recipes.push({ id: String(i), title: `r${i}`, ingredient_sections: [], instructions: [] });
          return d;
        }),
      ),
    );

    const ids = readRecipesFile().recipes.map((r: { id: string }) => r.id);
    expect(ids).toHaveLength(N);
    expect(new Set(ids).size).toBe(N);
  });

  it('rejects (and does not write) when fn throws', async () => {
    const svc = await loadService();
    await expect(
      svc.modifyData(() => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(readRecipesFile().recipes).toHaveLength(0);
  });
});

describe('modifyImportConfig / modifyCollections', () => {
  it('modifyImportConfig persists and aborts on null', async () => {
    const svc = await loadService();
    await svc.modifyImportConfig((c) => {
      c.rename_rules = [{ from: ['A'], to: 'B' }];
      return c;
    });
    expect((await svc.readImportConfig()).rename_rules).toEqual([{ from: ['A'], to: 'B' }]);

    await svc.modifyImportConfig(() => null);
    expect((await svc.readImportConfig()).rename_rules).toEqual([{ from: ['A'], to: 'B' }]);
  });

  it('modifyCollections persists changes', async () => {
    const svc = await loadService();
    await svc.modifyCollections((c) => {
      c.nextUp = ['r1'];
      return c;
    });
    expect((await svc.readCollections()).nextUp).toEqual(['r1']);
  });

  it('modifyCollections rejects when fn throws', async () => {
    const svc = await loadService();
    await expect(
      svc.modifyCollections(() => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');
  });
});

describe('writeData / writeImportConfig / writeCollections', () => {
  it('round-trips recipe data', async () => {
    const svc = await loadService();
    await svc.writeData({ version: '2', recipes: [{ id: 'z', title: 'Z', ingredient_sections: [], instructions: [] }] });
    expect((await svc.readData()).recipes[0].id).toBe('z');
  });

  it('round-trips collections data', async () => {
    const svc = await loadService();
    await svc.writeCollections({ nextUp: ['a'], collections: [] });
    expect((await svc.readCollections()).nextUp).toEqual(['a']);
  });
});
