let recipeData = { recipes: [] };
let importConfig = { rename_rules: [], spice_rules: { spices: [], spice_map: {} } };

const m = {
    readData: jest.fn(async () => JSON.parse(JSON.stringify(recipeData))),
    writeData: jest.fn(async d => { recipeData = d; }),
    readImportConfig: jest.fn(async () => JSON.parse(JSON.stringify(importConfig))),
    writeImportConfig: jest.fn(async c => { importConfig = c; }),
    modifyData: jest.fn(async fn => {
        const data = await m.readData();
        const newData = await fn(data);
        if (newData != null) await m.writeData(newData);
        return newData;
    }),
    modifyImportConfig: jest.fn(async fn => {
        const data = await m.readImportConfig();
        const newData = await fn(data);
        if (newData != null) await m.writeImportConfig(newData);
        return newData;
    }),

    // helpers for your tests:
    __setRecipeData: d => { recipeData = d; },
    __setImportConfig: c => { importConfig = c; },

    DATABASE_FILE: ':memory:'
};

module.exports = m;
