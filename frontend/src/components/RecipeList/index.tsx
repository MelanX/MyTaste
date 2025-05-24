import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Recipe } from '../../types/Recipe';
import BringButton from '../BringButton';
import FilterSection from '../FilterSection';
import styles from './styles.module.css';

interface RecipeListProps {
    recipes: Recipe[]
}

const levenshtein = (a: string, b: string): number => {
    const matrix: number[][] = [];
    const alen = a.length, blen = b.length;
    if (!alen) return blen;
    if (!blen) return alen;
    for (let i = 0; i <= blen; i++) matrix[i] = [i];
    for (let j = 0; j <= alen; j++) matrix[0][j] = j;
    for (let i = 1; i <= blen; i++) {
        for (let j = 1; j <= alen; j++) {
            const cost = b[i - 1] === a[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[blen][alen];
}

const RecipeList: React.FC<RecipeListProps> = ({recipes}) => {
    const {isAuthenticated} = useAuth();

    const [titleFilter, setTitleFilter] = React.useState('');
    const [selectedIngredients, setSelectedIngredients] = React.useState<string[]>([]);

    // derive full unique ingredient list
    const allIngredients = React.useMemo(() => {
        const set = new Set<string>();
        recipes.forEach(r =>
            r.ingredients.forEach(i => set.add(i.name))
        );

        return Array.from(set).sort();
    }, [recipes]);

    const toggleIngredient = (ing: string) => {
        setSelectedIngredients(sel =>
            sel.includes(ing)
                ? sel.filter(x => x !== ing)
                : [...sel, ing]
        );
    }

    // final filtered recipes
    const filtered = React.useMemo(() => {
        const term = titleFilter.trim().toLowerCase();
        return recipes.filter(r => {
            // title match
            const title = r.title.toLowerCase();
            const titleOk =
                !term ||
                title.includes(term) ||
                levenshtein(term, title) <= 2;

            if (!titleOk) return false;

            // ingredient match (every selected ingredient must be in a recipe)
            if (selectedIngredients.length > 0) {
                const names = r.ingredients.map(i => i.name.split(',')[0].trim());
                return selectedIngredients.every(si => names.includes(si));
            }

            return true;
        })
    }, [recipes, titleFilter, selectedIngredients]);

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

            <FilterSection
                allIngredients={allIngredients}
                selectedIngredients={selectedIngredients}
                onIngredientToggle={toggleIngredient}
                titleFilter={titleFilter}
                onTitleChange={setTitleFilter}
            />

            <div className={styles.recipeCardsGrid}>
                {filtered.map(recipe => (
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
