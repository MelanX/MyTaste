import { randomBytes } from 'node:crypto';

/** Nano-style, URL-friendly ID
 *  @see https://github.com/ai/nanoid
 *  @param length – characters to return (default 10)
 *  @returns e.g. "pX75pxW-LF"
 */
export function nanoid(length = 10): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';

  const bytes = randomBytes(length);
  let id = '';

  for (let i = 0; i < length; i++) {
    // byte & 63  → 0-63 → index inside alphabet
    id += alphabet[bytes[i] & 63];
  }
  return id;
}

export default nanoid;
