import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const repoPackageRoot = path.dirname(fileURLToPath(import.meta.url));
const adapterTemporalSourceEntry = path.resolve(repoPackageRoot, 'src/index.ts');
const cryptoDistEntry = path.resolve(repoPackageRoot, '../crypto/dist/index.js');
const temporalDbtPluginSourceEntry = path.resolve(
  repoPackageRoot,
  '../temporal-dbt-plugin/src/index.ts'
);

export default defineConfig({
  resolve: {
    alias: {
      // DBT fixture tests must exercise the public crypto package boundary rather than
      // reaching into sibling package sources.
      '@dvt/crypto': cryptoDistEntry,
      // DBT plugin tests load the extracted plugin from source; resolve the plugin's
      // adapter public-boundary import to the same source graph under test.
      '@dvt/adapter-temporal': adapterTemporalSourceEntry,
      '@dvt/temporal-dbt-plugin': temporalDbtPluginSourceEntry,
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
