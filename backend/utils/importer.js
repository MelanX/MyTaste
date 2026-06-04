const axios = require('axios');
const cheerio = require('cheerio');
const { isIP } = require('net');
const { parseLeckerAbnehmen, parseLilyaMomycooks } = require('./customImporter');
const {
  parseIngredients,
  parseInstructions,
  parseSpiceFromIngredient,
  loadRenameRules,
  parseSpicesAndIngredients,
} = require('./parserHelpers');

/**
 * Extracts the JSON-LD Recipe object from HTML
 */
function extractRecipeLd(html) {
  const api = cheerio.load(html);
  let recipeData = null;

  api('script[type="application/ld+json"]').each((_, el) => {
    if (recipeData) return false;

    try {
      const payload = JSON.parse(api(el).html());
      if (Array.isArray(payload['@graph'])) {
        const found = payload['@graph'].find((item) => item['@type'] === 'Recipe');
        if (found) {
          recipeData = found;
          return false;
        }
      }

      if (Array.isArray(payload)) {
        const found = payload.find((item) => item['@type'] === 'Recipe');
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

function isPrivateIp(ip) {
  const v4 = [/^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^169\.254\./, /^0\./];
  const v6 = [/^::1$/, /^fc/i, /^fd/i, /^fe[89ab]/i];
  if (isIP(ip) === 4) return v4.some((r) => r.test(ip));
  if (isIP(ip) === 6) return v6.some((r) => r.test(ip));
  return false;
}

/**
 * Tries importing using JSON-LD, falling back to custom parsing.
 */
async function importGeneric(url) {
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

  const html = res.data;
  const ld = extractRecipeLd(html);
  if (!ld) {
    return importCustom(url, html);
  }

  const renameRules = await loadRenameRules();
  const instructions = parseInstructions(ld.recipeInstructions);
  const { spices, ingredients } = await parseSpicesAndIngredients(ld.recipeIngredient, renameRules);

  if (typeof ld.image === 'object' && ld.image['@type'] === 'ImageObject') {
    ld.image = ld.image.url;
  }

  return {
    title: ld.name || '',
    url,
    image: Array.isArray(ld.image) ? ld.image[0] : ld.image || '',
    ingredient_sections: [{ title: null, ingredients }],
    spices,
    instructions,
  };
}

/**
 * Dispatcher for domains that *don’t* expose usable Recipe-JSON-LD.
 */
async function importCustom(url, html) {
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
function isDomain(hostname, domain) {
  if (hostname === domain) return true;
  return hostname.endsWith(`.${domain}`);
}

module.exports = {
  extractRecipeLd,
  importGeneric,
};
