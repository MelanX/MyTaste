const Joi = require('joi');
const { isIP } = require('net');

function isPrivateIp(ip) {
    const v4 = [
        /^127\./,
        /^10\./,
        /^172\.(1[6-9]|2\d|3[01])\./,
        /^192\.168\./,
        /^169\.254\./,
        /^0\./,
    ];
    const v6 = [ /^::1$/, /^fc/i, /^fd/i, /^fe[89ab]/i ];
    if (isIP(ip) === 4) return v4.some(r => r.test(ip));
    if (isIP(ip) === 6) return v6.some(r => r.test(ip));
    return false;
}

function rejectPrivateUrl(url) {
    let parsed;
    try { parsed = new URL(url); } catch { return false; }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
    const h = parsed.hostname;
    if (h === 'localhost' || h.endsWith('.localhost')) return true;
    if (isIP(h) && isPrivateIp(h)) return true;
    return false;
}

const recipeIngredients = Joi.array().items(
    Joi.object({
        name: Joi.string().max(256).required(),
        amount: Joi.number().min(0).optional(),
        unit: Joi.string().min(1).max(16).optional().allow(null, ''),
        note: Joi.string().optional().allow(null, '')
    })
).max(256);

const sectionBase = Joi.object({
    title: Joi.string().min(1).max(256).optional().allow(null, ''),
    ingredients: recipeIngredients.required()
});

const ingredientSectionsSchema = Joi.array()
    .items(sectionBase)
    .min(1)
    .custom((sections, helpers) => {
        if (sections.length > 1) {
            const missing = sections.findIndex(s => !s.title || !String(s.title).trim());
            if (missing !== -1) {
                return helpers.error('any.custom', { message: `Section title missing at index ${ missing }` });
            }
        }
        return sections;
    }, 'section title required when multiple sections');

const recipeSchema = Joi.object({
    id: Joi.string(),
    title: Joi.string()
        .min(3)
        .max(256)
        .required()
        .messages({
            'string.min': 'Title must be at least 3 characters long.',
            'string.max': 'Title must be at most 256 characters long.',
            'any.required': 'Title is required.',
        }),
    url: Joi.string()
        .uri()
        .messages({
            'string.uri': 'URL must be a valid URL.',
            'any.required': 'URL is required.',
        })
        .allow(null, ''),
    image: Joi.alternatives()
        .try(
            Joi.string().uri({ scheme: [ 'http', 'https' ] }),
            Joi.string().pattern(/^\/uploads\/[\w.-]+\.webp$/i)
        )
        .allow(null, ''),
    ingredient_sections: ingredientSectionsSchema.required(),
    recipeType: Joi.string().valid('cooking', 'baking', 'snack', 'dessert').optional().allow(null, ''),
    dietaryRestrictions: Joi.array().items(
        Joi.string().valid('vegan', 'vegetarian', 'glutenfree', 'dairyfree')
    ).optional(),
    spices: Joi.array().items(Joi.string()),
    instructions: Joi.array()
        .items(
            Joi.string()
                .min(3)
                .max(8192)
                .required()
                .messages({
                    'string.min': 'Instruction must be at least 3 characters long.',
                    'string.max': 'Instruction must be at most 8192 characters long.',
                    'any.required': 'Instruction text is required.',
                }),
        )
        .min(1)
        .max(64)
        .required()
        .messages({
            'array.min': 'At least one instruction is required.',
            'array.max': 'You can provide at most 64 instructions.',
            'any.required': 'Instructions are required.',
        })
})
    .or('ingredients', 'ingredient_sections')
    .messages({
        'object.missing': 'Either ingredients or ingredient_sections is required.',
    });

const loginSchema = Joi.object({
    username: Joi.string().min(1).max(64).required(),
    password: Joi.string().min(1).max(1024).required(),
});

const importSchema = Joi.object({
    url: Joi.string().trim().uri().custom((value, helpers) => {
        if (rejectPrivateUrl(value)) return helpers.error('any.invalid');
        return value;
    })
        .required()
        .messages({
            'string.uri': 'URL must be a valid URL.',
            'any.invalid': 'This URL is not allowed.',
            'any.required': 'URL is required.',
        })
});

const configSchema = Joi.object({
    rename_rules: Joi.array().items(
        Joi.object({
            from: Joi.array().items(Joi.string()).min(1).required(),
            to: Joi.string().min(1).required(),
        })
    ),
    spice_rules: Joi.object({
        spices: Joi.array().items(Joi.string().trim().min(1)).unique().required(),
        spice_map: Joi.object().pattern(
            Joi.string().trim().min(1),
            Joi.array().items(Joi.string().trim().min(1)).unique()
        )
    }).custom((value, helpers) => {
        const allowed = new Set(value.spices);
        const invalid = [];

        for (const [ alias, spices ] of Object.entries(value.spice_map ?? {})) {
            const missing = spices.filter(s => !allowed.has(s));
            if (missing.length > 0) {
                invalid.push({ [alias]: missing });
            }
        }

        return invalid.length ? helpers.error('any.invalid', { invalid }) : value;
    }, 'spice_map items must exist in spices'),
    bring_rules: Joi.array().items(
        Joi.object({
            from: Joi.array().items(Joi.string()).min(1).required(),
            to: Joi.string().min(1).required(),
        })
    ),
}).unknown(false).min(1); // at least one key when patching

const recipeStatusSchema = Joi.object({
    status: Joi.object({
        favorite: Joi.boolean(),
        cookState: Joi.boolean(),
    })
        .min(1).max(2).required().unknown(false),
});

module.exports = {
    recipeSchema,
    loginSchema,
    importSchema,
    configSchema,
    recipeStatusSchema
};
