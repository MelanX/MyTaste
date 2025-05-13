// backend/routes/recipes.js
const express = require('express');
const authenticateToken = require('../middleware/auth');
const { readData, writeData } = require('../utils/fileService');

const router = express.Router();

// GET all recipes
router.get('/recipes', async (req, res, next) => {
    try {
        const data = await readData();
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// GET a single recipe by ID
router.get('/recipe/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await readData();
        const recipe = data.recipes.find(r => r.id === id);
        if (!recipe) return res.status(404).send('Recipe not found');
        res.json(recipe);
    } catch (err) {
        next(err);
    }
});

// GET a recipe converted for Bring
router.get('/bring-recipe/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await readData();
        const recipe = data.recipes.find(r => r.id === id);
        if (!recipe) return res.status(404).send('Recipe not found');

        const converted = {
            author: 'MelanX',
            linkOutUrl: recipe.url,
            imageUrl: recipe.image || '',
            name: recipe.title,
            items: [
                ...recipe.ingredients.map(i => ({
                    itemId: i.name,
                    spec: `${String(i.amount || '').replace('.', ',')} ${i.unit || ''}`.trim()
                })),
                ...(recipe.spices || []).map(s => ({ itemId: s, stock: true }))
            ]
        };
        res.json(converted);
    } catch (err) {
        next(err);
    }
});

// POST create a new recipe
router.post('/recipes', authenticateToken, async (req, res, next) => {
    try {
        const newRecipe = req.body;
        const { nanoid } = await import('nanoid');
        const data = await readData();
        newRecipe.id = nanoid(10);
        data.recipes.push(newRecipe);
        await writeData(data);
        res.status(201).json(newRecipe);
    } catch (err) {
        next(err);
    }
});

// PUT update an existing recipe
router.put('/recipe/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const updated = req.body;
        const data = await readData();
        const idx = data.recipes.findIndex(r => r.id === id);
        if (idx < 0) return res.status(404).send('Recipe not found');

        updated.id = id;
        data.recipes[idx] = updated;
        await writeData(data);
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
