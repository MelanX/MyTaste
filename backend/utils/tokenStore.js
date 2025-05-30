const { DATABASE_FILE } = require("./fileService");
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(DATABASE_FILE);

db.exec(`
    CREATE TABLE IF NOT EXISTS revoked_tokens
    (
        jti     TEXT PRIMARY KEY,
        expires INTEGER
    );
`);

function revoke(jti, expires) {
    return new Promise(res => {
        db.run(
            'INSERT OR REPLACE INTO revoked_tokens VALUES (?, ?)', [ jti, expires ], res
        )
    });
}

function isRevoked(jti) {
    return new Promise(res => {
        db.get('SELECT 1 FROM revoked_tokens WHERE jti = ?', [ jti ], (err, row) => res(!!row))
    });
}

module.exports = { revoke, isRevoked };
