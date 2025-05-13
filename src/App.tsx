import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import Login from './components/Login';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PaperGrain from './components/PaperGrain';
import Sidebar from './components/Sidebar';
import './App.css';
import { Ingredient, Recipe } from './types/Recipe';

const App: React.FC = () => {
    const { token } = useAuth();
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);

    React.useEffect(() => {
        fetch('/api/recipes')
            .then((res) => res.json())
            .then((data) => setRecipes(data.recipes))
            .catch(err => console.error('Failed to fetch recipes:', err));
    }, []);

    const handleRecipeSubmit = async (
        title: string,
        instructions: string[],
        url: string,
        ingredients: Ingredient[],
        spices: string[],
        image?: string
    ) => {
        try {
            await fetch('/api/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ title, instructions, url, ingredients, spices, image }),
            });
            const res = await fetch('/api/recipes');
            if (res.ok) {
                const data = await res.json();
                setRecipes(data.recipes);
            }
        } catch (error) {
            console.error('Error submitting recipe:', error);
        }
    };

    return (
        <div className="app-container">
            <Sidebar />
            <div className="content">
                <PaperGrain
                    backgroundColor="#f8f4e9"
                    grainColor="#FF0000"
                    grainDensity={15000}
                    grainOpacity={0.08}
                    maxGrainSize={1.5}
                />
                <Link to="/">
                    <img src="/text.png" alt="My Taste" className="logo-image" style={{ cursor: 'pointer' }} />
                </Link>
                <Routes>
                    <Route path="/" element={<RecipeList recipes={recipes} />} />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/new-recipe"
                        element={
                            <ProtectedRoute>
                                <RecipeForm onSubmit={handleRecipeSubmit} />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/recipe/:id" element={<RecipeDetail />} />
                </Routes>
            </div>
        </div>
    );
};

export default App;
