import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Ingredient, IngredientSection } from '../../types/Recipe';
import styles from './styles.module.css';
import ImageUpload from "../ImageUpload";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../utils/api_service";
import ErrorSection from "../ErrorSection";

export interface RecipeFormValues {
    title: string;
    instructions: string[];
    url?: string;
    image?: string;
    ingredient_sections: IngredientSection[];
    spices?: string[];
}

interface RecipeFormBaseProps {
    initial?: RecipeFormValues;
    submitLabel: string;
    onSubmit: (values: RecipeFormValues) => Promise<Response>;
    onDelete?: () => Promise<Response>;
    redirectTo?: string;
    showImportButton?: boolean;
}

type DragInfo = {
    fromSectionIndex: number;
    fromIngredientIndex: number;
};

const parseAmount = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const n = Number(value.replace(',', '.'));
    return Number.isNaN(n) ? undefined : n;
};

const RecipeFormBase: React.FC<RecipeFormBaseProps> = ({
                                                           initial = {
                                                               title: '',
                                                               instructions: [ '' ],
                                                               url: '',
                                                               image: '',
                                                               ingredient_sections: [],
                                                               spices: []
                                                           },
                                                           submitLabel,
                                                           onSubmit,
                                                           onDelete,
                                                           redirectTo,
                                                           showImportButton
                                                       }) => {
    const navigate = useNavigate();
    const [ title, setTitle ] = useState(initial.title);
    const [ instructions, setInstructions ] = useState<string[]>(initial.instructions);
    const [ url, setUrl ] = useState<string>(initial.url || '');
    const [ imageFile, setImageFile ] = useState<File | null>(null);
    const [ image, setImage ] = useState(initial.image || '');
    const [ ingredientSections, setIngredientSections ] = useState<IngredientSection[]>(
        () => (initial.ingredient_sections && initial.ingredient_sections.length > 0)
            ? initial.ingredient_sections
            : [ { ingredients: [] } ] // 👈 implicit "flat" section
    );
    const [ pendingFocusSectionIndex, setPendingFocusSectionIndex ] = useState<number | null>(null);
    const sectionTitleRefs = useRef<(HTMLInputElement | null)[]>([]);
    const dragInfoRef = useRef<DragInfo | null>(null);
    const [ dragTarget, setDragTarget ] = useState<{
        sectionIndex: number;
        ingredientIndex: number | null;
    } | null>(null);
    const [ editingSectionIndex, setEditingSectionIndex ] = useState<number | null>(null);
    const [ editingSectionIngredientIndex, setEditingSectionIngredientIndex ] = useState<number | null>(null);
    const [ collapsedSections, setCollapsedSections ] = useState<Record<number, boolean>>({});
    const [ spices, setSpices ] = useState<string[]>(initial.spices || []);
    const [ newSpice, setNewSpice ] = useState('');
    const [ errors, setErrors ] = useState<string[]>([]);
    useEffect(() => {
        if (ingredientSections.length === 0) {
            setIngredientSections([ { ingredients: [] } ]);
        }
    }, [ ingredientSections.length ]);

    const handleIngredientDragStart = (
        sectionIndex: number,
        ingredientIndex: number
    ) => {
        dragInfoRef.current = { fromSectionIndex: sectionIndex, fromIngredientIndex: ingredientIndex };
    };

    const handleIngredientDrop = (
        toSectionIndex: number,
        toIngredientIndex: number | null // null = drop at end
    ) => {
        const info = dragInfoRef.current;
        if (!info) return;

        setIngredientSections(prev => {
            const sections = prev.map(s => ({ ...s, ingredients: [ ...s.ingredients ] }));

            const { fromSectionIndex, fromIngredientIndex } = info;
            const sourceIngredients = sections[fromSectionIndex].ingredients;
            const dragged = sourceIngredients.splice(fromIngredientIndex, 1)[0];

            const targetIngredients = sections[toSectionIndex].ingredients;

            let insertIndex: number;
            if (toIngredientIndex === null) {
                insertIndex = targetIngredients.length;
            } else {
                insertIndex = toIngredientIndex;

                // 🔧 important: if we move DOWN within the same section,
                // the array got shorter by one, so we need to shift the insert index up by 1
                if (
                    fromSectionIndex === toSectionIndex &&
                    toIngredientIndex > fromIngredientIndex
                ) {
                    insertIndex -= 1;
                }
            }

            targetIngredients.splice(insertIndex, 0, dragged);

            return sections;
        });

        dragInfoRef.current = null;
        setDragTarget(null);
    };

    const addSection = () => {
        setIngredientSections(prev => {
            let next = prev.length > 0 ? prev.map(s => ({ ...s })) : [ { ingredients: [] } ];

            // If this is the first time we go from flat -> sections, ensure section 0 has a title
            if (next.length === 1) {
                next[0] = {
                    ...next[0],
                    title: (next[0].title?.trim() || 'Sektion 1'),
                };
            }

            const newSections = [
                ...next,
                { title: `Sektion ${ next.length + 1 }`, ingredients: [] }
            ];

            setPendingFocusSectionIndex(newSections.length - 1);
            return newSections;
        });
    };

    const removeSection = (index: number) => {
        setIngredientSections(prev => {
            const next = prev.filter((_, i) => i !== index);

            // never allow "no section" state
            if (next.length === 0) {
                return [ { ingredients: [] } ];
            }

            // collapsing back to flat mode -> remove section title
            if (next.length === 1) {
                return [ { ingredients: next[0].ingredients ?? [] } ];
            }

            return next;
        });

        setEditingSectionIndex(null);
        setEditingSectionIngredientIndex(null);
    };

    const updateSectionTitle = (index: number, title: string) => {
        setIngredientSections(prev =>
            prev.map((section, i) =>
                i === index ? { ...section, title } : section
            )
        );
    };

    const addIngredientToSection = (
        sectionIndex: number,
        ingredient: Ingredient
    ) => {
        setIngredientSections(prev =>
            prev.map((section, i) =>
                i === sectionIndex
                    ? { ...section, ingredients: [ ...section.ingredients, ingredient ] }
                    : section
            )
        );
    };

    const updateIngredientInSection = (
        sectionIndex: number,
        ingredientIndex: number,
        ingredient: Ingredient
    ) => {
        setIngredientSections(prev =>
            prev.map((section, i) =>
                i === sectionIndex
                    ? {
                        ...section,
                        ingredients: section.ingredients.map((ing, idx) =>
                            idx === ingredientIndex ? ingredient : ing
                        )
                    }
                    : section
            )
        );
    };

    const removeIngredientFromSection = (
        sectionIndex: number,
        ingredientIndex: number
    ) => {
        setIngredientSections(prev =>
            prev.map((section, i) =>
                i === sectionIndex
                    ? {
                        ...section,
                        ingredients: section.ingredients.filter((_, idx) => idx !== ingredientIndex)
                    }
                    : section
            )
        );
    };

    const toggleSectionCollapsed = (sectionIndex: number) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionIndex]: !prev[sectionIndex],
        }));
    };

    const handleAddSpice = () => {
        if (!newSpice.trim()) return;
        setSpices([ ...spices, newSpice ]);
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
                    setErrors([ json.message, ...json.details ]);
                    return;
                }

                const { url: uploadedUrl } = await response.json();
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

        const normalizedSections: IngredientSection[] = (() => {
            const sections = ingredientSections.length > 0 ? ingredientSections : [ { ingredients: [] } ];

            // flat mode -> strip title
            if (sections.length === 1) {
                return [ { ingredients: sections[0].ingredients ?? [] } ];
            }

            // section mode -> ensure titles exist + trimmed
            return sections.map((s, idx) => ({
                title: (s.title ?? '').trim() || `Sektion ${ idx + 1 }`,
                ingredients: s.ingredients ?? []
            }));
        })();

        const payload: RecipeFormValues = {
            title,
            instructions: filteredInstructions,
            url: url.trim() || undefined,
            image: imgUrl.trim() || undefined,
            spices: maybeSpices,
            ingredient_sections: normalizedSections
        };

        const response: Response = await onSubmit(payload);

        if (!response.ok) {
            const json = await response.json();
            setErrors([ json.message, ...json.details ]);
            return;
        }

        if (redirectTo) {
            navigate(redirectTo);
        }
    };

    const redirectToImport = async (e: FormEvent) => {
        navigate('/import-recipe');
    }

    const isSectionMode = ingredientSections.length > 1;

    return (
        <div className={ styles.recipeFormContainer }>
            <div className={ styles.titleRow }>
                <h2>{ submitLabel }</h2>
                { showImportButton && (
                    <button
                        type="button"
                        className={ styles.importButton }
                        onClick={ redirectToImport }
                    >
                        Lieber importieren!
                    </button>
                ) }
            </div>
            <form onSubmit={ handleSubmit }>
                <div className={ styles.firstFormGroup }>
                    {/* Title */ }
                    <div>
                        <label htmlFor="title">Titel</label>
                        <input
                            id="title"
                            type="text"
                            value={ title }
                            onChange={ e => setTitle(e.target.value) }
                            required
                        />
                    </div>

                    {/* Instructions */ }
                    <div>
                        <label htmlFor="instructions">Anleitung</label>
                        <textarea
                            id="instructions"
                            rows={ 6 }
                            value={ instructions.join('\n') }
                            onChange={ e => setInstructions(e.target.value.split('\n')) }
                            placeholder="Jede Zeile ist ein Schritt der Anleitung"
                            required
                        />
                    </div>

                    {/* Original URL */ }
                    <div>
                        <label htmlFor="url">Originalrezept-URL</label>
                        <input
                            id="url"
                            type="url"
                            value={ url }
                            onChange={ e => setUrl(e.target.value) }
                        />
                    </div>

                    {/* Image */ }
                    <div>
                        <label>Vorschaubild</label>
                        <ImageUpload file={ imageFile } onFile={ setImageFile } url={ image } onUrl={ setImage } />
                        <small>…oder externe URL eingeben:</small>
                        <input
                            id="image"
                            type="url"
                            value={ image.startsWith('/uploads') ? '' : image }
                            onChange={ e => setImage(e.target.value) }
                            placeholder="https://example.com/bild.jpg"
                        />
                    </div>
                </div>

                {/* Ingredients */ }
                <div className={ styles.formSection }>
                    {/* --- Zutaten / sections toggle --- */ }
                    <div className={ styles.sectionToggleRow }>
                        <label>Zutaten</label>

                        <button
                            type="button"
                            className={ styles.addSectionButton }
                            onClick={ addSection }
                        >
                            + Sektion hinzufügen
                        </button>
                    </div>

                    {/* --- SECTION MODE --- */ }
                    { isSectionMode ? (
                        <div className={ styles.sectionsWrapper }>
                            { ingredientSections.map((section, sectionIndex) => {
                                const isCollapsed = !!collapsedSections[sectionIndex];

                                return (
                                    <div key={ sectionIndex } className={ styles.sectionCard }>
                                        <div className={ styles.sectionHeader }>
                                            <input
                                                className={ styles.sectionTitleInput }
                                                value={ section.title ?? '' }
                                                onChange={ e => updateSectionTitle(sectionIndex, e.target.value) }
                                                ref={ el => {
                                                    sectionTitleRefs.current[sectionIndex] = el;
                                                    if (
                                                        el &&
                                                        pendingFocusSectionIndex !== null &&
                                                        pendingFocusSectionIndex === sectionIndex
                                                    ) {
                                                        // focus & select the whole title when this section should get focus
                                                        el.focus();
                                                        el.select();
                                                        setPendingFocusSectionIndex(null);
                                                    }
                                                } }
                                            />
                                            <button
                                                type="button"
                                                className={ styles.addButton }
                                                onClick={ () => toggleSectionCollapsed(sectionIndex) }
                                                aria-label={ isCollapsed ? 'Sektion anzeigen' : 'Sektion ausblenden' }
                                                title={ isCollapsed ? 'Sektion anzeigen' : 'Sektion ausblenden' }
                                            >
                                                <i className={ isCollapsed ? 'fa-solid fa-eye' : 'fa-solid fa-eye-slash' } />
                                            </button>
                                            <button
                                                type="button"
                                                className={ styles.sectionDeleteButton }
                                                onClick={ () => removeSection(sectionIndex) }
                                            >
                                                Sektion entfernen
                                            </button>
                                        </div>

                                        <div
                                            className={ `${ styles.sectionBody } ${ isCollapsed ? styles.sectionBodyHidden : '' }` }>
                                            {/* existing list but draggable */ }
                                            <div className={ styles.ingredientsTable }>
                                                { section.ingredients.map((ingredient, ingredientIndex) => (
                                                    <div
                                                        key={ ingredientIndex }
                                                        className={
                                                            styles.ingredientRowDraggable +
                                                            (dragTarget &&
                                                            dragTarget.sectionIndex === sectionIndex &&
                                                            dragTarget.ingredientIndex === ingredientIndex
                                                                ? ' ' + styles.ingredientRowDropBefore
                                                                : '')
                                                        }
                                                        draggable
                                                        onDragStart={ () =>
                                                            handleIngredientDragStart(sectionIndex, ingredientIndex)
                                                        }
                                                        onDragOver={ e => {
                                                            e.preventDefault();
                                                            setDragTarget({ sectionIndex, ingredientIndex }); // show line before this row
                                                        } }
                                                        onDrop={ e => {
                                                            e.preventDefault();
                                                            handleIngredientDrop(sectionIndex, ingredientIndex);
                                                        } }
                                                        onClick={ () => {
                                                            // 👉 edit this ingredient in this section
                                                            setEditingSectionIndex(sectionIndex);
                                                            setEditingSectionIngredientIndex(ingredientIndex);
                                                        } }
                                                    >
                                                        <button
                                                            type="button"
                                                            className={ styles.removeButton }
                                                            onClick={ e => {
                                                                e.stopPropagation(); // don't start editing when deleting
                                                                removeIngredientFromSection(sectionIndex, ingredientIndex);
                                                            } }
                                                        >
                                                            <i className="fa-solid fa-minus" />
                                                        </button>

                                                        <div className={ styles.ingredientAmount }>
                                                            { ingredient.amount }
                                                            { ingredient.unit ? ` ${ ingredient.unit }` : '' }
                                                        </div>

                                                        <div className={ styles.ingredientName }>
                                                            { ingredient.name }
                                                            { ingredient.note && (
                                                                <span className={ styles.ingredientNote }>
                                                                { ingredient.note }
                                                            </span>
                                                            ) }
                                                        </div>

                                                        <span className={ styles.dragHandle }>::</span>
                                                    </div>
                                                )) }

                                                {/* drop at end of section */ }
                                                <div
                                                    className={
                                                        styles.dropZone +
                                                        (dragTarget &&
                                                        dragTarget.sectionIndex === sectionIndex &&
                                                        dragTarget.ingredientIndex === null
                                                            ? ' ' + styles.dropZoneActive
                                                            : '')
                                                    }
                                                    onDragOver={ e => {
                                                        e.preventDefault();
                                                        setDragTarget({ sectionIndex, ingredientIndex: null }); // line at end
                                                    } }
                                                    onDrop={ e => {
                                                        e.preventDefault();
                                                        handleIngredientDrop(sectionIndex, null);
                                                    } }
                                                >
                                                    Inhalte hierher ziehen, um sie ans Ende zu verschieben
                                                </div>
                                            </div>

                                            {/* per-section "add ingredient" row */ }
                                            <SectionAddRow
                                                sectionIndex={ sectionIndex }
                                                ingredientSections={ ingredientSections }
                                                editingSectionIndex={ editingSectionIndex }
                                                editingIngredientIndex={ editingSectionIngredientIndex }
                                                onAdd={ (secIndex, ing) => addIngredientToSection(secIndex, ing) }
                                                onUpdate={ updateIngredientInSection }
                                                onFinishEdit={ () => {
                                                    setEditingSectionIndex(null);
                                                    setEditingSectionIngredientIndex(null);
                                                } }
                                            />
                                        </div>
                                    </div>
                                )
                            }) }

                            { ingredientSections.length === 0 && (
                                <p className={ styles.sectionsEmptyHint }>
                                    Noch keine Sektionen. Klicke auf „Sektion hinzufügen“, um zu starten.
                                </p>
                            ) }
                        </div>
                    ) : (
                        /* FLAT MODE */
                        <div className={ styles.ingredientsCard }>
                            <div className={ styles.ingredientsTable }>
                                { (ingredientSections[0]?.ingredients ?? []).map((ingredient, idx) => (
                                    <div
                                        key={ idx }
                                        className={
                                            styles.ingredientRowDraggable +
                                            (dragTarget &&
                                            dragTarget.sectionIndex === 0 &&
                                            dragTarget.ingredientIndex === idx
                                                ? ' ' + styles.ingredientRowDropBefore
                                                : '')
                                        }
                                        draggable
                                        onDragStart={ () => handleIngredientDragStart(0, idx) }
                                        onDragOver={ e => {
                                            e.preventDefault();
                                            setDragTarget({ sectionIndex: 0, ingredientIndex: idx }); // show line before this row
                                        } }
                                        onDrop={ e => {
                                            e.preventDefault();
                                            handleIngredientDrop(0, idx);
                                        } }
                                        onClick={ () => {
                                            setEditingSectionIndex(0);
                                            setEditingSectionIngredientIndex(idx);
                                        } }
                                    >
                                        <button
                                            type="button"
                                            className={ styles.removeButton }
                                            onClick={ e => {
                                                e.stopPropagation();
                                                removeIngredientFromSection(0, idx);
                                            } }
                                        >
                                            <i className="fa-solid fa-minus" />
                                        </button>

                                        <div className={ styles.ingredientAmount }>
                                            { ingredient.amount }
                                            { ingredient.unit ? ` ${ ingredient.unit }` : '' }
                                        </div>

                                        <div className={ styles.ingredientName }>
                                            { ingredient.name }
                                            { ingredient.note && (
                                                <span className={ styles.ingredientNote }>{ ingredient.note }</span>
                                            ) }
                                        </div>

                                        <span className={ styles.dragHandle }>::</span>
                                    </div>
                                )) }

                                <div
                                    className={
                                        styles.dropZone +
                                        (dragTarget &&
                                        dragTarget.sectionIndex === 0 &&
                                        dragTarget.ingredientIndex === null
                                            ? ' ' + styles.dropZoneActive
                                            : '')
                                    }
                                    onDragOver={ e => {
                                        e.preventDefault();
                                        setDragTarget({ sectionIndex: 0, ingredientIndex: null });
                                    } }
                                    onDrop={ e => {
                                        e.preventDefault();
                                        handleIngredientDrop(0, null);
                                    } }
                                >
                                    Inhalte hierher ziehen, um sie ans Ende zu verschieben
                                </div>
                            </div>

                            <SectionAddRow
                                sectionIndex={ 0 }
                                ingredientSections={ ingredientSections }
                                editingSectionIndex={ editingSectionIndex }
                                editingIngredientIndex={ editingSectionIngredientIndex }
                                onAdd={ (secIndex, ing) => addIngredientToSection(secIndex, ing) }
                                onUpdate={ updateIngredientInSection }
                                onFinishEdit={ () => {
                                    setEditingSectionIndex(null);
                                    setEditingSectionIngredientIndex(null);
                                } }
                            />
                        </div>
                    ) }

                    {/* Spices */ }
                    <label>Gewürze</label>
                    <div className={ styles.spicesContainer }>
                        { spices.map((s, i) => (
                            <div key={ i } className={ styles.spiceTag }
                                 onClick={ () => handleRemoveSpice(i) }>{ s }</div>
                        )) }
                    </div>
                    <div className={ styles.spiceInputRow }>
                        <div className={ styles.formGroup }>
                            <input type="text" value={ newSpice }
                                   onChange={ e => setNewSpice(e.target.value) }
                                   onKeyDown={ e => {
                                       if (e.key === 'Enter') {
                                           e.preventDefault();
                                           handleAddSpice();
                                       }
                                   } }
                                   placeholder="Neues Gewürz" />
                        </div>
                        <button type="button"
                                className={ styles.addButton }
                                onClick={ handleAddSpice }
                                disabled={ !newSpice.trim() }>
                            <i className="fa-solid fa-plus" />
                        </button>
                    </div>
                </div>

                { errors.length > 0 && (
                    <ErrorSection title={ errors[0] } details={ errors.slice(1) } />
                ) }
                <div className={ styles.formActions }>
                    { onDelete && (
                        <button type="button"
                                className={ styles.deleteButton }
                                onClick={ handleDelete }
                        >
                            <i className="fa-solid fa-trash-can" /> Lösche Rezept
                        </button>
                    ) }
                    <button type="submit" className={ styles.submitButton }>
                        { submitLabel }
                    </button>
                </div>
            </form>
        </div>
    );
};

interface SectionAddRowProps {
    sectionIndex: number;
    ingredientSections: IngredientSection[];
    editingSectionIndex: number | null;
    editingIngredientIndex: number | null;
    onAdd: (sectionIndex: number, ingredient: Ingredient) => void;
    onUpdate: (sectionIndex: number, ingredientIndex: number, ingredient: Ingredient) => void;
    onFinishEdit: () => void;
}

const SectionAddRow: React.FC<SectionAddRowProps> = ({
                                                         sectionIndex,
                                                         ingredientSections,
                                                         editingSectionIndex,
                                                         editingIngredientIndex,
                                                         onAdd,
                                                         onUpdate,
                                                         onFinishEdit
                                                     }) => {
    const [ amount, setAmount ] = useState('');
    const [ unit, setUnit ] = useState('');
    const [ name, setName ] = useState('');
    const [ note, setNote ] = useState('');

    const amountInputRef = useRef<HTMLInputElement | null>(null);

    const isEditing =
        editingSectionIndex === sectionIndex &&
        editingIngredientIndex !== null &&
        editingIngredientIndex !== undefined;

    // when an ingredient in THIS section is selected for editing, load it into the row
    useEffect(() => {
        if (!isEditing) return;

        const section = ingredientSections[sectionIndex];
        const ing = section.ingredients[editingIngredientIndex!];
        if (!ing) return;

        setAmount(
            typeof ing.amount === 'number'
                ? String(ing.amount).replace('.', ',')
                : ''
        );
        setUnit(ing.unit ?? '');
        setName(ing.name);
        setNote(ing.note ?? '');

        amountInputRef.current?.focus();
        amountInputRef.current?.select();
    }, [ isEditing, ingredientSections, sectionIndex, editingIngredientIndex ]);

    const resetFields = () => {
        setAmount('');
        setUnit('');
        setName('');
        setNote('');
    };

    const handleSave = () => {
        if (!name.trim()) return;

        const ingredient: Ingredient = {
            name: name.trim(),
            amount: parseAmount(amount),
            unit: unit.trim() || undefined,
            note: note.trim() || undefined
        };

        if (isEditing && editingIngredientIndex !== null && editingIngredientIndex !== undefined) {
            onUpdate(sectionIndex, editingIngredientIndex, ingredient);
            onFinishEdit();
        } else {
            onAdd(sectionIndex, ingredient);
        }

        resetFields();
    };

    const handleCancel = () => {
        resetFields();
        onFinishEdit();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        }
    };

    return (
        <div className={ styles.sectionAddRow }>
            <div className={ styles.sectionAddInputs }>
                <input
                    ref={ amountInputRef }
                    className={ styles.amountInput }
                    placeholder="Menge"
                    value={ amount }
                    onChange={ e => setAmount(e.target.value) }
                    onKeyDown={ handleKeyDown }
                />

                <input
                    className={ styles.unitInput }
                    placeholder="Einheit"
                    value={ unit }
                    onChange={ e => setUnit(e.target.value) }
                    onKeyDown={ handleKeyDown }
                />

                <input
                    className={ styles.nameInput }
                    placeholder="Name"
                    value={ name }
                    onChange={ e => setName(e.target.value) }
                    onKeyDown={ handleKeyDown }
                />

                <input
                    className={ styles.noteInput }
                    placeholder="Anmerkung (optional)"
                    value={ note }
                    onChange={ e => setNote(e.target.value) }
                    onKeyDown={ handleKeyDown }
                />

            </div>

            <div className={ styles.sectionAddActions }>
                <button type="button" className={ styles.addButton } onClick={ handleSave }>
                    { isEditing ? <i className="fa-solid fa-check" /> : <i className="fa-solid fa-plus" /> }
                </button>

                { isEditing && (
                    <button type="button" className={ styles.sectionDeleteButton } onClick={ handleCancel }>
                        Abbrechen
                    </button>
                ) }
            </div>
        </div>
    );
};

export default RecipeFormBase;
