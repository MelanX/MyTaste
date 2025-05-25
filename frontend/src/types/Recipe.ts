export interface Status {
    cookState?: boolean;
    favorite?: boolean;
}

export interface Recipe {
    id: string;
    title: string;
    instructions: string[];
    url?: string;
    ingredients: Ingredient[];
    spices?: string[];
    image?: string;
    status?: Status;
}

export interface Ingredient {
    name: string;
    amount?: number;
    unit?: string;
    note?: string;
}
