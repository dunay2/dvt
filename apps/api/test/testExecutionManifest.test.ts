import fs from 'node:fs';
import { URL } from 'node:url';

import { describe, expect, it } from 'vitest';

import unitConfig from '../vitest.config.js';
import integrationConfig from '../vitest.integration.config.js';

type TestSelection = {
  test?: {
    exclude?: string[];
    include?: string[];
  };
};

const INTEGRATION_GLOB = 'test/integration/**/*.test.ts';

describe('API test execution manifests', () => {
  it('assigns integration tests exclusively to the integration suite', () => {
    const unitSelection = unitConfig as TestSelection;
    const integrationSelection = integrationConfig as TestSelection;

    expect(unitSelection.test?.include).toEqual(['test/**/*.test.ts']);
    expect(unitSelection.test?.exclude).toContain(INTEGRATION_GLOB);
    expect(integrationSelection.test?.include).toEqual([INTEGRATION_GLOB]);
  });

  it('runs the disjoint unit and integration manifests from every full test entrypoint', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')
    ) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['test:unit']).toBe('vitest run --config vitest.config.ts');
    expect(packageJson.scripts?.['test:integration:ci']).toBe(
      'vitest run --config vitest.integration.config.ts'
    );
    expect(packageJson.scripts?.test).toBe('pnpm test:unit && pnpm test:integration:ci');
    expect(packageJson.scripts?.['test:ci']).toBe('pnpm test:unit && pnpm test:integration:ci');
  });
});
