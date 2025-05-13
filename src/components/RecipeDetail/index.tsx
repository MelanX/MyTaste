import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Recipe } from '../../types/Recipe';
import styles from './styles.module.css';
import BringButton from "../BringButton";
import RecipeSidebar from './Sidebar';
import RecipeInstructions from './Instructions';
import { QRCodeSVG } from 'qrcode.react';

const RecipeDetail: React.FC = () => {
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = useParams<{ id: string }>();
    const buttonsRowRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const response = await fetch(`/api/recipe/${id}`);
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
            <div className={styles.titleContainer}>
                <h1>{recipe.title}</h1>
                <div className={styles.qrCode}>
                    Im Browser aufrufen:
                    <QRCodeSVG value={currentUrl} size={50} fgColor={'#d99c5e'} />
                </div>
            </div>
            <div className={styles.contentWrapper}>
                <div className={styles.mainContent}>
                    <RecipeInstructions instructions={recipe.instructions} />
                    <div className={`${styles.buttonsRow} no-print`} ref={buttonsRowRef}>
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
