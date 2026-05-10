const { readData, readImportConfig } = require('../utils/fileService');
const express = require("express");

function normalizeIngredient(name, bringRules) {
    for (const rule of bringRules) {
        if (rule.from.includes(name)) return rule.to;
    }
    return name;
}

const router = express.Router();

// GET a recipe converted for Bring
router.get('/bring-recipe/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const [data, config] = await Promise.all([readData(), readImportConfig()]);
        const bringRules = config.bring_rules ?? [];
        const recipe = data.recipes.find(r => r.id === id);
        if (!recipe) return res.status(404).send('Recipe not found');

        const merged = new Map();
        for (const section of recipe.ingredient_sections) {
            for (const ing of section.ingredients) {
                const normalizedName = normalizeIngredient(ing.name, bringRules);
                const key = `${ normalizedName }\0${ ing.unit ?? '' }`;
                if (merged.has(key)) {
                    const existing = merged.get(key);
                    if (ing.amount != null && existing.amount != null) {
                        existing.amount += ing.amount;
                    }
                } else {
                    merged.set(key, {
                        itemId: normalizedName,
                        amount: ing.amount ?? null,
                        unit: ing.unit ?? null,
                    });
                }
            }
        }

        const items = [
            ...[ ...merged.values() ].map(i => {
                const item = { itemId: i.itemId };
                if (i.amount != null) {
                    item.spec = `${ String(i.amount).replace('.', ',') } ${ i.unit || '' }`.trim();
                }
                return item;
            }),
            ...(recipe.spices || []).map(s => ({ itemId: s, stock: true })),
        ];

        res.json({
            author: 'MelanX',
            linkOutUrl: recipe.url,
            imageUrl: recipe.image || '',
            name: recipe.title,
            items,
        });
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

        const [data, config] = await Promise.all([readData(), readImportConfig()]);
        const bringRules = config.bring_rules ?? [];
        const recipes = ids.map(id => data.recipes.find(r => r.id === id) ?? null);
        if (recipes.some(r => r === null)) {
            return res.status(404).send('One or more recipe IDs not found');
        }

        const merged = new Map();
        const spiceSet = new Set();

        for (const recipe of recipes) {
            for (const section of recipe.ingredient_sections) {
                for (const ing of section.ingredients) {
                    const normalizedName = normalizeIngredient(ing.name, bringRules);
                    const key = `${ normalizedName }\0${ ing.unit ?? '' }`;
                    if (merged.has(key)) {
                        const existing = merged.get(key);
                        if (ing.amount != null && existing.amount != null) {
                            existing.amount += ing.amount;
                        }
                    } else {
                        merged.set(key, {
                            itemId: normalizedName,
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
                    item.spec = `${ String(i.amount || '').replace('.', ',') } ${ i.unit || '' }`.trim();
                }
                return item;
            }),
            ...[ ...spiceSet ].map(s => ({ itemId: s, stock: true })),
        ];

        res.json({ author: 'MelanX', name: 'Next Up', items });
    } catch (err) { next(err); }
});

module.exports = router;
