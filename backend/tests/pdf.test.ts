import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/utils/fileService.js');

import zlib from 'node:zlib';
import request from 'supertest';
import * as fileService from '../src/utils/fileService.js';
import { recipeTags } from '../src/routes/pdf.js';
import { makeApp } from './testUtils.js';

const fs = fileService as unknown as typeof import('../src/utils/__mocks__/fileService.js');

const app = makeApp();
const agent = request(app);

const seedRecipes = [
  {
    id: 'r1',
    title: 'Kartoffelsuppe',
    url: 'https://example.com/orig',
    image: '', // empty -> no image fetch, keeps the test offline
    ingredient_sections: [
      {
        title: 'Suppe',
        ingredients: [
          { name: 'Kartoffeln', amount: 2, unit: 'kg', note: 'mehlig' },
          { name: 'Suppengrün', amount: 1, unit: 'Bund' },
        ],
      },
    ],
    spices: ['Salz', 'Pfeffer'],
    instructions: ['**Kartoffeln** schälen und schneiden.', 'Alles kochen.'],
    status: { favorite: false, cookState: false },
  },
];

// A recipe long enough to overflow a single A4 page, so the multi-page layout is
// exercised. Synthetic filler text, sized like the 13-step / 17-ingredient recipe
// that triggered the original bug.
const longRecipe = {
  id: 'long',
  title: 'Testauflauf mit vielen Schritten',
  url: 'https://example.com/testauflauf',
  image: '',
  recipeType: 'cooking',
  dietaryRestrictions: ['vegetarian'],
  ingredient_sections: [
    {
      ingredients: [
        { name: 'Zutat A', amount: 18 },
        { name: 'Zutat B', amount: 800, unit: 'g' },
        { name: 'Zutat C', amount: 500, unit: 'ml' },
        { name: 'Zutat D', amount: 1.5 },
        { name: 'Zutat E', amount: 200, unit: 'g' },
        { name: 'Zutat F', amount: 150, unit: 'g' },
        { name: 'Zutat G', amount: 150, unit: 'g' },
        { name: 'Zutat H, entspricht ungefähr einer großen Portion', amount: 120, unit: 'g' },
        { name: 'Zutat I, getrocknet', amount: 120, unit: 'g' },
        { name: 'Zutat J', amount: 100, unit: 'g', note: 'zimmerwarm verarbeiten' },
        { name: 'Zutat K, entspricht ungefähr vier Löffeln', amount: 40, unit: 'g' },
        { name: 'Zutat L', amount: 2 },
        { name: 'Zutat M', amount: 3, unit: 'EL' },
        { name: 'Zutat N, Trockenware', amount: 3, unit: 'TL' },
        { name: 'Zutat O', amount: 1, unit: 'Prise' },
        { name: 'Zutat P', amount: 2, unit: 'TL' },
      ],
    },
  ],
  instructions: Array.from(
    { length: 13 },
    (_, i) =>
      `Schritt ${i + 1}: Dies ist ein absichtlich langer Platzhaltertext, damit der Schritt über ` +
      `mehrere Zeilen umbricht und die Seite zuverlässig überläuft. Rühre, warte und wiederhole ` +
      `den Vorgang so lange, bis die Testbedingung erfüllt ist.`,
  ),
  status: { favorite: false, cookState: false },
};

// A recipe whose *right* column (ingredients) is what overflows, while the steps stay short.
const ingredientHeavyRecipe = {
  id: 'many-ingredients',
  title: 'Gewürzregal',
  image: '',
  ingredient_sections: [
    {
      title: 'Alles',
      ingredients: Array.from({ length: 60 }, (_, i) => ({
        name: `Zutat Nummer ${i + 1}, sehr genau abgemessen`,
        amount: i + 1,
        unit: 'g',
      })),
    },
  ],
  instructions: ['Alles mischen.', 'Servieren.'],
  status: { favorite: false, cookState: false },
};

// Recipes differing only in the emphasis markers on one step, so the rendered content
// streams can be compared against each other.
const emphasisRecipes = (
  [
    ['md-plain', 'Zwiebeln fein würfeln.'],
    ['md-bold', '**Zwiebeln** fein würfeln.'],
    ['md-italic', '*Zwiebeln* fein würfeln.'],
    ['md-both', '***Zwiebeln*** fein würfeln.'],
    ['md-underline', '__Zwiebeln__ fein würfeln.'],
    ['md-bold-underline', '__**Zwiebeln**__ fein würfeln.'],
  ] as const
).map(([id, step]) => ({
  id,
  title: 'Betonung',
  image: '',
  // No comma "specifications" or notes — those are styled oblique independently of
  // markdown and would pollute the slant count.
  ingredient_sections: [{ ingredients: [{ name: 'Zwiebeln', amount: 2 }] }],
  instructions: [step],
  status: { favorite: false, cookState: false },
}));

/** Every page's decompressed content stream, in page order. */
function pageStreams(pdf: Buffer): string[] {
  const raw = pdf.toString('latin1');
  const objectAt = (id: string): string => {
    const start = raw.indexOf(`\n${id} 0 obj\n`);
    if (start < 0) throw new Error(`object ${id} not found`);
    return raw.slice(start);
  };
  const kids = /\/Type \/Pages[^>]*?\/Kids \[([^\]]*)\]/.exec(raw);
  if (!kids) throw new Error('no /Pages node');
  return [...kids[1].matchAll(/(\d+) 0 R/g)].map((m) => {
    const page = objectAt(m[1]);
    const contents = /\/Contents (\d+) 0 R/.exec(page);
    if (!contents) throw new Error(`page ${m[1]} has no /Contents`);
    const obj = objectAt(contents[1]);
    const from = obj.indexOf('stream\n') + 'stream\n'.length;
    const to = obj.indexOf('\nendstream', from);
    return zlib.inflateSync(Buffer.from(obj.slice(from, to), 'latin1')).toString('latin1');
  });
}

/** True when the content stream paints at least one glyph (`Tj` / `TJ`). */
const hasText = (stream: string): boolean => /\b(Tj|TJ)\b/.test(stream);

const PAGE_HEIGHT = 841.89; // A4

/** Baseline y of every text run, as a distance from the top of the page. pdfkit flips
 * the page CTM for paths but emits text matrices (`1 0 0 1 x y Tm`) in PDF's bottom-up
 * space, so text has to be converted before it can be compared against path geometry. */
const textYs = (stream: string): number[] => [...stream.matchAll(/^1 0 0 1 [\d.]+ ([\d.]+) Tm$/gm)].map((m) => PAGE_HEIGHT - Number(m[1]));

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Every stroked path on the page, as its bounding box. pdfkit writes paths as a run
 * of `m` / `l` / `c` operators (pure coordinate pairs), then the line width / stroke
 * colour, then `S`. */
function strokedPaths(stream: string): Rect[] {
  const block = /((?:^-?[\d.]+(?: -?[\d.]+)+ [mlc]$\n)+)(?:^(?!S$)[^\n]+$\n){0,6}S$/gm;
  return [...stream.matchAll(block)].map((m) => {
    const nums = [...m[1].matchAll(/-?[\d.]+/g)].map(Number);
    const xs = nums.filter((_, i) => i % 2 === 0);
    const ys = nums.filter((_, i) => i % 2 === 1);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  });
}

/** The card borders on a page: tall stroked boxes, as opposed to heading rules
 * (zero height) and tag pills (~16pt). */
const cardBorders = (stream: string): Rect[] => strokedPaths(stream).filter((r) => r.bottom - r.top > 40);

/** How many text runs are slanted. pdfkit renders `oblique` as a skew *transform*
 * (`1 0 <skew> 1 tx 0 cm`), not as part of the text matrix. */
const slantedRuns = (stream: string): number =>
  [...stream.matchAll(/^1 0 (-?[\d.]+) 1 -?[\d.]+ -?[\d.]+ cm$/gm)].filter((m) => Number(m[1]) !== 0).length;

/** Whether the page uses PDF text render mode 2 (fill + stroke) anywhere — the
 * standard way to thicken glyphs when a font has no real bold face. */
const usesFillStroke = (stream: string): boolean => /^2 Tr$/m.test(stream);

/** Count of flat horizontal stroked lines: the heading rules, plus one per underlined
 * run (pdfkit draws `underline` as a real line, not a font style). */
const horizontalRules = (stream: string): number => strokedPaths(stream).filter((r) => Math.abs(r.bottom - r.top) < 0.01).length;

// Collect the binary response body into a Buffer (supertest has no PDF parser).
const collectPdf = (path: string) =>
  agent
    .get(path)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(Buffer.from(c)));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    });

/** Render a recipe and return its page content streams. Asserts the response really is
 * a PDF, so a throttled or errored request fails loudly instead of leaving the geometry
 * assertions below with nothing to check. */
async function renderPages(path: string): Promise<string[]> {
  const res = await collectPdf(path);
  expect(res.status).toBe(200);
  return pageStreams(res.body as Buffer);
}

beforeEach(() => {
  fs.__setRecipeData({ recipes: [...seedRecipes, longRecipe, ingredientHeavyRecipe, ...emphasisRecipes] } as never);
});

describe('GET /api/recipe/:id/pdf', () => {
  it('returns a PDF for an existing recipe', async () => {
    const res = await collectPdf('/api/recipe/r1/pdf');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
    expect((res.body as Buffer).length).toBeGreaterThan(0);
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('returns 404 for an unknown recipe', async () => {
    const res = await agent.get('/api/recipe/does-not-exist/pdf');
    expect(res.status).toBe(404);
  });

  it('embeds Indie Flower (the app title font) so the PDF title matches the app', async () => {
    const res = await collectPdf('/api/recipe/r1/pdf');
    expect(res.status).toBe(200);
    // pdfkit subsets embedded fonts as `XXXXXX+IndieFlower`; the base name survives.
    expect((res.body as Buffer).toString('latin1')).toContain('IndieFlower');
  });
});

describe('GET /api/recipe/:id/pdf — multi-page layout', () => {
  it('keeps a short recipe on a single page', async () => {
    expect(await renderPages('/api/recipe/r1/pdf')).toHaveLength(1);
  });

  it('paints text on every page of a long recipe', async () => {
    const pages = await renderPages('/api/recipe/long/pdf');
    expect(pages.length).toBeGreaterThan(1);
    pages.forEach((stream, i) => {
      expect(hasText(stream), `page ${i + 1} paints no text`).toBe(true);
    });
  });

  it('lays a 13-step recipe out in as few pages as its content needs', async () => {
    // Guards against runaway pagination: the content is ~1.5 pages of steps.
    expect((await renderPages('/api/recipe/long/pdf')).length).toBeLessThanOrEqual(3);
  });

  it('keeps every step inside the page margins', async () => {
    const pages = await renderPages('/api/recipe/long/pdf');
    pages.forEach((stream, i) => {
      const ys = textYs(stream);
      expect(ys.length, `page ${i + 1}: found no text to check`).toBeGreaterThan(0);
      for (const y of ys) {
        expect(y, `page ${i + 1} paints text at y=${y}, outside the margins`).toBeGreaterThan(30);
        expect(y, `page ${i + 1} paints text at y=${y}, outside the margins`).toBeLessThan(812);
      }
    });
  });

  it('draws the instructions card border on the page that holds the steps', async () => {
    const [first] = await renderPages('/api/recipe/long/pdf');
    // The steps card hugs the left margin (40); the ingredients card sits at 380.
    expect(cardBorders(first).some((r) => Math.abs(r.left - 40) < 1)).toBe(true);
  });

  it('never strokes a card border around empty space', async () => {
    const pages = await renderPages('/api/recipe/long/pdf');
    let checked = 0;
    pages.forEach((stream, i) => {
      const ys = textYs(stream);
      for (const card of cardBorders(stream)) {
        checked += 1;
        const encloses = ys.some((y) => y > card.top && y < card.bottom);
        expect(encloses, `page ${i + 1}: card ${JSON.stringify(card)} encloses no text`).toBe(true);
      }
    });
    // Both columns, across every page they span — anything less means the card borders
    // weren't found and the assertion above never ran.
    expect(checked, 'no card borders were examined').toBeGreaterThanOrEqual(3);
  });

  it('never strokes a card border around empty space when the ingredients overflow', async () => {
    const pages = await renderPages('/api/recipe/many-ingredients/pdf');
    expect(pages.length).toBeGreaterThan(1);
    let checked = 0;
    pages.forEach((stream, i) => {
      expect(hasText(stream), `page ${i + 1} paints no text`).toBe(true);
      const ys = textYs(stream);
      for (const card of cardBorders(stream)) {
        checked += 1;
        const encloses = ys.some((y) => y > card.top && y < card.bottom);
        expect(encloses, `page ${i + 1}: card ${JSON.stringify(card)} encloses no text`).toBe(true);
      }
    });
    // One ingredients-card segment per page, plus the steps card on page 1.
    expect(checked, 'no card borders were examined').toBeGreaterThanOrEqual(pages.length);
  });

  it('keeps every card border inside the page margins', async () => {
    const pages = await renderPages('/api/recipe/long/pdf');
    let checked = 0;
    pages.forEach((stream, i) => {
      for (const card of cardBorders(stream)) {
        checked += 1;
        expect(card.top, `page ${i + 1} card starts above the top margin`).toBeGreaterThanOrEqual(39);
        expect(card.bottom, `page ${i + 1} card runs past the bottom margin`).toBeLessThanOrEqual(802);
      }
    });
    expect(checked, 'no card borders were examined').toBeGreaterThanOrEqual(3);
  });
});

describe('GET /api/recipe/:id/pdf — inline markdown emphasis', () => {
  const page = async (id: string): Promise<string> => (await renderPages(`/api/recipe/${id}/pdf`))[0];

  it('renders **bold** differently from *italic*', async () => {
    const [bold, italic] = await Promise.all([page('md-bold'), page('md-italic')]);
    expect(bold).not.toBe(italic);
  });

  it('does not slant **bold** text', async () => {
    const [plain, bold] = await Promise.all([page('md-plain'), page('md-bold')]);
    // The plain recipe is the baseline: no markdown, so nothing should be slanted.
    expect(slantedRuns(plain)).toBe(0);
    expect(slantedRuns(bold)).toBe(0);
  });

  it('still slants *italic* text', async () => {
    expect(slantedRuns(await page('md-italic'))).toBeGreaterThan(0);
  });

  it('thickens **bold** text with fill+stroke, and leaves plain and italic alone', async () => {
    const [plain, bold, italic] = await Promise.all([page('md-plain'), page('md-bold'), page('md-italic')]);
    expect(usesFillStroke(bold)).toBe(true);
    expect(usesFillStroke(plain)).toBe(false);
    expect(usesFillStroke(italic)).toBe(false);
  });

  it('renders ***bold+italic*** as both thickened and slanted', async () => {
    const both = await page('md-both');
    expect(usesFillStroke(both)).toBe(true);
    expect(slantedRuns(both)).toBeGreaterThan(0);
  });

  it('draws __underline__ as a real line, not a font style', async () => {
    const [plain, underline] = await Promise.all([page('md-plain'), page('md-underline')]);
    expect(horizontalRules(underline)).toBe(horizontalRules(plain) + 1);
    // Underline is its own thing: neither slanted nor thickened.
    expect(slantedRuns(underline)).toBe(0);
    expect(usesFillStroke(underline)).toBe(false);
  });

  it('keeps the underline when the run is also bold', async () => {
    const [plain, boldUnderline] = await Promise.all([page('md-plain'), page('md-bold-underline')]);
    // pdfkit only falls back to the fill colour for the underline when the run isn't
    // stroked; a bold run *is*, so the stroke colour has to be set to match.
    expect(horizontalRules(boldUnderline)).toBe(horizontalRules(plain) + 1);
    expect(usesFillStroke(boldUnderline)).toBe(true);
  });
});

describe('recipeTags', () => {
  it('maps recipe type + dietary codes to German labels, type first', () => {
    const tags = recipeTags({ recipeType: 'cooking', dietaryRestrictions: ['vegan', 'dairyfree', 'vegetarian'] } as never);
    expect(tags).toEqual([
      { label: 'Kochen', kind: 'type' },
      { label: 'Vegan', kind: 'dietary' },
      { label: 'Laktosefrei', kind: 'dietary' },
      { label: 'Vegetarisch', kind: 'dietary' },
    ]);
  });

  it('returns [] when no type or dietary restrictions are set', () => {
    expect(recipeTags({} as never)).toEqual([]);
  });

  it('passes unknown codes through unchanged', () => {
    expect(recipeTags({ recipeType: 'grill', dietaryRestrictions: ['nutfree'] } as never)).toEqual([
      { label: 'grill', kind: 'type' },
      { label: 'nutfree', kind: 'dietary' },
    ]);
  });
});
