import React from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
  return (
    <div className="relative flex w-[380px] max-w-[380px] items-center max-[600px]:order-2 max-[600px]:w-auto max-[600px]:max-w-none">
      <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-[0.9rem] text-base text-fg-muted" />
      <input
        type="text"
        placeholder="Rezepte suchen..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="box-border w-full rounded-[0.4rem] border border-line bg-surface py-2 pl-[2.4rem] pr-10 text-base text-fg focus:border-accent focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent)_20%,transparent)] focus:outline-none"
      />
      {value && (
        <button
          type="button"
          className="absolute right-2 cursor-pointer border-none bg-none px-2 py-[0.3rem] text-[0.9rem] leading-none text-fg-muted hover:bg-none hover:text-fg"
          onClick={() => onChange('')}
          aria-label="Suche löschen"
        >
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
