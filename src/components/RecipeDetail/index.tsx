import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Recipe } from '../../types/Recipe';
import styles from './styles.module.css';
import BringButton from "../BringButton";
import RecipeSidebar from './Sidebar';
import RecipeInstructions from './Instructions';

const RecipeDetail: React.FC = () => {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = useParams<{ id: string }>();
    const buttonsRowRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (buttonsRowRef.current && window.innerWidth >= 768) {
            const buttonElements = buttonsRowRef.current.querySelectorAll<HTMLElement>(
                `.${styles.originalRecipeButton}, .${styles.bringButton} > *`
            );

            if (buttonElements.length > 0) {
                // Find the widest button
                let maxWidth = 0;
                buttonElements.forEach(button => {
                    const width = button.offsetWidth;
                    if (width > maxWidth) {
                        maxWidth = width;
                    }
                });

                // Apply the maximum width to all buttons
                buttonElements.forEach(button => {
                    button.style.width = `${maxWidth + 1}px`;
                });
            }
        }
    }, [recipe]); // Run this effect when recipe data is loaded

    if (loading) return <div>Lade Rezept...</div>;
    if (error) return <div>Fehler: {error}</div>;
    if (!recipe) return <div>Rezept nicht gefunden</div>;

    return (
        <div className={styles.recipeDetail}>
            <h1>{recipe.title}</h1>
            <div className={styles.contentWrapper}>
                <div className={styles.mainContent}>
                    <RecipeInstructions instructions={recipe.instructions} />
                    <div className={styles.buttonsRow} ref={buttonsRowRef}>
                        <a href={recipe.url} className={styles.originalRecipeButton} target="_blank"
                           rel="noopener noreferrer">Zum Originalrezept</a>
                        <div className={styles.bringButton}>
                            <BringButton recipeId={recipe.id}/>
                        </div>
                    </div>
                </div>
                <RecipeSidebar recipe={recipe} />
            </div>
        </div>
    );
};

export default RecipeDetail;
