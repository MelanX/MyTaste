import React from 'react';
import { Link } from 'react-router-dom';
import type { Recipe } from '../../types/Recipe';
import BringButton from '../BringButton';
import CollectionPicker from '../CollectionPicker';
import { getConfig } from '../../config';
import { type Dietary, dietaryLabels, type RecipeType, typeLabels } from './constants';

interface RecipeCardProps {
  recipe: Recipe;
  matchReasons: string[];
  isAuthenticated: boolean;
  inNextUp: boolean;
  onMarkCooked: (recipeId: string) => void;
  onToggleFavorite: (recipeId: string, favorite: boolean) => void;
  onAddToNextUp: (recipeId: string) => void;
  onRemoveFromNextUp: (recipeId: string) => void;
  onActivateType: (type: string) => void;
  onActivateDietary: (dietary: string) => void;
}

const resolveImage = (image?: string): string => {
  if (!image) return '/placeholder.webp';
  return image.startsWith('/uploads') ? `${getConfig().API_URL}${image}` : image;
};

const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  matchReasons,
  isAuthenticated,
  inNextUp,
  onMarkCooked,
  onToggleFavorite,
  onAddToNextUp,
  onRemoveFromNextUp,
  onActivateType,
  onActivateDietary,
}) => {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-lg bg-surface shadow-[0_4px_8px_var(--color-shadow-soft)] transition-[translate,box-shadow] duration-300 ease-in-out hover:-translate-y-[5px] hover:shadow-[0_8px_16px_var(--color-shadow-strong)]">
      <div className="relative h-[200px] w-full overflow-hidden">
        {/* cook-state in top-left */}
        {!recipe.status?.cookState && (
          <div className="absolute left-2 top-2 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-surface/80 p-[0.3rem] text-[1.2rem] [&_i]:text-danger-bright">
            <i
              className="fa-solid fa-question"
              title="Noch nicht gekocht"
              role="button"
              tabIndex={0}
              onClick={() => onMarkCooked(recipe.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onMarkCooked(recipe.id);
              }}
              aria-label="Als gekocht markieren"
            />
          </div>
        )}
        {/* favorite in top-right */}
        <div className="absolute right-2 top-2 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-surface/80 p-[0.3rem] text-[1.2rem] [&_i[title='Favorit']]:text-danger-bright">
          {recipe.status?.favorite ? (
            <i
              className="fa-solid fa-heart"
              title="Favorit"
              role="button"
              tabIndex={0}
              onClick={() => onToggleFavorite(recipe.id, false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onToggleFavorite(recipe.id, false);
              }}
              aria-label="Favorit entfernen"
            />
          ) : (
            <i
              className="fa-regular fa-heart"
              title="Kein Favorit"
              role="button"
              tabIndex={0}
              onClick={() => onToggleFavorite(recipe.id, true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onToggleFavorite(recipe.id, true);
              }}
              aria-label="Als Favorit markieren"
            />
          )}
        </div>
        {/* collection picker below the cook icon */}
        {isAuthenticated && (
          <div className="absolute right-2 top-[5.5rem] z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-surface/80 p-[0.3rem] text-[1.2rem]">
            <CollectionPicker recipeId={recipe.id} />
          </div>
        )}
        {/* next-up bookmark below the favorite icon */}
        {isAuthenticated && (
          <div className="absolute right-2 top-12 z-[2] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-full bg-surface/80 p-[0.3rem] text-[1.2rem] [&_i[title='Aus_Next_Up_entfernen']]:text-action">
            {inNextUp ? (
              <i
                className="fa-solid fa-bookmark"
                title="Aus Next Up entfernen"
                role="button"
                tabIndex={0}
                onClick={() => onRemoveFromNextUp(recipe.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onRemoveFromNextUp(recipe.id);
                }}
                aria-label="Aus Next Up entfernen"
              />
            ) : (
              <i
                className="fa-regular fa-bookmark"
                title="Zu Next Up hinzufügen"
                role="button"
                tabIndex={0}
                onClick={() => onAddToNextUp(recipe.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onAddToNextUp(recipe.id);
                }}
                aria-label="Zu Next Up hinzufügen"
              />
            )}
          </div>
        )}
        <Link to={`/recipe/${recipe.id}`}>
          <img
            src={resolveImage(recipe.image)}
            alt={recipe.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-in-out hover:scale-105"
          />
        </Link>
      </div>
      <div className="flex grow flex-col gap-2.5 p-4">
        <h3 className="mb-1.5 mt-0 text-[1.2rem] font-semibold">{recipe.title}</h3>
        {matchReasons.length > 0 && (
          <div className="rounded-md border border-accent bg-accent-soft px-2.5 py-2" aria-label="Treffergrund">
            <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wide text-accent-dark">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <span>Gefunden über</span>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {matchReasons.map((reason) => (
                <span key={reason} className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-medium text-fg">
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2.5">
          {(recipe.recipeType || recipe.dietaryRestrictions?.length) && (
            <div className="flex flex-wrap-reverse gap-[0.3rem]">
              {recipe.recipeType && (
                <button
                  type="button"
                  className="cursor-pointer rounded-[5rem] border border-line bg-bg-alt px-[9px] py-[3px] text-[0.75rem] text-fg-muted hover:border-fg-muted"
                  onClick={() => onActivateType(recipe.recipeType!)}
                  title="Filter nach Rezepttyp"
                >
                  {typeLabels[recipe.recipeType as RecipeType] ?? recipe.recipeType}
                </button>
              )}
              {recipe.dietaryRestrictions?.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="cursor-pointer rounded-[5rem] border border-success-line bg-success-bg px-[9px] py-[3px] text-[0.75rem] text-success-fg hover:border-fg-muted"
                  onClick={() => onActivateDietary(d)}
                  title="Filter nach Ernährung"
                >
                  {dietaryLabels[d as Dietary] ?? d}
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
  );
};

export default RecipeCard;
