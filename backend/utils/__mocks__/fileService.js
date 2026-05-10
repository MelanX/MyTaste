let recipeData = { recipes: [] };
let importConfig = { rename_rules: [], spice_rules: { spices: [], spice_map: {} }, bring_rules: [] };
let collectionsData = { nextUp: [], collections: [] };

const m = {
    readData: jest.fn(async () => JSON.parse(JSON.stringify(recipeData))),
    writeData: jest.fn(async d => { recipeData = d; }),
    readImportConfig: jest.fn(async () => JSON.parse(JSON.stringify(importConfig))),
    writeImportConfig: jest.fn(async c => { importConfig = c; }),
    readCollections: jest.fn(async () => JSON.parse(JSON.stringify(collectionsData))),
    writeCollections: jest.fn(async d => { collectionsData = d; }),
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
    modifyCollections: jest.fn(async fn => {
        const data = await m.readCollections();
        const newData = await fn(data);
        if (newData != null) await m.writeCollections(newData);
        return newData;
    }),

    // helpers for your tests:
    __setRecipeData: d => { recipeData = d; },
    __setImportConfig: c => { importConfig = c; },
    __setCollectionsData: d => { collectionsData = d; },

    DATABASE_FILE: ':memory:'
};

module.exports = m;
