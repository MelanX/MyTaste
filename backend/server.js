const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authenticateToken = require('./middleware/auth');
require('dotenv').config();

const authRouter = require('./routes/auth');
const configRouter = require('./routes/config');
const recipesRouter = require('./routes/recipes');
const importRouter = require('./routes/import');

const app = express();
const PORT = 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.warn(`Blocked CORS for origin: ${ origin }`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: [ 'Content-Type', 'Authorization' ]
}));

app.use(bodyParser.json());

// Mount routers
app.use('/api', authRouter);
app.use('/api', configRouter);

if (process.env.REQUIRE_LOGIN === 'true') {
    app.use('/api', authenticateToken);
}

app.use('/api', recipesRouter);
app.use('/api', importRouter);

// Default error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Server error');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${ PORT }`);
});
