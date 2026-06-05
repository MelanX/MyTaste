import React from 'react';
import FilterSection from '../FilterSection';
import { useRecipeFilters } from '../../context/RecipeFiltersContext';

type SortMode = ReturnType<typeof useRecipeFilters>['sortMode'];

interface QuickFiltersProps {
  filters: ReturnType<typeof useRecipeFilters>;
  hasActiveFilters: boolean;
  onSortChange: (mode: SortMode) => void;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({ filters, hasActiveFilters, onSortChange }) => {
  const {
    selectedTypes,
    typeMode,
    setTypeMode,
    selectedDietary,
    dietaryMode,
    setDietaryMode,
    favFilter,
    setFavFilter,
    cookFilter,
    setCookFilter,
    sortMode,
    resetFilters,
  } = filters;

  const toggleType = (type: string) => {
    filters.setSelectedTypes((sel) => (sel.includes(type) ? sel.filter((x) => x !== type) : [...sel, type]));
  };

  const toggleDietary = (dietary: string) => {
    filters.setSelectedDietary((sel) => (sel.includes(dietary) ? sel.filter((x) => x !== dietary) : [...sel, dietary]));
  };

  return (
    <div className="ml-auto flex flex-wrap gap-[0.4rem] max-[600px]:order-3 max-[600px]:ml-0 max-[600px]:justify-center">
      {hasActiveFilters && (
        <button
          type="button"
          className="cursor-pointer whitespace-nowrap rounded-[5rem] border border-line bg-none px-[11px] py-[5px] text-[0.85rem] text-fg-muted opacity-70 hover:border-danger hover:bg-none hover:text-danger hover:opacity-100"
          onClick={resetFilters}
          title="Alle Filter zurücksetzen"
        >
          <i className="fa-solid fa-xmark" />
          <span className="max-[600px]:hidden"> Zurücksetzen</span>
        </button>
      )}
      <FilterSection
        selectedTypes={selectedTypes}
        onTypeToggle={toggleType}
        typeMode={typeMode}
        onTypeModeChange={setTypeMode}
        selectedDietary={selectedDietary}
        onDietaryToggle={toggleDietary}
        dietaryMode={dietaryMode}
        onDietaryModeChange={setDietaryMode}
      />
      <button
        type="button"
        className={`cursor-pointer whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${favFilter ? 'border-accent-dark bg-accent text-white' : 'border-line bg-bg-alt text-fg-muted'}`}
        onClick={() => setFavFilter((f) => !f)}
        title="Favoriten"
      >
        <i className="fa-solid fa-heart" />
        <span className="max-[600px]:hidden"> Favoriten</span>
      </button>
      <button
        type="button"
        className={`cursor-pointer whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${cookFilter === 'cooked' ? 'border-accent-dark bg-accent text-white' : 'border-line bg-bg-alt text-fg-muted'}`}
        onClick={() => setCookFilter((f) => (f === 'cooked' ? null : 'cooked'))}
        title="Gekocht"
      >
        <i className="fa-solid fa-check" />
        <span className="max-[600px]:hidden"> Gekocht</span>
      </button>
      <button
        type="button"
        className={`cursor-pointer whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${cookFilter === 'uncooked' ? 'border-accent-dark bg-accent text-white' : 'border-line bg-bg-alt text-fg-muted'}`}
        onClick={() => setCookFilter((f) => (f === 'uncooked' ? null : 'uncooked'))}
        title="Nicht gekocht"
      >
        <i className="fa-solid fa-question" />
        <span className="max-[600px]:hidden"> Nicht gekocht</span>
      </button>
      <select
        className="cursor-pointer whitespace-nowrap rounded-[5rem] border border-line bg-bg-alt px-[11px] py-[5px] text-base text-fg-muted"
        value={sortMode}
        onChange={(e) => onSortChange(e.target.value as SortMode)}
        title="Sortierung"
      >
        <option value="favorites">♥ Favoriten zuerst</option>
        <option value="alpha-asc">Alphabetisch (A → Z)</option>
        <option value="alpha-desc">Alphabetisch (Z → A)</option>
        <option value="random">⟳ Zufällig</option>
      </select>
    </div>
  );
};

export default QuickFilters;
