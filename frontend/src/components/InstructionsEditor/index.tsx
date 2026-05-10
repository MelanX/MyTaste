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

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addStep(index);
        } else if (e.key === 'Backspace' && value[index] === '') {
            e.preventDefault();
            removeStep(index);
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
                        ref={el => {
                            inputRefs.current[index] = el;
                            autoResize(el);
                        }}
                        className={styles.stepInput}
                        value={step}
                        rows={1}
                        placeholder="Schritt beschreiben…"
                        onChange={e => {
                            autoResize(e.target);
                            update(index, e.target.value);
                        }}
                        onKeyDown={e => handleKeyDown(e, index)}
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
                <span className={styles.hint}>
                    <code>**fett**</code> &nbsp; <code>*kursiv*</code> &nbsp; <code>__unterstrichen__</code>
                </span>
            </div>
        </div>
    );
};

export default InstructionsEditor;
