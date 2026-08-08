const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyCurrentPlanningDbSchema,
  assertCurrentPlanningDbSchema,
  currentSchemaPath,
  schemaName,
  schemaNames,
} = require('./planning-db-schema.cjs');

class RecordingClient {
  constructor(options = {}) {
    this.failOn = options.failOn || null;
    this.queries = [];
  }

  async query(sql) {
    const normalized = String(sql).trim();
    this.queries.push(normalized);
    if (this.failOn && normalized.includes(this.failOn)) {
      throw new Error(`planned failure: ${this.failOn}`);
    }
    return { rows: [] };
  }
}

test('current Planning DB schema is one declarative artifact without migration state', () => {
  assert.equal(schemaName, 'planning_query_store');
  assert.deepEqual(schemaNames, ['architecture', 'component_engineering', 'planning_query_store']);
  assert.equal(
    path.relative(path.resolve(__dirname, '..'), currentSchemaPath).replaceAll('\\', '/'),
    'tools/planning-db/schema.sql'
  );

  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');
  assert.doesNotMatch(schemaSql, /schema_migrations/iu);
  assert.doesNotMatch(schemaSql, /migration_state/iu);
  assert.doesNotMatch(schemaSql, /migration checksum|applied migration/iu);
  assert.doesNotThrow(() => assertCurrentPlanningDbSchema(schemaSql));
});

test('current schema validation rejects migration ledgers and wrong schema ownership', () => {
  assert.throws(
    () =>
      assertCurrentPlanningDbSchema(
        'create schema architecture; create schema component_engineering; create schema planning_query_store; create table planning_query_store.schema_migrations();'
      ),
    /must not contain migration state/iu
  );
  assert.throws(
    () =>
      assertCurrentPlanningDbSchema(
        'create schema architecture; create schema component_engineering; create schema planning_query_store; create table planning_query_store.example(migration_state text);'
      ),
    /must not contain migration state/iu
  );
  assert.throws(
    () => assertCurrentPlanningDbSchema('create schema planning_query_store;'),
    /must declare architecture, component_engineering/iu
  );
});

test('schema application replaces the complete query store in one transaction', async () => {
  const client = new RecordingClient();
  const schemaSql = [
    'create schema architecture;',
    'create schema component_engineering;',
    'create schema planning_query_store;',
    'create table planning_query_store.example(id text);',
  ].join('\n');

  const result = await applyCurrentPlanningDbSchema({ client, schemaSql, silent: true });

  assert.deepEqual(client.queries, [
    'begin',
    "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))",
    'drop schema if exists planning_query_store cascade',
    'drop schema if exists component_engineering cascade',
    'drop schema if exists architecture cascade',
    schemaSql,
    'commit',
  ]);
  assert.deepEqual(result, {
    schemas: ['architecture', 'component_engineering', 'planning_query_store'],
    replaced: true,
  });
});

test('schema application rolls back and never publishes a partial replacement', async () => {
  const client = new RecordingClient({ failOn: 'create schema planning_query_store' });
  const schemaSql = [
    'create schema architecture;',
    'create schema component_engineering;',
    'create schema planning_query_store;',
  ].join('\n');

  await assert.rejects(
    applyCurrentPlanningDbSchema({ client, schemaSql, silent: true }),
    /planned failure/iu
  );

  assert.deepEqual(client.queries, [
    'begin',
    "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))",
    'drop schema if exists planning_query_store cascade',
    'drop schema if exists component_engineering cascade',
    'drop schema if exists architecture cascade',
    schemaSql,
    'rollback',
  ]);
});
