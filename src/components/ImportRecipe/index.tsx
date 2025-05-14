import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RecipeFormBase, { RecipeFormValues } from '../RecipeForm/RecipeFormBase';
import styles from './styles.module.css';

const ImportRecipe: React.FC = () => {
    const [provider, setProvider] = useState<'chefkoch'>('chefkoch');
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [imported, setImported] = useState<RecipeFormValues | null>(null);
    const { token } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // only allow chefkoch.de URLs for now
        const chefRegex = /^https?:\/\/(www\.)?chefkoch\.de\/rezepte\/\d+\/.*$/;
        if (!chefRegex.test(url)) {
            setError('Bitte geben Sie eine gültige chefkoch.de-Rezept-URL ein');
            return;
        }
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ provider, url }),
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
                    await fetch('/api/recipes', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(vals),
                    });
                    navigate('/');
                }}
            />
        );
    }

    return (
        <div className={styles.importContainer}>
            <h2>Rezept importieren</h2>
            <form onSubmit={handleSubmit} className={styles.importForm}>
                <label>
                    Anbieter
                    <select value={provider} onChange={e => setProvider(e.target.value as any)}>
                        <option value="chefkoch">chefkoch.de</option>
                    </select>
                </label>
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
