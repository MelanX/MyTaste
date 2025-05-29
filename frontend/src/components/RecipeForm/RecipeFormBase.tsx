import React, { FormEvent, useRef, useState } from 'react';
import { Ingredient } from '../../types/Recipe';
import styles from './styles.module.css';
import { formatAmount } from '../../utils/formatters';
import ImageUpload from "../ImageUpload";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api_service";
import ErrorSection from "../ErrorSection";

export interface RecipeFormValues {
    title: string;
    instructions: string[];
    url?: string;
    image?: string;
    ingredients: Ingredient[];
    spices?: string[];
}

interface RecipeFormBaseProps {
    initial?: RecipeFormValues;
    submitLabel: string;
    onSubmit: (values: RecipeFormValues) => Promise<Response>;
    onDelete?: () => Promise<Response>;
    redirectTo?: string;
}

const RecipeFormBase: React.FC<RecipeFormBaseProps> = ({
                                                           initial = {
                                                               title: '',
                                                               instructions: [''],
                                                               url: '',
                                                               image: '',
                                                               ingredients: [],
                                                               spices: []
                                                           },
                                                           submitLabel,
                                                           onSubmit,
                                                           onDelete,
                                                           redirectTo
                                                       }) => {
    const navigate = useNavigate();
    const [title, setTitle] = useState(initial.title);
    const [instructions, setInstructions] = useState<string[]>(initial.instructions);
    const [url, setUrl] = useState<string>(initial.url || '');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [image, setImage] = useState(initial.image || '');
    const [ingredients, setIngredients] = useState<Ingredient[]>(initial.ingredients);
    const [newIngredient, setNewIngredient] = useState<Ingredient>({
        name: '',
        amount: undefined,
        unit: undefined,
        note: undefined
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [spices, setSpices] = useState<string[]>(initial.spices || []);
    const [newSpice, setNewSpice] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const amountInputRef = useRef<HTMLInputElement>(null);

    const handleAddIngredient = () => {
        if (!newIngredient.name.trim()) return;
        const amt = parseFloat(String(newIngredient.amount).replace(',', '.')) || undefined;
        const entry: Ingredient = {
            name: newIngredient.name.trim(),
            amount: amt,
            unit: newIngredient.unit?.trim() || undefined,
            note: newIngredient.note?.trim() || undefined,
        };

        let updated: Ingredient[];
        if (editingIndex !== null) {
            // replace
            updated = [...ingredients];
            updated.splice(editingIndex, 1, entry);
        } else {
            // add
            updated = [...ingredients, entry];
        }

        setIngredients(updated);
        setNewIngredient({name: '', amount: undefined, unit: undefined, note: undefined});
        setEditingIndex(null);
        amountInputRef.current?.focus();
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ings => ings.filter((_, idx) => idx !== index));
        // if we were editing that or after, reset editingIndex
        if (editingIndex !== null && editingIndex === index) {
            setEditingIndex(null);
            setNewIngredient({name: '', amount: undefined, unit: undefined, note: undefined});
        }
    };

    const handleEditIngredient = (index: number) => {
        setEditingIndex(index);
        setNewIngredient(ingredients[index]);
        amountInputRef.current?.focus();
    };

    const handleAddSpice = () => {
        if (!newSpice.trim()) return;
        setSpices([...spices, newSpice]);
        setNewSpice('');
    };
    const handleRemoveSpice = (index: number) => {
        setSpices(s => s.filter((_, idx) => idx !== index));
    };

    const handleDelete = () => {
        if (window.confirm('Bist du sicher, dass du dieses Rezept löschen möchtest?')) {
            onDelete!();
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const filteredInstructions = instructions.filter(l => l.trim());

        let imgUrl = image;
        if (imageFile && !imgUrl) {
            try {
                const form = new FormData();
                form.append('file', imageFile);
                const response = await apiFetch('/api/upload-image', {
                    method: 'POST',
                    body: form,
                });

                if (!response.ok) {
                    const json = await response.json();
                    setErrors([json.message, ...json.details]);
                    return;
                }

                const {url: uploadedUrl} = await response.json();
                imgUrl = uploadedUrl;
            } catch (err) {
                console.error(err);
                return;
            }
        }

        let maybeSpices: string[] | undefined = spices.map(s => s.trim()).filter(s => s !== '');
        if (maybeSpices.length === 0) {
            maybeSpices = undefined;
        }

        const response: Response = await onSubmit({
            title,
            instructions: filteredInstructions,
            url: url.trim() || undefined,
            image: imgUrl.trim() || undefined,
            ingredients,
            spices: maybeSpices,
        });

        if (!response.ok) {
            const json = await response.json();
            setErrors([json.message, ...json.details]);
            return;
        }

        if (redirectTo) {
            navigate(redirectTo);
        }
    };

    return (
        <div className={styles.recipeFormContainer}>
            <h2>{submitLabel}</h2>
            <form onSubmit={handleSubmit}>
                <div className={styles.firstFormGroup}>
                    {/* Title */}
                    <div className={styles.formGroup}>
                        <label htmlFor="title">Titel</label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    {/* Instructions */}
                    <div className={styles.formGroup}>
                        <label htmlFor="instructions">Anleitung</label>
                        <textarea
                            id="instructions"
                            rows={6}
                            value={instructions.join('\n')}
                            onChange={e => setInstructions(e.target.value.split('\n'))}
                            placeholder="Jede Zeile ist ein Schritt der Anleitung"
                            required
                        />
                    </div>

                    {/* Original URL */}
                    <div className={styles.formGroup}>
                        <label htmlFor="url">Originalrezept-URL</label>
                        <input
                            id="url"
                            type="url"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                        />
                    </div>

                    {/* Image */}
                    <div className={styles.formGroup}>
                        <label>Vorschaubild</label>
                        <ImageUpload file={imageFile} onFile={setImageFile} url={image} onUrl={setImage} />
                        <small>…oder externe URL eingeben:</small>
                        <input
                            id="image"
                            type="url"
                            value={image.startsWith('/uploads') ? '' : image}
                            onChange={e => setImage(e.target.value)}
                            placeholder="https://example.com/bild.jpg"
                        />
                    </div>
                </div>

                {/* Ingredients */}
                <div className={styles.formSection}>
                    <h3>Zutaten</h3>
                    {ingredients.length > 0 && (
                        <div className={styles.ingredientsTable}>
                            <div className={styles.ingredientsGrid}>
                                {ingredients.map((ing, idx) => (
                                    <div
                                        key={idx}
                                        className={styles.ingredientRow}
                                        style={{cursor: 'pointer'}}
                                        onClick={() => handleEditIngredient(idx)}
                                    >
                                        <div className={styles.ingredientRowLeft}>
                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleRemoveIngredient(idx);
                                                }}
                                            >
                                                -
                                            </button>
                                            <div className={styles.ingredientAmount}>
                                                {formatAmount(ing.amount)}
                                                {ing.unit && ` ${ing.unit}`}
                                            </div>
                                        </div>
                                        <div className={styles.ingredientRowRight}>
                                            <div className={styles.ingredientName}>{ing.name}</div>
                                            {ing.note && (
                                                <div className={styles.ingredientNote}>
                                                    <i className="fa-solid fa-circle-exclamation" /> {ing.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className={styles.ingredientInputRow}>
                        <div className={styles.ingredientInputs}>
                            <div className={`${styles.formGroup} ${styles.smallInput}`}>
                                <label htmlFor="ing-amount">Menge</label>
                                <input
                                    id="ing-amount"
                                    type="text"
                                    ref={amountInputRef}
                                    value={newIngredient.amount ?? ''}
                                    onChange={e => setNewIngredient(ni => ({...ni, amount: e.target.value}))}
                                    placeholder="1"
                                />
                            </div>
                            <div className={`${styles.formGroup} ${styles.smallInput}`}>
                                <label htmlFor="ing-unit">Einheit</label>
                                <input
                                    id="ing-unit"
                                    type="text"
                                    value={newIngredient.unit ?? ''}
                                    onChange={e => setNewIngredient(ni => ({...ni, unit: e.target.value}))}
                                    placeholder="g"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="ing-name">Name</label>
                                <input
                                    id="ing-name"
                                    type="text"
                                    value={newIngredient.name}
                                    onChange={e => setNewIngredient(ni => ({...ni, name: e.target.value}))}
                                    placeholder="Zutat"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="ing-note">Anmerkung</label>
                                <input
                                    id="ing-note"
                                    type="text"
                                    value={newIngredient.note ?? ''}
                                    onChange={e => setNewIngredient(ni => ({...ni, note: e.target.value}))}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                        <button type="submit"
                                className={styles.addButton}
                                onClick={handleAddIngredient}
                                onSubmit={handleAddIngredient}
                                disabled={!newIngredient.name.trim()}>
                            <i className="fa-solid fa-plus" />
                        </button>
                    </div>

                    {/* Spices */}
                    <h3>Gewürze</h3>
                    <div className={styles.spicesContainer}>
                        {spices.map((s, i) => (
                            <div key={i} className={styles.spiceTag}
                                 onClick={() => handleRemoveSpice(i)}>{s}</div>
                        ))}
                    </div>
                    <div className={styles.spiceInputRow}>
                        <div className={styles.formGroup}>
                            <input type="text" value={newSpice}
                                   onChange={e => setNewSpice(e.target.value)}
                                   onKeyDown={e => {
                                       if (e.key === 'Enter') {
                                           handleAddSpice();
                                       }
                                   }}
                                   placeholder="Neues Gewürz" />
                        </div>
                        <button type="button"
                                className={styles.addButton}
                                onClick={handleAddSpice}
                                disabled={!newSpice.trim()}>
                            <i className="fa-solid fa-plus" />
                        </button>
                    </div>
                </div>

                {errors.length > 0 && (
                    <ErrorSection title={errors[0]} details={errors.slice(1)} />
                )}
                <div className={styles.formActions}>
                    {onDelete && (
                        <button type="button"
                                className={styles.deleteButton}
                                onClick={handleDelete}
                        >
                            <i className="fa-solid fa-trash-can" /> Lösche Rezept
                        </button>
                    )}
                    <button type="submit" className={styles.submitButton}>
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RecipeFormBase;
