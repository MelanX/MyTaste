import type { Recipe } from '../types/Recipe';
import { normalizeSearchText, RecipeSearchIndex } from '../utils/recipeSearch';

const recipe = (overrides: Partial<Recipe>): Recipe => ({
  id: 'recipe',
  title: 'Rezept',
  instructions: [],
  ingredient_sections: [],
  ...overrides,
});

const richRecipes: Recipe[] = [
  recipe({
    id: 'potatoes',
    title: 'Knusprige Kartoffeln',
    ingredient_sections: [
      {
        title: 'Für das Gemüse',
        ingredients: [{ name: 'Kartoffeln', note: 'vorwiegend festkochend' }, { name: 'Olivenöl' }],
      },
    ],
    spices: ['Paprikapulver'],
    instructions: ['Im Backofen goldbraun rösten.'],
    recipeType: 'cooking',
    dietaryRestrictions: ['vegan'],
  }),
  recipe({
    id: 'cake',
    title: 'Käsekuchen',
    ingredient_sections: [{ title: 'Teig', ingredients: [{ name: 'Quark', note: 'zimmerwarm' }] }],
    spices: ['Vanille'],
    instructions: ['Den Kuchen vorsichtig auskühlen lassen.'],
    recipeType: 'baking',
    dietaryRestrictions: ['vegetarian'],
  }),
];

describe('normalizeSearchText', () => {
  it('normalizes case, umlauts, sharp s, punctuation, and hyphens', () => {
    expect(normalizeSearchText('KÄSE-Straße, süß!')).toBe('kaese strasse suess');
  });
});

describe('RecipeSearchIndex fields and explanations', () => {
  const searches = [
    ['knusprige', 'potatoes', 'Titel'],
    ['kartoffeln', 'potatoes', 'Zutat: Kartoffeln'],
    ['festkochend', 'potatoes', 'Zutat: Kartoffeln'],
    ['paprikapulver', 'potatoes', 'Gewürz: Paprikapulver'],
    ['gemuese', 'potatoes', 'Abschnitt: Für das Gemüse'],
    ['kochen', 'potatoes', 'Typ: Kochen'],
    ['vegan', 'potatoes', 'Ernährung: Vegan'],
    ['goldbraun', 'potatoes', 'Anleitung'],
  ] as const;

  it.each(searches)('finds %s in the expected field', (query, id, reason) => {
    const result = new RecipeSearchIndex(richRecipes).search(query);
    expect(result[0]?.id).toBe(id);
    expect(result[0]?.reasons).toContain(reason);
    expect(result[0]?.reasons.length).toBeLessThanOrEqual(2);
  });
});

describe('RecipeSearchIndex ranking and tolerant matching', () => {
  it('ranks title above ingredient, spice, metadata, and instruction matches', () => {
    const index = new RecipeSearchIndex([
      recipe({ id: 'instruction', title: 'Eintopf', instructions: ['Tomate rösten'] }),
      recipe({ id: 'metadata', title: 'Eintopf', ingredient_sections: [{ title: 'Tomate', ingredients: [] }] }),
      recipe({ id: 'spice', title: 'Eintopf', spices: ['Tomate'] }),
      recipe({ id: 'ingredient', title: 'Eintopf', ingredient_sections: [{ ingredients: [{ name: 'Tomate' }] }] }),
      recipe({ id: 'title', title: 'Tomate' }),
    ]);

    expect(index.search('tomate').map((match) => match.id)).toEqual(['title', 'ingredient', 'spice', 'metadata', 'instruction']);
  });

  it('prioritizes an exact title, then a title prefix, then a title phrase', () => {
    const index = new RecipeSearchIndex([
      recipe({ id: 'phrase', title: 'Mein schneller Kartoffel Salat' }),
      recipe({ id: 'prefix', title: 'Kartoffel Salat mit Gurke' }),
      recipe({ id: 'exact', title: 'Kartoffel Salat' }),
    ]);

    expect(index.search('kartoffel salat').map((match) => match.id)).toEqual(['exact', 'prefix', 'phrase']);
  });

  it('prefers a complete phrase over the same words in separate positions', () => {
    const index = new RecipeSearchIndex([
      recipe({ id: 'separate', title: 'Dip', instructions: ['Rote Zwiebel schneiden und Paprika zugeben'] }),
      recipe({ id: 'phrase', title: 'Sauce', instructions: ['Rote Paprika rösten'] }),
    ]);

    expect(index.search('rote paprika').map((match) => match.id)).toEqual(['phrase', 'separate']);
  });

  it('matches German transliteration, punctuation, hyphenated words, and the final term as a prefix', () => {
    const index = new RecipeSearchIndex(richRecipes);
    expect(index.search('kaese').map((match) => match.id)).toContain('cake');
    expect(index.search('käse!').map((match) => match.id)).toContain('cake');
    expect(index.search('knusprige-kartoff').map((match) => match.id)).toContain('potatoes');
  });

  it('matches inside compound words without including fuzzy lookalikes', () => {
    const index = new RecipeSearchIndex([
      recipe({
        id: 'lasagne',
        title: 'Lasagne',
        ingredient_sections: [{ ingredients: [{ name: 'Lasagneplatten' }] }],
      }),
      recipe({ id: 'bread', title: 'Käsebrötchen', instructions: ['Zu einem glatten Teig kneten.'] }),
      recipe({ id: 'pasta', title: 'Pasta', instructions: ['Die Sauce bekommt eine glatte Konsistenz.'] }),
    ]);

    const result = index.search('platten');

    expect(result.map((match) => match.id)).toEqual(['lasagne']);
    expect(result[0].reasons).toContain('Zutat: Lasagneplatten');
  });

  it('allows at most two typos only in terms containing at least five characters', () => {
    const index = new RecipeSearchIndex(richRecipes);
    expect(index.search('kartofeln').map((match) => match.id)).toContain('potatoes');
    expect(index.search('kartxxfeln').map((match) => match.id)).toContain('potatoes');
    expect(index.search('karxxxfeln')).toEqual([]);
    expect(index.search('teog')).toEqual([]);
  });

  it('uses AND for multiple words and falls back to partial matches only when AND has no result', () => {
    const index = new RecipeSearchIndex([
      recipe({ id: 'both', title: 'Kartoffel Suppe' }),
      recipe({ id: 'one', title: 'Kartoffel Salat' }),
      recipe({ id: 'other', title: 'Tomaten Suppe' }),
    ]);

    expect(index.search('kartoffel suppe').map((match) => match.id)).toEqual(['both']);
    expect(index.search('kartoffel pizza').map((match) => match.id)).toEqual(['one', 'both']);
  });

  it('supports one or multiple exact/prefix exclusions in title, ingredients, notes, and spices', () => {
    const index = new RecipeSearchIndex([
      recipe({ id: 'plain', title: 'Kartoffelsuppe' }),
      recipe({ id: 'title', title: 'Kartoffelsuppe mit Pilzen' }),
      recipe({
        id: 'ingredient',
        title: 'Kartoffelsuppe',
        ingredient_sections: [{ ingredients: [{ name: 'Champignons' }] }],
      }),
      recipe({
        id: 'note',
        title: 'Kartoffelsuppe',
        ingredient_sections: [{ ingredients: [{ name: 'Brühe', note: 'mit Pilzen' }] }],
      }),
      recipe({ id: 'spice', title: 'Kartoffelsuppe', spices: ['Muskat'] }),
    ]);

    expect(index.search('kartoffel -pilz').map((match) => match.id)).toEqual(['plain', 'ingredient', 'spice']);
    expect(index.search('kartoffel -pilz -muskat').map((match) => match.id)).toEqual(['plain', 'ingredient']);
    expect(index.search('kartoffel -chamignons').map((match) => match.id)).toContain('ingredient');
  });

  it('falls back to partial matches when exclusions remove every AND match', () => {
    const index = new RecipeSearchIndex([
      recipe({ id: 'excluded', title: 'Kartoffel Suppe mit Pilzen' }),
      recipe({ id: 'partial', title: 'Kartoffel Salat' }),
    ]);

    expect(index.search('kartoffel suppe -pilz').map((match) => match.id)).toEqual(['partial']);
  });

  it('returns every recipe alphabetically for an empty query', () => {
    expect(new RecipeSearchIndex(richRecipes).search('').map((match) => match.id)).toEqual(['cake', 'potatoes']);
  });
});

describe('RecipeSearchIndex incremental updates', () => {
  it('adds, replaces, removes, and fully replaces documents', () => {
    const index = new RecipeSearchIndex();
    index.upsert(recipe({ id: 'one', title: 'Apfelkuchen' }));
    expect(index.search('apfel').map((match) => match.id)).toEqual(['one']);

    index.upsert(recipe({ id: 'one', title: 'Birnenkuchen' }));
    expect(index.search('apfel')).toEqual([]);
    expect(index.search('birne').map((match) => match.id)).toEqual(['one']);

    index.remove('one');
    expect(index.search('birne')).toEqual([]);

    index.replaceAll(richRecipes);
    expect(index.search('').map((match) => match.id)).toEqual(['cake', 'potatoes']);
  });

  it('does not replace a document when only favorite/cooked state changes', () => {
    const index = new RecipeSearchIndex([richRecipes[0]]);
    const replaceSpy = vi.spyOn(index, 'replaceDocument');

    index.upsert({ ...richRecipes[0], status: { favorite: true, cookState: true } });

    expect(replaceSpy).not.toHaveBeenCalled();
  });
});
