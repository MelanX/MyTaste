jest.mock('../utils/fileService');
jest.mock('../utils/importer');

const { recipeSchema } = require('../utils/schemes');
const fileService = require('../utils/fileService');
const request = require('supertest');
const { makeApp, authHeader } = require('./testUtils');

const app = makeApp();
const agent = request(app);

// Minimal valid recipe body used as a base for each test
const base = {
    title: 'Test recipe',
    ingredient_sections: [ { ingredients: [ { name: 'Zucker' } ] } ],
    instructions: [ 'Mix well' ],
};

beforeEach(() => {
    fileService.__setRecipeData({
        recipes: [
            {
                id: '1',
                title: 'Dummy',
                ingredient_sections: [ { ingredients: [ { name: 'Zucker' } ] } ],
                instructions: [ 'Mix well' ],
                status: { favorite: false, cookState: false },
            },
        ],
    });
});

// ---------------------------------------------------------------------------
// Joi schema unit tests
// ---------------------------------------------------------------------------

describe('recipeSchema – recipeType field', () => {
    const valid = (body) => recipeSchema.validate(body, { abortEarly: false });

    it('accepts a missing recipeType', () => {
        const { error } = valid(base);
        expect(error).toBeUndefined();
    });

    it('accepts null recipeType', () => {
        const { error } = valid({ ...base, recipeType: null });
        expect(error).toBeUndefined();
    });

    it('accepts empty string recipeType', () => {
        const { error } = valid({ ...base, recipeType: '' });
        expect(error).toBeUndefined();
    });

    it.each([ 'cooking', 'baking', 'snack', 'dessert' ])('accepts recipeType "%s"', (type) => {
        const { error } = valid({ ...base, recipeType: type });
        expect(error).toBeUndefined();
    });

    it('rejects an unknown recipeType value', () => {
        const { error } = valid({ ...base, recipeType: 'grilling' });
        expect(error).toBeDefined();
    });
});

describe('recipeSchema – dietaryRestrictions field', () => {
    const valid = (body) => recipeSchema.validate(body, { abortEarly: false });

    it('accepts a missing dietaryRestrictions', () => {
        const { error } = valid(base);
        expect(error).toBeUndefined();
    });

    it('accepts an empty array', () => {
        const { error } = valid({ ...base, dietaryRestrictions: [] });
        expect(error).toBeUndefined();
    });

    it.each([ 'vegan', 'vegetarian', 'glutenfree', 'dairyfree' ])(
        'accepts a single-item array with "%s"',
        (d) => {
            const { error } = valid({ ...base, dietaryRestrictions: [ d ] });
            expect(error).toBeUndefined();
        }
    );

    it('accepts multiple valid dietary values', () => {
        const { error } = valid({
            ...base,
            dietaryRestrictions: [ 'vegan', 'glutenfree' ],
        });
        expect(error).toBeUndefined();
    });

    it('accepts all four dietary values together', () => {
        const { error } = valid({
            ...base,
            dietaryRestrictions: [ 'vegan', 'vegetarian', 'glutenfree', 'dairyfree' ],
        });
        expect(error).toBeUndefined();
    });

    it('rejects an unknown dietary value', () => {
        const { error } = valid({ ...base, dietaryRestrictions: [ 'keto' ] });
        expect(error).toBeDefined();
    });

    it('rejects a mix of valid and invalid dietary values', () => {
        const { error } = valid({
            ...base,
            dietaryRestrictions: [ 'vegan', 'keto' ],
        });
        expect(error).toBeDefined();
    });

    it('rejects "other" as a stored value (filter-only concept)', () => {
        const { error } = valid({ ...base, dietaryRestrictions: [ 'other' ] });
        expect(error).toBeDefined();
    });

    it('rejects a string instead of an array', () => {
        const { error } = valid({ ...base, dietaryRestrictions: 'vegan' });
        expect(error).toBeDefined();
    });
});

// ---------------------------------------------------------------------------
// API integration tests – POST /api/recipes
// ---------------------------------------------------------------------------

describe('POST /api/recipes – recipeType and dietaryRestrictions', () => {
    it('creates a recipe with a valid recipeType', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({ ...base, recipeType: 'baking' });

        expect(res.status).toBe(201);
        expect(res.body.recipeType).toBe('baking');
    });

    it('creates a recipe without recipeType (field absent from response)', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send(base);

        expect(res.status).toBe(201);
        expect(res.body.recipeType == null || res.body.recipeType === '').toBe(true);
    });

    it('rejects an invalid recipeType', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({ ...base, recipeType: 'grilling' });

        expect(res.status).toBe(400);
    });

    it('creates a recipe with multiple dietary restrictions', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({ ...base, dietaryRestrictions: [ 'vegan', 'glutenfree' ] });

        expect(res.status).toBe(201);
        expect(res.body.dietaryRestrictions).toEqual([ 'vegan', 'glutenfree' ]);
    });

    it('rejects an invalid dietary restriction value', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({ ...base, dietaryRestrictions: [ 'keto' ] });

        expect(res.status).toBe(400);
    });

    it('rejects "other" as a stored dietary value', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({ ...base, dietaryRestrictions: [ 'other' ] });

        expect(res.status).toBe(400);
    });

    it('creates a recipe with both fields set', async () => {
        const res = await agent
            .post('/api/recipes')
            .set(authHeader())
            .send({
                ...base,
                recipeType: 'dessert',
                dietaryRestrictions: [ 'vegan', 'dairyfree' ],
            });

        expect(res.status).toBe(201);
        expect(res.body.recipeType).toBe('dessert');
        expect(res.body.dietaryRestrictions).toEqual([ 'vegan', 'dairyfree' ]);
    });
});

// ---------------------------------------------------------------------------
// API integration tests – PUT /api/recipe/:id
// ---------------------------------------------------------------------------

describe('PUT /api/recipe/:id – recipeType and dietaryRestrictions', () => {
    const validPut = {
        ...base,
        title: 'Updated',
    };

    it('updates recipeType on an existing recipe', async () => {
        const res = await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send({ ...validPut, recipeType: 'snack' });

        expect(res.status).toBe(200);
        expect(res.body.recipeType).toBe('snack');
    });

    it('updates dietaryRestrictions on an existing recipe', async () => {
        const res = await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send({ ...validPut, dietaryRestrictions: [ 'vegetarian' ] });

        expect(res.status).toBe(200);
        expect(res.body.dietaryRestrictions).toEqual([ 'vegetarian' ]);
    });

    it('rejects invalid recipeType on update', async () => {
        const res = await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send({ ...validPut, recipeType: 'barbecue' });

        expect(res.status).toBe(400);
    });

    it('rejects invalid dietaryRestrictions on update', async () => {
        const res = await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send({ ...validPut, dietaryRestrictions: [ 'paleo' ] });

        expect(res.status).toBe(400);
    });

    it('persists both fields and GET reflects them', async () => {
        await agent
            .put('/api/recipe/1')
            .set(authHeader())
            .send({
                ...validPut,
                recipeType: 'cooking',
                dietaryRestrictions: [ 'vegan' ],
            });

        const get = await agent.get('/api/recipe/1');
        expect(get.status).toBe(200);
        expect(get.body.recipeType).toBe('cooking');
        expect(get.body.dietaryRestrictions).toEqual([ 'vegan' ]);
    });
});
