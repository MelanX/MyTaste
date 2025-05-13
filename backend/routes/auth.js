const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

router.post('/login', (req, res) => {
    const {ADMIN_USER, ADMIN_PASS, JWT_SECRET} = process.env;
    const {username, password} = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({user: username}, JWT_SECRET, {expiresIn: '1h'});
        return res.json({token});
    }
    return res.status(401).json({message: 'Invalid credentials'});
});

module.exports = router;
