import React from 'react';
import type { Recipe } from '../../types/Recipe';
import { formatAmount } from '../../utils/formatters';
import { getConfig } from '../../config';
import { updateRecipeStatus } from '../../utils/apiService';
import { useAuth } from '../../context/AuthContext';
import { upsertRecipe } from '../../utils/recipesCache';

interface RecipeSidebarProps {
  recipe: Recipe;
  hideImage?: boolean;
  updateRecipe?: (recipe: Recipe) => void;
}

const RecipeSidebar: React.FC<RecipeSidebarProps> = ({ recipe, hideImage = false, updateRecipe = () => {} }) => {
  const { isAuthenticated } = useAuth();

  const handleToggleCook = async () => {
    if (!recipe) return;
    const newState: boolean = !recipe.status?.cookState;
    try {
      const updated = await updateRecipeStatus(recipe.id, { cookState: newState });
      const next = { ...recipe, status: { ...recipe.status, cookState: updated.cookState } };
      updateRecipe(next);
      upsertRecipe(next);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavorite = async () => {
    if (!recipe) return;
    const newFav = !recipe.status?.favorite;
    try {
      const updated = await updateRecipeStatus(recipe.id, { favorite: newFav });
      const next = { ...recipe, status: { ...recipe.status, favorite: updated.favorite } };
      updateRecipe(next);
      upsertRecipe(next);
    } catch (err) {
      console.error(err);
    }
  };

  const status = recipe.status || { cookState: false, favorite: false };
  const iconBase =
    'no-print absolute top-2 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-white/80 p-[0.3rem] text-[1.2rem]';
  return (
    <div className="w-[min(100%,30rem)]">
      <div className="overflow-hidden rounded-lg bg-surface shadow-[0_4px_8px_var(--color-shadow-soft)]">
        {!hideImage && (
          <div className="relative aspect-[3/2] h-auto w-full overflow-hidden">
            {isAuthenticated && (
              <div>
                <div onClick={handleToggleCook} className={`${iconBase} left-2`}>
                  {status.cookState ? (
                    <i className="fa-solid fa-check-circle text-success-bright" title="Bereits gekocht" />
                  ) : (
                    <i className="fa-solid fa-question text-danger-bright" title="Noch nicht gekocht" />
                  )}
                </div>
                <div className={`${iconBase} right-2`} onClick={handleToggleFavorite}>
                  {recipe.status?.favorite ? (
                    <i className="fa-solid fa-heart text-danger-bright" title="Favorit" />
                  ) : (
                    <i className="fa-regular fa-heart" title="Kein Favorit" />
                  )}
                </div>
              </div>
            )}
            <img
              src={
                recipe.image
                  ? recipe.image.startsWith('/uploads')
                    ? `${getConfig().API_URL}${recipe.image}`
                    : recipe.image
                  : '/placeholder.webp'
              }
              alt={recipe.title}
              className="absolute top-0 left-0 h-full w-full object-cover md:static print:h-auto print:max-w-full print:object-contain"
            />
          </div>
        )}

        <div className="p-3 md:p-4">
          {(recipe.recipeType || (recipe.dietaryRestrictions && recipe.dietaryRestrictions.length > 0)) && (
            <div className="mb-4 flex flex-wrap gap-[0.4rem]">
              {recipe.recipeType && (
                <span className="rounded-[5rem] border border-line bg-bg-alt px-[10px] py-1 text-[0.8rem] text-fg-muted">
                  {{
                    cooking: 'Kochen',
                    baking: 'Backen',
                    snack: 'Snack',
                    dessert: 'Dessert',
                  }[recipe.recipeType] ?? recipe.recipeType}
                </span>
              )}
              {recipe.dietaryRestrictions?.map((d) => (
                <span
                  key={d}
                  className="rounded-[5rem] border border-success-line bg-success-bg px-[10px] py-1 text-[0.8rem] text-success-fg"
                >
                  {{
                    vegan: 'Vegan',
                    vegetarian: 'Vegetarisch',
                    glutenfree: 'Glutenfrei',
                    dairyfree: 'Laktosefrei',
                  }[d] ?? d}
                </span>
              ))}
            </div>
          )}
          <h2 className="mt-0 mb-4 text-[1.3rem] font-semibold text-fg">Zutaten</h2>
          {recipe.ingredient_sections && recipe.ingredient_sections.length > 0 ? (
            // Render sections
            recipe.ingredient_sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="mb-5">
                {section.title ? <h3 className="mb-2 text-[1.3rem] font-[450] text-fg">{section.title || 'Zutaten'}</h3> : <></>}
                <div className="flex flex-col gap-2">
                  {section.ingredients.map((ingredient, index) => {
                    const [primaryName, ...rest] = ingredient.name.split(',');
                    const nameSpecification = rest.length > 0 ? rest.join(',') : '';

                    return (
                      <div key={index} className="grid grid-cols-[70px_1fr] items-baseline gap-2 md:grid-cols-[80px_1fr] md:gap-[10px]">
                        <div className="font-medium text-fg-muted">
                          {formatAmount(ingredient.amount)}
                          {ingredient.unit ? ` ${ingredient.unit}` : ''}
                        </div>
                        <div className="break-words [hyphens:auto] text-fg [overflow-wrap:anywhere] md:inline-flex">
                          <span>{primaryName}</span>
                          {nameSpecification && <span className="ml-2 font-light text-fg-subtle italic">{nameSpecification}</span>}
                        </div>
                        {ingredient.note && (
                          <div className="col-span-2 mt-[2px] flex items-start text-[0.9rem] text-fg-subtle italic">
                            <i className="fa-solid fa-circle-exclamation mr-2 flex-shrink-0" />
                            <span>{ingredient.note}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <></>
          )}

          {recipe.spices && recipe.spices.length > 0 && (
            <div className="mt-5">
              <h3 className="mt-0 mb-4 text-[1.3rem] font-semibold text-fg">Gewürze</h3>
              <div className="flex flex-wrap gap-2">
                {recipe.spices.map((spice) => (
                  <div key={spice} className="inline-block rounded-[20px] bg-bg-alt px-3 py-[6px] text-[0.9rem] text-fg-muted">
                    {spice}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeSidebar;
