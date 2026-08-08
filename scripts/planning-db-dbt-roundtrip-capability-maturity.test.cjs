const test = require('node:test');
const assert = require('node:assert/strict');

const { architectureState } = require('../tools/planning-db/state/canonical-state.json');

test('DBT round-trip capability maturity uses real query and generator outcomes', () => {
  const observabilityById = new Map(
    architectureState.component_observability.map((row) => [row.observability_id, row])
  );
  const queryState = observabilityById.get('OBS-DBT-ROUNDTRIP-CAPABILITY-QUERY-STATE');
  const generatorResult = observabilityById.get('OBS-DBT-ROUNDTRIP-CAPABILITY-GENERATOR-RESULT');

  assert.equal(queryState.status, 'implemented');
  assert.match(queryState.signal_name, /current or named drift state/);
  assert.equal(generatorResult.status, 'implemented');
  assert.match(generatorResult.signal_name, /Git ancestry, or stale-render rejection/);
});
