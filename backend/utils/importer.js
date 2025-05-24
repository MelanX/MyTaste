const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extracts the JSON-LD Recipe object from chefkoch.de HTML
 */
function extractRecipeLd(html) {
    const $ = cheerio.load(html);
    let recipeData = null;

    $('script[type="application/ld+json"]').each((_, el) => {
        if (recipeData) return false;

        try {
            const payload = JSON.parse($(el).html());
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
 * Convert “1”, “0,5”, “1 1/2”, “1/2”, “1½”, “½” … → number
 */
function toNumber(str = '') {
    const unicode = { '⅕': 0.2, '¼': 0.25, '⅖': 0.4, '½': 0.5, '⅗': 0.6, '¾': 0.75, '⅘': 0.8 };

    str = str.trim().replace(',', '.');

    // 1 1/2   (mixed fraction with space)
    let m = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m) return parseInt(m[1], 10) + (parseInt(m[2], 10) / parseInt(m[3], 10));

    // 3/4
    m = str.match(/^(\d+)\/(\d+)$/);
    if (m) return parseInt(m[1], 10) / parseInt(m[2], 10);

    // 1½   /   1¾  …
    m = str.match(/^(\d+)([⅕¼⅖½⅗¾⅘])$/u);
    if (m) return parseInt(m[1], 10) + unicode[m[2]];

    // ½  …
    if (unicode[str] !== undefined) return unicode[str];

    // 1     0.5    0.5
    const n = parseFloat(str);
    return isNaN(n) ? undefined : n;
}

function formatIngredientName(raw = '') {
    // Text in brackets as specification
    const matchArray = raw.match(/^\s*(.+?)\s+\(+\s*([^)]+?)\s*\)+\s*$/);
    if (matchArray) {
        const base = matchArray[1].trim();
        const note = matchArray[2].trim();
        return base ? `${ base }, ${ note }` : note;
    }

    return raw.trim();
}

/**
 * Parse a single ingredient line into amount, unit, and name.
 *  – supports decimals with “,” or “.”
 *  – supports ASCII and Unicode fractions
 *  – keeps everything after the unit together in `name`
 */
function parseIngredientLine(text = '') {
    const ingredient = {
        name: '',
        amount: undefined,
        unit: undefined,
        note: undefined,      // not split out (current test-suite doesn’t expect it)
    };

    let line = text.trim();

    /* ---------- amount ---------- */
    // 1, 0,5, 1 1/2, 1/2, ½, 1½ …
    const amtRe = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+[.,]\d+|\d+[⅕¼⅖½⅗¾⅘]|\d+|[⅕¼⅖½⅗¾⅘])\s*/u;
    const amtMatch = line.match(amtRe);
    if (amtMatch) {
        ingredient.amount = toNumber(amtMatch[1]);
        line = line.slice(amtMatch[0].length);
    }

    /* ---------- unit ---------- */
    // letters only – stops before first space
    const unitMatch = line.match(/^([A-Za-zÄÖÜäöü]+)\s+/);
    if (unitMatch) {
        ingredient.unit = unitMatch[1];
        line = line.slice(unitMatch[0].length);
    }

    ingredient.name = formatIngredientName(line);
    return ingredient;
}

function parseSpiceFromIngredient(ingredient) {
    if (!ingredient) return;
    if (ingredient.name === '') return;
    if (ingredient.amount !== undefined) return;
    if (ingredient.unit !== undefined) return;
    if (ingredient.note !== undefined) return;

    const spices = [ 'Salz', 'Pfeffer', 'Muskat' ];
    const spiceMap = {
        'Salz und Pfeffer': [ 'Salz', 'Pfeffer' ],
        'Pfeffer und Salz': [ 'Salz', 'Pfeffer' ],
        'Pfeffer, Salz': [ 'Salz', 'Pfeffer' ],
        'Salz, Pfeffer': [ 'Salz', 'Pfeffer' ],
    }

    const isSpice = spices.includes(ingredient.name);
    if (isSpice) {
        return ingredient.name;
    }

    return spiceMap[ingredient.name];
}

/**
 * Turns raw ingredient strings into our Ingredient shape,
 * attempting to extract amounts and units.
 */
function parseIngredients(rawIngredients = []) {
    return rawIngredients.map(line => parseIngredientLine(line));
}

/**
 * Turns JSON-LD recipeInstructions into an array of strings
 */
function parseInstructions(rawInstructions = []) {
    if (typeof rawInstructions === 'string') {
        return rawInstructions
            .split('\n')
            .map(l => l.trim())
            .filter(Boolean);
    }
    if (Array.isArray(rawInstructions)) {
        return rawInstructions
            .map(step => {
                if (typeof step === 'string') return step.trim();
                if (step.text) return step.text.trim();
                if (
                    step['@type'] === 'HowToSection' &&
                    Array.isArray(step.itemListElement)
                ) {
                    return step.itemListElement
                        .map(si => (typeof si === 'string' ? si : si.text || ''))
                        .join(' ')
                        .trim();
                }
                return '';
            })
            .filter(Boolean);
    }
    return [];
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

    let ingredients = parseIngredients(ld.recipeIngredient);
    const instructions = parseInstructions(ld.recipeInstructions);
    const spices = [];
    for (let i = ingredients.length - 1; i >= 0; i--) {
        const ingredient = ingredients[i];
        const spice = parseSpiceFromIngredient(ingredient);
        if (spice) {
            if (Array.isArray(spice)) {
                spices.push(...spice);
            } else {
                spices.push(spice);
            }
            ingredients.splice(i, 1);
        }
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

async function importCustom(url, html) {
    // Fill with domains not using recipe-json-ld
    throw new Error('Unsupported Website');
}

module.exports = {
    extractRecipeLd,
    parseIngredientLine,
    parseIngredients,
    parseSpiceFromIngredient,
    parseInstructions,
    importGeneric,
};
