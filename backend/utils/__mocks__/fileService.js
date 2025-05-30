let recipeData = { recipes: [] };
let importConfig = { rename_rules: [], spice_rules: { spices: [], spice_map: {} } };

module.exports = {
    readData: jest.fn(async () => JSON.parse(JSON.stringify(recipeData))),
    writeData: jest.fn(async d => { recipeData = d; }),
    readImportConfig: jest.fn(async () => JSON.parse(JSON.stringify(importConfig))),
    writeImportConfig: jest.fn(async c => { importConfig = c; }),

    // helpers for your tests:
    __setRecipeData: d => { recipeData = d; },
    __setImportConfig: c => { importConfig = c; },

    DATABASE_FILE: ':memory:'
};
