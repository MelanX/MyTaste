import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import Login from './components/Login';
import ImportRecipe from './components/ImportRecipe';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PaperGrain from './components/PaperGrain';
import Sidebar from './components/Sidebar';
import './App.css';
import { Recipe } from './types/Recipe';
import { RecipeFormValues } from "./components/RecipeForm/RecipeFormBase";
import EditRecipe from "./components/EditRecipe";
import { apiFetch } from "./utils/api_service";

const App: React.FC = () => {
    const {token} = useAuth();
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);

    React.useEffect(() => {
        apiFetch('/api/recipes')
            .then((res) => res.json())
            .then((data) => setRecipes(data.recipes))
            .catch(err => console.error('Failed to fetch recipes:', err));
    }, []);

    const handleRecipeSubmit = async (recipeFormValues: RecipeFormValues) => {
        try {
            await apiFetch('/api/recipes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? {Authorization: `Bearer ${token}`} : {}),
                },
                body: JSON.stringify(recipeFormValues),
            });
            await updateRecipes();
        } catch (error) {
            console.error('Error submitting recipe:', error);
        }
    };

    const updateRecipes = async () => {
        apiFetch('/api/recipes')
            .then(res => res.json())
            .then(data => setRecipes(data.recipes))
            .catch(err => console.error('Failed to fetch recipes:', err));
    };

    return (
        <div className="app-container">
            <Sidebar />
            <div className="content">
                <PaperGrain
                    grainColor={'#ff0000'}
                />
                <Link to="/" reloadDocument className="logo-link">
                    <img
                        src={`${process.env.PUBLIC_URL}/text.png`}
                        alt="MyTaste"
                        className="logo-image"
                    />
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
                    <Route
                        path="/import-recipe"
                        element={
                            <ProtectedRoute>
                                <ImportRecipe onSubmit={updateRecipes} />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/edit/:id"
                        element={
                            <ProtectedRoute>
                                <EditRecipe />
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
