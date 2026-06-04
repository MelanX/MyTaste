import React from 'react';
import type { Ingredient } from '../../types/Recipe';
import type { DragTarget } from './types';
import type { RecipeFormController } from './useRecipeForm';
import SectionAddRow from './SectionAddRow';
import {
  addButtonClass,
  dropZoneActiveClass,
  dropZoneClass,
  ingredientRowClass,
  ingredientRowDropBeforeClass,
  ingredientsTableClass,
  labelClass,
  sectionDeleteButtonClass,
  removeButtonClass,
} from './styles';

interface IngredientRowsProps {
  sectionIndex: number;
  ingredients: Ingredient[];
  dragTarget: DragTarget;
  setDragTarget: (target: DragTarget) => void;
  onDragStart: (sectionIndex: number, ingredientIndex: number) => void;
  onDrop: (sectionIndex: number, ingredientIndex: number | null) => void;
  onRemove: (sectionIndex: number, ingredientIndex: number) => void;
  onEdit: (sectionIndex: number, ingredientIndex: number) => void;
}

/** The draggable list of ingredient rows + the "drop at end" zone. Shared by flat & section mode. */
const IngredientRows: React.FC<IngredientRowsProps> = ({
  sectionIndex,
  ingredients,
  dragTarget,
  setDragTarget,
  onDragStart,
  onDrop,
  onRemove,
  onEdit,
}) => (
  <div className={ingredientsTableClass}>
    {ingredients.map((ingredient, ingredientIndex) => (
      <div
        key={ingredientIndex}
        className={
          ingredientRowClass +
          (dragTarget && dragTarget.sectionIndex === sectionIndex && dragTarget.ingredientIndex === ingredientIndex
            ? ' ' + ingredientRowDropBeforeClass
            : '')
        }
        draggable
        onDragStart={() => onDragStart(sectionIndex, ingredientIndex)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragTarget({ sectionIndex, ingredientIndex }); // show line before this row
        }}
        onDrop={(e) => {
          e.preventDefault();
          onDrop(sectionIndex, ingredientIndex);
        }}
        onClick={() => {
          // 👉 edit this ingredient in this section
          onEdit(sectionIndex, ingredientIndex);
        }}
      >
        <button
          type="button"
          className={removeButtonClass}
          onClick={(e) => {
            e.stopPropagation(); // don't start editing when deleting
            onRemove(sectionIndex, ingredientIndex);
          }}
        >
          <i className="fa-solid fa-minus" />
        </button>

        <div className="w-[4.375rem] text-[0.9rem] font-medium">
          {ingredient.amount}
          {ingredient.unit ? ` ${ingredient.unit}` : ''}
        </div>

        <div className="flex flex-1 flex-col break-words text-[0.9rem]">
          {ingredient.name}
          {ingredient.note && <span className="mt-1 flex items-start text-[0.8rem] text-fg-subtle italic">{ingredient.note}</span>}
        </div>

        <span className="px-1 text-[0.8rem] opacity-60">::</span>
      </div>
    ))}

    {/* drop at end of section */}
    <div
      className={
        dropZoneClass +
        (dragTarget && dragTarget.sectionIndex === sectionIndex && dragTarget.ingredientIndex === null ? ' ' + dropZoneActiveClass : '')
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDragTarget({ sectionIndex, ingredientIndex: null }); // line at end
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(sectionIndex, null);
      }}
    >
      Inhalte hierher ziehen, um sie ans Ende zu verschieben
    </div>
  </div>
);

interface IngredientSectionsEditorProps {
  form: RecipeFormController;
}

const IngredientSectionsEditor: React.FC<IngredientSectionsEditorProps> = ({ form }) => {
  const {
    ingredientSections,
    isSectionMode,
    collapsedSections,
    dragTarget,
    setDragTarget,
    editingSectionIndex,
    editingSectionIngredientIndex,
    sectionTitleRefs,
    pendingFocusSectionIndex,
    consumePendingFocus,
    handleIngredientDragStart,
    handleIngredientDrop,
    addSection,
    removeSection,
    updateSectionTitle,
    addIngredientToSection,
    updateIngredientInSection,
    removeIngredientFromSection,
    toggleSectionCollapsed,
    startEditingIngredient,
    finishEdit,
  } = form;

  return (
    <>
      {/* --- Zutaten / sections toggle --- */}
      <div className="mb-3 flex">
        <label className={labelClass}>Zutaten</label>

        <button
          type="button"
          className="ml-auto cursor-pointer rounded-[62.5rem] border-none bg-accent px-3 py-[0.35rem] text-[0.9rem] font-semibold text-white"
          onClick={addSection}
        >
          + Sektion hinzufügen
        </button>
      </div>

      {/* --- SECTION MODE --- */}
      {isSectionMode ? (
        <div className="flex flex-col gap-2">
          {ingredientSections.map((section, sectionIndex) => {
            const isCollapsed = !!collapsedSections[sectionIndex];

            return (
              <div
                key={sectionIndex}
                className="mb-3 rounded-[1.5rem] bg-bg px-4 pt-3 pb-[0.9rem] shadow-[inset_0_1px_3px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-center gap-3">
                  <input
                    className="flex-1 rounded-[0.25rem] border border-line-soft px-2 py-[0.3rem] font-semibold"
                    value={section.title ?? ''}
                    onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                    ref={(el) => {
                      sectionTitleRefs.current[sectionIndex] = el;
                      if (el && pendingFocusSectionIndex !== null && pendingFocusSectionIndex === sectionIndex) {
                        // focus & select the whole title when this section should get focus
                        el.focus();
                        el.select();
                        consumePendingFocus(sectionIndex);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={addButtonClass}
                    onClick={() => toggleSectionCollapsed(sectionIndex)}
                    aria-label={isCollapsed ? 'Sektion anzeigen' : 'Sektion ausblenden'}
                    title={isCollapsed ? 'Sektion anzeigen' : 'Sektion ausblenden'}
                  >
                    <i className={isCollapsed ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash'} />
                  </button>
                  <button type="button" className={sectionDeleteButtonClass} onClick={() => removeSection(sectionIndex)}>
                    Sektion entfernen
                  </button>
                </div>

                <div className={`flex flex-col gap-2 ${isCollapsed ? 'hidden' : ''}`}>
                  {/* existing list but draggable */}
                  <IngredientRows
                    sectionIndex={sectionIndex}
                    ingredients={section.ingredients}
                    dragTarget={dragTarget}
                    setDragTarget={setDragTarget}
                    onDragStart={handleIngredientDragStart}
                    onDrop={handleIngredientDrop}
                    onRemove={removeIngredientFromSection}
                    onEdit={startEditingIngredient}
                  />

                  {/* per-section "add ingredient" row */}
                  <SectionAddRow
                    sectionIndex={sectionIndex}
                    ingredientSections={ingredientSections}
                    editingSectionIndex={editingSectionIndex}
                    editingIngredientIndex={editingSectionIngredientIndex}
                    onAdd={addIngredientToSection}
                    onUpdate={updateIngredientInSection}
                    onFinishEdit={finishEdit}
                  />
                </div>
              </div>
            );
          })}

          {ingredientSections.length === 0 && (
            <p className="mt-1 text-[0.85rem] text-fg-subtle">Noch keine Sektionen. Klicke auf „Sektion hinzufügen“, um zu starten.</p>
          )}
        </div>
      ) : (
        /* FLAT MODE */
        <div>
          <IngredientRows
            sectionIndex={0}
            ingredients={ingredientSections[0]?.ingredients ?? []}
            dragTarget={dragTarget}
            setDragTarget={setDragTarget}
            onDragStart={handleIngredientDragStart}
            onDrop={handleIngredientDrop}
            onRemove={removeIngredientFromSection}
            onEdit={startEditingIngredient}
          />

          <SectionAddRow
            sectionIndex={0}
            ingredientSections={ingredientSections}
            editingSectionIndex={editingSectionIndex}
            editingIngredientIndex={editingSectionIngredientIndex}
            onAdd={addIngredientToSection}
            onUpdate={updateIngredientInSection}
            onFinishEdit={finishEdit}
          />
        </div>
      )}
    </>
  );
};

export default IngredientSectionsEditor;
