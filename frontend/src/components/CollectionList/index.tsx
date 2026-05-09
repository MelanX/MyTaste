import React, { useState } from 'react';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { useRecipes } from '../../hooks/useRecipes';
import CollectionCard from '../CollectionCard';
import styles from './styles.module.css';
import recipeStyles from '../RecipeList/styles.module.css';

const CollectionList: React.FC = () => {
    const { collections, loading, error, create } = useCollectionsContext();
    const { recipes } = useRecipes();
    const [ showNew, setShowNew ] = useState(false);
    const [ newName, setNewName ] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        await create(newName.trim());
        setNewName('');
        setShowNew(false);
    };

    return (
        <div>
            <div className={ recipeStyles.titleRow }>
                <h2>Kollektionen</h2>
                <div className={ styles.actions }>
                    <button
                        type="button"
                        className={ styles.newButton }
                        onClick={ () => setShowNew(v => !v) }
                    >
                        Neue Kollektion
                    </button>
                </div>
            </div>

            { showNew && (
                <form onSubmit={ handleCreate } className={ styles.newForm }>
                    <input
                        type="text"
                        value={ newName }
                        onChange={ e => setNewName(e.target.value) }
                        placeholder="Name der Kollektion"
                        className={ styles.newInput }
                        autoFocus
                    />
                    <button type="submit" className={ styles.createButton }>Erstellen</button>
                    <button type="button" className={ styles.cancelButton }
                            onClick={ () => setShowNew(false) }>Abbrechen
                    </button>
                </form>
            ) }

            { loading && <p>Lade...</p> }
            { error && <p>Fehler: { error.message }</p> }
            { !loading && !error && collections.length === 0 && <p>Keine Kollektionen</p> }

            <div className={ recipeStyles.recipeCardsGrid }>
                { collections.map(collection => (
                    <CollectionCard
                        key={ collection.id }
                        collection={ collection }
                        recipes={ recipes ?? [] }
                    />
                )) }
            </div>
        </div>
    );
};

export default CollectionList;
