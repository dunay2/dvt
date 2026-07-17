const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.join(
  __dirname,
  '..',
  'tools',
  'planning-db',
  'migrations',
  '727_dbt_project_roundtrip_capability_maturity.sql'
);

test('DBT round-trip capability maturity uses real query and generator outcomes', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /OBS-DBT-ROUNDTRIP-CAPABILITY-QUERY-STATE/);
  assert.match(sql, /current or named drift state/);
  assert.match(sql, /OBS-DBT-ROUNDTRIP-CAPABILITY-GENERATOR-RESULT/);
  assert.match(sql, /Git ancestry, or stale-render rejection/);
  assert.equal((sql.match(/'implemented'/g) ?? []).length, 2);
  assert.match(sql, /architecture\.component_maturity_query/);
  assert.match(sql, /missing_reasons/);
});
