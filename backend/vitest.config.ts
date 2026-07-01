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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**'],
      exclude: [
        // entry point / process bootstrap — not unit-testable
        'src/index.ts',
        // type-only declaration files
        'src/**/*.d.ts',
        // test doubles
        'src/**/__mocks__/**',
      ],
      thresholds: {
        // Gate only the high-risk parser/util modules. Routes/app are covered
        // by integration tests but are intentionally not held to a hard %.
        'src/utils/**': {
          lines: 69,
        },
      },
    },
  },
});
