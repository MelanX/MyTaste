const express = require('express');
const authenticateToken = require('../middleware/auth');
const { readCollections, modifyCollections, readData } = require('../utils/fileService');
const nanoid = require('../utils/id');

const router = express.Router();

async function recipeExists(id) {
    const data = await readData();
    return data.recipes.some(r => r.id === id);
}

router.get('/collections/next-up', async (req, res, next) => {
    try {
        const collections = await readCollections();
        res.json({ nextUp: collections.nextUp ?? [] });
    } catch (err) { next(err); }
});

router.post('/collections/next-up/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!(await recipeExists(id))) return res.status(404).send('Recipe not found');
        let result;
        await modifyCollections(data => {
            if (!data.nextUp.includes(id)) data.nextUp.push(id);
            result = data;
            return data;
        });
        res.json({ nextUp: result.nextUp });
    } catch (err) { next(err); }
});

router.delete('/collections/next-up/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        let found = false;
        await modifyCollections(data => {
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
    } catch (err) { next(err); }
});

router.delete('/collections/next-up', authenticateToken, async (req, res, next) => {
    try {
        await modifyCollections(data => {
            data.nextUp = [];
            return data;
        });
        res.json({ nextUp: [] });
    } catch (err) { next(err); }
});

// ── Named collections ─────────────────────────────────────────────────────────

router.get('/collections', async (req, res, next) => {
    try {
        const data = await readCollections();
        res.json({ collections: data.collections });
    } catch (err) { next(err); }
});

router.post('/collections', authenticateToken, async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).send('name is required');
        }
        const now = new Date().toISOString();
        const entry = { id: nanoid(), name: name.trim(), recipeIds: [], createdAt: now, updatedAt: now };
        const updated = await modifyCollections(data => {
            data.collections.push(entry);
            return data;
        });
        res.json({ collections: updated.collections });
    } catch (err) { next(err); }
});

router.patch('/collections/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ message: 'Name darf nicht leer sein.' });
        }
        let found = false;
        const updated = await modifyCollections(data => {
            const c = data.collections.find(col => col.id === id);
            if (c) {
                c.name = name;
                c.updatedAt = new Date().toISOString();
                found = true;
            }
            return data;
        });
        if (!found) return res.status(404).send('Collection not found');
        res.json({ collections: updated.collections });
    } catch (err) { next(err); }
});

router.delete('/collections/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        let found = false;
        const updated = await modifyCollections(data => {
            const idx = data.collections.findIndex(col => col.id === id);
            if (idx >= 0) {
                data.collections.splice(idx, 1);
                found = true;
            }
            return data;
        });
        if (!found) return res.status(404).send('Collection not found');
        res.json({ collections: updated.collections });
    } catch (err) { next(err); }
});

router.post('/collections/:id/recipes/:recipeId', authenticateToken, async (req, res, next) => {
    try {
        const { id, recipeId } = req.params;
        if (!(await recipeExists(recipeId))) return res.status(404).send('Recipe not found');
        let found = false;
        const updated = await modifyCollections(data => {
            const c = data.collections.find(col => col.id === id);
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
        res.json({ collections: updated.collections });
    } catch (err) { next(err); }
});

router.delete('/collections/:id/recipes/:recipeId', authenticateToken, async (req, res, next) => {
    try {
        const { id, recipeId } = req.params;
        let found = false;
        const updated = await modifyCollections(data => {
            const c = data.collections.find(col => col.id === id);
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
        res.json({ collections: updated.collections });
    } catch (err) { next(err); }
});

router.delete('/collections/:id/recipes', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        let found = false;
        const updated = await modifyCollections(data => {
            const c = data.collections.find(col => col.id === id);
            if (c) {
                c.recipeIds = [];
                c.updatedAt = new Date().toISOString();
                found = true;
            }
            return data;
        });
        if (!found) return res.status(404).send('Collection not found');
        res.json({ collections: updated.collections });
    } catch (err) { next(err); }
});

module.exports = router;
