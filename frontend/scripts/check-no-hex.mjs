#!/usr/bin/env node
/*
 * Guard: no raw hex color literals in component markup.
 *
 * After the Tailwind v4 port, all colors live in the @theme token block in
 * src/index.css. Component .tsx files must reference colors only via semantic
 * utilities (bg-accent, text-fg, …) or var(--color-…) arbitrary values — never
 * a raw #rrggbb. This fails CI if a stray hex sneaks back into markup.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'src', 'components');
const HEX = /#[0-9a-fA-F]{3,8}\b/;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

const offenders = [];
for (const file of walk(root)) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (HEX.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
}

if (offenders.length > 0) {
  console.error('Stray hex color literal(s) found in component markup (use @theme tokens instead):\n');
  console.error(offenders.join('\n'));
  process.exit(1);
}

console.log('check:no-hex — OK (no raw hex in component .tsx)');
