import React, {useRef, useState} from 'react';
import {Ingredient} from '../../types/Recipe';
import {useNavigate} from 'react-router-dom';
import styles from './styles.module.css';

interface RecipeFormProps {
    onSubmit: (
        title: string,
        instructions: string[],
        url: string,
        ingredients: Ingredient[],
        spices: string[],
        image?: string
    ) => Promise<void>;
}

const RecipeForm: React.FC<RecipeFormProps> = ({onSubmit}) => {
    const [title, setTitle] = useState('');
    const [instructions, setInstructions] = useState<string[]>(['']);
    const [url, setUrl] = useState('');
    const [image, setImage] = useState('');
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [newIngredient, setNewIngredient] = useState<Ingredient>({name: '', amount: undefined, unit: '', note: ''});
    const [spices, setSpices] = useState<string[]>([]);
    const [newSpice, setNewSpice] = useState('');
    const navigate = useNavigate();

    const amountInputRef = useRef<HTMLInputElement>(null);

    const handleNewIngredientChange = (field: keyof Ingredient, value: string | number | undefined) => {
        setNewIngredient({
            ...newIngredient,
            // @ts-ignore - we know these values match the field types
            [field]: value
        });
    };

    const addIngredient = () => {
        if (newIngredient.name.trim() !== '') {
            newIngredient.amount === undefined ? newIngredient.amount = 0 : newIngredient.amount = parseFloat(String(newIngredient.amount).replace(',', '.'));
            setIngredients([...ingredients, {...newIngredient}]);
            setNewIngredient({name: '', amount: undefined, unit: '', note: ''});

            if (amountInputRef.current) amountInputRef.current.focus();
        }
    };

    const removeIngredient = (index: number) => {
        const updatedIngredients = [...ingredients];
        updatedIngredients.splice(index, 1);
        setIngredients(updatedIngredients);
    };

    const addSpice = () => {
        if (newSpice.trim() !== '') {
            setSpices([...spices, newSpice]);
            setNewSpice('');
        }
    };

    const removeSpice = (index: number) => {
        const updatedSpices = [...spices];
        updatedSpices.splice(index, 1);
        setSpices(updatedSpices);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // All spices should already be valid since we validate them when adding
        const filteredSpices = spices;

        // Filter out empty instruction lines
        const filteredInstructions = instructions.filter(line => line.trim() !== '');

        await onSubmit(title, filteredInstructions, url, ingredients, filteredSpices, image || undefined);

        // Reset form
        setTitle('');
        setInstructions(['']);
        setUrl('');
        setImage('');
        setIngredients([]);
        setNewIngredient({name: '', amount: undefined, unit: '', note: ''});
        setSpices([]);
        setNewSpice('');

        // Navigate back to the recipe list
        navigate('/');
    };

    const formattedAmount = (amount: number | string | undefined) => {
        if (amount === undefined) return '';
        amount = parseFloat(String(amount).replace(',', '.'));
        if (amount === 0) return '';
        if (amount === 0.2) return '⅕';
        if (amount === 0.25) return '¼';
        if (amount === 0.4) return '⅖';
        if (amount === 0.5) return '½';
        if (amount === 0.6) return '⅗';
        if (amount === 0.8) return '⅘';
        return String(amount).replace('.', ',');
    };

    return (
        <div className={styles.recipeFormContainer}>
            <h2>Neues Rezept hinzufügen</h2>
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label htmlFor="title">Titel</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="instructions">Anleitung</label>
                    <textarea
                        id="instructions"
                        value={instructions.join('\n')}
                        onChange={(e) => setInstructions(e.target.value.split('\n'))}
                        rows={6}
                        required
                        placeholder="Jede Zeile ist ein Schritt der Anleitung"
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="url">URL</label>
                    <input
                        type="url"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="image">Bild URL (optional)</label>
                    <input
                        type="url"
                        id="image"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                    />
                </div>

                <div className={styles.formSection}>
                    <h3>Zutaten</h3>

                    {ingredients.length > 0 && (
                        <div className={styles.ingredientsTable}>
                            <div className={styles.ingredientsGrid}>
                                {ingredients.map((ingredient, index) => (
                                    <div key={index} className={styles.ingredientRow}>
                                        <div className={styles.ingredientRowLeft}>
                                            <button
                                                type="button"
                                                className={styles.removeButton}
                                                onClick={() => removeIngredient(index)}
                                            >
                                                -
                                            </button>
                                            <div className={styles.ingredientAmount}>
                                                {formattedAmount(ingredient.amount)}{ingredient.unit ? ` ${ingredient.unit}` : ''}
                                            </div>
                                        </div>
                                        <div className={styles.ingredientRowRight}>
                                            <div className={styles.ingredientName}>
                                                {ingredient.name}
                                            </div>
                                            {ingredient.note && (
                                                <div className={styles.ingredientNote}>
                                                    <i className="fa-solid fa-circle-exclamation"/>
                                                    <span>{ingredient.note}</span>
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
                                <label htmlFor="ingredient-amount">Menge</label>
                                <input
                                    type="text"
                                    id="ingredient-amount"
                                    ref={amountInputRef}
                                    value={newIngredient.amount === undefined ? '' : newIngredient.amount}
                                    onChange={(e) => handleNewIngredientChange('amount', e.target.value)}
                                    step="0.1"
                                    placeholder="1"
                                />
                            </div>
                            <div className={`${styles.formGroup} ${styles.smallInput}`}>
                                <label htmlFor="ingredient-unit">Einheit</label>
                                <input
                                    type="text"
                                    id="ingredient-unit"
                                    value={newIngredient.unit || ''}
                                    onChange={(e) => handleNewIngredientChange('unit', e.target.value)}
                                    placeholder="g"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="ingredient-name">Name</label>
                                <input
                                    type="text"
                                    id="ingredient-name"
                                    value={newIngredient.name}
                                    onChange={(e) => handleNewIngredientChange('name', e.target.value)}
                                    placeholder="Zutat"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="ingredient-note">Anmerkung</label>
                                <input
                                    type="text"
                                    id="ingredient-note"
                                    value={newIngredient.note || ''}
                                    onChange={(e) => handleNewIngredientChange('note', e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className={styles.addButton}
                            onClick={addIngredient}
                            onSubmit={addIngredient}
                            disabled={!newIngredient.name.trim()}
                        >
                            +
                        </button>
                    </div>
                </div>

                <div className={styles.formSection}>
                    <h3>Gewürze</h3>

                    <div className={styles.spicesContainer}>
                        {spices.map((spice, index) => (
                            <div key={index} className={styles.spiceTag} onClick={() => removeSpice(index)}>
                                {spice}
                            </div>
                        ))}
                    </div>

                    <form className={styles.spiceInputRow} onSubmit={addSpice}>
                        <div className={styles.formGroup}>
                            <input
                                type="text"
                                value={newSpice}
                                onChange={(e) => setNewSpice(e.target.value)}
                                placeholder="Neues Gewürz"
                            />
                        </div>
                        <button
                            type="submit"
                            className={styles.addButton}
                            onClick={addSpice}
                            disabled={!newSpice.trim()}
                        >
                            +
                        </button>
                    </form>
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitButton}>Rezept speichern
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RecipeForm;
