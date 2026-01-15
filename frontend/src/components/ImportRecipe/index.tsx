import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import RecipeFormBase, { RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import styles from './styles.module.css';
import { apiFetch } from '../../utils/api_service';
import ErrorSection from "../ErrorSection";

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
                body: JSON.stringify({url}),
            });

            const json = await res.json();
            if (!res.ok) {
                setErrors([json.message, ...json.details]);
                setLoading(false);
                return;
            }

            if ('ingredients' in json) {
                json.ingredient_sections = [ { ingredients: json.ingredients } ];
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
                showImportButton={ false }
            />
        );
    }

    return (
        <div className={styles.importContainer}>
            <h2>Rezept importieren</h2>
            <form onSubmit={handleSubmit} className={styles.importForm}>
                <label>
                    Rezept-URL
                    <input
                        type="url"
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://www.chefkoch.de/rezepte/..."
                        required
                    />
                </label>
                {errors.length > 0 && (
                    <ErrorSection title={errors[0]} details={errors.slice(1)} />
                )}
                <button type="submit" disabled={loading}>
                    {loading ? 'Importiere…' : 'Import starten'}
                </button>
            </form>
        </div>
    );
};

export default ImportRecipe;
