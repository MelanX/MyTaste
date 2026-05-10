import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { useNextUpContext } from '../../context/NextUpContext';
import { useRecipes } from '../../hooks/useRecipes';
import BringButton from '../BringButton';
import styles from './styles.module.css';
import recipeStyles from '../RecipeList/styles.module.css';
import { getConfig } from '../../config';

const CollectionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { collections, loading, error, removeRecipe, clearRecipes, rename, remove } = useCollectionsContext();
    const { add: addToNextUp } = useNextUpContext();
    const navigate = useNavigate();
    const { recipes } = useRecipes();
    const [ renaming, setRenaming ] = useState(false);
    const [ nameInput, setNameInput ] = useState('');

    if (loading) return <p>Lade...</p>;
    if (error) return <p>Fehler: { error.message }</p>;

    const collection = collections.find(c => c.id === id);
    if (!collection) return <p>Sammlung nicht gefunden</p>;

    const collectionRecipes = (recipes ?? [])
        .filter(r => collection.recipeIds.includes(r.id))
        .sort((a, b) => collection.recipeIds.indexOf(a.id) - collection.recipeIds.indexOf(b.id));

    const handleClear = async () => {
        if (!window.confirm('Alle Rezepte aus der Sammlung entfernen?')) return;
        await clearRecipes(collection.id);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Sammlung "${ collection.name }" löschen?`)) return;
        await remove(collection.id);
        navigate('/collections');
    };

    const handleAddAllToNextUp = async () => {
        for (const recipeId of collection.recipeIds) {
            await addToNextUp(recipeId);
        }
    };

    const startRename = () => {
        setNameInput(collection.name);
        setRenaming(true);
    };

    const submitRename = async (e: React.FormEvent) => {
        e.preventDefault();
        if (nameInput.trim()) await rename(collection.id, nameInput.trim());
        setRenaming(false);
    };

    return (
        <div>
            <div className={ recipeStyles.titleRow }>
                { renaming ? (
                    <form onSubmit={ submitRename } className={ styles.renameForm }>
                        <input
                            type="text"
                            value={ nameInput }
                            onChange={ e => setNameInput(e.target.value) }
                            className={ styles.renameInput }
                            autoFocus
                            onBlur={ () => setRenaming(false) }
                            onKeyDown={ e => { if (e.key === 'Escape') setRenaming(false); } }
                        />
                    </form>
                ) : (
                    <h2
                        className={ styles.collectionName }
                        onClick={ startRename }
                        title="Zum Umbenennen klicken"
                    >
                        { collection.name }
                    </h2>
                ) }
                <div className={ styles.actions }>
                    <div className={ styles.actionsRow }>
                        <BringButton ids={ collection.recipeIds } label="Alle zu Bring" />
                        <button
                            type="button"
                            className={ styles.nextUpButton }
                            onClick={ handleAddAllToNextUp }
                            disabled={ collection.recipeIds.length === 0 }
                            title="Alle Rezepte zu Next Up hinzufügen"
                        >
                            Alle zu Next Up
                        </button>
                    </div>
                    <div className={ styles.actionsRow }>
                        <button
                            type="button"
                            className={ styles.clearButton }
                            onClick={ handleClear }
                            disabled={ collection.recipeIds.length === 0 }
                        >
                            Leeren
                        </button>
                        <button
                            type="button"
                            className={ styles.deleteButton }
                            onClick={ handleDelete }
                        >
                            Löschen
                        </button>
                        <button type="button" className={ styles.backLink }
                                onClick={ () => navigate('/collections') }>Zurück
                        </button>
                    </div>
                </div>
            </div>

            { !loading && !error && collection.recipeIds.length === 0 && <p>Liste ist leer</p> }

            <div className={ recipeStyles.recipeCardsGrid }>
                { collectionRecipes.map(recipe => (
                    <div key={ recipe.id } className={ recipeStyles.recipeCard }>
                        <div className={ recipeStyles.recipeCardImageContainer }>
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
                                    onClick={ () => removeRecipe(collection.id, recipe.id) }
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

export default CollectionDetail;
