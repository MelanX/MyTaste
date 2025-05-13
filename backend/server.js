const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const RECIPE_FILE = 'data/recipes.json';

app.use(cors({origin: '*', methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', credentials: true}));
app.use(bodyParser.json());

// Function to create initial recipe file
const createInitialRecipeFile = () => {
    const dir = 'data';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    const initialData = {
        recipes: []
    };
    fs.writeFileSync(RECIPE_FILE, JSON.stringify(initialData, null, 2));
};

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Login endpoint
app.post('/api/login', (req, res) => {
    const {ADMIN_USER, ADMIN_PASS} = process.env;
    const {username, password} = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({user: username}, process.env.JWT_SECRET, {expiresIn: '1h'});
        return res.json({token});
    }
    return res.status(401).json({message: 'Invalid credentials'});
});

// GET: Fetch all recipes
app.get('/api/recipes', (req, res) => {
    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.json(JSON.parse(data));
    });
});

// GET: Get a specific recipe by ID
app.get('/api/recipe/:id', (req, res) => {
    const recipeId = req.params.id;

    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading recipe file:', err);
            return res.status(500).send('Error reading recipe database');
        }

        try {
            const jsonData = JSON.parse(data);

            if (!jsonData.recipes || !Array.isArray(jsonData.recipes)) {
                console.error('Invalid recipe data structure');
                return res.status(500).send('Invalid recipe data structure');
            }

            const recipe = jsonData.recipes.find(recipe => recipe.id === recipeId);

            if (recipe) {
                return res.json(recipe);
            } else {
                return res.status(404).send('Recipe not found');
            }
        } catch (parseError) {
            console.error('Error parsing recipe data:', parseError);
            return res.status(500).send('Error processing recipe data');
        }
    });
});

// GET: Convert recipe for Bring
app.get('/api/bring-recipe/:id', (req, res) => {
    const recipeId = req.params.id;
    const convertRecipe = recipe => ({
        author: 'MelanX',
        linkOutUrl: recipe.url,
        imageUrl: recipe.image || '',
        name: recipe.title,
        items: [
            ...recipe.ingredients.map(ingredient => ({
                itemId: ingredient.name,
                spec: `${String(ingredient.amount || '').replace('.', ',')} ${ingredient.unit || ''}`
            })),
            ...recipe.spices.map(spice => ({
                itemId: spice,
                stock: true
            }))
        ]
    });
    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading recipe file:', err);
            return res.status(500).send('Error reading recipe database');
        }

        try {
            const jsonData = JSON.parse(data);

            if (!jsonData.recipes || !Array.isArray(jsonData.recipes)) {
                console.error('Invalid recipe data structure');
                return res.status(500).send('Invalid recipe data structure');
            }

            const recipe = jsonData.recipes.find(recipe => recipe.id === recipeId);

            if (recipe) {
                return res.json(convertRecipe(recipe));
            } else {
                return res.status(404).send('Recipe not found');
            }
        } catch (parseError) {
            console.error('Error parsing recipe data:', parseError);
            return res.status(500).send('Error processing recipe data');
        }
    });
});

// POST: Add a new recipe
app.post('/api/recipes', authenticateToken, async (req, res) => {
    const {nanoid} = await import('nanoid');
    const newRecipe = req.body;
    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        const jsonData = JSON.parse(data);
        newRecipe.id = nanoid(10);
        jsonData.recipes.push(newRecipe);
        fs.writeFile(RECIPE_FILE, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.status(201).json(newRecipe);
        });
    });
});

// PUT: Update an existing recipe
app.put('/api/recipe/:id', authenticateToken, async (req, res) => {
    const recipeId = req.params.id;
    const updatedData = req.body;
    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        const jsonData = JSON.parse(data);
        const index = jsonData.recipes.findIndex(r => r.id === recipeId);
        if (index === -1) {
            return res.status(404).send('Recipe not found');
        }
        updatedData.id = recipeId;
        jsonData.recipes[index] = updatedData;
        fs.writeFile(RECIPE_FILE, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.json(updatedData);
        });
    });
});

if (!fs.existsSync(RECIPE_FILE)) {
    createInitialRecipeFile();
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
