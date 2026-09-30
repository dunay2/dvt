import { defineConfig } from 'vitest/config';
import type { CoverageV8Options } from 'vitest/node';

export const engineCoveragePolicy = {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  all: true,
  clean: true,
  thresholds: {
    statements: 65,
    branches: 55,
    functions: 65,
    lines: 65,
  },
} satisfies CoverageV8Options;

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      ...engineCoveragePolicy,
      include: ['packages/@dvt/engine/src/**/*.ts'],
      exclude: [
        'packages/@dvt/engine/src/**/*.test.ts',
        'packages/@dvt/engine/src/**/*.spec.ts',
        'packages/@dvt/engine/test/**',
        'node_modules/**',
      ],
    },
    include: ['packages/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'packages/**/node_modules/**', 'dist/**'],
  },
});
