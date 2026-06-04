import { defineConfig } from 'vitest/config';
import os from 'node:os';
import path from 'node:path';

const testDataDir = path.join(os.tmpdir(), 'mytaste-test-data');

export default defineConfig({
  test: {
    globals: true,
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      DATA_DIR: testDataDir,
      NODE_ENV: 'test',
    },
  },
});
