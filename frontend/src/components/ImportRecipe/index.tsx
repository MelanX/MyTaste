import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeFormBase, { type RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import { apiFetch } from '../../utils/apiService';
import ErrorSection from '../ErrorSection';

const ImportRecipe: React.FC = () => {
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<RecipeFormValues | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const res = await apiFetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrors([json.message, ...json.details]);
        setLoading(false);
        return;
      }

      if ('ingredients' in json) {
        json.ingredient_sections = [{ ingredients: json.ingredients }];
        delete json.ingredients;
      }

      const data: RecipeFormValues = json;
      setImported(data);
    } catch (err) {
      setErrors(err instanceof Error ? [err.message] : ['Fehler beim Import']);
    } finally {
      setLoading(false);
    }
  };

  if (imported) {
    return (
      <RecipeFormBase
        initial={imported}
        submitLabel="Importiertes Rezept speichern"
        onSubmit={async (vals) => {
          const response = await apiFetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vals),
          });

          if (response.ok) {
            const json = await response.json();
            navigate(`/recipe/${json.id}`);
          }

          return response;
        }}
        showImportButton={false}
      />
    );
  }

  return (
    <div className="mx-auto my-8 max-w-[600px] rounded-[8px] bg-surface p-6 shadow-[0_2px_6px_var(--color-shadow-soft)]">
      <h2 className="mb-4 text-fg">Rezept importieren</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col font-medium text-fg">
          Rezept-URL
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.chefkoch.de/rezepte/..."
            required
            className="mt-2"
          />
        </label>
        {errors.length > 0 && <ErrorSection title={errors[0]} details={errors.slice(1)} />}
        <button
          type="submit"
          disabled={loading}
          className="w-fit cursor-pointer self-center rounded text-[1.2rem] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Importiere…' : 'Import starten'}
        </button>
      </form>
    </div>
  );
};

export default ImportRecipe;
