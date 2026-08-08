const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyCurrentPlanningDbSchema,
  assertPlanningDbCurrentSchemaReady,
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
  for (const taskObject of [
    'planning_artifacts',
    'planning_lanes',
    'planning_local_operations',
    'planning_sources',
    'planning_task_local_definitions',
    'planning_task_local_state',
    'planning_task_local_tombstones',
    'planning_tasks',
    'planning_claim_recovery_tasks',
    'planning_effective_tasks',
    'planning_next_tasks',
    'planning_open_tasks',
    'planning_real_work_query',
    'planning_task_dependencies',
    'planning_task_evidence_refs',
    'planning_task_gap_query',
    'planning_task_gap_raw_query',
    'planning_task_status_events',
    'planning_task_trace_query',
    'planning_work_intake_query',
    'registered_planning_task',
  ]) {
    assert.doesNotMatch(schemaSql, new RegExp(`\\b${taskObject}\\b`, 'u'));
  }
  assert.doesNotThrow(() => assertCurrentPlanningDbSchema(schemaSql));
});

test('Planning DB import contains no dormant local task registry compatibility', () => {
  const importSource = fs.readFileSync(path.join(__dirname, 'planning-db-import.cjs'), 'utf8');

  for (const retiredSemantic of [
    'buildPlanningTaskReferencePattern',
    'planningTaskIds',
    'registered_planning_task',
    'registeredPlanningTask',
  ]) {
    assert.doesNotMatch(importSource, new RegExp(`\\b${retiredSemantic}\\b`, 'u'));
  }
});

test('schema readiness rejects missing or legacy state without mutating the database', async () => {
  const readyClient = {
    query: async () => ({
      rows: [
        {
          has_query_store: true,
          has_component_engineering: true,
          has_architecture: true,
          has_no_migration_ledger: true,
          has_no_migration_state: true,
        },
      ],
    }),
  };
  assert.equal(
    (await assertPlanningDbCurrentSchemaReady(readyClient)).has_no_migration_state,
    true
  );

  await assert.rejects(
    assertPlanningDbCurrentSchemaReady({
      query: async () => ({ rows: [{ has_query_store: true, has_no_migration_ledger: false }] }),
    }),
    /pnpm planning:db:import/iu
  );
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

test('schema replacement can participate in the caller import transaction', async () => {
  const client = new RecordingClient();
  const schemaSql = [
    'create schema architecture;',
    'create schema component_engineering;',
    'create schema planning_query_store;',
  ].join('\n');

  await applyCurrentPlanningDbSchema({
    client,
    schemaSql,
    silent: true,
    manageTransaction: false,
  });

  assert.deepEqual(client.queries, [
    "select pg_advisory_xact_lock(hashtext('dvt:planning-db'), hashtext('current-schema'))",
    'drop schema if exists planning_query_store cascade',
    'drop schema if exists component_engineering cascade',
    'drop schema if exists architecture cascade',
    schemaSql,
  ]);
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
