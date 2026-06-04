import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNextUpContext } from '../../context/NextUpContext';
import { useCollectionsContext } from '../../context/CollectionsContext';
import { useRecipes } from '../../hooks/useRecipes';
import BringButton from '../BringButton';
import { getConfig } from '../../config';

const NextUpList: React.FC = () => {
  const { ids, loading, error, remove, clear } = useNextUpContext();
  const { create, addRecipe } = useCollectionsContext();
  const { recipes } = useRecipes();
  const navigate = useNavigate();
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveCollectionName, setSaveCollectionName] = useState('');
  const [saving, setSaving] = useState(false);

  const nextUpRecipes = React.useMemo(() => {
    if (!recipes) return [];
    return ids.map((id) => recipes.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => r != null);
  }, [ids, recipes]);

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
      await Promise.all(ids.map((id) => addRecipe(newCollection.id, id)));
      navigate(`/collections/${newCollection.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 [&>h2]:m-0 [&>h2]:whitespace-nowrap max-[600px]:mb-3 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2">
        <h2>Next Up</h2>
        <div className="ml-auto flex items-center gap-2 max-[600px]:ml-0 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:[&>*]:w-full max-[600px]:[&_a]:w-full">
          <BringButton ids={ids} label="Alle zu Bring" />
          <button
            type="button"
            className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-action px-4 py-2 font-medium text-white hover:not-disabled:bg-action-dark disabled:cursor-default disabled:opacity-40"
            onClick={() => setShowSaveAs((v) => !v)}
            disabled={ids.length === 0}
            title="Als Sammlung speichern"
          >
            Als Sammlung speichern
          </button>
          <button
            type="button"
            className="min-h-[40px] cursor-pointer whitespace-nowrap rounded border-none bg-accent px-4 py-2 font-medium text-white hover:not-disabled:bg-accent-dark disabled:cursor-default disabled:opacity-40"
            onClick={handleClear}
            disabled={ids.length === 0}
          >
            Leeren
          </button>
        </div>
      </div>

      {showSaveAs && (
        <form onSubmit={handleSaveAsCollection} className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={saveCollectionName}
            onChange={(e) => setSaveCollectionName(e.target.value)}
            placeholder="Name der Sammlung"
            className="m-0 box-border h-10 min-w-[180px] flex-1 rounded border border-line bg-surface px-3 text-base text-fg focus:border-accent focus:outline-none"
            autoFocus
            disabled={saving}
          />
          <button
            type="submit"
            className="box-border h-10 cursor-pointer whitespace-nowrap rounded border-none bg-accent px-4 text-base font-medium text-white hover:not-disabled:bg-accent-dark disabled:cursor-default disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Speichern...' : 'Erstellen'}
          </button>
          <button
            type="button"
            className="box-border h-10 cursor-pointer whitespace-nowrap rounded border border-danger bg-transparent px-4 text-base text-danger hover:not-disabled:bg-danger hover:not-disabled:text-white"
            onClick={() => setShowSaveAs(false)}
            disabled={saving}
          >
            Abbrechen
          </button>
        </form>
      )}

      {loading && <p>Lade...</p>}
      {error && <p>Fehler: {error.message}</p>}
      {!loading && !error && ids.length === 0 && <p>Liste ist leer</p>}
      {!loading && recipes && ids.length > nextUpRecipes.length && (
        <p>
          {ids.length - nextUpRecipes.length} Rezept{ids.length - nextUpRecipes.length !== 1 ? 'e' : ''} konnten nicht mehr gefunden werden.{' '}
          <button
            type="button"
            onClick={() => {
              const found = new Set(nextUpRecipes.map((r) => r.id));
              ids.filter((id) => !found.has(id)).forEach((id) => remove(id));
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
          >
            Bereinigen
          </button>
        </p>
      )}

      <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
        {nextUpRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_4px_8px_var(--color-shadow-soft)] transition-[transform,box-shadow] duration-300 ease-in-out hover:-translate-y-[5px] hover:shadow-[0_8px_16px_var(--color-shadow-strong)]"
          >
            <div className="relative h-[200px] w-full overflow-hidden">
              <div className="absolute right-2 top-2 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-white/80 p-[0.3rem] text-[1.2rem]">
                <i className="fa-solid fa-bookmark" title="Aus Next Up entfernen" onClick={() => remove(recipe.id)} />
              </div>
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
                  onClick={() => remove(recipe.id)}
                >
                  Entfernen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NextUpList;
