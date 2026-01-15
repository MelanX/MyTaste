export interface Status {
    cookState?: boolean;
    favorite?: boolean;
}

export interface Recipe {
    id: string;
    title: string;
    instructions: string[];
    url?: string;
    ingredient_sections: IngredientSection[];
    spices?: string[];
    image?: string;
    status?: Status;
}

export interface IngredientSection {
    title?: string;
    ingredients: Ingredient[];
}

export interface Ingredient {
    name: string;
    amount?: number;
    unit?: string;
    note?: string;
}
