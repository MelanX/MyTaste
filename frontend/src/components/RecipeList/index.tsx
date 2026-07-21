import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Toast from '../Toast';
import { useNextUpContext } from '../../context/NextUpContext';
import { useRecipeListData } from './useRecipeListData';
import RecipeCard from './RecipeCard';
import QuickFilters from './QuickFilters';
import SearchBar from './SearchBar';
import NextUpFab from './NextUpFab';

const RecipeList: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { ids: nextUpIds, add: addToNextUp, remove: removeFromNextUp } = useNextUpContext();

  const {
    loading,
    error,
    recipes,
    filtered,
    matchReasons,
    hasActiveFilters,
    toastMessage,
    setToastMessage,
    handleToggleFavorite,
    markCooked,
    filters,
    handleSortChange,
  } = useRecipeListData();

  const activateType = (type: string) => {
    filters.setSelectedTypes((sel) => (sel.includes(type) ? sel : [...sel, type]));
  };

  const activateDietary = (dietary: string) => {
    filters.setSelectedDietary((sel) => (sel.includes(dietary) ? sel : [...sel, dietary]));
  };

  if (loading && recipes === null) return <p>Lade Rezepte...</p>;
  if (error && recipes === null) return <p>Fehler: {error.message}</p>;

  return (
    <>
      <div>
        <div className="mb-4 flex items-center gap-4 [&>h2]:m-0 [&>h2]:whitespace-nowrap max-[600px]:mb-3 max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:gap-2">
          <h2 className="max-[600px]:order-1">
            Rezepte{' '}
            {isAuthenticated && (
              <Link to="/new-recipe" role="button">
                <button
                  type="button"
                  className="h-[1.6rem] w-[1.6rem] rounded-[25%] border-transparent bg-accent p-0 text-center text-[1.2rem] text-white no-underline transition-colors duration-300 hover:bg-accent-dark hover:no-underline"
                >
                  <i className="fa-solid fa-plus" />
                </button>
              </Link>
            )}
          </h2>

          <QuickFilters filters={filters} hasActiveFilters={hasActiveFilters} onSortChange={handleSortChange} />

          <SearchBar value={filters.searchQuery} onChange={filters.setSearchQuery} />
        </div>

        <p className="m-0 text-sm text-fg-muted" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? 'Rezept' : 'Rezepte'}
        </p>

        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {filtered.length === 0 ? (
            <p>Keine Rezepte gefunden</p>
          ) : (
            filtered.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                matchReasons={matchReasons.get(recipe.id) ?? []}
                isAuthenticated={isAuthenticated}
                inNextUp={nextUpIds.includes(recipe.id)}
                onMarkCooked={markCooked}
                onToggleFavorite={handleToggleFavorite}
                onAddToNextUp={addToNextUp}
                onRemoveFromNextUp={removeFromNextUp}
                onActivateType={activateType}
                onActivateDietary={activateDietary}
              />
            ))
          )}
        </div>
      </div>
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      {isAuthenticated && <NextUpFab count={nextUpIds.length} />}
    </>
  );
};

export default RecipeList;
