import React, { useEffect, useRef, useState } from 'react';
import type { Ingredient, IngredientSection } from '../../types/Recipe';
import { parseAmount } from './types';
import {
  addButtonClass,
  ingredientInputClass,
  sectionAddActionsClass,
  sectionAddInputsClass,
  sectionAddRowClass,
  sectionDeleteButtonClass,
} from './styles';

interface SectionAddRowProps {
  sectionIndex: number;
  ingredientSections: IngredientSection[];
  editingSectionIndex: number | null;
  editingIngredientIndex: number | null;
  onAdd: (sectionIndex: number, ingredient: Ingredient) => void;
  onUpdate: (sectionIndex: number, ingredientIndex: number, ingredient: Ingredient) => void;
  onFinishEdit: () => void;
}

/** The "add / edit ingredient" input row at the bottom of each section (and flat mode). */
const SectionAddRow: React.FC<SectionAddRowProps> = ({
  sectionIndex,
  ingredientSections,
  editingSectionIndex,
  editingIngredientIndex,
  onAdd,
  onUpdate,
  onFinishEdit,
}) => {
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = editingSectionIndex === sectionIndex && editingIngredientIndex !== null && editingIngredientIndex !== undefined;

  // when an ingredient in THIS section is selected for editing, load it into the row
  useEffect(() => {
    if (!isEditing) return;

    const section = ingredientSections[sectionIndex];
    const ing = section.ingredients[editingIngredientIndex!];
    if (!ing) return;

    setAmount(typeof ing.amount === 'number' ? String(ing.amount).replace('.', ',') : '');
    setUnit(ing.unit ?? '');
    setName(ing.name);
    setNote(ing.note ?? '');

    amountInputRef.current?.focus();
    amountInputRef.current?.select();
  }, [isEditing, ingredientSections, sectionIndex, editingIngredientIndex]);

  const resetFields = () => {
    setAmount('');
    setUnit('');
    setName('');
    setNote('');
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const ingredient: Ingredient = {
      name: name.trim(),
      amount: parseAmount(amount),
      unit: unit.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (isEditing && editingIngredientIndex !== null && editingIngredientIndex !== undefined) {
      onUpdate(sectionIndex, editingIngredientIndex, ingredient);
      onFinishEdit();
    } else {
      onAdd(sectionIndex, ingredient);
    }

    resetFields();
  };

  const handleCancel = () => {
    resetFields();
    onFinishEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className={sectionAddRowClass}>
      <div className={sectionAddInputsClass}>
        <input
          ref={amountInputRef}
          className={ingredientInputClass}
          placeholder="Menge"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          className={ingredientInputClass}
          placeholder="Einheit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          className={ingredientInputClass}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <input
          className={ingredientInputClass}
          placeholder="Anmerkung (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className={sectionAddActionsClass}>
        <button type="button" className={addButtonClass} onClick={handleSave}>
          {isEditing ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-plus" />}
        </button>

        {isEditing && (
          <button type="button" className={sectionDeleteButtonClass} onClick={handleCancel}>
            Abbrechen
          </button>
        )}
      </div>
    </div>
  );
};

export default SectionAddRow;
