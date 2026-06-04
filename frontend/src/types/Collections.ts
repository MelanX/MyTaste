export interface Collections {
  nextUp: string[];
}

export interface Collection {
  id: string;
  name: string;
  recipeIds: string[];
  createdAt?: string;
  updatedAt?: string;
}
