const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const authRouter = require('./routes/auth');
const recipesRouter = require('./routes/recipes');
const importRouter = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true}));
app.use(bodyParser.json());

// Mount routers
app.use('/api', authRouter);
app.use('/api', recipesRouter);
app.use('/api', importRouter)

// Default error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Server error');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
