const axios = require('axios');
const cheerio = require('cheerio');
const { parseLeckerAbnehmen, parseLilyaMomycooks } = require("./customImporter");
const {
    parseIngredients,
    parseInstructions,
    parseSpiceFromIngredient,
    loadRenameRules,
    parseSpicesAndIngredients
} = require("./parserHelpers");

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
                const found = payload['@graph'].find(item => item['@type'] === 'Recipe');
                if (found) {
                    recipeData = found;
                    return false;
                }
            }

            if (Array.isArray(payload)) {
                const found = payload.find(item => item['@type'] === 'Recipe');
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

/**
 * Tries importing using JSON-LD, falling back to custom parsing.
 */
async function importGeneric(url) {
    const res = await axios.get(url, {
        headers: {
            'User-Agent': 'MelanX/MyTaste',
        },
    });

    const html = res.data;
    const ld = extractRecipeLd(html);
    if (!ld) {
        return importCustom(url, html);
    }

    const renameRules = await loadRenameRules();
    const instructions = parseInstructions(ld.recipeInstructions);
    const { spices, ingredients } = parseSpicesAndIngredients(ld.recipeIngredient, renameRules);

    if (typeof ld.image === 'object' && ld.image['@type'] === 'ImageObject') {
        ld.image = ld.image.url;
    }

    return {
        title: ld.name || '',
        url,
        image: Array.isArray(ld.image) ? ld.image[0] : ld.image || '',
        ingredients,
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
    return hostname.endsWith(`.${ domain }`);
}

module.exports = {
    extractRecipeLd,
    importGeneric,
};
