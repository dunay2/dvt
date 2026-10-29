const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256HexUtf8 } = require('@dvt/crypto');
const { spawnSync } = require('node:child_process');

const {
  addCurrentPlanningDbTable,
  applyCurrentPlanningDbSchema,
  assertPlanningDbCurrentSchemaReady,
  assertCurrentPlanningDbSchema,
  replaceCurrentPlanningDbViews,
  schemaName,
  schemaNames,
} = require('./planning-db-schema.cjs');

const { readCurrentPlanningDbSchema } = require('./planning-db/current-schema.cjs');
const { currentSchemaSources } = require('../tools/planning-db/schema/manifest.cjs');

function readCurrentSchemaView(name) {
  assert.match(name, /^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/u);
  const matches = [
    ...readCurrentPlanningDbSchema().matchAll(
      new RegExp(
        '^CREATE VIEW ' + name.replaceAll('.', '\\.') + String.raw` AS(?:[^';]|'(?:''|[^'])*')*;`,
        'gmu'
      )
    ),
  ];
  assert.equal(matches.length, 1, 'Expected exactly one current view: ' + name);
  return matches[0][0];
}

test('explicit two-view CLI rejects an unreviewed schema before connecting or rebuilding', () => {
  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, 'planning-db-schema.cjs'),
      '--replace-read-views',
      '--expected-schema-sha256',
      'a'.repeat(64),
      '--expected-manifest-view-sha256',
      'b'.repeat(64),
      '--expected-lifecycle-view-sha256',
      'c'.repeat(64),
    ],
    { encoding: 'utf8' }
  );
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Reviewed schema digest does not match/);
});

test('fixed two-view extraction refuses stacked statements and caller-supplied SQL before connecting', async (t) => {
  const view = readCurrentSchemaView('planning_query_store.command_query_rail_manifest_query');
  const root = path.resolve(__dirname, '..');
  const targetPath = currentSchemaSources
    .map((source) => path.join(root, source))
    .find((source) => fs.readFileSync(source, 'utf8').includes(view));
  assert.ok(targetPath);
  const originalRead = fs.readFileSync;
  const reader = t.mock.method(fs, 'readFileSync', (name, ...args) => {
    const value = originalRead(name, ...args);
    return name === targetPath
      ? value.replace(view, view + '\nDROP TABLE architecture.design;')
      : value;
  });
  const client = new RecordingClient();
  try {
    await assert.rejects(
      replaceCurrentPlanningDbViews({
        client,
        expectedSchemaSha256: sha256HexUtf8(readCurrentPlanningDbSchema()),
        expectedManifestViewSha256: 'b'.repeat(64),
        expectedLifecycleViewSha256: 'c'.repeat(64),
      }),
      /Exactly one CREATE VIEW statement/
    );
    assert.deepEqual(client.queries, []);
  } finally {
    reader.mock.restore();
  }
  await assert.rejects(
    replaceCurrentPlanningDbViews({ client, sql: 'DROP TABLE architecture.design' }),
    /caller SQL/
  );
  await assert.rejects(
    replaceCurrentPlanningDbViews({ client, view: 'architecture.foreign' }),
    /caller SQL/
  );
  assert.deepEqual(client.queries, []);
});

test('explicit table addition uses the reviewed current definition without replacing schemas', async () => {
  const schemaSql = readCurrentPlanningDbSchema();
  const client = new RecordingClient();
  await addCurrentPlanningDbTable({
    client,
    table: 'architecture.component_source_responsibility',
    expectedSchemaSha256: sha256HexUtf8(schemaSql),
  });
  assert.ok(
    client.queries.some((sql) =>
      sql.startsWith('CREATE TABLE architecture.component_source_responsibility')
    )
  );
  assert.ok(client.queries.includes('commit'));
  assert.ok(client.queries.every((sql) => !/drop|delete|truncate|alter/iu.test(sql)));
});

test('table addition rejects unreviewed, unsafe and incomplete definitions before writing', async () => {
  const schemaSql = readCurrentPlanningDbSchema();
  const expectedSchemaSha256 = sha256HexUtf8(schemaSql);
  for (const options of [
    { table: 'architecture.component_source_responsibility', expectedSchemaSha256: 'a'.repeat(64) },
    { table: 'architecture.component; drop schema architecture', expectedSchemaSha256 },
    { table: 'architecture.unknown', expectedSchemaSha256 },
    { table: 'architecture.component', expectedSchemaSha256 },
  ]) {
    const client = new RecordingClient();
    await assert.rejects(addCurrentPlanningDbTable({ client, ...options }));
    assert.deepEqual(client.queries, []);
  }
});

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

test('current Planning DB schema is one declarative bundle without migration state', () => {
  assert.equal(schemaName, 'planning_query_store');
  assert.deepEqual(schemaNames, ['architecture', 'component_engineering', 'planning_query_store']);

  const schemaSql = readCurrentPlanningDbSchema();
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

test('command/query rail authority excludes feature references while retaining their evidence', () => {
  const viewSql = readCurrentSchemaView('planning_query_store.command_query_rail_query');

  assert.ok(viewSql.includes(`raw_rail @> '{"referenceOnly": true}'::jsonb) AS is_reference`));
  assert.ok(viewSql.includes('FILTER (WHERE ((NOT rail_1.is_reference)'));
  assert.ok(viewSql.includes('WHERE (NOT rail_1.is_reference)'));
  assert.ok(viewSql.includes('jsonb_agg(DISTINCT rail_1.feature_id'));
});

test('governed source drift checks repository paths without treating external evidence as files', () => {
  const viewSql = readCurrentSchemaView('planning_query_store.governed_source_drift_query');

  assert.ok(viewSql.includes("source_path !~* '^https?://'::text"));
  assert.ok(viewSql.includes("source_path !~ '^\\.generated-docs/'::text"));
});

test('current schema accepts audited architecture storage I/O records', () => {
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[\s\S]*architecture_storage_io_record/u
  );
});

test('current schema accepts audited architecture design transitions', () => {
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[^\r\n]*'architecture_design_transition'::text/u
  );
});

test('current schema can retire superseded architecture relations', () => {
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /architecture_component_relation_status_check[^\r\n]*'deprecated'::text/u
  );
});

test('current schema accepts audited architecture authority retirements', () => {
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /architecture_design_operations_type_check[^\r\n]*'architecture_component_responsibility_retire'::text/u
  );
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
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /architecture\.evidence[\s\S]*design_id text[\s\S]*evidence_origin text NOT NULL[\s\S]*source_path text[\s\S]*imported_assertion[\s\S]*local_execution[\s\S]*ci_execution/u
  );
  assert.match(schemaSql, /architecture\.evidence[\s\S]*implementation_content_sha256 text/u);
  assert.match(
    schemaSql,
    /CREATE VIEW architecture\.evidence_subject_implementation_query[\s\S]*command_query_rail_query[\s\S]*implementation_refs[\s\S]*governance_file_query[\s\S]*sha256_text/u
  );
  assert.match(schemaSql, /CREATE VIEW architecture\.evidence_query[\s\S]*source_changed/u);
  assert.match(schemaSql, /CREATE VIEW architecture\.evidence_query[\s\S]*implementation_changed/u);
  assert.match(schemaSql, /CREATE VIEW architecture\.evidence_query[\s\S]*assertion_only/u);
  assert.match(schemaSql, /CREATE VIEW architecture\.evidence_query[\s\S]*verified/u);
  assert.match(
    schemaSql,
    /CREATE VIEW architecture\.evidence_query[\s\S]*evidence_subject_implementation_query/u
  );
  assert.match(
    schemaSql,
    /implementation_violation_query[\s\S]*row_number\(\)[\s\S]*PARTITION BY evidence\.design_id[\s\S]*evidence\.recorded_at DESC[\s\S]*evidence\.design_id = scope\.design_id/u
  );
  assert.match(
    schemaSql,
    /implementation_violation_query[\s\S]*evidence_subject_implementation_query[\s\S]*30 days[\s\S]*source_content_sha256 IS DISTINCT FROM evidence\.current_source_content_sha256[\s\S]*implementation_content_sha256 IS DISTINCT FROM evidence\.current_implementation_content_sha256/u
  );
  assert.match(schemaSql, /evidence_design_id_fkey[\s\S]*REFERENCES architecture\.design/u);
});

test('governed source current content is an audited overlay over immutable imports', () => {
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /CREATE TABLE planning_query_store\.governed_source_content_overrides[\s\S]*content_hash text NOT NULL[\s\S]*state_fingerprint text NOT NULL[\s\S]*source_commit_sha text NOT NULL[\s\S]*revision integer/u
  );
  assert.match(
    schemaSql,
    /CREATE TABLE planning_query_store\.governed_source_content_operations[\s\S]*idempotency_key text NOT NULL[\s\S]*paths jsonb NOT NULL[\s\S]*changes jsonb NOT NULL/u
  );
  assert.match(
    schemaSql,
    /CREATE VIEW planning_query_store\.governance_file_query AS[\s\S]*COALESCE\(current_content\.content_hash, imported\.content_hash\) AS content_hash[\s\S]*LEFT JOIN planning_query_store\.governed_source_content_overrides current_content/u
  );
  assert.match(
    schemaSql,
    /CREATE VIEW planning_query_store\.command_query_rail_manifest_query AS[\s\S]*governance_file_query[\s\S]*COALESCE\(source\.content_hash/u
  );
  const evidenceSql = readCurrentSchemaView('architecture.evidence_subject_implementation_query');
  assert.match(evidenceSql, /planning_query_store\.governance_file_query/u);
  assert.doesNotMatch(evidenceSql, /planning_query_store\.governance_files/u);
  assert.match(
    schemaSql,
    /governed_source_content_overrides_path_fkey[\s\S]*REFERENCES planning_query_store\.governance_files\(path\) ON DELETE CASCADE/u
  );
});

test('documentation lifecycle accepts only hash-matched DB authority dispositions', () => {
  const schemaSql = readCurrentPlanningDbSchema();

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
  const coverageView = readCurrentSchemaView(
    'planning_query_store.fowler_analysis_canonical_coverage_query'
  );
  const referenceView = readCurrentSchemaView(
    'planning_query_store.fowler_analysis_reference_query'
  );
  const retirementView = readCurrentSchemaView(
    'planning_query_store.fowler_analysis_retirement_query'
  );
  const intendedWorkView = readCurrentSchemaView(
    'planning_query_store.fowler_analysis_intended_work_query'
  );

  assert.match(coverageView, /target\.source_content_sha256 = document\.source_content_sha256/u);
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
  assert.match(
    intendedWorkView,
    /target\.source_content_sha256 = document\.source_content_sha256/u
  );
});

test('documentation lifecycle duplicate counts exclude non-publishable documents', () => {
  const lifecycleView = readCurrentSchemaView('planning_query_store.documentation_lifecycle_query');

  assert.match(
    lifecycleView,
    /WHERE \(\(stateful_1\.subject_key IS NOT NULL\) AND \(stateful_1\.lifecycle_state <> ALL \(ARRAY\['archived'::text, 'discarded'::text, 'superseded'::text\]\)\)\)/u
  );
});

test('current schema accepts audited governance component revisions', () => {
  const schemaSql = readCurrentPlanningDbSchema();

  assert.match(
    schemaSql,
    /governance_component_local_operations_operation_type_check[^\r\n]*'component_revise'::text/u
  );
});

test('current schema accepts architecture design scopes for ports', () => {
  const schemaSql = readCurrentPlanningDbSchema();

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

test('default schema application consumes every whole manifest module in declared order', async (t) => {
  assert.ok(Object.isFrozen(currentSchemaSources));
  assert.ok(currentSchemaSources.length > 1);
  const modulePaths = currentSchemaSources.map((source) => path.resolve(__dirname, '..', source));
  const fragments = modulePaths.map((_, index) =>
    index === 0
      ? 'CREATE SCHEMA architecture;\nCREATE SCHEMA component_engineering;\nCREATE SCHEMA planning_query_store;\n'
      : '-- whole module ' + index + '\nSELECT ' + index + ';\n'
  );
  const reads = [];
  const originalRead = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (name, ...args) => {
    const index = modulePaths.indexOf(name);
    if (index < 0) return originalRead(name, ...args);
    reads.push(name);
    return fragments[index];
  });
  const expected = fragments.join('');
  assert.equal(readCurrentPlanningDbSchema(), expected);
  assert.deepEqual(reads, modulePaths);
  reads.length = 0;
  const client = new RecordingClient();
  await applyCurrentPlanningDbSchema({ client, silent: true });
  assert.equal(client.queries.filter((sql) => sql === expected.trim()).length, 1);
  assert.deepEqual(reads, modulePaths);
  assert.equal(client.queries[0], 'begin');
  assert.equal(client.queries.at(-1), 'commit');
});

test('bundle manifest rejects empty, duplicate, escaped, aliased and non-SQL source identities', () => {
  const manifestPath = require.resolve('../tools/planning-db/schema/manifest.cjs');
  const readerPath = require.resolve('./planning-db/current-schema.cjs');
  const manifest = require(manifestPath);
  const originalSources = manifest.currentSchemaSources;
  const originalReader = require.cache[readerPath];
  const first = originalSources[0];
  try {
    for (const invalid of [
      null,
      [],
      [first, first],
      [first, first.toUpperCase()],
      ['../outside.sql'],
      [path.resolve(__dirname, 'outside.sql')],
      ['tools/planning-db/schema/manifest.cjs'],
      [first.replace('/schema/', '/schema/./')],
      [first.replaceAll('/', '\\')],
    ]) {
      manifest.currentSchemaSources = invalid;
      delete require.cache[readerPath];
      assert.throws(() => require(readerPath).readCurrentPlanningDbSchema());
    }
  } finally {
    manifest.currentSchemaSources = originalSources;
    require.cache[readerPath] = originalReader;
  }
});

test('bundle rejects unreadable, empty and psql module contents without partial assembly', (t) => {
  const target = path.resolve(__dirname, '..', currentSchemaSources[0]);
  const originalRead = fs.readFileSync;
  for (const invalid of [null, '', '  \n', '\\i another.sql\n', '\\ir another.sql\n']) {
    const spy = t.mock.method(fs, 'readFileSync', (name, ...args) => {
      if (name !== target) return originalRead(name, ...args);
      if (invalid === null)
        throw Object.assign(new Error('missing schema module'), { code: 'ENOENT' });
      return invalid;
    });
    try {
      assert.throws(() => readCurrentPlanningDbSchema());
    } finally {
      spy.mock.restore();
    }
  }
});

test('bundle rejects non-regular files and symlinked file or directory segments', (t) => {
  const target = path.resolve(__dirname, '..', currentSchemaSources[0]);
  const originalStat = fs.lstatSync;
  for (const scenario of [
    { path: target, file: false, link: false },
    { path: target, file: true, link: true },
    { path: path.dirname(target), file: false, link: true },
  ]) {
    const spy = t.mock.method(fs, 'lstatSync', (name, ...args) => {
      const stat = originalStat(name, ...args);
      return name === scenario.path
        ? new Proxy(stat, {
            get(value, key) {
              if (key === 'isFile') return () => scenario.file;
              if (key === 'isSymbolicLink') return () => scenario.link;
              return Reflect.get(value, key);
            },
          })
        : stat;
    });
    try {
      assert.throws(() => readCurrentPlanningDbSchema());
    } finally {
      spy.mock.restore();
    }
  }
});

test('bundle rejects distinct source names resolving to the same physical file', (t) => {
  assert.ok(currentSchemaSources.length > 1);
  const first = path.resolve(__dirname, '..', currentSchemaSources[0]);
  const second = path.resolve(__dirname, '..', currentSchemaSources[1]);
  const originalRealpath = fs.realpathSync;
  t.mock.method(fs, 'realpathSync', (name, ...args) =>
    originalRealpath(name === second ? first : name, ...args)
  );
  assert.throws(() => readCurrentPlanningDbSchema());
});

test('all three schema modes fail before any query when a declared module is unavailable', async (t) => {
  const target = path.resolve(__dirname, '..', currentSchemaSources[0]);
  const originalRead = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (name, ...args) => {
    if (name === target)
      throw Object.assign(new Error('missing schema module'), { code: 'ENOENT' });
    return originalRead(name, ...args);
  });
  for (const mode of ['bootstrap', 'table', 'views']) {
    const client = new RecordingClient();
    await assert.rejects(
      mode === 'bootstrap'
        ? applyCurrentPlanningDbSchema({ client, silent: true })
        : mode === 'table'
          ? addCurrentPlanningDbTable({
              client,
              table: 'architecture.component_source_responsibility',
              expectedSchemaSha256: 'a'.repeat(64),
            })
          : replaceCurrentPlanningDbViews({
              client,
              expectedSchemaSha256: 'a'.repeat(64),
              expectedManifestViewSha256: 'b'.repeat(64),
              expectedLifecycleViewSha256: 'c'.repeat(64),
            })
    );
    assert.deepEqual(client.queries, []);
  }
});
