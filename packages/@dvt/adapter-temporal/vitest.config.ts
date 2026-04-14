import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const repoPackageRoot = path.dirname(fileURLToPath(import.meta.url));
const adapterPostgresDistEntry = path.resolve(
  repoPackageRoot,
  '../adapter-postgres/dist/index.js'
);

export default defineConfig({
  resolve: {
    alias: {
      // The local Postgres proof helper builds adapter-postgres before running Vitest.
      // Resolve the workspace package to that built entry so the proof lane does not
      // depend on a workspace install having materialized a package symlink first.
      '@dvt/adapter-postgres': adapterPostgresDistEntry,
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
