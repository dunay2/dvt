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
  assert.doesNotMatch(
    schemaSql,
    /migration[_ ](?:checksum|ordinal)|applied[_ ]migrations?(?:_identity)?/iu
  );
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
    'knowledge_action_work_intake_query',
  ]) {
    assert.doesNotMatch(schemaSql, new RegExp(`\\b${taskObject}\\b`, 'u'));
  }
  assert.doesNotThrow(() => assertCurrentPlanningDbSchema(schemaSql));
});

test('current schema accepts audited architecture storage I/O records', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[\s\S]*architecture_storage_io_record/u
  );
});

test('current schema accepts audited architecture design transitions', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[^\r\n]*'architecture_design_transition'::text/u
  );
});

test('current schema accepts audited architecture authority retirements', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[^\r\n]*'architecture_test_retire'::text/u
  );
  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[^\r\n]*'architecture_evidence_retire'::text/u
  );
});

test('architecture proof distinguishes assertions from fresh executions', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(
    schemaSql,
    /architecture\.evidence[\s\S]*design_id text[\s\S]*evidence_origin text NOT NULL[\s\S]*source_path text[\s\S]*imported_assertion[\s\S]*local_execution[\s\S]*ci_execution/u
  );
  assert.match(
    schemaSql,
    /CREATE VIEW architecture\.evidence_query[\s\S]*source_changed[\s\S]*assertion_only[\s\S]*verified[\s\S]*governance_files/u
  );
  assert.match(
    schemaSql,
    /implementation_violation_query[\s\S]*row_number\(\)[\s\S]*PARTITION BY evidence\.design_id[\s\S]*evidence\.recorded_at DESC[\s\S]*evidence\.design_id = scope\.design_id/u
  );
  assert.match(
    schemaSql,
    /implementation_violation_query[\s\S]*governance_files[\s\S]*30 days[\s\S]*source_content_sha256 IS DISTINCT FROM evidence\.current_source_content_sha256/u
  );
  assert.match(schemaSql, /evidence_design_id_fkey[\s\S]*REFERENCES architecture\.design/u);
});

test('documentation lifecycle accepts only hash-matched DB authority dispositions', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(
    schemaSql,
    /documentation_lifecycle_query[\s\S]*fowler_analysis_dispositions[\s\S]*db_authority_historical/u
  );
  assert.match(schemaSql, /disposition\.source_content_sha256 = document\.source_content_sha256/u);
  assert.match(
    schemaSql,
    /fowler_analysis_retirement_query[\s\S]*accepted_dispositions[\s\S]*accepted_dispositions\.source_content_sha256 = document\.source_content_sha256/u
  );
  assert.match(
    schemaSql,
    /LEFT JOIN retirement_decisions ON \(\(\(retirement_decisions\.document_path = document\.document_path\) AND \(retirement_decisions\.source_content_sha256 = document\.source_content_sha256\)\)\)/u
  );
});

test('Fowler read models invalidate accepted decisions when analyzed source bytes change', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');
  const referenceView = schemaSql.slice(
    schemaSql.indexOf('CREATE VIEW planning_query_store.fowler_analysis_reference_query AS'),
    schemaSql.indexOf(
      '-- Name: fowler_analysis_retirement_decisions',
      schemaSql.indexOf('CREATE VIEW planning_query_store.fowler_analysis_reference_query AS')
    )
  );
  const retirementView = schemaSql.slice(
    schemaSql.indexOf('CREATE VIEW planning_query_store.fowler_analysis_retirement_query AS'),
    schemaSql.indexOf(
      '-- Name: fowler_analysis_work_query',
      schemaSql.indexOf('CREATE VIEW planning_query_store.fowler_analysis_retirement_query AS')
    )
  );

  assert.match(referenceView, /document\.source_content_sha256 AS document_source_content_sha256/u);
  assert.match(
    referenceView,
    /target\.source_content_sha256 = reference\.document_source_content_sha256/u
  );
  assert.match(
    referenceView,
    /resolution\.source_content_sha256 = reference\.document_source_content_sha256/u
  );
  assert.match(
    retirementView,
    /accepted_targets\.source_content_sha256 = document\.source_content_sha256/u
  );
});

test('current schema accepts audited governance component revisions', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(
    schemaSql,
    /governance_component_local_operations_operation_type_check[^\r\n]*'component_revise'::text/u
  );
});

test('current schema accepts architecture design scopes for ports', () => {
  const schemaSql = fs.readFileSync(currentSchemaPath, 'utf8');

  assert.match(schemaSql, /architecture_design_scope_subject_kind_check[^\r\n]*'port'::text/u);
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
  for (const forbiddenLedger of [
    'migration_checksum',
    'migration_ordinal',
    'applied_migration',
    'applied_migration_identity',
  ]) {
    assert.throws(
      () =>
        assertCurrentPlanningDbSchema(
          `create schema architecture; create schema component_engineering; create schema planning_query_store; create table planning_query_store.example(${forbiddenLedger} text);`
        ),
      /must not contain migration state/iu
    );
  }
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
