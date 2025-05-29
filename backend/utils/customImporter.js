const cheerio = require('cheerio');
const {
    loadRenameRules,
    parseSpicesAndIngredients,
    parseInstructions,
} = require('./parserHelpers');

/** --- Generic extract/clean helpers ------------------------------------ */

/** Extracts the title, falling back from selector1 → selector2  */
function extractTitle(api, primary = 'h1', fallbackMeta = 'meta[property="og:title"]') {
    return api(primary).first().text().trim()
        || api(fallbackMeta).attr('content')
        || '';
}

/** Extracts the image URL from og:image or first <img> in article/figure */
function extractImage($, meta = 'meta[property="og:image"]') {
    return $(meta).attr('content')
        || $('article img, figure img').first().attr('src')
        || '';
}

/** Cleans an element’s text: removes unwanted nodes, collapses whitespace */
function cleanText(el, removeSelectors = [ 'i', '.ai-viewports', 'span', 'br' ]) {
    return el
        .clone()
        .find(removeSelectors.join(','))
        .remove()
        .end()
        .text()
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Finds the first <h2> matching headingRegex, then collects all
 * following <p> until the next <h2>.
 */
function extractParagraphSection($, headingRegex) {
    const out = [];
    const h2 = $('h2').filter((_, el) => headingRegex.test($(el).text())).first();
    let node = h2.next();
    while (node.length && !node.is('h2')) {
        if (node.is('p')) {
            const txt = cleanText(node);
            if (txt) out.push(txt);
        }
        node = node.next();
    }
    return out;
}

/**
 * Finds the first <h2> matching headingRegex, then grabs the
 * very next <ul> matching listSelector, and extracts li → cleanText.
 */
function extractListSection($, headingRegex, listSelector = 'ul', elementInList = undefined) {
    const out = [];
    const h2 = $('h2').filter((_, el) => headingRegex.test($(el).text())).first();
    const list = h2.nextAll(listSelector).first();
    list.find('li').each((_, li) => {
        const txt = elementInList
            ? $(li).find(elementInList).text().trim()
            : cleanText($(li));
        if (txt) out.push(txt);
    });
    return out;
}

/** --- Site-specific parsers using the generic helpers -------------- */

/** Parser for https://leckerabnehmen.com/… */
async function parseLeckerAbnehmen(url, html) {
    const api = cheerio.load(html);

    const title = extractTitle(api);
    const image = extractImage(api);

    const rawIngredients = extractParagraphSection(api, /^zutaten/i);
    const rawInstructions = extractParagraphSection(api, /^zubereitung/i);

    const renameRules = await loadRenameRules();
    const { spices, ingredients } = await parseSpicesAndIngredients(rawIngredients, renameRules);
    const instructions = parseInstructions(rawInstructions);

    return { title, url, image, ingredients, spices, instructions };
}

/** Parser for https://lilya.momycooks.com/… */
async function parseLilyaMomycooks(url, html) {
    const api = cheerio.load(html);

    const title = extractTitle(api, 'h1.entry-title');
    const image = extractImage(api);

    // ingredients live in a <ul class="wp-block-list">
    const rawIngredients = extractListSection(api, /^zutaten/i, 'ul.wp-block-list', 'strong');

    // instructions might be an <ol>, <ul> or paragraphs
    // try lists first; if empty, fall back to paragraphs
    let rawInstructions = extractListSection(api, /zubereitung|anleitung/i, 'ol');

    if (rawInstructions.length === 0) {
        rawInstructions = extractListSection(api, /zubereitung|anleitung/i, 'ul');
    }

    if (rawInstructions.length === 0) {
        rawInstructions = extractParagraphSection(api, /zubereitung|anleitung/i);
    }

    const renameRules = await loadRenameRules();
    const { spices, ingredients } = await parseSpicesAndIngredients(rawIngredients, renameRules);
    const instructions = parseInstructions(rawInstructions);

    return { title, url, image, ingredients, spices, instructions };
}

module.exports = {
    parseLeckerAbnehmen,
    parseLilyaMomycooks,
};
