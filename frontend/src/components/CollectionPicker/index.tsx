import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCollectionsContext } from '../../context/CollectionsContext';
import styles from './styles.module.css';

interface Props {
  recipeId: string;
  variant?: 'icon' | 'button';
}

const CollectionPicker: React.FC<Props> = ({ recipeId, variant = 'icon' }) => {
  const { collections, addRecipe, removeRecipe, create } = useCollectionsContext();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const gap = 6;
      const maxH = 280;
      const right = window.innerWidth - rect.right;
      if (window.innerHeight - rect.bottom - gap >= maxH) {
        setDropdownPos({ top: rect.bottom + gap, right });
      } else {
        setDropdownPos({ bottom: window.innerHeight - rect.top + gap, right });
      }
    }
    setOpen((v) => !v);
  };

  const toggle = async (collectionId: string, inCollection: boolean) => {
    try {
      if (inCollection) {
        await removeRecipe(collectionId, recipeId);
      } else {
        await addRecipe(collectionId, recipeId);
      }
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await create(newName.trim());
      setNewName('');
      setShowNew(false);
    } catch (err) {
      setPickerError(err instanceof Error ? err.message : 'Fehler beim Erstellen');
    }
  };

  const inCount = collections.filter((c) => c.recipeIds.includes(recipeId)).length;
  const buttonLabel = inCount === 0 ? 'Zu Sammlung' : inCount === 1 ? 'In 1 Sammlung' : `In ${inCount} Sammlungen`;

  const dropdown = (
    <div
      ref={dropdownRef}
      className={styles.dropdown}
      style={{
        position: 'fixed',
        top: dropdownPos.top,
        bottom: dropdownPos.bottom,
        right: dropdownPos.right,
        zIndex: 1000,
        maxHeight:
          dropdownPos.top != null
            ? window.innerHeight - dropdownPos.top - 8
            : dropdownPos.bottom != null
              ? window.innerHeight - dropdownPos.bottom - 8
              : 280,
      }}
    >
      {pickerError && <p className={styles.pickerError}>{pickerError}</p>}
      {collections.length === 0 && !showNew && <p className={styles.empty}>Keine Sammlungen</p>}
      {collections.map((c) => {
        const checked = c.recipeIds.includes(recipeId);
        return (
          <label key={c.id} className={styles.item}>
            <input type="checkbox" checked={checked} onChange={() => toggle(c.id, checked)} />
            <span>{c.name}</span>
          </label>
        );
      })}
      <hr className={styles.separator} />
      {showNew ? (
        <form onSubmit={handleCreate} className={styles.newForm}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name..."
            className={styles.newInput}
            autoFocus
          />
          <button type="submit" className={styles.createBtn}>
            <i className="fa-solid fa-plus" />
          </button>
        </form>
      ) : (
        <button type="button" className={styles.newCollectionBtn} onClick={() => setShowNew(true)}>
          <i className="fa-solid fa-plus" /> Neue Sammlung
        </button>
      )}
    </div>
  );

  return (
    <div className={`${styles.wrapper}${variant === 'button' ? ` ${styles.wrapperFull}` : ''}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={variant === 'button' ? styles.triggerButton : styles.trigger}
        onClick={handleToggle}
        title="Zu Sammlung hinzufügen"
      >
        <i className="fa-solid fa-folder-plus" />
        {variant === 'button' && <span> {buttonLabel}</span>}
      </button>

      {open && createPortal(dropdown, document.body)}
    </div>
  );
};

export default CollectionPicker;
