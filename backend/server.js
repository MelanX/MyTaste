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
    const recipeId = req.params.id;
    
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

// GET: Get a specific recipe by ID
app.get('/api/bring-recipe/:id', (req, res) => {
    const recipeId = req.params.id;

    const convertRecipe = (recipe) => {
        return {
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
        }
    }

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
app.post('/api/recipes', async (req, res) => {
    const { nanoid } = await import('nanoid');
    const newRecipe = req.body;

    fs.readFile(RECIPE_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        const jsonData = JSON.parse(data);
        newRecipe.id = nanoid(10);
        jsonData.recipes.push(newRecipe);

        fs.writeFile(RECIPE_FILE, JSON.stringify(jsonData, null, 2), (err) => {
            if (err) return res.status(500).send(err);
            res.status(201).send(newRecipe);
        });
    });
});

if (!fs.existsSync(RECIPE_FILE)) {
    createInitialRecipeFile();
}

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
