import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'test/integration/**/*.test.ts',
      ...(process.env['DVT_LOCAL_DATA_TEST_ADMIN_URL'] !== undefined
        ? ['test/integration/postgresLocalDataAcquisition.proof.ts']
        : []),
      ...(process.env['DVT_SOURCE_LIVE_PROOF_DATABASE_URL'] !== undefined
        ? ['test/integration/sourceLivePreviewPostgres.proof.ts']
        : []),
    ],
  },
});
