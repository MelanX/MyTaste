import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['src/**'],
      exclude: [
        'src/main.tsx',
        'src/index.tsx',
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/setupTests.ts',
        'src/components/PaperGrain/**',
        'src/**/*.test.{ts,tsx}',
        'src/__tests__/**',
        'src/types/**',
      ],
      thresholds: {
        'src/utils/**': { lines: 69 },
        'src/components/RecipeForm/useIngredientSections.ts': { lines: 69 },
        'src/components/RecipeForm/useRecipeForm.ts': { lines: 69 },
        'src/components/RecipeList/useRecipeListData.ts': { lines: 69 },
      },
    },
  },
});
