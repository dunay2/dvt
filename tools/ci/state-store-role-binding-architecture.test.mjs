import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const config = require('../../.dependency-cruiser.cjs');

const RULE_NAME = 'no-api-non-root-state-store-role-binding';

test('central architecture policy owns the API state-store role-binding boundary', () => {
  const matchingRules = (config.forbidden ?? []).filter((rule) => rule.name === RULE_NAME);

  assert.equal(matchingRules.length, 1);
  assert.deepEqual(matchingRules[0], {
    name: RULE_NAME,
    severity: 'error',
    from: { path: '^apps/api/src/(?!modules/|runtime/)' },
    to: {
      path: '^apps/api/src/modules/stateStoreRoles\\.ts$',
      dependencyTypesNot: ['type-only', 'type-import'],
    },
  });
});
