import type { Recipe } from '../types/Recipe';
import { levenshtein } from '../components/RecipeList/levenshtein';

const FIELD_WEIGHTS = {
  title: 12,
  ingredients: 6,
  spices: 4,
  metadata: 2,
  instructions: 1,
} as const;

type SearchField = keyof typeof FIELD_WEIGHTS;

const TYPE_LABELS: Record<string, string> = {
  cooking: 'Kochen',
  baking: 'Backen',
  snack: 'Snack',
  dessert: 'Dessert',
};

const DIETARY_LABELS: Record<string, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarisch',
  glutenfree: 'Glutenfrei',
  dairyfree: 'Laktosefrei',
};

interface SearchDocument {
  id: string;
  signature: string;
  title: string;
  fields: Record<SearchField, string>;
  exclusionText: string;
  recipe: Recipe;
}

interface Posting {
  field: SearchField;
  occurrences: number;
}

export interface RecipeSearchMatch {
  id: string;
  score: number;
  reasons: string[];
}

interface ParsedQuery {
  positive: string[];
  excluded: string[];
  phrase: string;
}

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('de-DE')
    .replaceAll('ä', 'ae')
    .replaceAll('ö', 'oe')
    .replaceAll('ü', 'ue')
    .replaceAll('ß', 'ss')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function tokenize(value: string): string[] {
  const normalized = normalizeSearchText(value);
  return normalized ? normalized.split(' ') : [];
}

function parseQuery(query: string): ParsedQuery {
  const positive: string[] = [];
  const excluded: string[] = [];

  for (const rawPart of query.trim().split(/\s+/)) {
    const isExcluded = rawPart.startsWith('-') && rawPart.length > 1;
    const terms = tokenize(isExcluded ? rawPart.slice(1) : rawPart);
    (isExcluded ? excluded : positive).push(...terms);
  }

  return { positive, excluded, phrase: positive.join(' ') };
}

function localizedType(recipe: Recipe): string {
  if (!recipe.recipeType) return '';
  return TYPE_LABELS[recipe.recipeType] ?? recipe.recipeType;
}

function localizedDietary(recipe: Recipe): string[] {
  return (recipe.dietaryRestrictions ?? []).map((dietary) => DIETARY_LABELS[dietary] ?? dietary);
}

function deriveDocument(recipe: Recipe): SearchDocument {
  const ingredientSections = recipe.ingredient_sections ?? [];
  const ingredients = ingredientSections.flatMap((section) =>
    section.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.note ?? '']),
  );
  const sections = ingredientSections.map((section) => section.title ?? '');
  const spices = recipe.spices ?? [];
  const metadata = [...sections, localizedType(recipe), ...localizedDietary(recipe)];
  const searchable = {
    title: normalizeSearchText(recipe.title),
    ingredients: normalizeSearchText(ingredients.join(' ')),
    spices: normalizeSearchText(spices.join(' ')),
    metadata: normalizeSearchText(metadata.join(' ')),
    instructions: normalizeSearchText((recipe.instructions ?? []).join(' ')),
  };

  return {
    id: recipe.id,
    title: searchable.title,
    fields: searchable,
    exclusionText: normalizeSearchText([recipe.title, ...ingredients, ...spices].join(' ')),
    signature: JSON.stringify(searchable),
    recipe,
  };
}

function fuzzyDistance(term: string): number {
  return term.length >= 5 ? 2 : 0;
}

function matchQuality(term: string, token: string, allowPrefix: boolean, allowFuzzy: boolean): number {
  if (token === term) return 1;
  if (allowPrefix && token.startsWith(term)) return 0.9;
  if (term.length >= 4 && token.includes(term)) return 0.8;
  if (allowFuzzy && fuzzyDistance(term) > 0) {
    const distance = levenshtein(term, token);
    if (distance <= fuzzyDistance(term)) return 0.65 - distance * 0.05;
  }
  return 0;
}

function hasExcludedTerm(document: SearchDocument, excluded: string[]): boolean {
  const tokens = tokenize(document.exclusionText);
  return excluded.some((term) =>
    tokens.some((token) => token === term || token.startsWith(term) || (term.length >= 4 && token.includes(term))),
  );
}

function valueMatches(value: string, terms: string[], finalTerm: string | undefined): boolean {
  const tokens = tokenize(value);
  return terms.some((term) => tokens.some((token) => matchQuality(term, token, term === finalTerm, true) > 0));
}

function reasonsFor(document: SearchDocument, terms: string[]): string[] {
  if (terms.length === 0) return [];
  const finalTerm = terms.at(-1);
  const recipe = document.recipe;
  const reasons: string[] = [];

  if (valueMatches(recipe.title, terms, finalTerm)) reasons.push('Titel');

  for (const section of recipe.ingredient_sections ?? []) {
    for (const ingredient of section.ingredients) {
      if (valueMatches(`${ingredient.name} ${ingredient.note ?? ''}`, terms, finalTerm)) {
        reasons.push(`Zutat: ${ingredient.name}`);
        break;
      }
    }
    if (reasons.length >= 2) break;
  }

  for (const spice of recipe.spices ?? []) {
    if (reasons.length >= 2) break;
    if (valueMatches(spice, terms, finalTerm)) reasons.push(`Gewürz: ${spice}`);
  }

  for (const section of recipe.ingredient_sections ?? []) {
    if (reasons.length >= 2) break;
    if (section.title && valueMatches(section.title, terms, finalTerm)) reasons.push(`Abschnitt: ${section.title}`);
  }

  const typeLabel = localizedType(recipe);
  if (reasons.length < 2 && typeLabel && valueMatches(typeLabel, terms, finalTerm)) reasons.push(`Typ: ${typeLabel}`);

  for (const dietaryLabel of localizedDietary(recipe)) {
    if (reasons.length >= 2) break;
    if (valueMatches(dietaryLabel, terms, finalTerm)) reasons.push(`Ernährung: ${dietaryLabel}`);
  }

  if (reasons.length < 2 && (recipe.instructions ?? []).some((line) => valueMatches(line, terms, finalTerm))) {
    reasons.push('Anleitung');
  }

  return reasons.slice(0, 2);
}

/**
 * A small weighted inverted full-text index for the browser recipe cache.
 * Search documents are derived data and deliberately never persisted.
 */
export class RecipeSearchIndex {
  private documents = new Map<string, SearchDocument>();
  private postings = new Map<string, Map<string, Posting[]>>();

  constructor(recipes: Recipe[] = []) {
    this.replaceAll(recipes);
  }

  replaceAll(recipes: Recipe[]): void {
    const nextIds = new Set(recipes.map((recipe) => recipe.id));
    for (const id of this.documents.keys()) {
      if (!nextIds.has(id)) this.remove(id);
    }
    for (const recipe of recipes) this.upsert(recipe);
  }

  upsert(recipe: Recipe): void {
    const document = deriveDocument(recipe);
    const current = this.documents.get(recipe.id);
    if (current?.signature === document.signature) return;
    this.replaceDocument(document);
  }

  /** Public to make the actual index mutation observable in focused tests. */
  replaceDocument(document: SearchDocument): void {
    this.remove(document.id);
    this.documents.set(document.id, document);

    for (const field of Object.keys(FIELD_WEIGHTS) as SearchField[]) {
      const counts = new Map<string, number>();
      for (const token of tokenize(document.fields[field])) counts.set(token, (counts.get(token) ?? 0) + 1);
      for (const [token, occurrences] of counts) {
        const documents = this.postings.get(token) ?? new Map<string, Posting[]>();
        const postings = documents.get(document.id) ?? [];
        postings.push({ field, occurrences });
        documents.set(document.id, postings);
        this.postings.set(token, documents);
      }
    }
  }

  remove(id: string): void {
    if (!this.documents.delete(id)) return;
    for (const [token, documents] of this.postings) {
      documents.delete(id);
      if (documents.size === 0) this.postings.delete(token);
    }
  }

  search(query: string): RecipeSearchMatch[] {
    const parsed = parseQuery(query);
    if (parsed.positive.length === 0) {
      return [...this.documents.values()]
        .filter((document) => !hasExcludedTerm(document, parsed.excluded))
        .sort((a, b) => a.recipe.title.localeCompare(b.recipe.title, 'de'))
        .map((document) => ({ id: document.id, score: 0, reasons: [] }));
    }

    const scoreByTerm = parsed.positive.map((term, termIndex) => {
      const allowPrefix = termIndex === parsed.positive.length - 1;
      const collectScores = (allowFuzzy: boolean) => {
        const scores = new Map<string, number>();
        for (const [token, documents] of this.postings) {
          const quality = matchQuality(term, token, allowPrefix, allowFuzzy);
          if (quality === 0) continue;
          for (const [id, postings] of documents) {
            const score = postings.reduce((total, posting) => total + FIELD_WEIGHTS[posting.field] * posting.occurrences * quality, 0);
            scores.set(id, (scores.get(id) ?? 0) + score);
          }
        }
        return scores;
      };

      const lexicalScores = collectScores(false);
      return lexicalScores.size > 0 ? lexicalScores : collectScores(true);
    });

    const allTerms = new Set(scoreByTerm[0]?.keys() ?? []);
    for (const termScores of scoreByTerm.slice(1)) {
      for (const id of allTerms) if (!termScores.has(id)) allTerms.delete(id);
    }
    const partialIds = new Set(scoreByTerm.flatMap((scores) => [...scores.keys()]));
    const buildResults = (candidateIds: Set<string>): RecipeSearchMatch[] => {
      const matches: RecipeSearchMatch[] = [];
      for (const id of candidateIds) {
        const document = this.documents.get(id);
        if (!document || hasExcludedTerm(document, parsed.excluded)) continue;
        let score = scoreByTerm.reduce((total, termScores) => total + (termScores.get(id) ?? 0), 0);
        if (document.title === parsed.phrase) score += 10_000;
        else if (document.title.startsWith(parsed.phrase)) score += 2_000;
        else if (document.title.includes(parsed.phrase)) score += 1_000;
        else if (Object.values(document.fields).some((field) => field.includes(parsed.phrase))) score += 500;
        matches.push({ id, score, reasons: reasonsFor(document, parsed.positive) });
      }
      return matches;
    };

    let results = allTerms.size > 0 ? buildResults(allTerms) : [];
    if (results.length === 0) results = buildResults(partialIds);

    return results.sort(
      (a, b) => b.score - a.score || this.documents.get(a.id)!.recipe.title.localeCompare(this.documents.get(b.id)!.recipe.title, 'de'),
    );
  }
}

export const recipeSearchIndex = new RecipeSearchIndex();
