const express = require('express');
const authenticateToken = require('../middleware/auth');
const { readImportConfig, writeImportConfig } = require("../utils/fileService");
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

router.put('/importer-config', authenticateToken, async (req, res) => {
    const data = req.body;
    await writeImportConfig(data);

    res.json(data);
});

module.exports = router;
