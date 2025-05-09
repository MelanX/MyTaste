export interface Recipe {
    id: number;
    title: string;
    instructions: string[];
    url: string;
    ingredients: Ingredient[];
    spices?: string[];
    image?: string;
}

export interface Ingredient {
    name: string;
    amount?: number;
    unit?: string;
    note?: string;
}
