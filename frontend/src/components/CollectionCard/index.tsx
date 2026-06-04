import React from 'react';
import { Link } from 'react-router-dom';
import type { Collection } from '../../types/Collections';
import type { Recipe } from '../../types/Recipe';
import { getConfig } from '../../config';

interface Props {
  collection: Collection;
  recipes: Recipe[];
}

const CollectionCard: React.FC<Props> = ({ collection, recipes }) => {
  const first = recipes.find((r) => r.id === collection.recipeIds[0]);
  const imageSrc = first?.image
    ? first.image.startsWith('/uploads')
      ? `${getConfig().API_URL}${first.image}`
      : first.image
    : '/placeholder.webp';

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg bg-surface shadow-[0_4px_8px_var(--color-shadow-soft)] transition-[transform,box-shadow] duration-300 ease-in-out hover:-translate-y-[5px] hover:shadow-[0_8px_16px_var(--color-shadow-strong)]">
      <Link to={`/collections/${collection.id}`} className="relative block h-[200px] overflow-hidden no-underline">
        <img
          src={imageSrc}
          alt={collection.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 flex flex-col justify-end gap-[0.2rem] bg-gradient-to-t from-black/55 from-0% to-transparent to-[55%] p-[0.8rem]">
          <span className="text-[1.1rem] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">{collection.name}</span>
          <span className="text-[0.8rem] text-white/85">
            {collection.recipeIds.length} Rezept{collection.recipeIds.length !== 1 ? 'e' : ''}
          </span>
        </div>
      </Link>
    </div>
  );
};

export default CollectionCard;
