import React, { useRef } from 'react';
import styles from './styles.module.css';

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
    <div className={styles.editor}>
      {value.map((step, index) => (
        <div key={index} className={styles.stepRow}>
          <div className={styles.stepNumber}>{index + 1}</div>
          <textarea
            ref={(el) => {
              inputRefs.current[index] = el;
              autoResize(el);
            }}
            className={styles.stepInput}
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
            className={styles.removeButton}
            aria-label="Schritt entfernen"
            onClick={() => removeStep(index)}
            disabled={value.length <= 1}
          >
            <i className="fa-solid fa-minus" />
          </button>
        </div>
      ))}
      <div className={styles.footer}>
        <button type="button" className={styles.addButton} onClick={() => addStep()}>
          <i className="fa-solid fa-plus" /> Schritt hinzufügen
        </button>
      </div>
    </div>
  );
};

export default InstructionsEditor;
