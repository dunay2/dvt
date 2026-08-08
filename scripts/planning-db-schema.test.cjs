const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyCurrentPlanningDbSchema,
  assertCurrentPlanningDbSchema,
  currentSchemaPath,
  schemaName,
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
  assert.equal(
    path.relative(path.resolve(__dirname, '..'), currentSchemaPath).replaceAll('\\', '/'),
    'tools/planning-db/schema.sql'
  );

  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');
  assert.doesNotMatch(schemaSql, /schema_migrations/iu);
  assert.doesNotMatch(schemaSql, /migration checksum|applied migration/iu);
  assert.doesNotThrow(() => assertCurrentPlanningDbSchema(schemaSql));
});

test('current schema validation rejects migration ledgers and wrong schema ownership', () => {
  assert.throws(
    () => assertCurrentPlanningDbSchema('create table planning_query_store.schema_migrations();'),
    /must not contain migration state/iu
  );
  assert.throws(
    () => assertCurrentPlanningDbSchema('create schema another_schema;'),
    /must declare planning_query_store/iu
  );
});

test('schema application replaces the complete query store in one transaction', async () => {
  const client = new RecordingClient();
  const schemaSql =
    'create schema planning_query_store;\ncreate table planning_query_store.example(id text);';

  const result = await applyCurrentPlanningDbSchema({ client, schemaSql, silent: true });

  assert.deepEqual(client.queries, [
    'begin',
    "select pg_advisory_xact_lock(hashtext('dvt:planning-query-store'), hashtext('current-schema-v1'))",
    'drop schema if exists planning_query_store cascade',
    schemaSql,
    'commit',
  ]);
  assert.deepEqual(result, { schema: 'planning_query_store', replaced: true });
});

test('schema application rolls back and never publishes a partial replacement', async () => {
  const client = new RecordingClient({ failOn: 'create schema planning_query_store' });
  const schemaSql = 'create schema planning_query_store;';

  await assert.rejects(
    applyCurrentPlanningDbSchema({ client, schemaSql, silent: true }),
    /planned failure/iu
  );

  assert.deepEqual(client.queries, [
    'begin',
    "select pg_advisory_xact_lock(hashtext('dvt:planning-query-store'), hashtext('current-schema-v1'))",
    'drop schema if exists planning_query_store cascade',
    schemaSql,
    'rollback',
  ]);
});
