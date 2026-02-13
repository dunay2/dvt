import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/engine/src/**/*.ts'],
      exclude: [
        'packages/engine/src/**/*.test.ts',
        'packages/engine/src/**/*.spec.ts',
        'packages/engine/test/**',
        'node_modules/**',
      ],
    },
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
