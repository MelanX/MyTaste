import React, { useEffect } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import RecipeList from './components/RecipeList';
import NextUpList from './components/NextUpList';
import RecipeForm from './components/RecipeForm';
import RecipeDetail from './components/RecipeDetail';
import Login from './components/Login';
import ImportRecipe from './components/ImportRecipe';
import PaperGrain from './components/PaperGrain';
import Sidebar from './components/Sidebar';
import './App.css';
import type { RecipeFormValues } from './components/RecipeForm/RecipeFormBase';
import EditRecipe from './components/EditRecipe';
import { apiFetch } from './utils/apiService';
import RequireLogin from './components/RequireLogin';
import ProtectedRoute from './components/ProtectedRoute';
import Config from './components/Config';
import { fetchAndCache } from './utils/recipesCache';
import { RecipeFiltersProvider } from './context/RecipeFiltersContext';
import { useToast } from './context/ToastContext';
import { NextUpProvider } from './context/NextUpContext';
import { CollectionsProvider } from './context/CollectionsContext';
import CollectionList from './components/CollectionList';
import CollectionDetail from './components/CollectionDetail';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App: React.FC = () => {
  const toast = useToast();
  const handleRecipeSubmit = async (recipeFormValues: RecipeFormValues): Promise<Response> => {
    const response = await apiFetch('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipeFormValues),
    });

    if (response.ok) {
      await fetchAndCache();
      toast.success('Rezept erstellt');
    } else {
      toast.error('Rezept konnte nicht erstellt werden');
    }

    return response;
  };

  return (
    <RecipeFiltersProvider>
      <NextUpProvider>
        <CollectionsProvider>
          <div className="app-container">
            <Sidebar />
            <div className="content">
              <PaperGrain grainColor={'#ff0000'} />
              <Link
                to="/"
                className="logo-link"
                onClick={() => {
                  if (window.location.pathname === '/') window.location.reload();
                }}
              >
                <img src="/text.png" alt="MyTaste" className="logo-image" />
              </Link>
              <ScrollToTop />
              <Routes>
                <Route
                  path="/"
                  element={
                    <RequireLogin>
                      <RecipeList />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/config"
                  element={
                    <ProtectedRoute>
                      <Config />
                    </ProtectedRoute>
                  }
                />
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
                <Route
                  path="/recipe/:id"
                  element={
                    <RequireLogin>
                      <RecipeDetail />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/next-up"
                  element={
                    <RequireLogin>
                      <NextUpList />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/collections"
                  element={
                    <RequireLogin>
                      <CollectionList />
                    </RequireLogin>
                  }
                />
                <Route
                  path="/collections/:id"
                  element={
                    <RequireLogin>
                      <CollectionDetail />
                    </RequireLogin>
                  }
                />
              </Routes>
            </div>
          </div>
        </CollectionsProvider>
      </NextUpProvider>
    </RecipeFiltersProvider>
  );
};

export default App;
