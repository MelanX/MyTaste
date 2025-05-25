import React from 'react';
import { Recipe } from '../../types/Recipe';
import styles from './styles.module.css';
import { formatAmount } from '../../utils/formatters';
import { getConfig } from "../../config";
import { updateRecipeStatus } from "../../utils/api_service";
import { useAuth } from "../../context/AuthContext";

interface RecipeSidebarProps {
    recipe: Recipe;
    hideImage?: boolean;
    updateRecipe?: (recipe: Recipe) => void;
}

const RecipeSidebar: React.FC<RecipeSidebarProps> = ({recipe, hideImage = false, updateRecipe = () => {}}) => {
    const {isAuthenticated} = useAuth();

    const handleToggleCook = async () => {
        if (!recipe) return;
        const newState: boolean = !recipe.status?.cookState;
        try {
            const updated = await updateRecipeStatus(recipe.id, {cookState: newState});
            updateRecipe({...recipe, status: {...recipe.status, cookState: updated.cookState}});
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleFavorite = async () => {
        if (!recipe) return;
        const newFav = !recipe.status?.favorite;
        try {
            const updated = await updateRecipeStatus(recipe.id, {favorite: newFav});
            updateRecipe({...recipe, status: {...recipe.status, favorite: updated.favorite}});
        } catch (err) {
            console.error(err);
        }
    };

    const status = recipe.status || {cookState: false, favorite: false};
    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarCard}>
                {!hideImage && (
                    <div className={styles.sidebarImageContainer}>
                        {isAuthenticated && (
                            <div className={styles.buttonRow}>
                                <div onClick={handleToggleCook}
                                     className={`${styles.cookIcon} no-print`}>
                                    {status.cookState ? (
                                        <i className="fa-solid fa-check-circle"
                                           title="Bereits gekocht" />
                                    ) : (
                                        <i className="fa-solid fa-question"
                                           title="Noch nicht gekocht" />
                                    )}
                                </div>
                                <div className={`${styles.favIcon} no-print`}
                                     onClick={handleToggleFavorite}>
                                    {recipe.status?.favorite ? (
                                        <i
                                            className="fa-solid fa-heart"
                                            title="Favorit"
                                        />
                                    ) : (
                                        <i
                                            className="fa-regular fa-heart"
                                            title="Kein Favorit"
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                        <img
                            src={
                                recipe.image
                                    ? (recipe.image.startsWith('/uploads')
                                        ? `${getConfig().API_URL}${recipe.image}`
                                        : recipe.image)
                                    : '/placeholder.webp'
                            }
                            alt={recipe.title}
                            className={styles.sidebarImage}
                        />
                    </div>
                )}

                <div className={styles.sidebarContent}>
                    <div className={styles.ingredientsCard}>
                        <h3 className={styles.ingredientsTitle}>Zutaten</h3>
                        <div className={styles.ingredientsTable}>
                            {recipe.ingredients.map((ingredient, index) => {
                                    const [primaryName, ...rest] = ingredient.name.split(',');
                                    const nameSpecification = rest.length > 0 ? rest.join(',') : '';

                                    return (
                                        <div key={index} className={styles.ingredientRow}>
                                            <div className={styles.ingredientAmount}>
                                                {formatAmount(ingredient.amount)}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                                            </div>
                                            <div className={styles.ingredientName}>
                                                <span>{primaryName}</span>
                                                {nameSpecification && (
                                                    <span className={styles.nameSpecification}>{nameSpecification}</span>
                                                )}
                                            </div>
                                            {ingredient.note && (
                                                <div className={styles.ingredientNote}>
                                                    <i className="fa-solid fa-circle-exclamation" />
                                                    <span>{ingredient.note}</span>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }
                            )}
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
    );
};

export default RecipeSidebar;
