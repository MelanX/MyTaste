// backend/utils/importer.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extracts the JSON-LD Recipe object from chefkoch.de HTML
 */
function extractRecipeLd(html) {
    const $ = cheerio.load(html);
    let recipeData = null;

    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const payload = JSON.parse($(el).html());
            if (Array.isArray(payload)) {
                const found = payload.find(item => item['@type'] === 'Recipe');
                if (found) recipeData = found;
            } else if (payload['@type'] === 'Recipe') {
                recipeData = payload;
            }
        } catch {
            // ignore non-JSON or parse errors
        }
    });

    return recipeData;
}

/**
 * Parse a single ingredient line into amount, unit, and name.
 */
function parseIngredientLine(text = '') {
    const ingredient = {
        name: '',
        amount: undefined,
        unit: undefined,
        note: undefined,
    };

    // Regex: capture leading number/fraction, optional unit, and the rest as name
    const regex = /^\s*([\d.,\/]+)\s*([^\d\s]+)?\s+(.*)$/;
    const match = text.match(regex);

    if (match) {
        let [, amtStr, unitStr, rest] = match;

        // Convert fraction or decimal string to number
        let num;
        if (amtStr.includes('/')) {
            // handle "1 1/2" or "1/2"
            const parts = amtStr.split(' ');
            if (parts.length === 2) {
                const whole = parseInt(parts[0], 10);
                const [nume, deno] = parts[1].split('/').map(Number);
                num = whole + (nume / deno);
            } else {
                const [nume, deno] = amtStr.split('/').map(Number);
                num = nume / deno;
            }
        } else {
            num = parseFloat(amtStr.replace(',', '.'));
        }

        if (!isNaN(num)) {
            ingredient.amount = num;
        }

        if (unitStr) {
            ingredient.unit = unitStr.trim();
        }

        ingredient.name = rest.trim();
    } else {
        // Fallback: no explicit amount/unit
        ingredient.name = text.trim();
    }

    return ingredient;
}

function parseSpiceFromIngredient(ingredient) {
    if (!ingredient) return;
    if (ingredient.name === '') return;
    if (ingredient.amount !== undefined) return;
    if (ingredient.unit !== undefined) return;
    if (ingredient.note !== undefined) return;

    const spices = ['Salz', 'Pfeffer', 'Muskat'];
    const spiceMap = {
        'Salz und Pfeffer': ['Salz', 'Pfeffer'],
        'Pfeffer und Salz': ['Salz', 'Pfeffer'],
        'Pfeffer, Salz': ['Salz', 'Pfeffer'],
        'Salz, Pfeffer': ['Salz', 'Pfeffer'],
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
 * Imports a chefkoch.de recipe by URL, scraping JSON-LD
 */
async function importChefkoch(url) {
    const res = await axios.get(url, {
        headers: {
            'User-Agent': 'MelanX/MyTaste',
        },
    });

    const html = res.data;
    const ld = extractRecipeLd(html);
    if (!ld) {
        throw new Error('Kein Recipe-JSON-LD auf der Seite gefunden');
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

module.exports = {
    extractRecipeLd,
    parseIngredientLine,
    parseIngredients,
    parseInstructions,
    importChefkoch,
};
