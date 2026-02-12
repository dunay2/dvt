import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./engine/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['engine/src/**/*.ts'],
      exclude: [
        'engine/src/**/*.test.ts',
        'engine/src/**/*.spec.ts',
        'engine/test/**',
        'node_modules/**',
      ],
    },
    include: ['engine/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
});
