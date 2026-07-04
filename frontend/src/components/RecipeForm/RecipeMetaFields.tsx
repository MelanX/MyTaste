import React from 'react';
import ImageUpload from '../ImageUpload';
import InstructionsEditor from '../InstructionsEditor';
import { addButtonClass, labelClass, pillActive, pillBase, pillInactive, sectionAddActionsClass } from './styles';
import type { RecipeFormController } from './useRecipeForm';

const RECIPE_TYPES: [string, string][] = [
  ['cooking', 'Kochen'],
  ['baking', 'Backen'],
  ['snack', 'Snack'],
  ['dessert', 'Dessert'],
];

const DIETARY_OPTIONS: [string, string][] = [
  ['vegan', 'Vegan'],
  ['vegetarian', 'Vegetarisch'],
  ['glutenfree', 'Glutenfrei'],
  ['dairyfree', 'Laktosefrei'],
];

interface RecipeMetaFieldsProps {
  form: RecipeFormController;
}

const RecipeMetaFields: React.FC<RecipeMetaFieldsProps> = ({ form }) => {
  const {
    title,
    setTitle,
    instructions,
    setInstructions,
    url,
    setUrl,
    image,
    setImage,
    imageFile,
    setImageFile,
    recipeType,
    setRecipeType,
    dietaryRestrictions,
    toggleDietary,
  } = form;

  return (
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
          {RECIPE_TYPES.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${pillBase} ${recipeType === value ? pillActive : pillInactive}`}
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
          {DIETARY_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`${pillBase} ${dietaryRestrictions.includes(value) ? pillActive : pillInactive}`}
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
  );
};

interface SpicesEditorProps {
  form: RecipeFormController;
}

export const SpicesEditor: React.FC<SpicesEditorProps> = ({ form }) => {
  const { spices, newSpice, setNewSpice, handleAddSpice, handleRemoveSpice } = form;

  return (
    <>
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
    </>
  );
};

export default RecipeMetaFields;
