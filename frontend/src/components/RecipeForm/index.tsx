import React from 'react';
import RecipeFormBase, { RecipeFormValues } from './RecipeFormBase';

interface Props {
    onSubmit: (values: RecipeFormValues) => Promise<Response>;
}

const RecipeForm: React.FC<Props> = ({onSubmit}) => (
    <RecipeFormBase
        submitLabel="Rezept hinzufügen"
        onSubmit={onSubmit}
        redirectTo='/'
        showImportButton={ true }
    />
);

export default RecipeForm;
