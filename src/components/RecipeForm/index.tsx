import React, { useState } from 'react';
import { Ingredient } from '../../types/Recipe';
import { useNavigate } from 'react-router-dom';
import './custom.css';

interface RecipeFormProps {
  onSubmit: (
    title: string, 
    description: string, 
    url: string, 
    ingredients: Ingredient[], 
    spices: string[], 
    image?: string
  ) => Promise<void>;
}

const RecipeForm: React.FC<RecipeFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [image, setImage] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', amount: undefined, unit: '', note: '' }]);
  const [spices, setSpices] = useState<string[]>(['']);
  const navigate = useNavigate();

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number | undefined) => {
    const updatedIngredients = [...ingredients];

    if (field === 'amount' && typeof value === 'string') {
      // @ts-ignore
      updatedIngredients[index][field] = isNaN(value.replace(',', '.')) ? undefined : value;
    } else {
      // @ts-ignore - we know these values match the field types
      updatedIngredients[index][field] = value;
    }

    setIngredients(updatedIngredients);
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', amount: undefined, unit: '', note: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      const updatedIngredients = [...ingredients];
      updatedIngredients.splice(index, 1);
      setIngredients(updatedIngredients);
    }
  };

  const handleSpiceChange = (index: number, value: string) => {
    const updatedSpices = [...spices];
    updatedSpices[index] = value;
    setSpices(updatedSpices);
  };

  const addSpice = () => {
    setSpices([...spices, '']);
  };

  const removeSpice = (index: number) => {
    if (spices.length > 1) {
      const updatedSpices = [...spices];
      updatedSpices.splice(index, 1);
      setSpices(updatedSpices);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Filter out empty ingredients
    const filteredIngredients = ingredients.filter(ing => ing.name.trim() !== '');

    // Filter out empty spices
    const filteredSpices = spices.filter(spice => spice.trim() !== '');

    console.log(filteredIngredients);

    await onSubmit(title, description, url, filteredIngredients, filteredSpices, image || undefined);

    // Reset form
    setTitle('');
    setDescription('');
    setUrl('');
    setImage('');
    setIngredients([{ name: '', amount: undefined, unit: '', note: '' }]);
    setSpices(['']);

    // Navigate back to the recipe list
    navigate('/');
  };

  return (
    <div className="recipe-form-container">
      <h2>Neues Rezept hinzufügen</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Titel</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Beschreibung</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="url">URL</label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Bild URL (optional)</label>
          <input
            type="url"
            id="image"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>

        <div className="form-section">
          <h3>Zutaten</h3>
          {ingredients.map((ingredient, index) => (
            <div key={index} className="ingredient-row">
              <div className="ingredient-inputs">
                <div className="form-group">
                  <label htmlFor={`ingredient-name-${index}`}>Name</label>
                  <input
                    type="text"
                    id={`ingredient-name-${index}`}
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                    required={index === 0}
                  />
                </div>
                <div className="form-group small-input">
                  <label htmlFor={`ingredient-amount-${index}`}>Menge</label>
                  <input
                    type="text"
                    id={`ingredient-amount-${index}`}
                    value={ingredient.amount === undefined ? '' : ingredient.amount}
                    onChange={(e) => handleIngredientChange(index, 'amount', e.target.value.replace(',', '.'))}
                    step="0.1"
                    placeholder="1"
                  />
                </div>
                <div className="form-group small-input">
                  <label htmlFor={`ingredient-unit-${index}`}>Einheit</label>
                  <input
                    type="text"
                    id={`ingredient-unit-${index}`}
                    value={ingredient.unit || ''}
                    onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`ingredient-note-${index}`}>Anmerkung</label>
                  <input
                    type="text"
                    id={`ingredient-note-${index}`}
                    value={ingredient.note || ''}
                    onChange={(e) => handleIngredientChange(index, 'note', e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="remove-button"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length === 1}
              >
                -
              </button>
            </div>
          ))}
          <button type="button" className="add-button" onClick={addIngredient}>
            + Zutat hinzufügen
          </button>
        </div>

        <div className="form-section">
          <h3>Gewürze (optional)</h3>
          {spices.map((spice, index) => (
            <div key={index} className="spice-row">
              <div className="form-group">
                <input
                  type="text"
                  value={spice}
                  onChange={(e) => handleSpiceChange(index, e.target.value)}
                />
              </div>
              <button
                type="button"
                className="remove-button"
                onClick={() => removeSpice(index)}
                disabled={spices.length === 1}
              >
                -
              </button>
            </div>
          ))}
          <button type="button" className="add-button" onClick={addSpice}>
            + Gewürz hinzufügen
          </button>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">Rezept speichern</button>
        </div>
      </form>
    </div>
  );
};

export default RecipeForm;
