const {
    loadRenameRules,
    parseInstructions,
    parseSpicesAndIngredients
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

    const renameRules = await loadRenameRules();
    const { spices, ingredients } = parseSpicesAndIngredients(rawIngredients, renameRules);
    const instructions = parseInstructions(rawInstructions);

    return { title, url, image, ingredients, spices, instructions };
}

/**
 * Parser for https://lilya.momycooks.com
 */
async function parseLilyaMomycooks(url, html) {
    const $ = cheerio.load(html);

    // title
    const title = $('h1.entry-title').first().text().trim()
        || $('meta[property="og:title"]').attr('content') || '';

    // image
    const image = $('meta[property="og:image"]').attr('content')
        || $('article img').first().attr('src') || '';

    // ingredients
    const rawIngredients = [];
    const ingH2 = $('h2')
        .filter((_, el) =>
            /zutaten/i.test($(el).text().trim())
        )
        .first();
    const ingList = ingH2.nextAll('ul.wp-block-list').first();
    ingList.find('li').each((_, li) => {
        const text = $(li)
            .find('strong')
            .first()
            .clone()
            .find('i, .ai-viewports')
            .remove()
            .end()
            .text()
            .trim();
        if (text) rawIngredients.push(text);
    });

    // instructions
    const rawInstructions = [];
    const instH2 = $('h2')
        .filter((_, el) =>
            /zubereitung|anleitung/i.test($(el).text().trim())
        )
        .first();
    node = instH2.next();
    while (node.length && !node.is('h2')) {
        if (node.is('ol') || node.is('ul')) {
            node.find('li').each((_, li) => {
                const txt = $(li).text().trim();
                if (txt) rawInstructions.push(txt);
            });
        } else if (node.is('p')) {
            const txt = node.text().trim();
            if (txt) rawInstructions.push(txt);
        }
        node = node.next();
    }

    const renameRules = await loadRenameRules();
    const { spices, ingredients } = parseSpicesAndIngredients(rawIngredients, renameRules);
    const instructions = parseInstructions(rawInstructions);

    return { title, url, image, ingredients, spices, instructions };
}

module.exports = {
    parseLeckerAbnehmen,
    parseLilyaMomycooks,
};
