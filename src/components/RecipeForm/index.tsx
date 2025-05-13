// src/components/RecipeForm/index.tsx
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import RecipeFormBase, { RecipeFormValues } from './RecipeFormBase';

interface Props { onSubmit: (values: RecipeFormValues) => Promise<void>; }

const RecipeForm: React.FC<Props> = ({ onSubmit }) => (
    <RecipeFormBase
        submitLabel="Rezept hinzufügen"
        onSubmit={onSubmit}
    />
);

export default RecipeForm;
