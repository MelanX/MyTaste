import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCollectionsContext } from '../../context/CollectionsContext';

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
      className="max-h-[280px] min-w-[200px] overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-[0_4px_16px_var(--color-shadow-soft)]"
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
      {pickerError && <p className="m-0 px-[14px] py-[6px] text-[0.85rem] text-danger">{pickerError}</p>}
      {collections.length === 0 && !showNew && <p className="m-0 px-[14px] py-2 text-[0.9rem] text-fg-muted">Keine Sammlungen</p>}
      {collections.map((c) => {
        const checked = c.recipeIds.includes(recipeId);
        return (
          <label key={c.id} className="flex cursor-pointer items-center gap-2 px-[14px] text-[0.95rem] text-fg hover:bg-bg-alt">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(c.id, checked)}
              className="h-[15px] w-[15px] shrink-0 cursor-pointer accent-[var(--color-accent)]"
            />
            <span>{c.name}</span>
          </label>
        );
      })}
      <hr className="mx-3 my-2 border-none border-t border-line" />
      {showNew ? (
        <form onSubmit={handleCreate} className="m-0 mb-1 mt-3 flex gap-1 px-[10px]">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name..."
            className="m-0 flex-1 rounded border border-line bg-surface px-2 py-1 text-[0.9rem] text-fg focus:border-accent focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-none bg-accent p-0 font-bold text-white hover:bg-accent-dark"
          >
            <i className="fa-solid fa-plus" />
          </button>
        </form>
      ) : (
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-1.5 border-none bg-transparent px-[14px] py-2 text-left text-[0.9rem] text-accent-dark hover:bg-bg-alt"
          onClick={() => setShowNew(true)}
        >
          <i className="fa-solid fa-plus" /> Neue Sammlung
        </button>
      )}
    </div>
  );

  return (
    <div className={`relative inline-block${variant === 'button' ? ' block w-full md:w-auto' : ''}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={
          variant === 'button'
            ? 'box-border flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded border-none bg-accent px-4 py-2 text-base font-medium text-white hover:bg-accent-dark md:w-auto'
            : 'flex h-full w-full cursor-pointer items-center justify-center border-none bg-transparent p-0 text-[1.1rem] text-fg-muted hover:bg-transparent hover:text-accent'
        }
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
