import { defineConfig } from 'vitest/config';

const integrationTimeoutMs = process.env.DVT_PG_INTEGRATION === '1' ? 30_000 : 5_000;

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
    hookTimeout: integrationTimeoutMs,
    testTimeout: integrationTimeoutMs,
  },
});
