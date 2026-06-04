import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { useNextUpContext } from '../../context/NextUpContext';
import { useRecipes } from '../../hooks/useRecipes';
import BringButton from '../BringButton';
import Toast from '../Toast';
import { getConfig } from '../../config';

const CollectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { collections, loading, error, removeRecipe, clearRecipes, rename, remove } = useCollectionsContext();
  const { ids: nextUpIds, add: addToNextUp } = useNextUpContext();
  const navigate = useNavigate();
  const { recipes } = useRecipes();
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [addingToNextUp, setAddingToNextUp] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  if (loading) return <p>Lade...</p>;
  if (error) return <p>Fehler: {error.message}</p>;

  const collection = collections.find((c) => c.id === id);
  if (!collection) return <p>Sammlung nicht gefunden</p>;

  const collectionRecipes = (recipes ?? [])
    .filter((r) => collection.recipeIds.includes(r.id))
    .sort((a, b) => collection.recipeIds.indexOf(a.id) - collection.recipeIds.indexOf(b.id));

  const handleClear = async () => {
    if (!window.confirm('Alle Rezepte aus der Sammlung entfernen?')) return;
    await clearRecipes(collection.id);
  };

  const handleDelete = async () => {
    if (!window.confirm(`Sammlung "${collection.name}" löschen?`)) return;
    await remove(collection.id);
    navigate('/collections');
  };

  const handleAddAllToNextUp = async () => {
    setAddingToNextUp(true);
    try {
      const alreadyPresent = collection.recipeIds.filter((rid) => nextUpIds.includes(rid)).length;
      await Promise.allSettled(collection.recipeIds.map((rid) => addToNextUp(rid)));
      const newlyAdded = collection.recipeIds.length - alreadyPresent;
      const parts: string[] = [];
      if (newlyAdded > 0) parts.push(`${newlyAdded} hinzugefügt`);
      if (alreadyPresent > 0) parts.push(`${alreadyPresent} bereits vorhanden`);
      setToastType('success');
      setToastMessage(parts.join(', '));
    } catch {
      setToastType('error');
      setToastMessage('Fehler beim Hinzufügen zu Next Up');
    } finally {
      setAddingToNextUp(false);
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
      <div className="mb-4 flex items-center gap-4 [&>h2]:m-0 [&>h2]:whitespace-nowrap max-[600px]:mb-3 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2">
        {renaming ? (
          <form onSubmit={submitRename} className="flex items-center">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full border-none border-b-2 border-accent bg-transparent px-1 text-2xl font-bold text-fg outline-none"
              autoFocus
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setRenaming(false);
              }}
            />
          </form>
        ) : (
          <h2 className="m-0 cursor-pointer whitespace-nowrap hover:opacity-70" onClick={startRename} title="Zum Umbenennen klicken">
            {collection.name}
          </h2>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2 max-[600px]:ml-0 max-[600px]:flex-col">
          <div className="contents max-[600px]:flex max-[600px]:w-full max-[600px]:gap-2 max-[600px]:[&>*]:min-w-0 max-[600px]:[&>*]:flex-1 max-[600px]:[&_a]:w-full">
            <BringButton ids={collection.recipeIds} label="Alle zu Bring" />
            <button
              type="button"
              className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-action px-4 py-2 font-medium text-white hover:not-disabled:bg-action-dark disabled:cursor-default disabled:opacity-40"
              onClick={handleAddAllToNextUp}
              disabled={collection.recipeIds.length === 0 || addingToNextUp}
              title="Alle Rezepte zu Next Up hinzufügen"
            >
              {addingToNextUp ? 'Wird hinzugefügt…' : 'Alle zu Next Up'}
            </button>
          </div>
          <div className="contents max-[600px]:flex max-[600px]:w-full max-[600px]:gap-2 max-[600px]:[&>*]:min-w-0 max-[600px]:[&>*]:flex-1 max-[600px]:[&_a]:w-full">
            <button
              type="button"
              className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-accent px-4 py-2 font-medium text-white hover:not-disabled:bg-accent-dark disabled:cursor-default disabled:opacity-40"
              onClick={handleClear}
              disabled={collection.recipeIds.length === 0}
            >
              Leeren
            </button>
            <button
              type="button"
              className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-danger px-4 py-2 font-medium text-white hover:bg-danger-strong"
              onClick={handleDelete}
            >
              Löschen
            </button>
            <button
              type="button"
              className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-accent px-4 py-2 text-base font-medium text-white hover:bg-accent-dark"
              onClick={() => navigate('/collections')}
            >
              Zurück
            </button>
          </div>
        </div>
      </div>

      {!loading && !error && collection.recipeIds.length === 0 && <p>Liste ist leer</p>}

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
        {collectionRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_4px_8px_var(--color-shadow-soft)] transition-[transform,box-shadow] duration-300 ease-in-out hover:-translate-y-[5px] hover:shadow-[0_8px_16px_var(--color-shadow-strong)]"
          >
            <div className="relative h-[200px] w-full overflow-hidden">
              <Link to={`/recipe/${recipe.id}`}>
                <img
                  src={
                    recipe.image
                      ? recipe.image.startsWith('/uploads')
                        ? `${getConfig().API_URL}${recipe.image}`
                        : recipe.image
                      : '/placeholder.webp'
                  }
                  alt={recipe.title}
                  className="h-full w-full object-cover transition-transform duration-500 ease-in-out hover:scale-105"
                />
              </Link>
            </div>
            <div className="flex grow flex-col gap-2.5 p-4">
              <h3 className="mb-1.5 mt-0 text-[1.2rem] font-semibold">{recipe.title}</h3>
              <div className="mt-auto flex flex-col gap-2.5">
                <Link
                  to={`/recipe/${recipe.id}`}
                  className="rounded bg-accent px-4 py-2 text-center text-base font-medium text-white no-underline transition-colors duration-300 hover:bg-accent-dark hover:no-underline"
                >
                  Rezept ansehen
                </Link>
                <button
                  type="button"
                  className="w-full cursor-pointer rounded border-none bg-danger px-4 py-2 text-center font-medium text-white hover:bg-danger-strong"
                  onClick={() => removeRecipe(collection.id, recipe.id)}
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} type={toastType} />
    </div>
  );
};

export default CollectionDetail;
