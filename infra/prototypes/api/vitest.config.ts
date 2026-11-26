/** Owned concern: execute the existing standalone prototype reconciliation proofs. */
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    environment: 'node',
    pool: 'forks',
    maxWorkers: 1,
    isolate: true,
  },
});
