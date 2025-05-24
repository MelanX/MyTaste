const express = require('express');
const { importGeneric } = require('../utils/importer');
const authenticateToken = require('../middleware/auth');
const { importSchema } = require("../utils/schemes");
const router = express.Router();

router.post('/import', authenticateToken, async (req, res, next) => {
    try {
        const { value, error } = importSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            return res.status(400).json({
                message: 'Validation failed',
                details: error.details.map(d => d.message)
            });
        }

        const { url } = value;
        const recipe = await importGeneric(url);
        res.json(recipe);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
