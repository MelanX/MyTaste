const {
    loadRenameRules,
    parseIngredients,
    parseSpiceFromIngredient,
    parseInstructions,
    parseSpicesFromIngredients, parseSpicesAndIngredients
} = require("./parserHelpers");
const cheerio = require('cheerio');

/**
 * Parser for https://leckerabnehmen.com/
 */
async function parseLeckerAbnehmen(url, html) {
    const $ = cheerio.load(html);

    // title
    const title =
        $('h1').first().text().trim() ||
        $('meta[property="og:title"]').attr('content') ||
        '';

    // image
    const image =
        $('meta[property="og:image"]').attr('content') ||
        $('figure img').first().attr('src') ||
        '';

    // ingredients
    const rawIngredients = [];
    const ingredientsTitle = $('h2').filter((_, element) => $(element).text().trim().toLowerCase().startsWith('zutaten')).first();
    let ingredientsNode = ingredientsTitle.next();
    while (ingredientsNode.length && !ingredientsNode.is('h2')) {
        if (ingredientsNode.is('p')) {
            const text = ingredientsNode.clone()
                .find('i, .ai-viewports')
                .remove()
                .end()
                .text()
                .replace(/\s+/g, ' ')
                .trim();
            if (text) {
                rawIngredients.push(text);
            }
        }
        ingredientsNode = ingredientsNode.next();
    }

    const renameRules = await loadRenameRules();

    // split out spices so they don’t clutter the ingredient list
    const { spices, ingredients } = parseSpicesAndIngredients(rawIngredients, renameRules);

    // instructions
    const rawInstructions = [];
    const instructionsTitle = $('h2').filter((_, element) => $(element).text().trim().toLowerCase().startsWith('zubereitung')).first();
    let instructionNode = instructionsTitle.next();
    while (instructionNode.length && !instructionNode.is('h2')) {
        if (instructionNode.is('p')) {
            const text = instructionNode.clone()
                .find('.ai-viewports')
                .remove()
                .end()
                .text()
                .replace(/\s+/g, ' ')
                .replace(/(\d?\d.\) )/, '')
                .trim();
            if (text) {
                rawInstructions.push(text);
            }
        }
        instructionNode = instructionNode.next();
    }

    const instructions = parseInstructions(rawInstructions);

    return { title, url, image, ingredients, spices, instructions };
}

module.exports = {
    parseLeckerAbnehmen,
};
