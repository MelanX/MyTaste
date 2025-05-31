import React from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import Login from './components/Login';
import ImportRecipe from './components/ImportRecipe';
import PaperGrain from './components/PaperGrain';
import Sidebar from './components/Sidebar';
import './App.css';
import { RecipeFormValues } from "./components/RecipeForm/RecipeFormBase";
import EditRecipe from "./components/EditRecipe";
import { apiFetch } from "./utils/api_service";
import RequireLogin from "./components/RequireLogin";
import ProtectedRoute from "./components/ProtectedRoute";
import Config from "./components/Config";
import { fetchAndCache } from "./utils/recipesCache";

const App: React.FC = () => {
    const handleRecipeSubmit = async (recipeFormValues: RecipeFormValues): Promise<Response> => {
        const response = await apiFetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipeFormValues),
        });

        if (response.ok) {
            await fetchAndCache();
        }

        return response;
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
                            <RecipeList />
                        </RequireLogin>
                    } />
                    <Route path="/config" element={
                        <ProtectedRoute>
                            <Config />
                        </ProtectedRoute>
                    } />
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
                                <ImportRecipe />
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
