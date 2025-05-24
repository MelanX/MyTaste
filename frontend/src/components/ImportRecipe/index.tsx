import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RecipeFormBase, { RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import styles from './styles.module.css';
import { apiFetch } from '../../utils/api_service';

interface Props {
    onSubmit: () => Promise<void>;
}

const ImportRecipe: React.FC<Props> = ({onSubmit}) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [imported, setImported] = useState<RecipeFormValues | null>(null);
    const {token} = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await apiFetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? {Authorization: `Bearer ${token}`} : {}),
                },
                body: JSON.stringify({url}),
            });
            if (!res.ok) throw new Error('Import fehlgeschlagen');
            const data: RecipeFormValues = await res.json();
            setImported(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Import');
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
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? {Authorization: `Bearer ${token}`} : {}),
                        },
                        body: JSON.stringify(vals),
                    });

                    if (response.ok) {
                        const json = await response.json();
                        await onSubmit();
                        navigate(`/recipe/${json.id}`);
                    }

                    return response;
                }}
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
                {error && <p className={styles.error}>{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Importiere…' : 'Import starten'}
                </button>
            </form>
        </div>
    );
};

export default ImportRecipe;
