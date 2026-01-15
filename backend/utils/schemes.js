const Joi = require('joi');

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
    ingredients: recipeIngredients.optional(),
    ingredient_sections: ingredientSectionsSchema.optional(),
    spices: Joi.array().items(Joi.string()),
    instructions: Joi.array()
        .items(
            Joi.string()
                .min(3)
                .max(1024)
                .required()
                .messages({
                    'string.min': 'Instruction must be at least 3 characters long.',
                    'string.max': 'Instruction must be at most 1024 characters long.',
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

const unallowedDomains = [];
const importSchema = Joi.object({
    url: Joi.string().trim().uri().custom((value, helpers) => {
        const { hostname } = new URL(value);

        const isAllowed = !unallowedDomains.some((base) =>
            hostname === base || hostname.endsWith(`.${ base }`)
        );

        return isAllowed
            ? value
            : helpers.error('any.invalid');   // triggers custom message below
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
    }, 'spice_map items must exist in spices')
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
