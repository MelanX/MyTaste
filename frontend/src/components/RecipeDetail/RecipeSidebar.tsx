import React from 'react';
import { Recipe } from '../../types/Recipe';
import styles from './styles.module.css';
import { formatAmount } from '../../utils/formatters';

interface RecipeSidebarProps {
    recipe: Recipe;
    hideImage?: boolean;
}

const RecipeSidebar: React.FC<RecipeSidebarProps> = ({recipe, hideImage = false}) => {
    return (
        <div className={styles.sidebar}>
            <div className={styles.sidebarCard}>
                {!hideImage && recipe.image && (
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
