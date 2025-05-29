const {
    parseIngredientLine,
    parseSpiceFromIngredient,
    parseInstructions,
} = require('../utils/parserHelpers');

describe('parseIngredientLine()', () => {
    it('Parses "1 kg Zucker"', () => {
        const res = parseIngredientLine('1 kg Zucker');
        expect(res).toEqual({ name: 'Zucker', amount: 1, unit: 'kg', note: undefined });
    });

    it('Handles decimal comma', () => {
        const res = parseIngredientLine('0,5 l Wasser');
        expect(res).toEqual({ name: 'Wasser', amount: 0.5, unit: 'l', note: undefined });
    });

    it('Handles "1 1/2 EL Butter"', () => {
        const res = parseIngredientLine('1 1/2 EL Butter');
        expect(res).toEqual({ name: 'Butter', amount: 1.5, unit: 'EL', note: undefined });
    });

    it('Understands the ½ Unicode fraction char', () => {
        const res = parseIngredientLine('1½ TL Zucker');
        expect(res).toEqual({ name: 'Zucker', amount: 1.5, unit: 'TL', note: undefined });
    });

    it('Splits name and note (e.g. "gehackt")', () => {
        const res = parseIngredientLine('100 g Schokolade, gehackt');
        expect(res).toEqual({ name: 'Schokolade, gehackt', amount: 100, unit: 'g', note: undefined });
    });

    it('Falls back correctly when no amount', () => {
        const res = parseIngredientLine('Salz');
        expect(res).toEqual({ name: 'Salz', amount: undefined, unit: undefined, note: undefined });
    });

    it('Falls back correctly when no unit', () => {
        const res = parseIngredientLine('2 Karotten');
        expect(res).toEqual({ name: 'Karotten', amount: 2, unit: undefined, note: undefined });
    });
});

describe('parseSpiceFromIngredient()', () => {
    spiceRules = {
        spices: [ 'Salz', 'Pfeffer' ],
        spice_map: {
            'Salz und Pfeffer': [ 'Salz', 'Pfeffer' ],
        }
    }
    
    it('Detects single spices', () => {
        expect(parseSpiceFromIngredient({ name: 'Pfeffer' }, spiceRules)).toBe('Pfeffer');
    });

    it('Maps combined spice lines', () => {
        const combo = { name: 'Salz und Pfeffer' };
        expect(parseSpiceFromIngredient(combo, spiceRules)).toEqual([ 'Salz', 'Pfeffer' ]);
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
