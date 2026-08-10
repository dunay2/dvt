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
});
