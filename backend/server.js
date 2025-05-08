// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 5000;

const corsOptions = {
    origin: '*', // In production, specify exact origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

const RECIPE_FILE = 'data/recipes.json';

app.use(cors(corsOptions));
app.use(bodyParser.json());

// GET: Fetch all recipes
app.get('/api/recipes', (req, res) => {
    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.json(JSON.parse(data));
    });
});

// GET: Get a specific recipe by ID
app.get('/api/recipe/:id', (req, res) => {
    const recipeId = parseInt(req.params.id);
    
    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading recipe file:', err);
            return res.status(500).send('Error reading recipe database');
        }
        
        try {
            const jsonData = JSON.parse(data);
            
            // Check if the structure contains a recipes array
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

// POST: Add a new recipe
app.post('/api/recipes', (req, res) => {
    const newRecipe = req.body;

    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        const jsonData = JSON.parse(data);
        newRecipe.id = jsonData.recipes.length + 1; // todo better id configuration
        jsonData.recipes.push(newRecipe);

        fs.writeFile(RECIPE_FILE, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.status(201).send(newRecipe);
        });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
