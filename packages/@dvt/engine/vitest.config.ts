import { defineConfig } from 'vitest/config';

import { engineCoveragePolicy } from '../../../vitest.config.js';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      ...engineCoveragePolicy,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'test/**', 'node_modules/**'],
    },
  },
});
