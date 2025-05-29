const {
    parseIngredientLine,
    parseSpiceFromIngredient,
    parseInstructions,
} = require('../utils/parserHelpers');

describe('parseIngredientLine()', () => {
    const cases = [
        [ '1 kg Zucker', { name: 'Zucker', amount: 1, unit: 'kg', note: undefined } ],
        [ '0,5 l Wasser', { name: 'Wasser', amount: 0.5, unit: 'l', note: undefined } ],
        [ '1 1/2 EL Butter', { name: 'Butter', amount: 1.5, unit: 'EL', note: undefined } ],
        [ '1½ TL Zucker', { name: 'Zucker', amount: 1.5, unit: 'TL', note: undefined } ],
        [ '100 g Schokolade, gehackt',
            { name: 'Schokolade, gehackt', amount: 100, unit: 'g', note: undefined } ],
        [ 'Salz', { name: 'Salz', amount: undefined, unit: undefined, note: undefined } ],
        [ '2 Karotten', { name: 'Karotten', amount: 2, unit: undefined, note: undefined } ],
    ];

    test.each(cases)('Parses "%s"', (input, expected) => {
        expect(parseIngredientLine(input)).toEqual(expected);
    });
});

describe('parseSpiceFromIngredient()', () => {
    const spiceRules = {
        spices: [ 'Salz', 'Pfeffer' ],
        spice_map: { 'Salz und Pfeffer': [ 'Salz', 'Pfeffer' ] },
    };
    const cases = [
        [ { name: 'Pfeffer' }, 'Pfeffer' ],
        [ { name: 'Salz und Pfeffer' }, [ 'Salz', 'Pfeffer' ] ],
    ];

    test.each(cases)('Given %p → %p', (ingredient, expected) => {
        expect(parseSpiceFromIngredient(ingredient, spiceRules)).toEqual(expected);
    });
});

describe('parseInstructions()', () => {
    it('Splits newline-separated string to array', () => {
        const out = parseInstructions('Schritt 1\nSchritt 2\n');
        expect(out).toEqual([ 'Schritt 1', 'Schritt 2' ]);
    });

    it('Flattens HowToStep/HowToSection arrays', () => {
        const raw = [
            { '@type': 'HowToStep', text: 'erstens' },
            {
                '@type': 'HowToSection',
                itemListElement: [ { text: 'zweitens' }, { text: 'drittens' } ],
            },
        ];
        expect(parseInstructions(raw)).toEqual([ 'erstens', 'zweitens drittens' ]);
    });
});
