import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import authenticateToken from '../middleware/auth.js';
import { readCollections, modifyCollections, readData } from '../utils/fileService.js';
import type { CollectionsData } from '../utils/fileService.js';
import nanoid from '../utils/id.js';

const router = express.Router();

async function recipeExists(id: string): Promise<boolean> {
  const data = await readData();
  return data.recipes.some((r) => r.id === id);
}

router.get('/collections/next-up', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const collections = await readCollections();
    res.json({ nextUp: collections.nextUp ?? [] });
  } catch (err) {
    next(err);
  }
});

router.post('/collections/next-up/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    if (!(await recipeExists(id))) return res.status(404).send('Recipe not found');
    let result: CollectionsData | undefined;
    await modifyCollections((data) => {
      if (!data.nextUp.includes(id)) data.nextUp.push(id);
      result = data;
      return data;
    });
    res.json({ nextUp: result!.nextUp });
  } catch (err) {
    next(err);
  }
});

router.delete('/collections/next-up/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    let found = false;
    await modifyCollections((data) => {
      const idx = data.nextUp.indexOf(id);
      if (idx >= 0) {
        data.nextUp.splice(idx, 1);
        found = true;
      }
      return data;
    });
    if (!found) return res.status(404).send('ID not in Next Up list');
    const collections = await readCollections();
    res.json({ nextUp: collections.nextUp });
  } catch (err) {
    next(err);
  }
});

router.delete('/collections/next-up', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await modifyCollections((data) => {
      data.nextUp = [];
      return data;
    });
    res.json({ nextUp: [] });
  } catch (err) {
    next(err);
  }
});

// ── Named collections ─────────────────────────────────────────────────────────

router.get('/collections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await readCollections();
    res.json({ collections: data.collections });
  } catch (err) {
    next(err);
  }
});

router.post('/collections', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).send('name is required');
    }
    const now = new Date().toISOString();
    const entry = { id: nanoid(), name: name.trim(), recipeIds: [], createdAt: now, updatedAt: now };
    const updated = await modifyCollections((data) => {
      data.collections.push(entry);
      return data;
    });
    res.json({ collections: updated!.collections });
  } catch (err) {
    next(err);
  }
});

router.patch('/collections/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { name } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name darf nicht leer sein.' });
    }
    let found = false;
    const updated = await modifyCollections((data) => {
      const c = data.collections.find((col) => col.id === id);
      if (c) {
        c.name = name;
        c.updatedAt = new Date().toISOString();
        found = true;
      }
      return data;
    });
    if (!found) return res.status(404).send('Collection not found');
    res.json({ collections: updated!.collections });
  } catch (err) {
    next(err);
  }
});

router.delete('/collections/:id', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    let found = false;
    const updated = await modifyCollections((data) => {
      const idx = data.collections.findIndex((col) => col.id === id);
      if (idx >= 0) {
        data.collections.splice(idx, 1);
        found = true;
      }
      return data;
    });
    if (!found) return res.status(404).send('Collection not found');
    res.json({ collections: updated!.collections });
  } catch (err) {
    next(err);
  }
});

router.post('/collections/:id/recipes/:recipeId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const recipeId = req.params.recipeId as string;
    if (!(await recipeExists(recipeId))) return res.status(404).send('Recipe not found');
    let found = false;
    const updated = await modifyCollections((data) => {
      const c = data.collections.find((col) => col.id === id);
      if (c) {
        found = true;
        if (!c.recipeIds.includes(recipeId)) {
          c.recipeIds.push(recipeId);
          c.updatedAt = new Date().toISOString();
        }
      }
      return data;
    });
    if (!found) return res.status(404).send('Collection not found');
    res.json({ collections: updated!.collections });
  } catch (err) {
    next(err);
  }
});

router.delete('/collections/:id/recipes/:recipeId', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const recipeId = req.params.recipeId as string;
    let found = false;
    const updated = await modifyCollections((data) => {
      const c = data.collections.find((col) => col.id === id);
      if (c) {
        const idx = c.recipeIds.indexOf(recipeId);
        if (idx >= 0) {
          c.recipeIds.splice(idx, 1);
          c.updatedAt = new Date().toISOString();
          found = true;
        }
      }
      return data;
    });
    if (!found) return res.status(404).send('Recipe not in collection');
    res.json({ collections: updated!.collections });
  } catch (err) {
    next(err);
  }
});

router.delete('/collections/:id/recipes', authenticateToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    let found = false;
    const updated = await modifyCollections((data) => {
      const c = data.collections.find((col) => col.id === id);
      if (c) {
        c.recipeIds = [];
        c.updatedAt = new Date().toISOString();
        found = true;
      }
      return data;
    });
    if (!found) return res.status(404).send('Collection not found');
    res.json({ collections: updated!.collections });
  } catch (err) {
    next(err);
  }
});

export default router;
