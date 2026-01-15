const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const RECIPE_FILE = path.join(DATA_DIR, 'recipes.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const DATABASE_FILE = process.env.NODE_ENV === 'test'
    ? ':memory:'
    : path.join(DATA_DIR, 'tokens.db');
const RECIPE_FILE_VERSION = '2';

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

module.exports = { readData, writeData, readImportConfig, writeImportConfig, DATABASE_FILE };
