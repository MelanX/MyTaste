const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { timingSafeEqual } = require('crypto');

const { loginSchema } = require("../utils/schemes");
const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const { value, error } = loginSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({
                message: 'Bad request'
            });
        }

        const { ADMIN_USER, ADMIN_PASS, JWT_SECRET } = process.env;

        const userOk = timingSafeEqual(
            Buffer.from(value.username),
            Buffer.from(ADMIN_USER),
        );
        const passwordOk = timingSafeEqual(
            Buffer.from(value.password),
            Buffer.from(ADMIN_PASS),
        );

        if (!userOk || !passwordOk) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Delay to prevent brute force attacks
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ user: value.username }, JWT_SECRET, { expiresIn: '8h' });
        const expirationTime = new Date();
        expirationTime.setHours(expirationTime.getHours() + 8);
        return res
            .cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                expires: expirationTime,
            })
            .json({ token, expirationTime: expirationTime.getTime() });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
