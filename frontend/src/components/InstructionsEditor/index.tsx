import React, { useRef } from 'react';

interface Props {
  value: string[];
  onChange: (steps: string[]) => void;
}

const InstructionsEditor: React.FC<Props> = ({ value, onChange }) => {
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const update = (index: number, text: string) => {
    const next = [...value];
    next[index] = text;
    onChange(next);
  };

  const addStep = (afterIndex?: number) => {
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : value.length;
    const next = [...value.slice(0, insertAt), '', ...value.slice(insertAt)];
    onChange(next);
    // Focus the new step after re-render
    requestAnimationFrame(() => {
      inputRefs.current[insertAt]?.focus();
    });
  };

  const removeStep = (index: number) => {
    if (value.length <= 1) return;
    const next = value.filter((_, i) => i !== index);
    onChange(next);
    requestAnimationFrame(() => {
      const focusIndex = Math.max(0, index - 1);
      inputRefs.current[focusIndex]?.focus();
    });
  };

  const isWrapped = (text: string, start: number, end: number, marker: string): boolean => {
    const len = marker.length;
    if (start < len || end + len > text.length) return false;
    if (text.slice(start - len, start) !== marker) return false;
    if (text.slice(end, end + len) !== marker) return false;
    // For single-char markers (*/_) avoid false-positives inside ** or __.
    // Exception: inside *** (triple) the single * IS the italic layer — allow toggle.
    if (len === 1) {
      const m = marker[0];
      const leftDouble = start >= 2 && text[start - 2] === m;
      const leftTriple = start >= 3 && text[start - 3] === m;
      if (leftDouble && !leftTriple) return false;
      const rightDouble = end + 1 < text.length && text[end + 1] === m;
      const rightTriple = end + 2 < text.length && text[end + 2] === m;
      if (rightDouble && !rightTriple) return false;
    }
    return true;
  };

  const wrapSelection = (el: HTMLTextAreaElement, index: number, marker: string) => {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;
    const text = value[index];
    const len = marker.length;
    if (isWrapped(text, start, end, marker)) {
      // Toggle off: remove surrounding markers
      const newText = text.slice(0, start - len) + text.slice(start, end) + text.slice(end + len);
      update(index, newText);
      requestAnimationFrame(() => {
        const ref = inputRefs.current[index];
        if (ref) ref.setSelectionRange(start - len, end - len);
      });
    } else {
      // Toggle on: add markers
      const newText = text.slice(0, start) + marker + text.slice(start, end) + marker + text.slice(end);
      update(index, newText);
      requestAnimationFrame(() => {
        const ref = inputRefs.current[index];
        if (ref) ref.setSelectionRange(start + len, end + len);
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addStep(index);
    } else if (e.key === 'Backspace' && value[index] === '') {
      e.preventDefault();
      removeStep(index);
    } else if (e.ctrlKey && (e.key === 'b' || e.key === 'B')) {
      e.preventDefault();
      wrapSelection(e.currentTarget, index, '**');
    } else if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
      e.preventDefault();
      wrapSelection(e.currentTarget, index, '*');
    } else if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
      e.preventDefault();
      wrapSelection(e.currentTarget, index, '__');
    }
  };

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((step, index) => (
        <div key={index} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
          <div className="mb-0! flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-[0.9rem] font-semibold text-white">
            {index + 1}
          </div>
          <textarea
            ref={(el) => {
              inputRefs.current[index] = el;
              autoResize(el);
            }}
            className="box-border min-h-[2.4rem] w-full resize-none overflow-hidden rounded-md border border-line bg-surface px-[0.65rem] py-2 font-[inherit] text-base leading-normal text-fg focus:border-accent focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-accent)_20%,transparent)] focus:outline-none"
            value={step}
            rows={1}
            placeholder="Schritt beschreiben…"
            onChange={(e) => {
              autoResize(e.target);
              update(index, e.target.value);
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
          />
          <button
            type="button"
            className="flex h-[1.7rem] w-[1.7rem] shrink-0 items-center justify-center rounded-full border-none bg-danger p-0 text-[1.1rem] text-white transition-colors hover:not-disabled:bg-danger-strong disabled:cursor-default disabled:opacity-35"
            aria-label="Schritt entfernen"
            onClick={() => removeStep(index)}
            disabled={value.length <= 1}
          >
            <i className="fa-solid fa-minus" />
          </button>
        </div>
      ))}
      <div className="mt-1 flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="flex cursor-pointer items-center gap-[0.4rem] rounded-md border border-dashed border-line bg-transparent px-[0.85rem] py-[0.4rem] text-[0.9rem] text-fg transition-[border-color,background] hover:border-accent hover:bg-[color-mix(in_srgb,var(--color-accent)_6%,transparent)]"
          onClick={() => addStep()}
        >
          <i className="fa-solid fa-plus" /> Schritt hinzufügen
        </button>
      </div>
    </div>
  );
};

export default InstructionsEditor;
