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
import { useRecipeFilters } from "../../context/RecipeFiltersContext";

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

    const {
        titleFilter, setTitleFilter,
        selectedTypes, setSelectedTypes,
        typeMode, setTypeMode,
        selectedDietary, setSelectedDietary,
        dietaryMode, setDietaryMode,
        favFilter, setFavFilter,
        cookFilter, setCookFilter,
        sortMode, setSortMode,
        resetFilters,
    } = useRecipeFilters();
    const [ randomOrder, setRandomOrder ] = React.useState<string[]>([]);
    const [ localRecipes, setLocalRecipes ] = React.useState<Recipe[]>([]);

    const handleSortChange = (mode: typeof sortMode) => {
        setSortMode(mode);
        if (mode === 'random') {
            setRandomOrder([ ...localRecipes ].map(r => r.id).sort(() => Math.random() - 0.5));
        }
    };

    const hasActiveFilters = titleFilter !== '' || selectedTypes.length > 0 || selectedDietary.length > 0
        || favFilter || cookFilter !== null || sortMode !== 'alpha-asc';

    React.useEffect(() => {
        setLocalRecipes(recipes ?? []);
    }, [recipes]);

    const toggleType = (type: string) => {
        setSelectedTypes(sel =>
            sel.includes(type) ? sel.filter(x => x !== type) : [ ...sel, type ]
        );
    };

    const toggleDietary = (dietary: string) => {
        setSelectedDietary(sel =>
            sel.includes(dietary) ? sel.filter(x => x !== dietary) : [ ...sel, dietary ]
        );
    };

    const activateType = (type: string) => {
        setSelectedTypes(sel => sel.includes(type) ? sel : [ ...sel, type ]);
    };

    const activateDietary = (dietary: string) => {
        setSelectedDietary(sel => sel.includes(dietary) ? sel : [ ...sel, dietary ]);
    };

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

    const knownTypes = [ 'cooking', 'baking', 'snack', 'dessert' ];
    const knownDietary = [ 'vegan', 'vegetarian', 'glutenfree', 'dairyfree' ];

    // final filtered + sorted recipes
    const filtered = React.useMemo(() => {
        const term = titleFilter.trim().toLowerCase();
        const result = localRecipes.filter(r => {
            // title match
            const title = r.title.toLowerCase();
            const titleOk =
                !term ||
                title.includes(term) ||
                levenshtein(term, title) <= 2;

            if (!titleOk) return false;

            // quick filters
            if (favFilter && !r.status?.favorite) return false;
            if (cookFilter === 'cooked' && !r.status?.cookState) return false;
            if (cookFilter === 'uncooked' && r.status?.cookState) return false;

            // type filter
            if (selectedTypes.length > 0) {
                const typeMatch = (t: string) =>
                    t === 'other'
                        ? !knownTypes.includes(r.recipeType ?? '')
                        : r.recipeType === t;
                const ok = typeMode === 'and'
                    ? selectedTypes.every(typeMatch)
                    : selectedTypes.some(typeMatch);
                if (!ok) return false;
            }

            // dietary filter (recipe.dietaryRestrictions is now string[])
            if (selectedDietary.length > 0) {
                const recipeDietary = r.dietaryRestrictions ?? [];
                const dietaryMatch = (d: string) =>
                    d === 'other'
                        ? recipeDietary.length === 0
                        : (recipeDietary as string[]).includes(d);
                const ok = dietaryMode === 'and'
                    ? selectedDietary.every(dietaryMatch)
                    : selectedDietary.some(dietaryMatch);
                if (!ok) return false;
            }

            return true;
        });

        switch (sortMode) {
            case 'favorites':
                return [ ...result ].sort((a, b) =>
                    (b.status?.favorite ? 1 : 0) - (a.status?.favorite ? 1 : 0)
                );
            case 'alpha-desc':
                return [ ...result ].sort((a, b) => b.title.localeCompare(a.title));
            case 'random':
                return [ ...result ].sort((a, b) =>
                    randomOrder.indexOf(a.id) - randomOrder.indexOf(b.id)
                );
            default:
                return [ ...result ].sort((a, b) => a.title.localeCompare(b.title));
        }
    }, [ localRecipes, titleFilter, selectedTypes, typeMode, selectedDietary, dietaryMode, favFilter, cookFilter, sortMode, randomOrder ]);

    if (loading && recipes === null) return <p>Lade Rezepte...</p>;
    if (error) return <p>Fehler: { error.message }</p>;

    return (
        <div>
            <div className={ styles.titleRow }>
                <h2>
                    Rezepte{ ' ' }
                    { isAuthenticated && (
                        <Link to="/new-recipe" role="button">
                            <button type="button" className={ styles.addRecipeButton }>
                                <i className="fa-solid fa-plus" />
                            </button>
                        </Link>
                    ) }
                </h2>

                <div className={ styles.quickFilters }>
                    { hasActiveFilters && (
                        <button
                            type="button"
                            className={ styles.resetButton }
                            onClick={ resetFilters }
                            title="Alle Filter zurücksetzen"
                        >
                            <i className="fa-solid fa-xmark" /><span className={ styles.chipLabel }> Zurücksetzen</span>
                        </button>
                    ) }
                    <FilterSection
                        selectedTypes={ selectedTypes }
                        onTypeToggle={ toggleType }
                        typeMode={ typeMode }
                        onTypeModeChange={ setTypeMode }
                        selectedDietary={ selectedDietary }
                        onDietaryToggle={ toggleDietary }
                        dietaryMode={ dietaryMode }
                        onDietaryModeChange={ setDietaryMode }
                    />
                    <button
                        type="button"
                        className={ `${ styles.filterChip } ${ favFilter ? styles.filterChipActive : '' }` }
                        onClick={ () => setFavFilter(f => !f) }
                        title="Favoriten"
                    >
                        <i className="fa-solid fa-heart" /><span className={ styles.chipLabel }> Favoriten</span>
                    </button>
                    <button
                        type="button"
                        className={ `${ styles.filterChip } ${ cookFilter === 'cooked' ? styles.filterChipActive : '' }` }
                        onClick={ () => setCookFilter(f => f === 'cooked' ? null : 'cooked') }
                        title="Gekocht"
                    >
                        <i className="fa-solid fa-check" /><span className={ styles.chipLabel }> Gekocht</span>
                    </button>
                    <button
                        type="button"
                        className={ `${ styles.filterChip } ${ cookFilter === 'uncooked' ? styles.filterChipActive : '' }` }
                        onClick={ () => setCookFilter(f => f === 'uncooked' ? null : 'uncooked') }
                        title="Nicht gekocht"
                    >
                        <i className="fa-solid fa-question" /><span className={ styles.chipLabel }> Nicht gekocht</span>
                    </button>
                    <select
                        className={ styles.filterChip }
                        value={ sortMode }
                        onChange={ e => handleSortChange(e.target.value as typeof sortMode) }
                        title="Sortierung"
                    >
                        <option value="favorites">♥ Favoriten zuerst</option>
                        <option value="alpha-asc">Alphabetisch (A → Z)</option>
                        <option value="alpha-desc">Alphabetisch (Z → A)</option>
                        <option value="random">⟳ Zufällig</option>
                    </select>
                </div>

                <div className={ styles.searchBar }>
                    <i className={ `fa-solid fa-magnifying-glass ${ styles.searchIcon }` } />
                    <input
                        type="text"
                        placeholder="Rezepte suchen..."
                        value={ titleFilter }
                        onChange={ e => setTitleFilter(e.target.value) }
                        className={ styles.searchInput }
                    />
                    { titleFilter && (
                        <button
                            type="button"
                            className={ styles.searchClear }
                            onClick={ () => setTitleFilter('') }
                            aria-label="Suche löschen"
                        >
                            <i className="fa-solid fa-xmark" />
                        </button>
                    ) }
                </div>
            </div>

            <div className={styles.recipeCardsGrid}>
                { filtered.length === 0 ? (
                    <p>Keine Rezepte gefunden</p>
                ) : filtered.map(recipe => (
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
                            <Link to={ `/recipe/${ recipe.id }` }>
                                <img
                                    src={
                                        recipe.image
                                            ? (recipe.image.startsWith('/uploads')
                                                ? `${ getConfig().API_URL }${ recipe.image }`
                                                : recipe.image)
                                            : '/placeholder.webp'
                                    }
                                    alt={ recipe.title }
                                    className={ styles.recipeCardImage }
                                />
                            </Link>
                        </div>
                        <div className={styles.recipeCardContent}>
                            <h3 className={styles.recipeCardTitle}>{recipe.title}</h3>
                            <div className={ styles.recipeCardBottom }>
                                { (recipe.recipeType || recipe.dietaryRestrictions?.length) && (
                                    <div className={ styles.recipeTags }>
                                        { recipe.recipeType && (
                                            <button
                                                type="button"
                                                className={ styles.recipeTag }
                                                onClick={ () => activateType(recipe.recipeType!) }
                                                title="Filter nach Rezepttyp"
                                            >
                                                { {
                                                    cooking: 'Kochen',
                                                    baking: 'Backen',
                                                    snack: 'Snack',
                                                    dessert: 'Dessert'
                                                }[recipe.recipeType] ?? recipe.recipeType }
                                            </button>
                                        ) }
                                        { recipe.dietaryRestrictions?.map(d => (
                                            <button
                                                key={ d }
                                                type="button"
                                                className={ `${ styles.recipeTag } ${ styles.recipeTagDietary }` }
                                                onClick={ () => activateDietary(d) }
                                                title="Filter nach Ernährung"
                                            >
                                                { {
                                                    vegan: 'Vegan',
                                                    vegetarian: 'Vegetarisch',
                                                    glutenfree: 'Glutenfrei',
                                                    dairyfree: 'Laktosefrei'
                                                }[d] ?? d }
                                            </button>
                                        )) }
                                    </div>
                                ) }
                            <Link to={`/recipe/${recipe.id}`} className={styles.recipeCardButton}>
                                Rezept ansehen
                            </Link>
                            <BringButton recipeId={recipe.id} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RecipeList;
