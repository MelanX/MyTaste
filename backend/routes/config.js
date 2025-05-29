const express = require('express');
const authenticateToken = require('../middleware/auth');
const { readImportConfig, writeImportConfig } = require("../utils/fileService");
const { configSchema } = require("../utils/schemes");
const router = express.Router();

router.get('/config', (req, res) => {
    res.json({
        requireLogin: [ 'true', '1', 'yes', 'on' ].includes(process.env.REQUIRE_LOGIN?.trim().toLowerCase() || 'false'),
    });
});

router.get('/importer-config', async (req, res) => {
    let data = await readImportConfig();
    res.json(data);
});

router.patch('/importer-config', authenticateToken, async (req, res, next) => {
    try {
        // validate the incoming patch itself
        const { error: patchErr } = configSchema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (patchErr) {
            const invalid = patchErr.details.find(d => d.context?.invalid)?.context?.invalid || [];
            return res.status(400).json({
                message: 'Validation failed',
                details: invalid.length ? invalid : patchErr.details,
            });
        }

        // merge with current config, then validate the whole thing
        const currentConfig = await readImportConfig();
        const mergedConfig = { ...currentConfig, ...req.body };
        const { error, value: validConfig } = configSchema.validate(mergedConfig, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const invalid = error.details.find(d => d.context?.invalid)?.context?.invalid || [];
            console.log(error.details);
            return res.status(400).json({
                message: 'Validation failed',
                details: invalid.length ? invalid : error.details,
            });
        }

        await writeImportConfig(validConfig);
        res.json(validConfig);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
