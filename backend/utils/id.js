const { randomBytes } = require('crypto');

/** Nano-style, URL-friendly ID
 *  @see https://github.com/ai/nanoid
 *  @param {number} length – characters to return (default 21)
 *  @returns {string}      – e.g. "pX75pxW-LF"
 */
function nanoid(length = 10) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

    const bytes = randomBytes(length);
    let id = '';

    for (let i = 0; i < length; i++) {
        // byte & 63  → 0-63 → index inside alphabet
        id += alphabet[bytes[i] & 63];
    }
    return id;
}

module.exports = nanoid;
