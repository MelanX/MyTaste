import axios from 'axios';
import * as cheerio from 'cheerio';
import { isIP } from 'node:net';
import { parseLeckerAbnehmen, parseLilyaMomycooks } from './customImporter.js';
import type { ImportedRecipe } from './customImporter.js';
import { parseInstructions, loadRenameRules, parseSpicesAndIngredients } from './parserHelpers.js';

interface RecipeLd {
  '@type'?: string | string[];
  name?: string;
  image?: string | string[] | { '@type'?: string; url?: string };
  recipeIngredient?: string[];
  recipeInstructions?: Parameters<typeof parseInstructions>[0];
  [key: string]: unknown;
}

/**
 * Extracts the JSON-LD Recipe object from HTML
 */
export function extractRecipeLd(html: string): RecipeLd | null {
  const api = cheerio.load(html);
  let recipeData: RecipeLd | null = null;

  api('script[type="application/ld+json"]').each((_, el) => {
    if (recipeData) return false;

    try {
      const payload = JSON.parse(api(el).html() ?? '');
      if (Array.isArray(payload['@graph'])) {
        const found = payload['@graph'].find((item: RecipeLd) => item['@type'] === 'Recipe');
        if (found) {
          recipeData = found;
          return false;
        }
      }

      if (Array.isArray(payload)) {
        const found = payload.find((item: RecipeLd) => item['@type'] === 'Recipe');
        if (found) {
          recipeData = found;
          return false;
        }
      }

      if (payload['@type'] === 'Recipe') {
        recipeData = payload;
        return false;
      }
    } catch {
      // ignore non-JSON or parse errors
    }
  });

  return recipeData;
}

function isPrivateIp(ip: string): boolean {
  const v4 = [/^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^169\.254\./, /^0\./];
  const v6 = [/^::1$/, /^fc/i, /^fd/i, /^fe[89ab]/i];
  if (isIP(ip) === 4) return v4.some((r) => r.test(ip));
  if (isIP(ip) === 6) return v6.some((r) => r.test(ip));
  return false;
}

/**
 * Tries importing using JSON-LD, falling back to custom parsing.
 */
export async function importGeneric(url: string): Promise<ImportedRecipe> {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are allowed.');
  }
  const h = parsed.hostname;
  if (h === 'localhost' || h.endsWith('.localhost') || (isIP(h) && isPrivateIp(h))) {
    throw new Error('Requests to private addresses are not allowed.');
  }

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'MelanX/MyTaste',
    },
    timeout: 10000,
  });

  const html: string = res.data;
  const ld = extractRecipeLd(html);
  if (!ld) {
    return importCustom(url, html);
  }

  const renameRules = await loadRenameRules();
  const instructions = parseInstructions(ld.recipeInstructions);
  const { spices, ingredients } = await parseSpicesAndIngredients(ld.recipeIngredient, renameRules);

  let image = ld.image;
  if (typeof image === 'object' && image !== null && !Array.isArray(image) && image['@type'] === 'ImageObject') {
    image = image.url;
  }

  return {
    title: ld.name || '',
    url,
    image: (Array.isArray(image) ? image[0] : (image as string)) || '',
    ingredient_sections: [{ title: null, ingredients }],
    spices,
    instructions,
  };
}

/**
 * Dispatcher for domains that *don't* expose usable Recipe-JSON-LD.
 */
async function importCustom(url: string, html: string): Promise<ImportedRecipe> {
  const hostname = new URL(url).hostname;

  if (isDomain(hostname, 'leckerabnehmen.com')) {
    return parseLeckerAbnehmen(url, html);
  }

  if (isDomain(hostname, 'lilya.momycooks.com')) {
    return parseLilyaMomycooks(url, html);
  }

  throw new Error('Unsupported Website');
}

/**
 * Checks if the given URL is from the given domain.
 */
function isDomain(hostname: string, domain: string): boolean {
  if (hostname === domain) return true;
  return hostname.endsWith(`.${domain}`);
}
