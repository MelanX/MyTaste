import React from 'react';
import {Link} from 'react-router-dom';
import {Recipe} from '../../types/Recipe';
import styles from './styles.module.css';

interface RecipeListProps {
    recipes: Recipe[];
}

const RecipeList: React.FC<RecipeListProps> = ({recipes}) => {
    return (
        <div>
            <h2>Rezepte <Link to="/new-recipe"><input className={styles.addRecipeButton} type="button" value="+"/></Link></h2>
            <div className={styles.recipeCardsGrid}>
                {recipes.map((recipe) => (
                    <div key={recipe.id} className={styles.recipeCard}>
                        <div className={styles.recipeCardImageContainer}>
                            <img
                                src={recipe.image}
                                alt={recipe.title}
                                className={styles.recipeCardImage}
                            />
                        </div>
                        <div className={styles.recipeCardContent}>
                            <h3 className={styles.recipeCardTitle}>{recipe.title}</h3>
                            <Link to={`/recipe/${recipe.id}`} className={styles.recipeCardButton}>
                                Rezept ansehen
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecipeList;
