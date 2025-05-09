import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {Recipe} from '../../types/Recipe';
import styles from './styles.module.css';

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
        <div className={styles.recipeDetail}>
            <h1>{recipe.title}</h1>
            <div className={styles.contentWrapper}>
                <div className={styles.mainContent}>
                    <div className={styles.instructionsCard}>
                        <h3 className={styles.instructionsTitle}>Zubereitung</h3>
                        <div className={styles.instructionsList}>
                            {recipe.instructions.map((paragraph, index) => (
                                <div key={index} className={styles.instructionStep}>
                                    <div className={styles.stepNumber}>{index + 1}</div>
                                    <div className={styles.stepText}>{paragraph}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <a href={recipe.url} className={styles.originalRecipeButton} target="_blank"
                           rel="noopener noreferrer">Zum Originalrezept</a>
                    </div>
                </div>
                <div className={styles.sidebar}>
                    <div className={styles.sidebarCard}>
                        {recipe.image && (
                            <div className={styles.sidebarImageContainer}>
                                <img
                                    src={recipe.image}
                                    alt={recipe.title}
                                    className={styles.sidebarImage}
                                />
                            </div>
                        )}

                        <div className={styles.sidebarContent}>
                            <div className={styles.ingredientsCard}>
                                <h3 className={styles.ingredientsTitle}>Zutaten</h3>
                                <div className={styles.ingredientsTable}>
                                    {recipe.ingredients.map((ingredient, index) => (
                                        <div key={index} className={styles.ingredientRow}>
                                            <div className={styles.ingredientAmount}>
                                                {formattedAmount(ingredient.amount)}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                                            </div>
                                            <div className={styles.ingredientName}>
                                                {ingredient.name}
                                            </div>
                                            {ingredient.note && (
                                                <div className={styles.ingredientNote}>
                                                    <i className="fa-solid fa-circle-exclamation"/>
                                                    <span>{ingredient.note}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {recipe.spices && recipe.spices.length > 0 && (
                                <div className={styles.spicesCard}>
                                    <h3 className={styles.spicesTitle}>Gewürze</h3>
                                    <div className={styles.spicesContainer}>
                                        {recipe.spices.map((spice, index) => (
                                            <div key={index} className={styles.spiceTag}>
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

const formattedAmount = (amount: number | string | undefined) => {
    if (amount === undefined) return '';
    amount = parseFloat(String(amount).replace(',', '.'));
    if (amount === 0) return '';
    if (amount === 0.2) return '⅕';
    if (amount === 0.25) return '¼';
    if (amount === 0.4) return '⅖';
    if (amount === 0.5) return '½';
    if (amount === 0.6) return '⅗';
    if (amount === 0.8) return '⅘';
    return String(amount).replace('.', ',');
};

export default RecipeDetail;
