import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const FromPillInput: React.FC<Props> = ({ value, onChange, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [modifierHeld, setModifierHeld] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.shiftKey) setModifierHeld(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.shiftKey) setModifierHeld(false);
    };
    document.addEventListener('keydown', onDown);
    document.addEventListener('keyup', onUp);
    return () => {
      document.removeEventListener('keydown', onDown);
      document.removeEventListener('keyup', onUp);
    };
  }, []);

  const commit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) onChange([...value, trimmed]);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ',' || e.key === 'Enter') {
      e.preventDefault();
      commit(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '') {
      e.preventDefault();
      if (value.length > 0) {
        const last = value[value.length - 1];
        onChange(value.slice(0, -1));
        setInputValue(last);
      }
    } else if (e.key === ' ' && inputValue === '') {
      e.preventDefault();
    }
  };

  const handleBlur = () => commit(inputValue);

  const handlePillClick = (index: number) => {
    if (modifierHeld) {
      onChange(value.filter((_, i) => i !== index));
    } else {
      const pill = value[index];
      onChange(value.filter((_, i) => i !== index));
      setInputValue(pill);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col gap-[6px]">
      <input
        ref={inputRef}
        className="m-0 h-10 rounded border border-line p-2"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((pill, i) => (
            <span
              key={i}
              className={`inline-flex cursor-pointer select-none items-center rounded-xl border border-line bg-bg-alt px-2.5 py-0.5 text-sm leading-[1.4] hover:text-white ${
                modifierHeld ? 'hover:border-danger hover:bg-danger' : 'hover:border-accent-dark hover:bg-accent-dark'
              }`}
              onClick={() => handlePillClick(i)}
            >
              {pill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FromPillInput;
