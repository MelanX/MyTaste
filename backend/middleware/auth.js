const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized',
            details: [ 'No credentials provided' ]
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
        if (err) return res.status(403).json({
            message: 'Unauthorized',
            details: [ 'Invalid credentials' ]
        });
        req.user = payload.user;
        next();
    });
};
