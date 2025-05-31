import { useEffect, useState } from 'react';
import { fetchOneAndCache, readCache } from '../utils/recipesCache';
import type { Recipe } from '../types/Recipe';

export function useRecipe(id: string | undefined) {
    const initial = id ? (readCache() ?? []).find(r => r.id === id) : null;

    const [ recipe, setRecipe ] = useState<Recipe | null>(initial ?? null);
    const [ loading, setLoading ] = useState(!initial);
    const [ error, setError ] = useState<Error | null>(null);

    useEffect(() => {
        if (!id) return;

        let cancelled = false;

        fetchOneAndCache(id)
            .then(fresh => !cancelled && setRecipe(fresh))
            .catch(e => !cancelled && setError(e))
            .finally(() => !cancelled && setLoading(false));

        const onChange = () => {
            const cached = (readCache() ?? []).find(r => r.id === id);
            if (cached) setRecipe(cached);
        };

        window.addEventListener('recipes-updated', onChange);
        window.addEventListener('storage', onChange);

        return () => {
            cancelled = true;
            window.removeEventListener('recipes-updated', onChange);
            window.removeEventListener('storage', onChange);
        };
    }, [ id ]);

    return { recipe, loading, error };
}
