import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNextUpContext } from '../../context/NextUpContext';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { useRecipes } from '../../hooks/useRecipes';
import BringButton from '../BringButton';
import styles from './styles.module.css';
import recipeStyles from '../RecipeList/styles.module.css';
import { getConfig } from '../../config';

const NextUpList: React.FC = () => {
    const { ids, loading, error, remove, clear } = useNextUpContext();
    const { create, addRecipe } = useCollectionsContext();
    const { recipes } = useRecipes();
    const navigate = useNavigate();
    const [ showSaveAs, setShowSaveAs ] = useState(false);
    const [ saveCollectionName, setSaveCollectionName ] = useState('');
    const [ saving, setSaving ] = useState(false);

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

    const handleSaveAsCollection = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = saveCollectionName.trim();
        if (!name) return;
        setSaving(true);
        try {
            const updated = await create(name);
            const newCollection = updated[updated.length - 1];
            await Promise.all(ids.map(id => addRecipe(newCollection.id, id)));
            navigate(`/collections/${ newCollection.id }`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className={ recipeStyles.titleRow }>
                <h2>Next Up</h2>
                <div className={ styles.actions }>
                    <BringButton ids={ ids } label="Alle zu Bring" />
                    <button
                        type="button"
                        className={ styles.saveButton }
                        onClick={ () => setShowSaveAs(v => !v) }
                        disabled={ ids.length === 0 }
                        title="Als Sammlung speichern"
                    >
                        Als Sammlung speichern
                    </button>
                    <button
                        type="button"
                        className={ styles.clearButton }
                        onClick={ handleClear }
                        disabled={ ids.length === 0 }
                    >
                        Leeren
                    </button>
                </div>
            </div>

            { showSaveAs && (
                <form onSubmit={ handleSaveAsCollection } className={ styles.saveAsForm }>
                    <input
                        type="text"
                        value={ saveCollectionName }
                        onChange={ e => setSaveCollectionName(e.target.value) }
                        placeholder="Name der Sammlung"
                        className={ styles.saveAsInput }
                        autoFocus
                        disabled={ saving }
                    />
                    <button type="submit" className={ styles.saveAsCreate } disabled={ saving }>
                        { saving ? 'Speichern...' : 'Erstellen' }
                    </button>
                    <button type="button" className={ styles.saveAsCancel } onClick={ () => setShowSaveAs(false) }
                            disabled={ saving }>
                        Abbrechen
                    </button>
                </form>
            ) }

            { loading && <p>Lade...</p> }
            { error && <p>Fehler: { error.message }</p> }
            { !loading && !error && ids.length === 0 && <p>Liste ist leer</p> }
            { !loading && recipes && ids.length > nextUpRecipes.length && (
                <p>
                    { ids.length - nextUpRecipes.length } Rezept{ ids.length - nextUpRecipes.length !== 1 ? 'e' : '' } konnten nicht mehr gefunden werden.{ ' ' }
                    <button
                        type="button"
                        onClick={ () => {
                            const found = new Set(nextUpRecipes.map(r => r.id));
                            ids.filter(id => !found.has(id)).forEach(id => remove(id));
                        } }
                        style={ { background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 } }
                    >
                        Bereinigen
                    </button>
                </p>
            ) }

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
