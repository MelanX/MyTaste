import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Recipe } from '../../types/Recipe';
import BringButton from '../BringButton';
import styles from './styles.module.css';

interface RecipeListProps {
    recipes: Recipe[];
}

const RecipeList: React.FC<RecipeListProps> = ({recipes}) => {
    const {isAuthenticated} = useAuth();

    return (
        <div>
            <h2>
                Rezepte{' '}
                {isAuthenticated && (
                    <Link to="/new-recipe" role="button">
                        <button type="button" className={styles.addRecipeButton}>
                            <i className="fa-solid fa-plus" />
                        </button>
                    </Link>
                )}
            </h2>
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
                            <BringButton recipeId={recipe.id} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecipeList;
