const express = require('express');
const { importChefkoch } = require('../utils/importer');
const authenticateToken = require('../middleware/auth');
const router = express.Router();

router.post('/import', authenticateToken, async (req, res, next) => {
    try {
        const { url, provider } = req.body;
        if (provider !== 'chefkoch') {
            return res.status(400).json({ message: 'Only chefkoch.de is supported at the moment.' });
        }
        const recipe = await importChefkoch(url);
        res.json(recipe);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
