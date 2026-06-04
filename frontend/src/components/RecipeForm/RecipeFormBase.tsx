import React, { type FormEvent, useEffect, useRef, useState } from 'react';
import type { Ingredient, IngredientSection } from '../../types/Recipe';
import ImageUpload from '../ImageUpload';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/api_service';
import ErrorSection from '../ErrorSection';
import InstructionsEditor from '../InstructionsEditor';

export interface RecipeFormValues {
  title: string;
  instructions: string[];
  url?: string;
  image?: string;
  ingredient_sections: IngredientSection[];
  spices?: string[];
  recipeType?: string;
  dietaryRestrictions?: string[];
}

interface RecipeFormBaseProps {
  initial?: RecipeFormValues;
  submitLabel: string;
  onSubmit: (values: RecipeFormValues) => Promise<Response>;
  onDelete?: () => Promise<Response>;
  redirectTo?: string;
  showImportButton?: boolean;
}

type DragInfo = {
  fromSectionIndex: number;
  fromIngredientIndex: number;
};

const parseAmount = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const n = Number(value.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
};

// Shared class strings (ported from styles.module.css)
const labelClass = 'block text-[1.2rem] font-semibold text-fg';
const pillBase =
  'cursor-pointer rounded-[5rem] border border-line bg-bg-alt px-[14px] py-[6px] text-[0.9rem] text-fg-muted hover:bg-accent-dark';
const pillActive = 'border-accent-dark bg-accent text-white';
const addButtonClass =
  'flex h-8 w-8 flex-[0_0_auto] cursor-pointer items-center justify-center self-center rounded-full border-none p-0 max-[600px]:self-end';
const ingredientInputClass = 'rounded-[0.25rem] border border-line-soft px-[0.4rem] py-[0.3rem] text-[0.9rem]';
const sectionAddRowClass = 'grid grid-cols-[1fr_auto] items-center gap-[0.4rem]';
const sectionAddInputsClass = 'grid min-w-0 grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] items-center gap-2';
const sectionAddActionsClass = 'flex items-center justify-end gap-[0.4rem] whitespace-nowrap';
const sectionDeleteButtonClass =
  'ml-auto h-8 cursor-pointer rounded-[2rem] border-none bg-danger px-3 py-[0.35rem] text-[0.85rem] font-medium text-white hover:bg-danger-strong';

const ingredientsTableClass =
  'my-2 max-h-[20rem] overflow-y-auto rounded-[4px] border border-line bg-surface p-[10px] shadow-[0_2px_6px_var(--color-shadow-soft)]';
const ingredientRowClass = 'relative flex cursor-move items-center gap-2 rounded-[0.25rem] px-[0.4rem] py-[0.3rem] hover:bg-bg';
const ingredientRowDropBeforeClass =
  "before:absolute before:-top-[0.125rem] before:right-0 before:left-0 before:h-[0.125rem] before:rounded-[62.5rem] before:bg-accent before:content-['']";
const removeButtonClass =
  'mr-[0.6rem] flex h-[1.7rem] w-[1.7rem] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-danger p-0 text-[1.2rem] leading-none text-white transition-colors hover:bg-danger-strong disabled:cursor-not-allowed disabled:bg-disabled';
const dropZoneClass = 'mt-[0.3rem] rounded-[0.25rem] border border-dashed border-line-soft px-[0.4rem] py-1 text-[0.75rem] text-fg-subtle';
const dropZoneActiveClass = 'border-accent bg-accent-soft text-fg-subtle';

const RecipeFormBase: React.FC<RecipeFormBaseProps> = ({
  initial = {
    title: '',
    instructions: [''],
    url: '',
    image: '',
    ingredient_sections: [],
    spices: [],
    recipeType: '',
    dietaryRestrictions: [],
  },
  submitLabel,
  onSubmit,
  onDelete,
  redirectTo,
  showImportButton,
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial.title);
  const [instructions, setInstructions] = useState<string[]>(initial.instructions);
  const [url, setUrl] = useState<string>(initial.url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [image, setImage] = useState(initial.image || '');
  const [ingredientSections, setIngredientSections] = useState<IngredientSection[]>(
    () => (initial.ingredient_sections && initial.ingredient_sections.length > 0 ? initial.ingredient_sections : [{ ingredients: [] }]), // 👈 implicit "flat" section
  );
  const [pendingFocusSectionIndex, setPendingFocusSectionIndex] = useState<number | null>(null);
  const sectionTitleRefs = useRef<(HTMLInputElement | null)[]>([]);
  const dragInfoRef = useRef<DragInfo | null>(null);
  const [dragTarget, setDragTarget] = useState<{
    sectionIndex: number;
    ingredientIndex: number | null;
  } | null>(null);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionIngredientIndex, setEditingSectionIngredientIndex] = useState<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [recipeType, setRecipeType] = useState(initial.recipeType || '');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(initial.dietaryRestrictions || []);

  const toggleDietary = (value: string) => {
    setDietaryRestrictions((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };
  const [spices, setSpices] = useState<string[]>(initial.spices || []);
  const [newSpice, setNewSpice] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
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

  const updateSectionTitle = (index: number, title: string) => {
    setIngredientSections((prev) => prev.map((section, i) => (i === index ? { ...section, title } : section)));
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

  const handleAddSpice = () => {
    if (!newSpice.trim()) return;
    setSpices([...spices, newSpice]);
    setNewSpice('');
  };

  const handleRemoveSpice = (index: number) => {
    setSpices((s) => s.filter((_, idx) => idx !== index));
  };

  const handleDelete = () => onDelete!();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const filteredInstructions = instructions.filter((l) => l.trim());

    let imgUrl = image;
    if (imageFile && !imgUrl) {
      try {
        const form = new FormData();
        form.append('file', imageFile);
        const response = await apiFetch('/api/upload-image', {
          method: 'POST',
          body: form,
        });

        if (!response.ok) {
          const json = await response.json();
          setErrors([json.message, ...json.details]);
          return;
        }

        const { url: uploadedUrl } = await response.json();
        imgUrl = uploadedUrl;
      } catch (err) {
        console.error(err);
        return;
      }
    }

    let maybeSpices: string[] | undefined = spices.map((s) => s.trim()).filter((s) => s !== '');
    if (maybeSpices.length === 0) {
      maybeSpices = undefined;
    }

    const normalizedSections: IngredientSection[] = (() => {
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
    })();

    const payload: RecipeFormValues = {
      title,
      instructions: filteredInstructions,
      url: url.trim() || undefined,
      image: imgUrl.trim() || undefined,
      spices: maybeSpices,
      ingredient_sections: normalizedSections,
      recipeType: recipeType || undefined,
      dietaryRestrictions: dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,
    };

    const response: Response = await onSubmit(payload);

    if (!response.ok) {
      const json = await response.json();
      setErrors([json.message, ...json.details]);
      return;
    }

    if (redirectTo) {
      navigate(redirectTo);
    }
  };

  const redirectToImport = async () => {
    navigate('/import-recipe');
  };

  const isSectionMode = ingredientSections.length > 1;

  return (
    <div className="mx-auto max-w-[800px] rounded-[8px] bg-surface p-5 shadow-[0_2px_6px_var(--color-shadow-soft)]">
      <div className="flex items-center gap-[10px] px-5">
        <h2>{submitLabel}</h2>
        {showImportButton && (
          <button type="button" className="ml-auto text-base font-medium" onClick={redirectToImport}>
            Lieber importieren!
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-5">
        <div className="[&_div]:mb-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className={labelClass}>
              Titel
            </label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          {/* Instructions */}
          <div>
            <label className={labelClass}>Anleitung</label>
            <InstructionsEditor value={instructions.length > 0 ? instructions : ['']} onChange={setInstructions} />
          </div>

          {/* Original URL */}
          <div>
            <label htmlFor="url" className={labelClass}>
              Originalrezept-URL
            </label>
            <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          {/* Recipe Type */}
          <div>
            <label className={labelClass}>Rezepttyp</label>
            <div className="mt-[0.4rem] flex flex-wrap gap-2">
              {(
                [
                  ['cooking', 'Kochen'],
                  ['baking', 'Backen'],
                  ['snack', 'Snack'],
                  ['dessert', 'Dessert'],
                ] as [string, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${pillBase} ${recipeType === value ? pillActive : ''}`}
                  onClick={() => setRecipeType((v) => (v === value ? '' : value))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Restrictions */}
          <div>
            <label className={labelClass}>
              Ernährung <span className="text-[0.75rem] font-normal text-fg-muted">(Mehrfachauswahl)</span>
            </label>
            <div className="mt-[0.4rem] flex flex-wrap gap-2">
              {(
                [
                  ['vegan', 'Vegan'],
                  ['vegetarian', 'Vegetarisch'],
                  ['glutenfree', 'Glutenfrei'],
                  ['dairyfree', 'Laktosefrei'],
                ] as [string, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`${pillBase} ${dietaryRestrictions.includes(value) ? pillActive : ''}`}
                  onClick={() => toggleDietary(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Image */}
          <div>
            <label className={labelClass}>Vorschaubild</label>
            <ImageUpload file={imageFile} onFile={setImageFile} url={image} onUrl={setImage} />
            <small>…oder externe URL eingeben:</small>
            <input
              id="image"
              type="url"
              value={image.startsWith('/uploads') ? '' : image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/bild.jpg"
            />
          </div>
        </div>

        {/* Ingredients */}
        <div className="mt-5 border-t border-line pt-[15px]">
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
                            setPendingFocusSectionIndex(null);
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
                      <div className={ingredientsTableClass}>
                        {section.ingredients.map((ingredient, ingredientIndex) => (
                          <div
                            key={ingredientIndex}
                            className={
                              ingredientRowClass +
                              (dragTarget && dragTarget.sectionIndex === sectionIndex && dragTarget.ingredientIndex === ingredientIndex
                                ? ' ' + ingredientRowDropBeforeClass
                                : '')
                            }
                            draggable
                            onDragStart={() => handleIngredientDragStart(sectionIndex, ingredientIndex)}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragTarget({ sectionIndex, ingredientIndex }); // show line before this row
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleIngredientDrop(sectionIndex, ingredientIndex);
                            }}
                            onClick={() => {
                              // 👉 edit this ingredient in this section
                              setEditingSectionIndex(sectionIndex);
                              setEditingSectionIngredientIndex(ingredientIndex);
                            }}
                          >
                            <button
                              type="button"
                              className={removeButtonClass}
                              onClick={(e) => {
                                e.stopPropagation(); // don't start editing when deleting
                                removeIngredientFromSection(sectionIndex, ingredientIndex);
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
                              {ingredient.note && (
                                <span className="mt-1 flex items-start text-[0.8rem] text-fg-subtle italic">{ingredient.note}</span>
                              )}
                            </div>

                            <span className="px-1 text-[0.8rem] opacity-60">::</span>
                          </div>
                        ))}

                        {/* drop at end of section */}
                        <div
                          className={
                            dropZoneClass +
                            (dragTarget && dragTarget.sectionIndex === sectionIndex && dragTarget.ingredientIndex === null
                              ? ' ' + dropZoneActiveClass
                              : '')
                          }
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragTarget({ sectionIndex, ingredientIndex: null }); // line at end
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            handleIngredientDrop(sectionIndex, null);
                          }}
                        >
                          Inhalte hierher ziehen, um sie ans Ende zu verschieben
                        </div>
                      </div>

                      {/* per-section "add ingredient" row */}
                      <SectionAddRow
                        sectionIndex={sectionIndex}
                        ingredientSections={ingredientSections}
                        editingSectionIndex={editingSectionIndex}
                        editingIngredientIndex={editingSectionIngredientIndex}
                        onAdd={(secIndex, ing) => addIngredientToSection(secIndex, ing)}
                        onUpdate={updateIngredientInSection}
                        onFinishEdit={() => {
                          setEditingSectionIndex(null);
                          setEditingSectionIngredientIndex(null);
                        }}
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
              <div className={ingredientsTableClass}>
                {(ingredientSections[0]?.ingredients ?? []).map((ingredient, idx) => (
                  <div
                    key={idx}
                    className={
                      ingredientRowClass +
                      (dragTarget && dragTarget.sectionIndex === 0 && dragTarget.ingredientIndex === idx
                        ? ' ' + ingredientRowDropBeforeClass
                        : '')
                    }
                    draggable
                    onDragStart={() => handleIngredientDragStart(0, idx)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragTarget({ sectionIndex: 0, ingredientIndex: idx }); // show line before this row
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleIngredientDrop(0, idx);
                    }}
                    onClick={() => {
                      setEditingSectionIndex(0);
                      setEditingSectionIngredientIndex(idx);
                    }}
                  >
                    <button
                      type="button"
                      className={removeButtonClass}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeIngredientFromSection(0, idx);
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
                      {ingredient.note && (
                        <span className="mt-1 flex items-start text-[0.8rem] text-fg-subtle italic">{ingredient.note}</span>
                      )}
                    </div>

                    <span className="px-1 text-[0.8rem] opacity-60">::</span>
                  </div>
                ))}

                <div
                  className={
                    dropZoneClass +
                    (dragTarget && dragTarget.sectionIndex === 0 && dragTarget.ingredientIndex === null ? ' ' + dropZoneActiveClass : '')
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragTarget({ sectionIndex: 0, ingredientIndex: null });
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleIngredientDrop(0, null);
                  }}
                >
                  Inhalte hierher ziehen, um sie ans Ende zu verschieben
                </div>
              </div>

              <SectionAddRow
                sectionIndex={0}
                ingredientSections={ingredientSections}
                editingSectionIndex={editingSectionIndex}
                editingIngredientIndex={editingSectionIngredientIndex}
                onAdd={(secIndex, ing) => addIngredientToSection(secIndex, ing)}
                onUpdate={updateIngredientInSection}
                onFinishEdit={() => {
                  setEditingSectionIndex(null);
                  setEditingSectionIngredientIndex(null);
                }}
              />
            </div>
          )}

          {/* Spices */}
          <label className={labelClass}>Gewürze</label>
          <div className="flex flex-wrap gap-2 [&:has(div)]:mt-4 [&:has(div)]:mb-2">
            {spices.map((s, i) => (
              <div
                key={s}
                className="inline-flex cursor-pointer items-center rounded-2xl bg-bg-alt px-3 py-[5px] text-[0.9rem] transition-colors hover:bg-danger"
                onClick={() => handleRemoveSpice(i)}
              >
                {s}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-[0.4rem] max-[600px]:flex max-[600px]:flex-col">
            <input
              type="text"
              value={newSpice}
              onChange={(e) => setNewSpice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSpice();
                }
              }}
              placeholder="Neues Gewürz"
            />
            <div className={sectionAddActionsClass}>
              <button type="button" className={addButtonClass} onClick={handleAddSpice} disabled={!newSpice.trim()}>
                <i className="fa-solid fa-plus" />
              </button>
            </div>
          </div>
        </div>

        {errors.length > 0 && <ErrorSection title={errors[0]} details={errors.slice(1)} />}
        <div className="mt-8 flex items-center gap-2 text-right max-[600px]:flex-col max-[600px]:items-stretch max-[600px]:text-left">
          {onDelete &&
            (confirmingDelete ? (
              <div className="mr-auto flex items-center gap-2 max-[600px]:mr-0 max-[600px]:flex-col max-[600px]:items-stretch">
                <span className="font-semibold text-danger">Bist du sicher?</span>
                <button
                  type="button"
                  className="bg-danger px-5 py-[10px] text-base font-semibold hover:bg-danger-strong"
                  onClick={handleDelete}
                >
                  Ja, löschen
                </button>
                <button type="button" className="px-5 py-[10px] text-base font-semibold" onClick={() => setConfirmingDelete(false)}>
                  Abbrechen
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mr-auto bg-danger px-5 py-[10px] text-base font-semibold hover:bg-danger-strong max-[600px]:mr-0"
                onClick={() => setConfirmingDelete(true)}
              >
                <i className="fa-solid fa-trash-can" /> Lösche Rezept
              </button>
            ))}
          <div className="hidden max-[600px]:block max-[600px]:border-t max-[600px]:border-line" />
          <button type="submit" className="px-5 py-[10px] text-base font-semibold">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};

interface SectionAddRowProps {
  sectionIndex: number;
  ingredientSections: IngredientSection[];
  editingSectionIndex: number | null;
  editingIngredientIndex: number | null;
  onAdd: (sectionIndex: number, ingredient: Ingredient) => void;
  onUpdate: (sectionIndex: number, ingredientIndex: number, ingredient: Ingredient) => void;
  onFinishEdit: () => void;
}

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

export default RecipeFormBase;
