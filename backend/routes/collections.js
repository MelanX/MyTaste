const express = require('express');
const authenticateToken = require('../middleware/auth');
const { readCollections, modifyCollections, readData } = require('../utils/fileService');

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

module.exports = router;
