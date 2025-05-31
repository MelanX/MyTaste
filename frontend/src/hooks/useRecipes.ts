import { useEffect, useState } from 'react';
import { fetchAndCache, readCache } from '../utils/recipesCache';

export function useRecipes() {
    const [ recipes, setRecipes ] = useState<ReturnType<typeof readCache>>(readCache);
    const [ error, setError ] = useState<Error | null>(null);
    const [ loading, setLoading ] = useState(!recipes);

    useEffect(() => {
        let cancelled = false;

        fetchAndCache()
            .then(fresh => {
                if (cancelled) return;
                /* Only update state when something actually changed */
                if (JSON.stringify(fresh) !== JSON.stringify(recipes)) {
                    setRecipes(fresh);
                }
            })
            .catch(e => !cancelled && setError(e))
            .finally(() => !cancelled && setLoading(false));

        /* 3️⃣ Listen for updates from other tabs / SW */
        const onChange = () => setRecipes(readCache());
        window.addEventListener('recipes-updated', onChange);
        window.addEventListener('storage', onChange);   // cross-tab

        return () => {
            cancelled = true;
            window.removeEventListener('recipes-updated', onChange);
            window.removeEventListener('storage', onChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // never ever put 'recipes' in here, it will cause infinite loop!

    return { recipes, loading, error };
}
