import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['packages/@dvt/engine/src/**/*.ts'],
      exclude: [
        'packages/@dvt/engine/src/**/*.test.ts',
        'packages/@dvt/engine/src/**/*.spec.ts',
        'packages/@dvt/engine/test/**',
        'node_modules/**',
      ],
    },
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
