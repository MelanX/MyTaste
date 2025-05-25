const express = require('express');
const authenticateToken = require('../middleware/auth');
const { readData, writeData } = require('../utils/fileService');
const nanoid = require("../utils/id");
const { recipeSchema } = require("../utils/schemes");

const router = express.Router();

// GET all recipes
router.get('/recipes', async (req, res, next) => {
    try {
        const data = await readData();
        data.recipes.sort((a, b) => {
            if (a.status?.favorite && !b.status?.favorite) return -1;
            if (!a.status?.favorite && b.status?.favorite) return 1;
            if (a.status?.cookState && !b.status?.cookState) return -1;
            if (!a.status?.cookState && b.status?.cookState) return 1;
            return a.title.localeCompare(b.title);
        });
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

// POST create a new recipe
router.post('/recipes', authenticateToken, async (req, res, next) => {
    try {
        const { value: newRecipe, error } = recipeSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (error) {
            return res.status(400).json({
                message: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }

        const data = await readData();
        newRecipe.id = nanoid();
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

router.patch('/recipe/:id/status', authenticateToken, async (req, res, next) => {
    try {
        if (!req.body.status) {
            return res.status(400).send('Missing status');
        }

        const { id } = req.params;
        const data = await readData();
        const idx = data.recipes.findIndex(r => r.id === id);
        if (idx < 0) {
            return res.status(404).send('Recipe not found');
        }

        data.recipes[idx].status = { ...data.recipes[idx].status, ...req.body.status };
        await writeData(data);
        res.json(data.recipes[idx].status);
    } catch (err) {
        next(err);
    }
});

// DELETE an existing recipe
router.delete('/recipe/:id', authenticateToken, async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await readData();
        const idx = data.recipes.findIndex(r => r.id === id);
        if (idx < 0) return res.status(404).send('Recipe not found');

        data.recipes.splice(idx, 1);
        await writeData(data);
        res.sendStatus(204);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
