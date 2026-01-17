const { readData } = require('../utils/fileService');
const express = require("express");

const router = express.Router();

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
                ...recipe.ingredient_sections.flatMap(s => s.ingredients).map(i => ({
                    itemId: i.name,
                    spec: `${ String(i.amount || '').replace('.', ',') } ${ i.unit || '' }`.trim()
                })),
                ...(recipe.spices || []).map(s => ({ itemId: s, stock: true }))
            ]
        };
        res.json(converted);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
