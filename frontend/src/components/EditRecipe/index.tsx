import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RecipeFormBase, { type RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import type { Recipe } from '../../types/Recipe';
import { apiFetch } from '../../utils/apiService';
import Toast from '../Toast';

const EditRecipe: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<RecipeFormValues | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    apiFetch(`/api/recipe/${id}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Rezept nicht gefunden');
        return r.json();
      })
      .then((recipe: Recipe) => {
        setInitial({
          title: recipe.title,
          instructions: recipe.instructions,
          url: recipe.url,
          image: recipe.image,
          ingredient_sections: recipe.ingredient_sections ?? [],
          spices: recipe.spices || [],
          recipeType: recipe.recipeType,
          dietaryRestrictions: recipe.dietaryRestrictions,
        });
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setLoadError(err.message ?? 'Fehler beim Laden');
      });
    return () => controller.abort();
  }, [id]);

  const handleUpdate = async (values: RecipeFormValues): Promise<Response> => {
    const response = await apiFetch(`/api/recipe/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      navigate(`/recipe/${id}`);
    }

    return response;
  };

  const handleDeletion = async (): Promise<Response> => {
    const response = await apiFetch(`/api/recipe/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      navigate('/');
    }

    return response;
  };

  if (loadError)
    return (
      <div>
        <p>Fehler: {loadError}</p>
        <Toast message={loadError} onDismiss={() => setLoadError(null)} type="error" />
      </div>
    );

  if (!initial) return <div>Lade Rezept…</div>;

  return (
    <RecipeFormBase
      initial={initial}
      submitLabel="Rezept bearbeiten"
      onSubmit={handleUpdate}
      onDelete={handleDeletion}
      showImportButton={false}
    />
  );
};

export default EditRecipe;
