import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../utils/apiService';
import type { RecipeFormValues } from './types';
import { useIngredientSections } from './useIngredientSections';

interface UseRecipeFormArgs {
  initial: RecipeFormValues;
  onSubmit: (values: RecipeFormValues) => Promise<Response>;
  onDelete?: () => Promise<Response>;
  redirectTo?: string;
}

export function useRecipeForm({ initial, onSubmit, onDelete, redirectTo }: UseRecipeFormArgs) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initial.title);
  const [instructions, setInstructions] = useState<string[]>(initial.instructions);
  const [url, setUrl] = useState<string>(initial.url || '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [image, setImage] = useState(initial.image || '');
  const [recipeType, setRecipeType] = useState(initial.recipeType || '');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(initial.dietaryRestrictions || []);
  const [spices, setSpices] = useState<string[]>(initial.spices || []);
  const [newSpice, setNewSpice] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sections = useIngredientSections(initial.ingredient_sections);

  const toggleDietary = (value: string) => {
    setDietaryRestrictions((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
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

    const payload: RecipeFormValues = {
      title,
      instructions: filteredInstructions,
      url: url.trim() || undefined,
      image: imgUrl.trim() || undefined,
      spices: maybeSpices,
      ingredient_sections: sections.buildNormalizedSections(),
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

  return {
    // meta field state
    title,
    setTitle,
    instructions,
    setInstructions,
    url,
    setUrl,
    imageFile,
    setImageFile,
    image,
    setImage,
    recipeType,
    setRecipeType,
    dietaryRestrictions,
    toggleDietary,
    spices,
    newSpice,
    setNewSpice,
    handleAddSpice,
    handleRemoveSpice,
    // ingredient sections state + handlers (delegated)
    ...sections,
    // form-level
    errors,
    confirmingDelete,
    setConfirmingDelete,
    handleDelete,
    handleSubmit,
    redirectToImport,
  };
}

export type RecipeFormController = ReturnType<typeof useRecipeForm>;
