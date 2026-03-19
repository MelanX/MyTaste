const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const RECIPE_FILE = path.join(DATA_DIR, 'recipes.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DATABASE_FILE = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(DATA_DIR, 'tokens.db');
const RECIPE_FILE_VERSION = '2';

// Queues serialize concurrent read-modify-write cycles so they never interleave.
let recipeQueue = Promise.resolve();
let configQueue = Promise.resolve();

async function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(RECIPE_FILE)) {
        fs.writeFileSync(RECIPE_FILE, JSON.stringify({ version: `${ RECIPE_FILE_VERSION }`, recipes: [] }, null, 2));
    }
}

async function ensureImportConfigFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({
            rename_rules: [],
            spice_rules: {
                spices: [],
                spice_map: {}
            }
        }, null, 2));
    }
}

async function readData() {
    await ensureFile();
    const raw = fs.readFileSync(RECIPE_FILE, 'utf8');

    return await checkAndUpgradeRecipesFileVersion(JSON.parse(raw));
}

async function writeData(data) {
    await ensureFile();
    fs.writeFileSync(RECIPE_FILE, JSON.stringify(data, null, 2));
}

async function readImportConfig() {
    await ensureImportConfigFile();
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(raw);
}

async function writeImportConfig(data) {
    await ensureImportConfigFile();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

async function checkAndUpgradeRecipesFileVersion(data) {
    if (data.version === RECIPE_FILE_VERSION) {
        return data;
    }

    console.log(`Wrong file version: ${ data.version }`);
    await backup(RECIPE_FILE);
    if (data.version === undefined) {
        console.log('This file is from a time before the versioning, upgrade to version 1 by just adding 1.');
        data.version = '1';
        await writeData(data);
    }

    if (data.version === '1') {
        console.log('Upgrading to version 2');
        data.version = "2";
        data.recipes.forEach(recipe => {
            recipe.ingredient_sections = [ { ingredients: [ ...recipe.ingredients ] } ]
            delete recipe.ingredients;
        })
        await writeData(data);
        console.log('Done');
    }

    return data;
}

async function backup(path) {
    const dest = path + '_bak_' + new Date().toISOString().replace(/[:.T]/g, '-').replace('Z', '');
    fs.copyFileSync(path, dest);
    console.log(`Backed up ${ path } to ${ dest }`);
}

/**
 * Atomically read-modify-write recipes.json.
 * fn receives the current data object and must return the (modified) data to
 * persist, or null/undefined to abort the write without an error.
 * Concurrent calls are serialized — no two fn bodies ever overlap.
 */
async function modifyData(fn) {
    return new Promise((resolve, reject) => {
        recipeQueue = recipeQueue.then(async () => {
            try {
                const data = await readData();
                const newData = await fn(data);
                if (newData != null) await writeData(newData);
                resolve(newData);
            } catch (err) {
                reject(err);
            }
        });
    });
}

/**
 * Atomically read-modify-write config.json.
 * fn receives the current config and must return the new config to persist,
 * or null/undefined to abort the write without an error.
 * Concurrent calls are serialized.
 */
async function modifyImportConfig(fn) {
    return new Promise((resolve, reject) => {
        configQueue = configQueue.then(async () => {
            try {
                const data = await readImportConfig();
                const newData = await fn(data);
                if (newData != null) await writeImportConfig(newData);
                resolve(newData);
            } catch (err) {
                reject(err);
            }
        });
    });
}

module.exports = {
    readData,
    writeData,
    readImportConfig,
    writeImportConfig,
    modifyData,
    modifyImportConfig,
    DATABASE_FILE
};
