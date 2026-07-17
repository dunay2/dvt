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
  '728_dbt_roundtrip_capability_mechanization_alignment.sql'
);

test('DBT round-trip capability mechanization is Fowler-governed and symbol-complete', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');

  assert.match(sql, /docs\/architecture\/fowler-opportunity-planning-governance\.md/);
  assert.match(sql, /with declared_symbol\(path, name\)/);
  assert.match(sql, /createDbtProjectRoundtripCapabilityStatusReadModel/);
  assert.match(sql, /runDbtRoundtripCapabilityStatusGenerator/);
  assert.match(sql, /verifyGitCommitAncestry/);
  assert.match(sql, /must declare 24 implementation symbols/);
  assert.match(sql, /symbol_refs = symbol_manifest\.symbol_refs/);
  assert.doesNotMatch(sql, /delete\s+from/i);
  assert.doesNotMatch(sql, /truncate\s+/i);
});
