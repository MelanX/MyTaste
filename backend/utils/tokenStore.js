const { DATABASE_FILE } = require("./fileService");
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

const db = new sqlite3.Database(DATABASE_FILE);

db.exec(`
    CREATE TABLE IF NOT EXISTS revoked_tokens
    (
        jti     TEXT PRIMARY KEY,
        expires INTEGER
    );
`);

const run = promisify(db.run.bind(db));
const get = promisify(db.get.bind(db));

async function revoke(jti, expires) {
    await run('INSERT OR REPLACE INTO revoked_tokens VALUES (?, ?)', [jti, expires]);
}

async function isRevoked(jti) {
    const row = await get('SELECT 1 FROM revoked_tokens WHERE jti = ?', [jti]);
    return !!row;
}

async function purgeExpired() {
    await run('DELETE FROM revoked_tokens WHERE expires < ?', [Date.now()]);
}

// Purge on startup and every 24 hours.
// .unref() prevents the interval from keeping the process alive during shutdown.
purgeExpired();
setInterval(purgeExpired, 24 * 60 * 60 * 1000).unref();

module.exports = { revoke, isRevoked };
