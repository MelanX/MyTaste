import React from 'react';
import { Link } from 'react-router-dom';
import type { Collection } from '../../types/Collections';
import type { Recipe } from '../../types/Recipe';
import { getConfig } from '../../config';
import styles from './styles.module.css';

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
    <div className={styles.card}>
      <Link to={`/collections/${collection.id}`} className={styles.imageLink}>
        <img src={imageSrc} alt={collection.name} className={styles.image} />
        <div className={styles.overlay}>
          <span className={styles.name}>{collection.name}</span>
          <span className={styles.count}>
            {collection.recipeIds.length} Rezept{collection.recipeIds.length !== 1 ? 'e' : ''}
          </span>
        </div>
      </Link>
    </div>
  );
};

export default CollectionCard;
