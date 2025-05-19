import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import Login from './components/Login';
import ImportRecipe from './components/ImportRecipe';
import { useAuth } from './context/AuthContext';
import PaperGrain from './components/PaperGrain';
import Sidebar from './components/Sidebar';
import './App.css';
import { Recipe } from './types/Recipe';
import { RecipeFormValues } from "./components/RecipeForm/RecipeFormBase";
import EditRecipe from "./components/EditRecipe";
import { apiFetch } from "./utils/api_service";
import RequireLogin from "./components/RequireLogin";

const App: React.FC = () => {
    const {token} = useAuth();
    const [recipes, setRecipes] = React.useState<Recipe[]>([]);

    React.useEffect(() => {
        apiFetch('/api/recipes')
            .then((res) => res.json())
            .then((data) => setRecipes(data.recipes))
            .catch(err => console.error('Failed to fetch recipes:', err));
    }, [token]);

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
                    <Route path="/" element={
                        <RequireLogin>
                            <RecipeList recipes={recipes} />
                        </RequireLogin>
                    } />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/new-recipe"
                        element={
                            <RequireLogin>
                                <RecipeForm onSubmit={handleRecipeSubmit} />
                            </RequireLogin>
                        }
                    />
                    <Route
                        path="/import-recipe"
                        element={
                            <RequireLogin>
                                <ImportRecipe onSubmit={updateRecipes} />
                            </RequireLogin>
                        }
                    />
                    <Route
                        path="/edit/:id"
                        element={
                            <RequireLogin>
                                <EditRecipe />
                            </RequireLogin>
                        }
                    />
                    <Route path="/recipe/:id" element={
                        <RequireLogin>
                            <RecipeDetail />
                        </RequireLogin>
                    } />
                </Routes>
            </div>
        </div>
    );
};

export default App;
