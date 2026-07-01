import { useEffect, useRef, useState } from 'react';
import type { Ingredient, IngredientSection } from '../../types/Recipe';
import type { DragInfo, DragTarget } from './types';

/** Owns the ingredient-section state machine: flat vs sectioned mode, drag/drop reorder, add/remove/edit. */
export function useIngredientSections(initialSections: IngredientSection[]) {
  const [ingredientSections, setIngredientSections] = useState<IngredientSection[]>(
    () => (initialSections && initialSections.length > 0 ? initialSections : [{ ingredients: [] }]), // 👈 implicit "flat" section
  );
  const [pendingFocusSectionIndex, setPendingFocusSectionIndex] = useState<number | null>(null);
  const sectionTitleRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dragInfoRef = useRef<DragInfo | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionIngredientIndex, setEditingSectionIngredientIndex] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (ingredientSections.length === 0) {
      setIngredientSections([{ ingredients: [] }]);
    }
  }, [ingredientSections.length]);

  const handleIngredientDragStart = (sectionIndex: number, ingredientIndex: number) => {
    dragInfoRef.current = { fromSectionIndex: sectionIndex, fromIngredientIndex: ingredientIndex };
  };

  const handleIngredientDrop = (
    toSectionIndex: number,
    toIngredientIndex: number | null, // null = drop at end
  ) => {
    const info = dragInfoRef.current;
    if (!info) return;

    setIngredientSections((prev) => {
      const sections = prev.map((s) => ({ ...s, ingredients: [...s.ingredients] }));

      const { fromSectionIndex, fromIngredientIndex } = info;
      const sourceIngredients = sections[fromSectionIndex].ingredients;
      const dragged = sourceIngredients.splice(fromIngredientIndex, 1)[0];

      const targetIngredients = sections[toSectionIndex].ingredients;

      let insertIndex: number;
      if (toIngredientIndex === null) {
        insertIndex = targetIngredients.length;
      } else {
        insertIndex = toIngredientIndex;

        // 🔧 important: if we move DOWN within the same section,
        // the array got shorter by one, so we need to shift the insert index up by 1
        if (fromSectionIndex === toSectionIndex && toIngredientIndex > fromIngredientIndex) {
          insertIndex -= 1;
        }
      }

      targetIngredients.splice(insertIndex, 0, dragged);

      return sections;
    });

    dragInfoRef.current = null;
    setDragTarget(null);
  };

  const addSection = () => {
    setIngredientSections((prev) => {
      const next = prev.length > 0 ? prev.map((s) => ({ ...s })) : [{ ingredients: [] }];

      // If this is the first time we go from flat -> sections, ensure section 0 has a title
      if (next.length === 1) {
        next[0] = {
          ...next[0],
          title: next[0].title?.trim() || 'Sektion 1',
        };
      }

      const newSections = [...next, { title: `Sektion ${next.length + 1}`, ingredients: [] }];

      setPendingFocusSectionIndex(newSections.length - 1);
      return newSections;
    });
  };

  const removeSection = (index: number) => {
    setIngredientSections((prev) => {
      const next = prev.filter((_, i) => i !== index);

      // never allow "no section" state
      if (next.length === 0) {
        return [{ ingredients: [] }];
      }

      // collapsing back to flat mode -> remove section title
      if (next.length === 1) {
        return [{ ingredients: next[0].ingredients ?? [] }];
      }

      return next;
    });

    setEditingSectionIndex(null);
    setEditingSectionIngredientIndex(null);
  };

  const updateSectionTitle = (index: number, sectionTitle: string) => {
    setIngredientSections((prev) => prev.map((section, i) => (i === index ? { ...section, title: sectionTitle } : section)));
  };

  const addIngredientToSection = (sectionIndex: number, ingredient: Ingredient) => {
    setIngredientSections((prev) =>
      prev.map((section, i) => (i === sectionIndex ? { ...section, ingredients: [...section.ingredients, ingredient] } : section)),
    );
  };

  const updateIngredientInSection = (sectionIndex: number, ingredientIndex: number, ingredient: Ingredient) => {
    setIngredientSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              ingredients: section.ingredients.map((ing, idx) => (idx === ingredientIndex ? ingredient : ing)),
            }
          : section,
      ),
    );
  };

  const removeIngredientFromSection = (sectionIndex: number, ingredientIndex: number) => {
    setIngredientSections((prev) =>
      prev.map((section, i) =>
        i === sectionIndex
          ? {
              ...section,
              ingredients: section.ingredients.filter((_, idx) => idx !== ingredientIndex),
            }
          : section,
      ),
    );
  };

  const toggleSectionCollapsed = (sectionIndex: number) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex],
    }));
  };

  const finishEdit = () => {
    setEditingSectionIndex(null);
    setEditingSectionIngredientIndex(null);
  };

  const consumePendingFocus = (sectionIndex: number) => {
    if (pendingFocusSectionIndex === sectionIndex) {
      setPendingFocusSectionIndex(null);
    }
  };

  const startEditingIngredient = (sectionIndex: number, ingredientIndex: number) => {
    setEditingSectionIndex(sectionIndex);
    setEditingSectionIngredientIndex(ingredientIndex);
  };

  /** Normalizes sections for the submit payload: strip title in flat mode, ensure titles in section mode. */
  const buildNormalizedSections = (): IngredientSection[] => {
    const sections = ingredientSections.length > 0 ? ingredientSections : [{ ingredients: [] }];

    // flat mode -> strip title
    if (sections.length === 1) {
      return [{ ingredients: sections[0].ingredients ?? [] }];
    }

    // section mode -> ensure titles exist + trimmed
    return sections.map((s, idx) => ({
      title: (s.title ?? '').trim() || `Sektion ${idx + 1}`,
      ingredients: s.ingredients ?? [],
    }));
  };

  return {
    ingredientSections,
    isSectionMode: ingredientSections.length > 1,
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
    buildNormalizedSections,
  };
}
