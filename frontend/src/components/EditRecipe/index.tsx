import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RecipeFormBase, { RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import { Recipe } from '../../types/Recipe';
import { apiFetch } from "../../utils/api_service";

const EditRecipe: React.FC = () => {
    const {id} = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [initial, setInitial] = useState<RecipeFormValues | null>(null);

    useEffect(() => {
        apiFetch(`/api/recipe/${id}`)
            .then(r => r.json())
            .then((recipe: Recipe) => {
                setInitial({
                    title: recipe.title,
                    instructions: recipe.instructions,
                    url: recipe.url,
                    image: recipe.image,
                    ingredient_sections: recipe.ingredient_sections ?? [],
                    spices: recipe.spices || []
                });
            });
    }, [id]);

    const handleUpdate = async (values: RecipeFormValues): Promise<Response> => {
        const response = await apiFetch(`/api/recipe/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values)
        });

        if (response.ok) {
            navigate(`/recipe/${id}`);
        }

        return response;
    };

    const handleDeletion = async (): Promise<Response> => {
        const response = await apiFetch(`/api/recipe/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            navigate('/');
        }

        return response;
    }

    if (!initial) return <div>Lade Rezept…</div>;

    return (
        <RecipeFormBase
            initial={initial}
            submitLabel="Rezept bearbeiten"
            onSubmit={handleUpdate}
            onDelete={handleDeletion}
            showImportButton={ false }
        />
    );
};

export default EditRecipe;
