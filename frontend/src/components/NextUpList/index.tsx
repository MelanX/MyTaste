import React from 'react';
import { Link } from 'react-router-dom';
import { useNextUpContext } from '../../context/NextUpContext';
import { useRecipes } from '../../hooks/useRecipes';
import BringButton from '../BringButton';
import styles from './styles.module.css';
import recipeStyles from '../RecipeList/styles.module.css';
import { getConfig } from '../../config';

const NextUpList: React.FC = () => {
    const { ids, loading, error, remove, clear } = useNextUpContext();
    const { recipes } = useRecipes();

    const nextUpRecipes = React.useMemo(() => {
        if (!recipes) return [];
        return ids
            .map(id => recipes.find(r => r.id === id))
            .filter((r): r is NonNullable<typeof r> => r != null);
    }, [ ids, recipes ]);

    const handleClear = async () => {
        if (!window.confirm('Alle Rezepte aus der Next Up Liste entfernen?')) return;
        await clear();
    };

    return (
        <div>
            <div className={ recipeStyles.titleRow }>
                <h2>Next Up</h2>
                <div className={ styles.actions }>
                    <BringButton ids={ ids } label="Alle zu Bring hinzufügen" />
                    <button
                        type="button"
                        className={ styles.clearButton }
                        onClick={ handleClear }
                        disabled={ ids.length === 0 }
                    >
                        Liste leeren
                    </button>
                </div>
            </div>

            { loading && <p>Lade...</p> }
            { error && <p>Fehler: { error.message }</p> }
            { !loading && !error && ids.length === 0 && <p>Liste ist leer</p> }

            <div className={ recipeStyles.recipeCardsGrid }>
                { nextUpRecipes.map(recipe => (
                    <div key={ recipe.id } className={ recipeStyles.recipeCard }>
                        <div className={ recipeStyles.recipeCardImageContainer }>
                            <div className={ recipeStyles.favIcon }>
                                <i
                                    className="fa-solid fa-bookmark"
                                    title="Aus Next Up entfernen"
                                    onClick={ () => remove(recipe.id) }
                                />
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
                                    className={ recipeStyles.recipeCardImage }
                                />
                            </Link>
                        </div>
                        <div className={ recipeStyles.recipeCardContent }>
                            <h3 className={ recipeStyles.recipeCardTitle }>{ recipe.title }</h3>
                            <div className={ recipeStyles.recipeCardBottom }>
                                <Link to={ `/recipe/${ recipe.id }` } className={ recipeStyles.recipeCardButton }>
                                    Rezept ansehen
                                </Link>
                                <button
                                    type="button"
                                    className={ styles.removeButton }
                                    onClick={ () => remove(recipe.id) }
                                >
                                    Entfernen
                                </button>
                            </div>
                        </div>
                    </div>
                )) }
            </div>
        </div>
    );
};

export default NextUpList;
