import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RecipeFormBase, { RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import { Recipe } from '../../types/Recipe';

const EditRecipe: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();
    const [initial, setInitial] = useState<RecipeFormValues | null>(null);

    useEffect(() => {
        fetch(`/api/recipe/${id}`)
            .then(r => r.json())
            .then((recipe: Recipe) => {
                setInitial({
                    title: recipe.title,
                    instructions: recipe.instructions,
                    url: recipe.url,
                    image: recipe.image,
                    ingredients: recipe.ingredients,
                    spices: recipe.spices || []
                });
            });
    }, [id]);

    const handleUpdate = async (values: RecipeFormValues) => {
        await fetch(`/api/recipe/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(values)
        });
        navigate(`/recipe/${id}`);
    };

    if (!initial) return <div>Lade Rezept…</div>;

    return (
        <RecipeFormBase
            initial={initial}
            submitLabel="Rezept bearbeiten"
            onSubmit={handleUpdate}
        />
    );
};

export default EditRecipe;
