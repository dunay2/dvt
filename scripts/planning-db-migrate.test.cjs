const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMigrationRecords,
  detectChecksumMismatch,
  readMigrationFiles,
  schemaName,
} = require('./planning-db-migrate.cjs');

test('planning DB migrations target the dedicated query-store schema', () => {
  assert.equal(schemaName, 'planning_query_store');
});

test('buildMigrationRecords derives stable versions and sha256 checksums', () => {
  const records = buildMigrationRecords([
    {
      fileName: '001_init.sql',
      sql: 'create table one (id bigint primary key);',
    },
    {
      fileName: '002_content.sql',
      sql: 'create table two (id bigint primary key);',
    },
  ]);

  assert.deepEqual(
    records.map((record) => record.version),
    ['001_init', '002_content']
  );
  assert.match(records[0].checksumSha256, /^[a-f0-9]{64}$/);
});

test('detectChecksumMismatch catches edited migrations after apply', () => {
  const mismatch = detectChecksumMismatch(
    { version: '001_init', checksumSha256: 'new-checksum' },
    { checksum_sha256: 'old-checksum' }
  );

  assert.equal(
    mismatch,
    'Migration 001_init was already applied with checksum old-checksum but now has checksum new-checksum.'
  );
});

test('tracked migrations include governance content read-model tables after W2', () => {
  const migrations = readMigrationFiles();
  const governanceMigration = migrations.find(
    (migration) => migration.fileName === '002_governance_content_read_model.sql'
  );

  assert.ok(governanceMigration);
  assert.match(
    governanceMigration.sql,
    /create table if not exists planning_query_store\.governance_components/
  );
  assert.match(
    governanceMigration.sql,
    /create table if not exists planning_query_store\.governance_remediation/
  );
});
