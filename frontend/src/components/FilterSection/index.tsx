import React from 'react';

export interface FilterSectionProps {
  selectedTypes: string[];
  onTypeToggle: (type: string) => void;
  typeMode: 'or' | 'and';
  onTypeModeChange: (mode: 'or' | 'and') => void;
  selectedDietary: string[];
  onDietaryToggle: (dietary: string) => void;
  dietaryMode: 'or' | 'and';
  onDietaryModeChange: (mode: 'or' | 'and') => void;
}

const RECIPE_TYPES = [
  { value: 'cooking', label: 'Kochen' },
  { value: 'baking', label: 'Backen' },
  { value: 'snack', label: 'Snack' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'other', label: 'Sonstiges' },
];

const DIETARY_OPTIONS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetarian', label: 'Vegetarisch' },
  { value: 'glutenfree', label: 'Glutenfrei' },
  { value: 'dairyfree', label: 'Laktosefrei' },
  { value: 'other', label: 'Sonstiges' },
];

const ModeToggle: React.FC<{
  mode: 'or' | 'and';
  onChange: (mode: 'or' | 'and') => void;
}> = ({ mode, onChange }) => {
  const modeBtn = 'cursor-pointer border-none px-2 py-[2px] text-[0.72rem] leading-[1.4]';
  const inactive = 'bg-transparent text-fg-muted hover:bg-bg-alt';
  const active = 'bg-accent-dark text-white';
  return (
    <span className="inline-flex shrink-0 overflow-hidden rounded-[5rem] border border-line">
      <button type="button" className={`${modeBtn} ${mode === 'or' ? active : inactive}`} onClick={() => onChange('or')}>
        ODER
      </button>
      <button type="button" className={`${modeBtn} ${mode === 'and' ? active : inactive}`} onClick={() => onChange('and')}>
        UND
      </button>
    </span>
  );
};

const FilterSection: React.FC<FilterSectionProps> = ({
  selectedTypes,
  onTypeToggle,
  typeMode,
  onTypeModeChange,
  selectedDietary,
  onDietaryToggle,
  dietaryMode,
  onDietaryModeChange,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [popupTop, setPopupTop] = React.useState(0);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const activeCount = selectedTypes.length + selectedDietary.length;

  React.useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  const handleToggle = () => {
    if (!expanded && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupTop(rect.bottom + 8);
    }
    setExpanded((e) => !e);
  };

  const ingButtonBase = 'inline-block cursor-pointer rounded-[5rem] border px-3 py-[6px] text-[0.9rem]';
  const ingButtonInactive = 'border-line bg-bg-alt text-fg-muted hover:border-accent-dark hover:bg-accent-soft';
  const ingButtonSelected = 'border-accent-dark bg-accent-dark text-white';

  return (
    <div className="relative flex items-stretch" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`flex cursor-pointer items-center gap-[0.3rem] whitespace-nowrap rounded-[5rem] border px-[11px] py-[5px] text-[0.85rem] ${
          activeCount > 0
            ? 'border-accent-dark bg-accent-dark text-white'
            : 'border-line bg-bg-alt text-fg-muted hover:border-accent-dark hover:bg-accent-soft'
        }`}
        onClick={handleToggle}
      >
        <i className="fa-solid fa-sliders" />
        <span className="max-[600px]:hidden"> Mehr Filter</span>
        {activeCount > 0 && (
          <span
            className={`inline-flex h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-[5rem] px-[0.2rem] text-[0.75rem] font-bold leading-none ${
              activeCount > 0 ? 'bg-surface text-accent' : 'bg-accent text-white'
            }`}
          >
            {activeCount}
          </span>
        )}
      </button>

      {expanded && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-100 flex min-w-[300px] flex-col gap-4 rounded-lg border border-line bg-surface p-4 shadow-[0_4px_16px_var(--color-shadow-soft)] max-[600px]:fixed max-[600px]:left-1/2 max-[600px]:top-[var(--popup-top)] max-[600px]:w-[88vw] max-[600px]:min-w-0 max-[600px]:-translate-x-1/2"
          style={{ ['--popup-top' as string]: `${popupTop}px` }}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Rezepttyp</span>
              <ModeToggle mode={typeMode} onChange={onTypeModeChange} />
            </div>
            <div className="flex flex-wrap gap-2">
              {RECIPE_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${ingButtonBase} ${selectedTypes.includes(value) ? ingButtonSelected : ingButtonInactive}`}
                  onClick={() => onTypeToggle(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">Ernährung</span>
              <ModeToggle mode={dietaryMode} onChange={onDietaryModeChange} />
            </div>
            <div className="flex flex-wrap gap-2">
              {DIETARY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${ingButtonBase} ${selectedDietary.includes(value) ? ingButtonSelected : ingButtonInactive}`}
                  onClick={() => onDietaryToggle(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSection;
