import React, {useEffect, useState} from 'react';
import {Route, Routes} from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import {Ingredient, Recipe} from './types/Recipe';
import './App.css';
import PaperGrain from "./components/PaperGrain";
import RecipeDetail from "./components/RecipeDetail";

const App: React.FC = () => {
    const [recipes, setRecipes] = useState<Recipe[]>([]);

    const fetchRecipes = async () => {
        console.log('Fetching from:', `${process.env.REACT_APP_API_URL}/recipes`);
        const response = await fetch(`${process.env.REACT_APP_API_URL}/recipes`);

        if (!response.ok) {
            console.error('Error fetching recipes:', response.statusText);
            return;
        }
        const data = await response.json();
        setRecipes(data.recipes);
    };

    const handleRecipeSubmit = async (
        title: string,
        description: string,
        url: string,
        ingredients: Ingredient[],
        spices: string[],
        image?: string
    ) => {
        await fetch(`${process.env.REACT_APP_API_URL}/recipes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                description,
                url,
                ingredients,
                spices,
                image
            }),
        });

        fetchRecipes();
    };


    useEffect(() => {
        fetchRecipes();
    }, []);

    return (
        <div className="app-container">
            <PaperGrain
                backgroundColor="#f8f4e9"
                grainColor="#FF0000"
                grainDensity={15000}
                grainOpacity={0.08}
                maxGrainSize={1.5}
            />
            <div className="content">
                <img
                    src="/text.png"
                    alt="My Taste"
                    className="logo-image"
                    onClick={() => window.location.href = '/'}
                    style={{cursor: 'pointer'}}
                />
                <Routes>
                    <Route path="/" element={<RecipeList recipes={recipes}/>}/>
                    <Route path="/new-recipe" element={<RecipeForm onSubmit={handleRecipeSubmit}/>}/>
                    <Route path="/recipe/:id" element={<RecipeDetail/>}/>
                </Routes>
            </div>
        </div>
    );
};

export default App;
