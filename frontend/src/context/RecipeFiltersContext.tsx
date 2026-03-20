import React, { createContext, useContext, useState } from 'react';

const SESSION_KEY = 'recipeFilters';

interface PersistedFilters {
    titleFilter: string;
    selectedTypes: string[];
    typeMode: 'or' | 'and';
    selectedDietary: string[];
    dietaryMode: 'or' | 'and';
    favFilter: boolean;
    cookFilter: 'cooked' | 'uncooked' | null;
    sortMode: 'favorites' | 'alpha-asc' | 'alpha-desc' | 'random';
}

const defaults: PersistedFilters = {
    titleFilter: '',
    selectedTypes: [],
    typeMode: 'or',
    selectedDietary: [],
    dietaryMode: 'or',
    favFilter: false,
    cookFilter: null,
    sortMode: 'alpha-asc',
};

function loadFromSession(): PersistedFilters {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch {}
    return defaults;
}

function usePersistedState<T>(key: keyof PersistedFilters, initial: T) {
    const [ value, setValueRaw ] = useState<T>(initial);

    const setValue: React.Dispatch<React.SetStateAction<T>> = (action) => {
        setValueRaw(prev => {
            const next = typeof action === 'function' ? (action as (p: T) => T)(prev) : action;
            try {
                const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
                sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...stored, [key]: next }));
            } catch {}
            return next;
        });
    };

    return [ value, setValue ] as const;
}

interface RecipeFiltersContextValue {
    titleFilter: string;
    setTitleFilter: (v: string) => void;
    selectedTypes: string[];
    setSelectedTypes: React.Dispatch<React.SetStateAction<string[]>>;
    typeMode: 'or' | 'and';
    setTypeMode: (m: 'or' | 'and') => void;
    selectedDietary: string[];
    setSelectedDietary: React.Dispatch<React.SetStateAction<string[]>>;
    dietaryMode: 'or' | 'and';
    setDietaryMode: (m: 'or' | 'and') => void;
    favFilter: boolean;
    setFavFilter: React.Dispatch<React.SetStateAction<boolean>>;
    cookFilter: 'cooked' | 'uncooked' | null;
    setCookFilter: React.Dispatch<React.SetStateAction<'cooked' | 'uncooked' | null>>;
    sortMode: 'favorites' | 'alpha-asc' | 'alpha-desc' | 'random';
    setSortMode: (m: 'favorites' | 'alpha-asc' | 'alpha-desc' | 'random') => void;
    resetFilters: () => void;
}

const RecipeFiltersContext = createContext<RecipeFiltersContextValue | null>(null);

export const RecipeFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const saved = loadFromSession();

    const [ titleFilter, setTitleFilter ] = usePersistedState<string>('titleFilter', saved.titleFilter);
    const [ selectedTypes, setSelectedTypes ] = usePersistedState<string[]>('selectedTypes', saved.selectedTypes);
    const [ typeMode, setTypeMode ] = usePersistedState<'or' | 'and'>('typeMode', saved.typeMode);
    const [ selectedDietary, setSelectedDietary ] = usePersistedState<string[]>('selectedDietary', saved.selectedDietary);
    const [ dietaryMode, setDietaryMode ] = usePersistedState<'or' | 'and'>('dietaryMode', saved.dietaryMode);
    const [ favFilter, setFavFilter ] = usePersistedState<boolean>('favFilter', saved.favFilter);
    const [ cookFilter, setCookFilter ] = usePersistedState<'cooked' | 'uncooked' | null>('cookFilter', saved.cookFilter);
    const [ sortMode, setSortMode ] = usePersistedState<'favorites' | 'alpha-asc' | 'alpha-desc' | 'random'>('sortMode', saved.sortMode);

    const resetFilters = () => {
        sessionStorage.removeItem(SESSION_KEY);
        setTitleFilter('');
        setSelectedTypes([]);
        setTypeMode('or');
        setSelectedDietary([]);
        setDietaryMode('or');
        setFavFilter(false);
        setCookFilter(null);
        setSortMode('alpha-asc');
    };

    return (
        <RecipeFiltersContext.Provider value={ {
            titleFilter, setTitleFilter,
            selectedTypes, setSelectedTypes,
            typeMode, setTypeMode,
            selectedDietary, setSelectedDietary,
            dietaryMode, setDietaryMode,
            favFilter, setFavFilter,
            cookFilter, setCookFilter,
            sortMode, setSortMode,
            resetFilters,
        } }>
            { children }
        </RecipeFiltersContext.Provider>
    );
};

export const useRecipeFilters = (): RecipeFiltersContextValue => {
    const ctx = useContext(RecipeFiltersContext);
    if (!ctx) throw new Error('useRecipeFilters must be used within RecipeFiltersProvider');
    return ctx;
};
