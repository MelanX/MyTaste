import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Recipe } from '../../types/Recipe';
import BringButton from '../BringButton';
import FilterSection from '../FilterSection';
import Toast from '../Toast';
import { getConfig } from '../../config';
import { ApiError, updateRecipeStatus } from '../../utils/api_service';
import { useRecipes } from '../../hooks/useRecipes';
import { useRecipeFilters } from '../../context/RecipeFiltersContext';
import { useNextUpContext } from '../../context/NextUpContext';
import CollectionPicker from '../CollectionPicker';

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];
  const alen = a.length,
    blen = b.length;
  if (!alen) return blen;
  if (!blen) return alen;
  for (let i = 0; i <= blen; i++) matrix[i] = [i];
  for (let j = 0; j <= alen; j++) matrix[0][j] = j;
  for (let i = 1; i <= blen; i++) {
    for (let j = 1; j <= alen; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[blen][alen];
};

const knownTypes = ['cooking', 'baking', 'snack', 'dessert'];
const knownDietary = ['vegan', 'vegetarian', 'glutenfree', 'dairyfree'];

const RecipeList: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  const { recipes, loading, error } = useRecipes();
  const { ids: nextUpIds, add: addToNextUp, remove: removeFromNextUp } = useNextUpContext();
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!error) return;
    const isAuthError = error instanceof ApiError && (error.status === 401 || error.status === 403);
    if (isAuthError) {
      logout();
    } else if (recipes !== null) {
      setToastMessage(error.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const {
    titleFilter,
    setTitleFilter,
    selectedTypes,
    setSelectedTypes,
    typeMode,
    setTypeMode,
    selectedDietary,
    setSelectedDietary,
    dietaryMode,
    setDietaryMode,
    favFilter,
    setFavFilter,
    cookFilter,
    setCookFilter,
    sortMode,
    setSortMode,
    resetFilters,
  } = useRecipeFilters();
  const [randomOrder, setRandomOrder] = React.useState<string[]>([]);
  const [localRecipes, setLocalRecipes] = React.useState<Recipe[]>([]);

  const handleSortChange = (mode: typeof sortMode) => {
    setSortMode(mode);
    if (mode === 'random') {
      setRandomOrder([...localRecipes].map((r) => r.id).sort(() => Math.random() - 0.5));
    }
  };

  const hasActiveFilters =
    titleFilter !== '' ||
    selectedTypes.length > 0 ||
    selectedDietary.length > 0 ||
    favFilter ||
    cookFilter !== null ||
    sortMode !== 'alpha-asc';

  React.useEffect(() => {
    const list = recipes ?? [];
    setLocalRecipes(list);
    // Re-seed if random sort was activated before recipes finished loading
    if (sortMode === 'random' && list.length > 0 && randomOrder.length === 0) {
      setRandomOrder(list.map((r) => r.id).sort(() => Math.random() - 0.5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipes]);

  const toggleType = (type: string) => {
    setSelectedTypes((sel) => (sel.includes(type) ? sel.filter((x) => x !== type) : [...sel, type]));
  };

  const toggleDietary = (dietary: string) => {
    setSelectedDietary((sel) => (sel.includes(dietary) ? sel.filter((x) => x !== dietary) : [...sel, dietary]));
  };

  const activateType = (type: string) => {
    setSelectedTypes((sel) => (sel.includes(type) ? sel : [...sel, type]));
  };

  const activateDietary = (dietary: string) => {
    setSelectedDietary((sel) => (sel.includes(dietary) ? sel : [...sel, dietary]));
  };

  const handleToggleFavorite = async (recipeId: string, favorite: boolean) => {
    try {
      const updated = await updateRecipeStatus(recipeId, { favorite });
      setLocalRecipes((recipes) =>
        recipes.map((r) => (r.id === recipeId ? { ...r, status: { ...r.status, favorite: updated.favorite } } : r)),
      );
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  const markCooked = async (recipeId: string) => {
    try {
      const updated = await updateRecipeStatus(recipeId, { cookState: true });
      setLocalRecipes((recipes) =>
        recipes.map((r) => (r.id === recipeId ? { ...r, status: { ...r.status, cookState: updated.cookState } } : r)),
      );
    } catch (err) {
      setToastMessage(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  // final filtered + sorted recipes
  const filtered = React.useMemo(() => {
    const term = titleFilter.trim().toLowerCase();
    const result = localRecipes.filter((r) => {
      // title match
      const title = r.title.toLowerCase();
      const titleOk = !term || title.includes(term) || levenshtein(term, title) <= 2;

      if (!titleOk) return false;

      // quick filters
      if (favFilter && !r.status?.favorite) return false;
      if (cookFilter === 'cooked' && !r.status?.cookState) return false;
      if (cookFilter === 'uncooked' && r.status?.cookState) return false;

      // type filter
      if (selectedTypes.length > 0) {
        const typeMatch = (t: string) => (t === 'other' ? !knownTypes.includes(r.recipeType ?? '') : r.recipeType === t);
        const ok = typeMode === 'and' ? selectedTypes.every(typeMatch) : selectedTypes.some(typeMatch);
        if (!ok) return false;
      }

      // dietary filter (recipe.dietaryRestrictions is now string[])
      if (selectedDietary.length > 0) {
        const recipeDietary = r.dietaryRestrictions ?? [];
        const dietaryMatch = (d: string) =>
          d === 'other' ? recipeDietary.some((x: string) => !knownDietary.includes(x)) : (recipeDietary as string[]).includes(d);
        const ok = dietaryMode === 'and' ? selectedDietary.every(dietaryMatch) : selectedDietary.some(dietaryMatch);
        if (!ok) return false;
      }

      return true;
    });

    switch (sortMode) {
      case 'favorites':
        return [...result].sort((a, b) => (b.status?.favorite ? 1 : 0) - (a.status?.favorite ? 1 : 0));
      case 'alpha-desc':
        return [...result].sort((a, b) => b.title.localeCompare(a.title));
      case 'random':
        return [...result].sort((a, b) => randomOrder.indexOf(a.id) - randomOrder.indexOf(b.id));
      default:
        return [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
  }, [localRecipes, titleFilter, selectedTypes, typeMode, selectedDietary, dietaryMode, favFilter, cookFilter, sortMode, randomOrder]);

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

          <div className="ml-auto flex flex-wrap gap-[0.4rem] max-[600px]:order-3 max-[600px]:ml-0 max-[600px]:justify-center">
            {hasActiveFilters && (
              <button
                type="button"
                className="cursor-pointer whitespace-nowrap rounded-[5rem] border border-line bg-none px-[11px] py-[5px] text-[0.85rem] text-fg-muted opacity-70 hover:border-danger hover:bg-none hover:text-danger hover:opacity-100"
                onClick={resetFilters}
                title="Alle Filter zurücksetzen"
              >
                <i className="fa-solid fa-xmark" />
                <span className="max-[600px]:hidden"> Zurücksetzen</span>
              </button>
            )}
            <FilterSection
              selectedTypes={selectedTypes}
              onTypeToggle={toggleType}
              typeMode={typeMode}
              onTypeModeChange={setTypeMode}
              selectedDietary={selectedDietary}
              onDietaryToggle={toggleDietary}
              dietaryMode={dietaryMode}
              onDietaryModeChange={setDietaryMode}
            />
            <button
              type="button"
              className={`cursor-pointer whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${favFilter ? 'border-accent-dark bg-accent text-white' : 'border-line bg-bg-alt text-fg-muted'}`}
              onClick={() => setFavFilter((f) => !f)}
              title="Favoriten"
            >
              <i className="fa-solid fa-heart" />
              <span className="max-[600px]:hidden"> Favoriten</span>
            </button>
            <button
              type="button"
              className={`cursor-pointer whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${cookFilter === 'cooked' ? 'border-accent-dark bg-accent text-white' : 'border-line bg-bg-alt text-fg-muted'}`}
              onClick={() => setCookFilter((f) => (f === 'cooked' ? null : 'cooked'))}
              title="Gekocht"
            >
              <i className="fa-solid fa-check" />
              <span className="max-[600px]:hidden"> Gekocht</span>
            </button>
            <button
              type="button"
              className={`cursor-pointer whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${cookFilter === 'uncooked' ? 'border-accent-dark bg-accent text-white' : 'border-line bg-bg-alt text-fg-muted'}`}
              onClick={() => setCookFilter((f) => (f === 'uncooked' ? null : 'uncooked'))}
              title="Nicht gekocht"
            >
              <i className="fa-solid fa-question" />
              <span className="max-[600px]:hidden"> Nicht gekocht</span>
            </button>
            <select
              className="cursor-pointer whitespace-nowrap rounded-[5rem] border border-line bg-bg-alt px-[11px] py-[5px] text-[0.85rem] text-fg-muted"
              value={sortMode}
              onChange={(e) => handleSortChange(e.target.value as typeof sortMode)}
              title="Sortierung"
            >
              <option value="favorites">♥ Favoriten zuerst</option>
              <option value="alpha-asc">Alphabetisch (A → Z)</option>
              <option value="alpha-desc">Alphabetisch (Z → A)</option>
              <option value="random">⟳ Zufällig</option>
            </select>
          </div>

          <div className="relative flex w-[380px] max-w-[380px] items-center max-[600px]:order-2 max-[600px]:w-auto max-[600px]:max-w-none">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-[0.9rem] text-base text-fg-muted" />
            <input
              type="text"
              placeholder="Rezepte suchen..."
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              className="box-border w-full rounded-[0.4rem] border border-line bg-surface py-2 pl-[2.4rem] pr-10 text-base text-fg focus:border-accent focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent)_20%,transparent)] focus:outline-none"
            />
            {titleFilter && (
              <button
                type="button"
                className="absolute right-2 cursor-pointer border-none bg-none px-2 py-[0.3rem] text-[0.9rem] leading-none text-fg-muted hover:bg-none hover:text-fg"
                onClick={() => setTitleFilter('')}
                aria-label="Suche löschen"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-5">
          {filtered.length === 0 ? (
            <p>Keine Rezepte gefunden</p>
          ) : (
            filtered.map((recipe) => (
              <div
                key={recipe.id}
                className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_4px_8px_var(--color-shadow-soft)] transition-[transform,box-shadow] duration-300 ease-in-out hover:-translate-y-[5px] hover:shadow-[0_8px_16px_var(--color-shadow-strong)]"
              >
                <div className="relative h-[200px] w-full overflow-hidden">
                  {/* cook-state in top-left */}
                  {!recipe.status?.cookState && (
                    <div className="absolute left-2 top-2 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-white/80 p-[0.3rem] text-[1.2rem] [&_i]:text-danger-bright">
                      <i
                        className="fa-solid fa-question"
                        title="Noch nicht gekocht"
                        role="button"
                        tabIndex={0}
                        onClick={() => markCooked(recipe.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') markCooked(recipe.id);
                        }}
                        aria-label="Als gekocht markieren"
                      />
                    </div>
                  )}
                  {/* favorite in top-right */}
                  <div className="absolute right-2 top-2 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-white/80 p-[0.3rem] text-[1.2rem] [&_i[title='Favorit']]:text-danger-bright">
                    {recipe.status?.favorite ? (
                      <i
                        className="fa-solid fa-heart"
                        title="Favorit"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleFavorite(recipe.id, false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleToggleFavorite(recipe.id, false);
                        }}
                        aria-label="Favorit entfernen"
                      />
                    ) : (
                      <i
                        className="fa-regular fa-heart"
                        title="Kein Favorit"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleToggleFavorite(recipe.id, true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleToggleFavorite(recipe.id, true);
                        }}
                        aria-label="Als Favorit markieren"
                      />
                    )}
                  </div>
                  {/* collection picker below the cook icon */}
                  {isAuthenticated && (
                    <div className="absolute right-2 top-[5.5rem] z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-white/80 p-[0.3rem] text-[1.2rem]">
                      <CollectionPicker recipeId={recipe.id} />
                    </div>
                  )}
                  {/* next-up bookmark below the favorite icon */}
                  {isAuthenticated && (
                    <div className="absolute right-2 top-12 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-white/80 p-[0.3rem] text-[1.2rem] [&_i[title='Aus_Next_Up_entfernen']]:text-action">
                      {nextUpIds.includes(recipe.id) ? (
                        <i
                          className="fa-solid fa-bookmark"
                          title="Aus Next Up entfernen"
                          role="button"
                          tabIndex={0}
                          onClick={() => removeFromNextUp(recipe.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') removeFromNextUp(recipe.id);
                          }}
                          aria-label="Aus Next Up entfernen"
                        />
                      ) : (
                        <i
                          className="fa-regular fa-bookmark"
                          title="Zu Next Up hinzufügen"
                          role="button"
                          tabIndex={0}
                          onClick={() => addToNextUp(recipe.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') addToNextUp(recipe.id);
                          }}
                          aria-label="Zu Next Up hinzufügen"
                        />
                      )}
                    </div>
                  )}
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
                    {(recipe.recipeType || recipe.dietaryRestrictions?.length) && (
                      <div className="flex flex-wrap-reverse gap-[0.3rem]">
                        {recipe.recipeType && (
                          <button
                            type="button"
                            className="cursor-pointer rounded-[5rem] border border-line bg-bg-alt px-[9px] py-[3px] text-[0.75rem] text-fg-muted hover:border-fg-muted"
                            onClick={() => activateType(recipe.recipeType!)}
                            title="Filter nach Rezepttyp"
                          >
                            {{
                              cooking: 'Kochen',
                              baking: 'Backen',
                              snack: 'Snack',
                              dessert: 'Dessert',
                            }[recipe.recipeType] ?? recipe.recipeType}
                          </button>
                        )}
                        {recipe.dietaryRestrictions?.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className="cursor-pointer rounded-[5rem] border border-success-line bg-success-bg px-[9px] py-[3px] text-[0.75rem] text-success-fg hover:border-fg-muted"
                            onClick={() => activateDietary(d)}
                            title="Filter nach Ernährung"
                          >
                            {{
                              vegan: 'Vegan',
                              vegetarian: 'Vegetarisch',
                              glutenfree: 'Glutenfrei',
                              dairyfree: 'Laktosefrei',
                            }[d] ?? d}
                          </button>
                        ))}
                      </div>
                    )}
                    <Link
                      to={`/recipe/${recipe.id}`}
                      className="rounded bg-accent px-4 py-2 text-center text-base font-medium text-white no-underline transition-colors duration-300 hover:bg-accent-dark hover:no-underline"
                    >
                      Rezept ansehen
                    </Link>
                    <BringButton recipeId={recipe.id} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      {isAuthenticated && (
        <Link
          to="/next-up"
          className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-action text-[1.4rem] text-white no-underline shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-[transform,box-shadow,background-color] duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-action-dark hover:text-white hover:no-underline hover:shadow-[0_10px_20px_rgba(0,0,0,0.3)] active:translate-y-0 print:hidden"
          aria-label="Next Up öffnen"
          title="Next Up"
        >
          <i className="fa-solid fa-bookmark" />
          {nextUpIds.length > 0 && (
            <span className="absolute -right-1 -top-1 box-border h-[1.4rem] min-w-[1.4rem] rounded-[5rem] bg-danger-bright px-[0.35rem] text-center text-[0.75rem] font-bold leading-[1.4rem] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]">
              {nextUpIds.length}
            </span>
          )}
        </Link>
      )}
    </>
  );
};

export default RecipeList;
