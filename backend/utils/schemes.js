const Joi = require('joi');

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
    ingredients: Joi.array().items(
        Joi.object({
            name: Joi.string().min(3).max(256).required(),
            amount: Joi.number().min(0).optional(),
            unit: Joi.string().min(1).max(16).optional(),
            note: Joi.string().optional(),
        })
    )
        .min(1)
        .max(256)
        .required()
        .messages({
            'any.required': 'Ingredients are required.',
        }),
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
        }),
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

module.exports = {
    recipeSchema,
    loginSchema,
    importSchema
};
