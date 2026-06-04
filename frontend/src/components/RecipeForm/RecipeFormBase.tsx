import React from 'react';
import ErrorSection from '../ErrorSection';
import IngredientSectionsEditor from './IngredientSectionsEditor';
import RecipeMetaFields, { SpicesEditor } from './RecipeMetaFields';
import { useRecipeForm } from './useRecipeForm';
import type { RecipeFormValues } from './types';

export type { RecipeFormValues } from './types';

interface RecipeFormBaseProps {
  initial?: RecipeFormValues;
  submitLabel: string;
  onSubmit: (values: RecipeFormValues) => Promise<Response>;
  onDelete?: () => Promise<Response>;
  redirectTo?: string;
  showImportButton?: boolean;
}

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
  const form = useRecipeForm({ initial, onSubmit, onDelete, redirectTo });
  const { errors, confirmingDelete, setConfirmingDelete, handleDelete, handleSubmit, redirectToImport } = form;

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
        <RecipeMetaFields form={form} />

        {/* Ingredients */}
        <div className="mt-5 border-t border-line pt-[15px]">
          <IngredientSectionsEditor form={form} />
          <SpicesEditor form={form} />
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

export default RecipeFormBase;
