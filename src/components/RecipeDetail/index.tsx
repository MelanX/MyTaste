// src/components/index.tsx
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Recipe} from '../../types/Recipe';
import './custom.css'

const RecipeDetail: React.FC = () => {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const {id} = useParams<{ id: string }>();

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/recipe/${id}`);
                if (!response.ok) {
                    throw new Error('Rezept konnte nicht geladen werden');
                }
                const data = await response.json();
                setRecipe(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
            } finally {
                setLoading(false);
            }
        };

        fetchRecipe();
    }, [id]);

    if (loading) return <div>Lade Rezept...</div>;
    if (error) return <div>Fehler: {error}</div>;
    if (!recipe) return <div>Rezept nicht gefunden</div>;

    return (
        <div className="recipe-detail">
            <div className="content-wrapper">
                <div className="main-content">
                    <h1>{recipe.title}</h1>
                    <div className="instructions-card">
                        <h3 className="instructions-title">Zubereitung</h3>
                        <div className="instructions-list">
                            {recipe.description.map((paragraph, index) => (
                                <div key={index} className="instruction-step">
                                    <div className="step-number">{index + 1}</div>
                                    <div className="step-text">{paragraph}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <a href={recipe.url} className="original-recipe-button" target="_blank" rel="noopener noreferrer">Zum Originalrezept</a>
                    </div>
                </div>
                <div className="sidebar">
                    <div className="sidebar-card">
                        {recipe.image && (
                            <div className="sidebar-image-container">
                                <img
                                    src={recipe.image}
                                    alt={recipe.title}
                                    className="sidebar-image"
                                />
                            </div>
                        )}

                        <div className="sidebar-content">
                            <div className="ingredients-card">
                                <h3 className="ingredients-title">Zutaten</h3>
                                <div className="ingredients-table">
                                    {recipe.ingredients.map((ingredient, index) => (
                                        <div key={index} className="ingredient-row">
                                            <div className="ingredient-amount">
                                                {formattedAmount(ingredient.amount)}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                                            </div>
                                            <div className="ingredient-name">
                                                {ingredient.name}
                                            </div>
                                            {ingredient.note && (
                                                <div className="ingredient-note">
                                                    <i className="fa-solid fa-circle-exclamation"/>
                                                    <span>{ingredient.note}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {recipe.spices && recipe.spices.length > 0 && (
                                <div className="spices-card">
                                    <h3 className="spices-title">Gewürze</h3>
                                    <div className="spices-container">
                                        {recipe.spices.map((spice, index) => (
                                            <div key={index} className="spice-tag">
                                                {spice}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const formattedAmount = (amount: number | undefined) => {
    if (amount === undefined) return '1';
    if (amount === 0) return '';
    if (amount === 0.5) return '½';
    if (amount === 0.25) return '¼';
    return amount;
}

export default RecipeDetail;
