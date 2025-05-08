import React from 'react';
import {Link} from 'react-router-dom';
import {Recipe} from '../../types/Recipe';
import './custom.css';

interface RecipeListProps {
    recipes: Recipe[];
}

const RecipeList: React.FC<RecipeListProps> = ({recipes}) => {
    return (
        <div>
            <h2>Rezepte</h2>
            <div className="recipe-cards-grid">
                {recipes.map((recipe) => (
                    <div key={recipe.id} className="recipe-card">
                        <div className="recipe-card-image-container">
                            <img
                                src={recipe.image}
                                alt={recipe.title}
                                className="recipe-card-image"
                            />
                        </div>
                        <div className="recipe-card-content">
                            <h3 className="recipe-card-title">{recipe.title}</h3>
                            <Link to={`/recipe/${recipe.id}`} className="recipe-card-button">
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
