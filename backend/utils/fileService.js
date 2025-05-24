const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const RECIPE_FILE = path.join(DATA_DIR, 'recipes.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

async function ensureFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(RECIPE_FILE)) {
        fs.writeFileSync(RECIPE_FILE, JSON.stringify({ recipes: [] }, null, 2));
    }
}

async function ensureImportConfigFile() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
    if (!fs.existsSync(CONFIG_FILE)) {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ rename_rules: [] }, null, 2));
    }
}

async function readData() {
    await ensureFile();
    const raw = fs.readFileSync(RECIPE_FILE, 'utf8');
    return JSON.parse(raw);
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

module.exports = { readData, writeData, readImportConfig, writeImportConfig };
