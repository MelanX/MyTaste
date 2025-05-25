import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Recipe } from '../../types/Recipe';
import styles from './styles.module.css';
import BringButton from "../BringButton";
import RecipeSidebar from './RecipeSidebar';
import RecipeInstructions from './Instructions';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api_service";

const RecipeDetail: React.FC = () => {
    const {isAuthenticated} = useAuth();
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const {id} = useParams<{ id: string }>();
    const buttonsRowRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const currentUrl = window.location.origin + location.pathname;

    useEffect(() => {
        const fetchRecipe = async () => {
            try {
                const response = await apiFetch(`/api/recipe/${id}`);
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
            <div className={styles.titleContainer}>
                <h1>{recipe.title}
                    {isAuthenticated && (
                        <Link to={`/edit/${recipe.id}`} className={`${styles.editRecipeButton} no-print`}>
                            <i className="fa-solid fa-pen" />
                        </Link>
                    )}
                </h1>
                <div className={styles.qrCode}>
                    Im Browser aufrufen:
                    <QRCodeSVG value={currentUrl} size={50} fgColor={'#d99c5e'} />
                </div>
            </div>
            <div className={styles.contentWrapper}>
                <div className={styles.mainContent}>
                    <RecipeInstructions instructions={recipe.instructions} />
                    <div className={`${styles.buttonsRow} no-print`} ref={buttonsRowRef}>
                        {recipe.url && (
                            <a href={recipe.url} className={styles.originalRecipeButton} target="_blank"
                               rel="noopener noreferrer">Zum Originalrezept</a>
                        )}
                        <div className={styles.bringButton}>
                            <BringButton recipeId={recipe.id} />
                        </div>
                    </div>
                </div>
                <RecipeSidebar recipe={recipe} updateRecipe={r => setRecipe(r)} />
            </div>
        </div>
    );
};

export default RecipeDetail;
