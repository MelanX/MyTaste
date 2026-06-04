import React, { useState } from 'react';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { useRecipes } from '../../hooks/useRecipes';
import CollectionCard from '../CollectionCard';

const CollectionList: React.FC = () => {
  const { collections, loading, error, create } = useCollectionsContext();
  const { recipes } = useRecipes();
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await create(newName.trim());
    setNewName('');
    setShowNew(false);
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 [&>h2]:m-0 [&>h2]:whitespace-nowrap max-[600px]:mb-3 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2">
        <h2>Sammlungen</h2>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark"
            onClick={() => setShowNew((v) => !v)}
          >
            Neue Sammlung
          </button>
        </div>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name der Sammlung"
            className="min-w-[180px] flex-1 rounded border border-line bg-surface px-3 py-2 text-base text-fg focus:border-accent focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="cursor-pointer whitespace-nowrap rounded border-none bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark"
          >
            Erstellen
          </button>
          <button
            type="button"
            className="cursor-pointer whitespace-nowrap rounded border border-line bg-transparent px-4 py-2 text-fg-muted hover:border-danger hover:text-danger"
            onClick={() => setShowNew(false)}
          >
            Abbrechen
          </button>
        </form>
      )}

      {loading && <p>Lade...</p>}
      {error && <p>Fehler: {error.message}</p>}
      {!loading && !error && collections.length === 0 && <p>Keine Sammlungen</p>}

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
        {collections.map((collection) => (
          <CollectionCard key={collection.id} collection={collection} recipes={recipes ?? []} />
        ))}
      </div>
    </div>
  );
};

export default CollectionList;
