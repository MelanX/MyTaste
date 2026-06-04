import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', '.pwa-legacy']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Relaxed for this CRA->Vite port (build-tooling-only phase, not a rewrite):
      // Context files idiomatically co-export hooks/providers; refactoring file
      // structure is out of scope here.
      'react-refresh/only-export-components': 'off',
      // New react-hooks v7 rule; existing effects intentionally sync state.
      // Addressing them is an app-logic change, out of scope for this phase.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Test files use Vitest globals (vi, describe, it, expect, ...)
    files: ['**/*.test.{ts,tsx}', 'src/setupTests.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
