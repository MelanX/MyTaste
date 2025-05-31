import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Recipe } from '../../types/Recipe';
import BringButton from '../BringButton';
import FilterSection from '../FilterSection';
import styles from './styles.module.css';
import { getConfig } from "../../config";
import { updateRecipeStatus } from "../../utils/api_service";
import { useRecipes } from "../../hooks/useRecipes";

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

const RecipeList: React.FC = () => {
    const {isAuthenticated} = useAuth();

    const { recipes, loading, error } = useRecipes();

    const [titleFilter, setTitleFilter] = React.useState('');
    const [selectedIngredients, setSelectedIngredients] = React.useState<string[]>([]);
    const [ localRecipes, setLocalRecipes ] = React.useState<Recipe[]>([]);

    React.useEffect(() => {
        setLocalRecipes(recipes ?? []);
    }, [recipes]);

    // derive full unique ingredient list
    const allIngredients = React.useMemo(() => {
        const set = new Set<string>();
        localRecipes.forEach(r =>
            r.ingredients.forEach(i => set.add(i.name))
        );

        return Array.from(set).sort();
    }, [localRecipes]);

    const toggleIngredient = (ing: string) => {
        setSelectedIngredients(sel =>
            sel.includes(ing)
                ? sel.filter(x => x !== ing)
                : [...sel, ing]
        );
    }

    const handleToggleFavorite = async (recipeId: string, favorite: boolean) => {
        try {
            const updated = await updateRecipeStatus(recipeId, {favorite});
            setLocalRecipes(recipes =>
                recipes.map(r =>
                    r.id === recipeId
                        ? {...r, status: {...r.status, favorite: updated.favorite}}
                        : r
                )
            );
        } catch (err) {
            console.error(err);
        }
    }

    const markCooked = async (recipeId: string) => {
        try {
            const updated = await updateRecipeStatus(recipeId, {cookState: true});
            setLocalRecipes(recipes =>
                recipes.map(r =>
                    r.id === recipeId
                        ? {...r, status: {...r.status, cookState: updated.cookState}}
                        : r
                )
            );
        } catch (err) {
            console.error(err);
        }
    }

    // final filtered recipes
    const filtered = React.useMemo(() => {
        const term = titleFilter.trim().toLowerCase();
        return localRecipes.filter(r => {
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
    }, [localRecipes, titleFilter, selectedIngredients]);

    if (loading && recipes === null) return <p>Lade Rezepte...</p>;
    if (error) return <p>Fehler: { error.message }</p>;
    if (filtered.length === 0) return <p>Keine Rezepte gefunden</p>;

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
                            {/* cook-state in top-left */}
                            {!recipe.status?.cookState && (
                                <div className={styles.cookIcon}>
                                    <i
                                        className="fa-solid fa-question"
                                        title="Noch nicht gekocht"
                                        onClick={e => markCooked(recipe.id)}
                                    />
                                </div>
                            )}
                            {/* favorite in top-right */}
                            <div className={styles.favIcon}>
                                {recipe.status?.favorite ? (
                                    <i
                                        className="fa-solid fa-heart"
                                        title="Favorit"
                                        onClick={e => handleToggleFavorite(recipe.id, false)}
                                    />
                                ) : (
                                    <i
                                        className="fa-regular fa-heart"
                                        title="Kein Favorit"
                                        onClick={e => handleToggleFavorite(recipe.id, true)}
                                    />
                                )}
                            </div>
                            <img
                                src={
                                    recipe.image
                                        ? (recipe.image.startsWith('/uploads')
                                            ? `${getConfig().API_URL}${recipe.image}`
                                            : recipe.image)
                                        : '/placeholder.webp'
                                }
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
