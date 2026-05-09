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

router.get('/bring-bulk', async (req, res, next) => {
    try {
        const rawIds = req.query.ids;
        if (!rawIds) return res.status(400).send('Missing ids query parameter');
        const ids = String(rawIds).split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) return res.status(400).send('ids must not be empty');

        const data = await readData();
        const recipes = ids.map(id => data.recipes.find(r => r.id === id) ?? null);
        if (recipes.some(r => r === null)) {
            return res.status(404).send('One or more recipe IDs not found');
        }

        const merged = new Map();
        const spiceSet = new Set();

        for (const recipe of recipes) {
            for (const section of recipe.ingredient_sections) {
                for (const ing of section.ingredients) {
                    const key = `${ ing.name }\0${ ing.unit ?? '' }`;
                    if (merged.has(key)) {
                        const existing = merged.get(key);
                        if (ing.amount != null && existing.amount != null) {
                            existing.amount += ing.amount;
                        }
                    } else {
                        merged.set(key, {
                            itemId: ing.name,
                            amount: ing.amount ?? null,
                            unit: ing.unit ?? null,
                        });
                    }
                }
            }
            for (const spice of (recipe.spices ?? [])) {
                spiceSet.add(spice);
            }
        }

        const items = [
            ...[ ...merged.values() ].map(i => {
                const item = { itemId: i.itemId };
                if (i.amount != null) {
                    item.spec = `${ String(i.amount).replace('.', ',') } ${ i.unit ?? '' }`.trim();
                }
                return item;
            }),
            ...[ ...spiceSet ].map(s => ({ itemId: s, stock: true })),
        ];

        res.json({ author: 'MelanX', name: 'Next Up', items });
    } catch (err) { next(err); }
});

module.exports = router;
