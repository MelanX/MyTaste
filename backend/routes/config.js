const express = require('express');
const router = express.Router();

router.get('/config', (req, res) => {
    res.json({
        requireLogin: [ 'true', '1', 'yes', 'on' ].includes(process.env.REQUIRE_LOGIN?.trim().toLowerCase() || 'false'),
    });
});

module.exports = router;
