const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMigrationRecords,
  detectChecksumMismatch,
  readMigrationFiles,
  schemaName,
  sha256,
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

test('buildMigrationRecords normalizes SQL line endings before checksumming', () => {
  const sqlWithLf = 'create table one (\n  id bigint primary key\n);\n';
  const sqlWithCrlf = sqlWithLf.replace(/\n/g, '\r\n');

  const [lfRecord, crlfRecord] = buildMigrationRecords([
    { fileName: '001_init.sql', sql: sqlWithLf },
    { fileName: '001_init.sql', sql: sqlWithCrlf },
  ]);

  assert.equal(crlfRecord.checksumSha256, lfRecord.checksumSha256);
});

test('detectChecksumMismatch accepts legacy line-ending-only checksums', () => {
  const sqlWithLf = 'create table one (\n  id bigint primary key\n);\n';
  const sqlWithCrlf = sqlWithLf.replace(/\n/g, '\r\n');
  const [record] = buildMigrationRecords([{ fileName: '001_init.sql', sql: sqlWithCrlf }]);

  const mismatch = detectChecksumMismatch(record, { checksum_sha256: sha256(sqlWithCrlf) });

  assert.equal(mismatch, null);
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

test('tracked migrations include local operation audit tables after W6', () => {
  const migrations = readMigrationFiles();
  const operationMigration = migrations.find(
    (migration) => migration.fileName === '003_local_operation_store.sql'
  );

  assert.ok(operationMigration);
  assert.match(
    operationMigration.sql,
    /create table if not exists planning_query_store\.planning_task_local_state/
  );
  assert.match(
    operationMigration.sql,
    /create table if not exists planning_query_store\.planning_local_operations/
  );
});
