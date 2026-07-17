const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  analyzeMigrationOrdinals,
  assertAppliedMigrationIdentities,
  assertMigrationOrdinalPolicy,
  buildMigrationRecords,
  buildMigrationFileNameFingerprint,
  detectChecksumMismatch,
  migrationOrdinalPolicy,
  readMigrationFiles,
  runMigrations,
  schemaName,
  sha256,
} = require('./planning-db-migrate.cjs');

test('planning DB migrations target the dedicated query-store schema', () => {
  assert.equal(schemaName, 'planning_query_store');
});

test('migration ordinal analysis reports the next safe ordinal', () => {
  const historicalFileNames = ['001_init.sql', '002_content.sql'];
  const report = analyzeMigrationOrdinals([...historicalFileNames, '003_add_query.sql'], {
    firstStrictOrdinal: 3,
    historicalFileNameSha256: buildMigrationFileNameFingerprint(historicalFileNames),
  });

  assert.equal(report.highestOrdinal, 3);
  assert.equal(report.nextSafeOrdinal, 4);
  assert.deepEqual(report.strictDuplicateOrdinals, []);
  assert.equal(report.historicalFileNamesMatch, true);
});

test('migration ordinal policy rejects duplicate strict ordinals', () => {
  const historicalFileNames = ['001_init.sql', '002_content.sql'];

  assert.throws(
    () =>
      assertMigrationOrdinalPolicy(
        [...historicalFileNames, '003_add_query.sql', '003_add_command.sql'],
        {
          firstStrictOrdinal: 3,
          historicalFileNameSha256: buildMigrationFileNameFingerprint(historicalFileNames),
        }
      ),
    /Duplicate strict migration ordinal 003: 003_add_command\.sql, 003_add_query\.sql\. Highest ordinal=3; next safe ordinal=4\./
  );
});

test('migration ordinal policy rejects changes to the applied filename history', () => {
  const historicalFileNames = ['001_init.sql', '002_content.sql'];

  assert.throws(
    () =>
      assertMigrationOrdinalPolicy(
        [...historicalFileNames, '002_parallel_history.sql', '003_add_query.sql'],
        {
          firstStrictOrdinal: 3,
          historicalFileNameSha256: buildMigrationFileNameFingerprint(historicalFileNames),
        }
      ),
    /Applied migration filename history changed below strict ordinal 003/
  );
});

test('migration files sort by numeric ordinal after the three-digit range', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-planning-migrations-'));

  try {
    fs.writeFileSync(path.join(directory, '1000_after.sql'), 'select 1000;', 'utf8');
    fs.writeFileSync(path.join(directory, '999_before.sql'), 'select 999;', 'utf8');

    assert.deepEqual(
      readMigrationFiles(directory).map((migration) => migration.fileName),
      ['999_before.sql', '1000_after.sql']
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('applied strict migration identities reject a renamed filename', () => {
  const records = buildMigrationRecords([
    { fileName: '722_new_name.sql', sql: 'select 722;' },
    { fileName: '723_next.sql', sql: 'select 723;' },
  ]);

  assert.throws(
    () =>
      assertAppliedMigrationIdentities(
        records,
        [{ version: '722_old_name', checksum_sha256: 'applied-checksum' }],
        { firstStrictOrdinal: 722 }
      ),
    /Applied strict migration files are missing or renamed: 722_old_name\.sql/
  );
});

test('applied strict migration identities allow newer shared-worktree migrations', () => {
  const records = buildMigrationRecords([
    { fileName: '722_current.sql', sql: 'select 722;' },
    { fileName: '723_current.sql', sql: 'select 723;' },
  ]);

  assert.doesNotThrow(() =>
    assertAppliedMigrationIdentities(
      records,
      [
        { version: '722_current', checksum_sha256: 'current-checksum' },
        { version: '724_newer_worktree', checksum_sha256: 'future-checksum' },
      ],
      { firstStrictOrdinal: 722 }
    )
  );
});

test('applied strict migration identities reject a rename to a different local ordinal', () => {
  const records = buildMigrationRecords([
    { fileName: '723_current.sql', sql: 'select 723;' },
    { fileName: '726_renamed.sql', sql: 'select 722;' },
  ]);

  assert.throws(
    () =>
      assertAppliedMigrationIdentities(
        records,
        [{ version: '722_original', checksum_sha256: 'applied-checksum' }],
        { firstStrictOrdinal: 722 }
      ),
    /Applied strict migration files are missing or renamed: 722_original\.sql/
  );
});

test('migration runner rejects a renamed applied strict migration before replaying SQL', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-planning-migrations-'));
  const queryCalls = [];

  try {
    fs.writeFileSync(path.join(directory, '001_new_name.sql'), 'select 1;', 'utf8');

    await assert.rejects(
      runMigrations({
        migrationsDir: directory,
        client: {
          query: async (sql) => {
            queryCalls.push(sql);
            if (/select version, checksum_sha256/u.test(sql)) {
              return {
                rows: [{ version: '001_old_name', checksum_sha256: 'applied-checksum' }],
              };
            }
            return { rows: [] };
          },
        },
        silent: true,
      }),
      /Applied strict migration files are missing or renamed: 001_old_name\.sql/
    );
    assert.equal(queryCalls.includes('select 1;'), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('migration runner serializes shared database invocations before reading applied versions', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-planning-migrations-'));
  const queryCalls = [];

  try {
    fs.writeFileSync(path.join(directory, '001_current.sql'), 'select 1;', 'utf8');

    await runMigrations({
      migrationsDir: directory,
      client: {
        query: async (sql, parameters) => {
          queryCalls.push({ sql, parameters });
          if (/select version, checksum_sha256/u.test(sql)) {
            return { rows: [] };
          }
          return { rows: [] };
        },
      },
      silent: true,
    });

    const lockIndex = queryCalls.findIndex(({ sql }) => /pg_advisory_xact_lock/u.test(sql));
    const appliedVersionsIndex = queryCalls.findIndex(({ sql }) =>
      /select version, checksum_sha256/u.test(sql)
    );
    const migrationSqlIndex = queryCalls.findIndex(({ sql }) => sql === 'select 1;');

    assert.ok(lockIndex > queryCalls.findIndex(({ sql }) => sql === 'begin'));
    assert.ok(lockIndex < appliedVersionsIndex);
    assert.ok(lockIndex < migrationSqlIndex);
    assert.deepEqual(queryCalls[lockIndex].parameters, [0x445654, 0x4d494752]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('tracked migrations preserve applied identities and use unique strict ordinals', () => {
  const migrations = readMigrationFiles();
  const report = analyzeMigrationOrdinals(
    migrations.map((migration) => migration.fileName),
    migrationOrdinalPolicy
  );
  const policyMigration = migrations.find(
    (migration) => migration.fileName === '722_planning_db_migration_ordinal_uniqueness.sql'
  );

  assert.equal(report.historicalFileNamesMatch, true);
  assert.deepEqual(report.strictDuplicateOrdinals, []);
  assert.ok(report.highestOrdinal >= migrationOrdinalPolicy.firstStrictOrdinal);
  assert.equal(report.nextSafeOrdinal, report.highestOrdinal + 1);
  assert.ok(policyMigration);
  assert.match(policyMigration.sql, /PreparePlanningDbForCiGate/);
  assert.match(policyMigration.sql, /Renaming those applied files would replay their SQL/);
});

test('migration ordinal policy fails before issuing database queries', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dvt-planning-migrations-'));
  const queryCalls = [];

  try {
    fs.writeFileSync(path.join(directory, '001_first.sql'), 'select 1;', 'utf8');
    fs.writeFileSync(path.join(directory, '001_parallel.sql'), 'select 2;', 'utf8');

    await assert.rejects(
      runMigrations({
        migrationsDir: directory,
        client: {
          query: async (...args) => {
            queryCalls.push(args);
            return { rows: [] };
          },
        },
        silent: true,
      }),
      /Duplicate strict migration ordinal 001/
    );
    assert.deepEqual(queryCalls, []);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
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

test('tracked migrations include DB-derived governance hash projections after W7', () => {
  const migrations = readMigrationFiles();
  const hashProjectionMigration = migrations.find(
    (migration) => migration.fileName === '004_governance_hash_projections.sql'
  );

  assert.ok(hashProjectionMigration);
  assert.match(
    hashProjectionMigration.sql,
    /create or replace function planning_query_store\.stable_jsonb_text/
  );
  assert.match(
    hashProjectionMigration.sql,
    /create or replace view planning_query_store\.governance_file_hash_projection/
  );
  assert.match(
    hashProjectionMigration.sql,
    /create or replace view planning_query_store\.governance_file_hash_drift/
  );
});

test('tracked migrations include the planning knowledge document relation rail', () => {
  const migrations = readMigrationFiles();
  const knowledgeMigration = migrations.find(
    (migration) => migration.fileName === '034_planning_knowledge_document_relations.sql'
  );

  assert.ok(knowledgeMigration);
  assert.match(
    knowledgeMigration.sql,
    /create table if not exists planning_query_store\.knowledge_documents/
  );
  assert.match(
    knowledgeMigration.sql,
    /create table if not exists planning_query_store\.knowledge_document_sections/
  );
  assert.match(
    knowledgeMigration.sql,
    /create table if not exists planning_query_store\.knowledge_action_links/
  );
  assert.match(
    knowledgeMigration.sql,
    /create or replace view planning_query_store\.knowledge_mandatory_proposal_binding_gap/
  );
});

test('tracked migrations flag partial mandatory proposal action task linkage', () => {
  const migrations = readMigrationFiles();
  const partialGapMigration = migrations.find(
    (migration) => migration.fileName === '047_knowledge_mandatory_proposal_partial_action_gaps.sql'
  );

  assert.ok(partialGapMigration);
  assert.match(
    partialGapMigration.sql,
    /count\(distinct action\.action_id\) > count\(distinct task_link\.action_id\)/
  );
});

test('tracked migrations expose DB-first knowledge intake retirement state', () => {
  const migrations = readMigrationFiles();
  const retirementMigration = migrations.find(
    (migration) => migration.fileName === '057_knowledge_intake_retirement_query.sql'
  );

  assert.ok(retirementMigration);
  assert.match(
    retirementMigration.sql,
    /create or replace view planning_query_store\.knowledge_intake_retirement_query/
  );
  assert.match(retirementMigration.sql, /document_path like 'buzon\/%'/);
  assert.match(retirementMigration.sql, /canonical_disposition/);
  assert.match(retirementMigration.sql, /open_action_count/);
});

test('tracked migrations count repository backrefs without buzon self references', () => {
  const migrations = readMigrationFiles();
  const retirementMigration = migrations
    .filter((migration) =>
      /create or replace view planning_query_store\.knowledge_intake_retirement_query/.test(
        migration.sql
      )
    )
    .at(-1);

  assert.ok(retirementMigration);
  assert.match(
    retirementMigration.sql,
    /join planning_query_store\.knowledge_intake_repository_references reference\s+on reference\.target_document_path = document\.document_path/
  );
  assert.match(retirementMigration.sql, /reference\.source_path not like 'buzon\/%'/);
});

test('tracked migrations include repository backrefs before knowledge intake retirement decisions', () => {
  const migrations = readMigrationFiles();
  const repositoryBackrefMigration = migrations.find(
    (migration) => migration.fileName === '063_knowledge_intake_repository_backrefs.sql'
  );

  assert.ok(repositoryBackrefMigration);
  assert.match(
    repositoryBackrefMigration.sql,
    /create table if not exists planning_query_store\.knowledge_intake_repository_references/
  );
  assert.match(
    repositoryBackrefMigration.sql,
    /create or replace view planning_query_store\.knowledge_intake_repository_reference_query/
  );
  assert.match(
    repositoryBackrefMigration.sql,
    /from planning_query_store\.knowledge_intake_repository_references reference/
  );
  assert.match(repositoryBackrefMigration.sql, /reference\.source_path not like 'buzon\/%'/);
  assert.match(
    repositoryBackrefMigration.sql,
    /create or replace view planning_query_store\.knowledge_intake_retirement_query/
  );
});

test('tracked migrations expose documentation lifecycle as logical DB facts', () => {
  const migrations = readMigrationFiles();
  const lifecycleMigration = migrations.find(
    (migration) => migration.fileName === '065_documentation_lifecycle_query.sql'
  );

  assert.ok(lifecycleMigration);
  assert.match(
    lifecycleMigration.sql,
    /create or replace view planning_query_store\.documentation_lifecycle_query/
  );
  assert.match(lifecycleMigration.sql, /canonicality/);
  assert.match(lifecycleMigration.sql, /lifecycle_state/);
  assert.match(lifecycleMigration.sql, /lifecycle_gap_kind/);
  assert.match(lifecycleMigration.sql, /proposal_missing_canonical/);
  assert.match(lifecycleMigration.sql, /Documentation lifecycle catalog/);
});

test('tracked migrations keep user stories as lifecycle support documents', () => {
  const migrations = readMigrationFiles();
  const supportingDocsMigration = migrations.find(
    (migration) => migration.fileName === '066_documentation_lifecycle_supporting_docs.sql'
  );

  assert.ok(supportingDocsMigration);
  assert.match(supportingDocsMigration.sql, /architecture_user_stories/);
  assert.match(supportingDocsMigration.sql, /then 'supporting'/);
  assert.match(supportingDocsMigration.sql, /canonicality in \('canonical', 'supporting'\)/);
});

test('tracked migrations normalize documentation subject keys without corrupting words', () => {
  const migrations = readMigrationFiles();
  const subjectKeyMigration = migrations.find(
    (migration) => migration.fileName === '067_documentation_lifecycle_subject_key.sql'
  );

  assert.ok(subjectKeyMigration);
  assert.match(
    subjectKeyMigration.sql,
    /create or replace function planning_query_store\.documentation_subject_key/
  );
  assert.match(subjectKeyMigration.sql, /\(\^|\[\^a-z0-9\]\)/);
  assert.match(subjectKeyMigration.sql, /documentation_subject_key\(document\.title\)/);
});

test('tracked migrations expose the system component roadmap as DB-first facts', () => {
  const migrations = readMigrationFiles();
  const componentRoadmapMigration = migrations.find(
    (migration) => migration.fileName === '068_component_roadmap_query.sql'
  );

  assert.ok(componentRoadmapMigration);
  assert.match(
    componentRoadmapMigration.sql,
    /create or replace view planning_query_store\.component_roadmap_query/
  );
  assert.match(componentRoadmapMigration.sql, /component_engineering\.component_metadata_query/);
  assert.match(componentRoadmapMigration.sql, /architecture\.component_query/);
  assert.match(componentRoadmapMigration.sql, /command_query_rail_manifest_query/);
  assert.match(componentRoadmapMigration.sql, /planned_component_missing_db_component/);
  assert.match(componentRoadmapMigration.sql, /System component roadmap/);
});

test('tracked migrations keep component roadmap refs scoped to components or ids', () => {
  const migrations = readMigrationFiles();
  const componentRoadmapFilterMigration = migrations.find(
    (migration) => migration.fileName === '069_component_roadmap_component_ref_filter.sql'
  );

  assert.ok(componentRoadmapFilterMigration);
  assert.match(
    componentRoadmapFilterMigration.sql,
    /component_ref\.value like 'docs\/architecture\/components\/%'/
  );
  assert.match(
    componentRoadmapFilterMigration.sql,
    /component_ref\.value !~ '\^\(docs\/\|buzon\/\)'/
  );
  assert.match(componentRoadmapFilterMigration.sql, /componentRefFilter/);
});

test('tracked migrations exclude documentation sources from planned component refs', () => {
  const migrations = readMigrationFiles();
  const componentRoadmapSourceFilterMigration = migrations.find(
    (migration) => migration.fileName === '089_component_roadmap_source_ref_filter.sql'
  );

  assert.ok(componentRoadmapSourceFilterMigration);
  assert.match(
    componentRoadmapSourceFilterMigration.sql,
    /component_ref\.value !~ '\^\(docs\/\|buzon\/\)'/
  );
  assert.doesNotMatch(
    componentRoadmapSourceFilterMigration.sql,
    /component_ref\.value like 'docs\/architecture\/components\/%'/
  );
  assert.match(
    componentRoadmapSourceFilterMigration.sql,
    /"componentRefFilter":"mechanical-component-id-or-repo-path"/
  );
});

test('tracked migrations exclude file sources from planned component refs', () => {
  const migrations = readMigrationFiles();
  const componentRoadmapFileFilterMigration = migrations.find(
    (migration) => migration.fileName === '090_component_roadmap_file_ref_filter.sql'
  );

  assert.ok(componentRoadmapFileFilterMigration);
  assert.ok(
    componentRoadmapFileFilterMigration.sql.includes("component_ref.value !~ '\\.[A-Za-z0-9]+$'")
  );
  assert.match(
    componentRoadmapFileFilterMigration.sql,
    /"componentRefFilter":"mechanical-component-id-or-owned-directory"/
  );
});

test('tracked migrations expose documentation panels as relational DB facts', () => {
  const migrations = readMigrationFiles();
  const documentationPanelMigration = migrations.find(
    (migration) => migration.fileName === '070_documentation_panel_query.sql'
  );

  assert.ok(documentationPanelMigration);
  assert.match(
    documentationPanelMigration.sql,
    /create or replace view planning_query_store\.documentation_panel_query/
  );
  assert.match(documentationPanelMigration.sql, /documentation_lifecycle_query/);
  assert.match(documentationPanelMigration.sql, /component_roadmap_query/);
  assert.match(documentationPanelMigration.sql, /knowledge_document_sections/);
  assert.match(documentationPanelMigration.sql, /missing_required_section/);
  assert.match(documentationPanelMigration.sql, /Documentation panel catalog/);
});

test('tracked migrations harden documentation panel reads against unbounded roadmap joins', () => {
  const migrations = readMigrationFiles();
  const documentationPanelHardeningMigration = migrations.find(
    (migration) => migration.fileName === '071_documentation_panel_query_runtime_hardening.sql'
  );

  assert.ok(documentationPanelHardeningMigration);
  assert.match(
    documentationPanelHardeningMigration.sql,
    /create or replace view planning_query_store\.documentation_panel_query/
  );
  assert.match(documentationPanelHardeningMigration.sql, /''::text as component_id/);
  assert.match(documentationPanelHardeningMigration.sql, /panelRuntimeScope/);
  assert.doesNotMatch(
    documentationPanelHardeningMigration.sql,
    /left join planning_query_store\.component_roadmap_query roadmap\s+on roadmap\.source_path = lifecycle\.document_path/
  );
});

test('tracked migrations scope required documentation panel sections to component and proposal docs', () => {
  const migrations = readMigrationFiles();
  const documentationPanelScopeMigration = migrations.find(
    (migration) => migration.fileName === '072_documentation_panel_gap_scope.sql'
  );

  assert.ok(documentationPanelScopeMigration);
  assert.match(
    documentationPanelScopeMigration.sql,
    /create or replace view planning_query_store\.documentation_panel_query/
  );
  assert.match(
    documentationPanelScopeMigration.sql,
    /lifecycle\.document_path like 'docs\/architecture\/components\/%'/
  );
  assert.match(
    documentationPanelScopeMigration.sql,
    /lifecycle\.document_path like 'docs\/planning\/proposals\/%'/
  );
  assert.doesNotMatch(
    documentationPanelScopeMigration.sql,
    /lifecycle\.canonicality = 'canonical'/
  );
});

test('tracked migrations expose Fowler analysis work as DB-first retirement facts', () => {
  const migrations = readMigrationFiles();
  const fowlerAnalysisMigration = migrations.find(
    (migration) => migration.fileName === '073_fowler_analysis_work_query.sql'
  );

  assert.ok(fowlerAnalysisMigration);
  assert.match(
    fowlerAnalysisMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_work_query/
  );
  assert.match(fowlerAnalysisMigration.sql, /documentation_lifecycle_query/);
  assert.match(fowlerAnalysisMigration.sql, /ready_to_retire/);
  assert.match(fowlerAnalysisMigration.sql, /pending_improvements/);
  assert.match(fowlerAnalysisMigration.sql, /Fowler analysis work queue/);
});

test('tracked migrations expose Fowler analysis retirement rails as DB-owned decisions', () => {
  const migrations = readMigrationFiles();
  const fowlerRetirementMigration = migrations.find(
    (migration) => migration.fileName === '074_fowler_analysis_retirement_rails.sql'
  );

  assert.ok(fowlerRetirementMigration);
  assert.match(
    fowlerRetirementMigration.sql,
    /create table if not exists planning_query_store\.fowler_analysis_dispositions/
  );
  assert.match(
    fowlerRetirementMigration.sql,
    /create table if not exists planning_query_store\.fowler_analysis_canonical_targets/
  );
  assert.match(
    fowlerRetirementMigration.sql,
    /create table if not exists planning_query_store\.fowler_analysis_reference_resolutions/
  );
  assert.match(
    fowlerRetirementMigration.sql,
    /create table if not exists planning_query_store\.fowler_analysis_retirement_decisions/
  );
  assert.match(
    fowlerRetirementMigration.sql,
    /create table if not exists planning_query_store\.fowler_analysis_operations/
  );
  assert.match(
    fowlerRetirementMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_reference_query/
  );
  assert.match(
    fowlerRetirementMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_retirement_query/
  );
  assert.match(fowlerRetirementMigration.sql, /policy\.lifecycle_gap_kind/);
  assert.match(
    fowlerRetirementMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_canonical_coverage_query/
  );
});

test('tracked migrations require DB-resolved references before Fowler intake retirement', () => {
  const migrations = readMigrationFiles();
  const fowlerRetirementMigration = migrations.find(
    (migration) => migration.fileName === '074_fowler_analysis_retirement_rails.sql'
  );

  assert.ok(fowlerRetirementMigration);
  assert.match(fowlerRetirementMigration.sql, /unresolved_reference_count = 0/);
  assert.match(fowlerRetirementMigration.sql, /reference_state = 'live'/);
  assert.match(
    fowlerRetirementMigration.sql,
    /resolution_status in \('resolved', 'obsolete', 'replaced'\)/
  );
  assert.match(fowlerRetirementMigration.sql, /source_path not like 'buzon\/%'/);
});

test('tracked migrations require accepted targets and dispositions before Fowler retirement', () => {
  const migrations = readMigrationFiles();
  const fowlerRetirementMigration = migrations.find(
    (migration) => migration.fileName === '074_fowler_analysis_retirement_rails.sql'
  );

  assert.ok(fowlerRetirementMigration);
  assert.match(fowlerRetirementMigration.sql, /open_improvement_count = 0/);
  assert.match(fowlerRetirementMigration.sql, /canonical_target_status = 'accepted'/);
  assert.match(fowlerRetirementMigration.sql, /disposition_status = 'accepted'/);
  assert.match(fowlerRetirementMigration.sql, /retirement_decision_status = 'approved'/);
  assert.match(fowlerRetirementMigration.sql, /retirement_allowed/);
});

test('tracked migrations do not allow Fowler retirement from missing grep results alone', () => {
  const migrations = readMigrationFiles();
  const fowlerRetirementMigration = migrations.find(
    (migration) => migration.fileName === '074_fowler_analysis_retirement_rails.sql'
  );

  assert.ok(fowlerRetirementMigration);
  assert.match(fowlerRetirementMigration.sql, /fowler_analysis_retirement_query/);
  assert.match(fowlerRetirementMigration.sql, /fowler_analysis_reference_query/);
  assert.match(fowlerRetirementMigration.sql, /fowler_analysis_canonical_coverage_query/);
  assert.doesNotMatch(fowlerRetirementMigration.sql, /grep|ripgrep|rg --files/i);
});

test('tracked migrations expose Fowler analysis intended work and duplicate intents', () => {
  const migrations = readMigrationFiles();
  const fowlerIntentMigration = migrations.find(
    (migration) => migration.fileName === '075_fowler_analysis_intent_duplicates.sql'
  );

  assert.ok(fowlerIntentMigration);
  assert.match(
    fowlerIntentMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_intended_work_query/
  );
  assert.match(
    fowlerIntentMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_duplicate_intent_query/
  );
  assert.match(fowlerIntentMigration.sql, /knowledge_action_items/);
  assert.match(fowlerIntentMigration.sql, /intent_key/);
  assert.match(fowlerIntentMigration.sql, /duplicate_document_count/);
  assert.match(fowlerIntentMigration.sql, /Duplicate semantics/);
  assert.doesNotMatch(fowlerIntentMigration.sql, /grep|ripgrep|rg --files/i);
});

test('tracked migrations classify same-document repeated open Fowler intentions as duplicates', () => {
  const migrations = readMigrationFiles();
  const fowlerIntentHardeningMigration = migrations.find(
    (migration) => migration.fileName === '076_fowler_analysis_intent_duplicate_state_hardening.sql'
  );

  assert.ok(fowlerIntentHardeningMigration);
  assert.match(
    fowlerIntentHardeningMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_intended_work_query/
  );
  assert.match(fowlerIntentHardeningMigration.sql, /duplicate_open_action_count, 0\) > 1/);
  assert.doesNotMatch(
    fowlerIntentHardeningMigration.sql,
    /duplicate_open_action_count, 0\) > 1\s+and\s+coalesce\(intent_rollup\.duplicate_document_count/
  );
  assert.match(
    fowlerIntentHardeningMigration.sql,
    /lower\(coalesce\(intent\.action_status, ''\)\) not in/
  );
});

test('tracked migrations expose DB-first component architecture fitness facts', () => {
  const migrations = readMigrationFiles();
  const architectureFitnessMigration = migrations.find(
    (migration) => migration.fileName === '077_component_architecture_fitness_dbfirst.sql'
  );

  assert.ok(architectureFitnessMigration);
  assert.match(
    architectureFitnessMigration.sql,
    /create table if not exists architecture\.component_dependency_scan/
  );
  assert.match(
    architectureFitnessMigration.sql,
    /create table if not exists architecture\.component_dependency_observation/
  );
  assert.match(
    architectureFitnessMigration.sql,
    /create table if not exists architecture\.component_fitness_evaluation/
  );
  assert.match(
    architectureFitnessMigration.sql,
    /create or replace view architecture\.component_dependency_observation_query/
  );
  assert.match(
    architectureFitnessMigration.sql,
    /create or replace view architecture\.component_path_mapping_query/
  );
  assert.match(
    architectureFitnessMigration.sql,
    /create or replace view architecture\.component_dependency_classification_query/
  );
  assert.match(
    architectureFitnessMigration.sql,
    /create or replace view architecture\.component_fitness_query/
  );
  assert.match(architectureFitnessMigration.sql, /DVT-ARCH-001/);
  assert.match(architectureFitnessMigration.sql, /unmapped_source/);
  assert.match(architectureFitnessMigration.sql, /undeclared_dependency/);
});

test('tracked migrations widen architecture design operations for fitness scans', () => {
  const migrations = readMigrationFiles();
  const architectureFitnessOperationMigration = migrations.find(
    (migration) => migration.fileName === '078_component_architecture_fitness_operation_rail.sql'
  );

  assert.ok(architectureFitnessOperationMigration);
  assert.match(
    architectureFitnessOperationMigration.sql,
    /architecture_design_operations_type_check/
  );
  assert.match(architectureFitnessOperationMigration.sql, /architecture_fitness_scan/);
});

test('tracked migrations expose component architecture fitness gap summaries', () => {
  const migrations = readMigrationFiles();
  const architectureFitnessGapMigration = migrations.find(
    (migration) => migration.fileName === '079_component_architecture_fitness_gap_summary.sql'
  );

  assert.ok(architectureFitnessGapMigration);
  assert.match(
    architectureFitnessGapMigration.sql,
    /create or replace view architecture\.component_fitness_gap_summary_query/
  );
  assert.match(architectureFitnessGapMigration.sql, /dependency_classification/);
  assert.match(architectureFitnessGapMigration.sql, /observation_count/);
  assert.match(architectureFitnessGapMigration.sql, /action_hint/);
});

test('tracked migrations include governance refresh run ledger rails', () => {
  const migrations = readMigrationFiles();
  const refreshRunLedgerMigration = migrations.find(
    (migration) => migration.fileName === '080_governance_refresh_run_ledger.sql'
  );

  assert.ok(refreshRunLedgerMigration);
  assert.match(
    refreshRunLedgerMigration.sql,
    /create table if not exists planning_query_store\.governance_refresh_runs/
  );
  assert.match(
    refreshRunLedgerMigration.sql,
    /create table if not exists planning_query_store\.governance_refresh_run_operations/
  );
  assert.match(
    refreshRunLedgerMigration.sql,
    /create table if not exists planning_query_store\.governance_refresh_stage_runs/
  );
  assert.match(
    refreshRunLedgerMigration.sql,
    /create or replace view planning_query_store\.governance_refresh_run_query/
  );
  assert.doesNotMatch(refreshRunLedgerMigration.sql, /grep|ripgrep|rg --files/i);
});

test('tracked migrations expose component integrity and rail vocabulary query rails', () => {
  const migrations = readMigrationFiles();
  const integrityMigration = migrations.find(
    (migration) => migration.fileName === '081_component_integrity_rail_vocabulary.sql'
  );

  assert.ok(integrityMigration);
  assert.match(
    integrityMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/
  );
  assert.match(
    integrityMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_vocabulary_query/
  );
  assert.match(integrityMigration.sql, /semantic_duplicate/);
  assert.match(integrityMigration.sql, /filesystem_coverage/);
});

test('tracked migrations expose code symbol duplicate and source drift query rails', () => {
  const migrations = readMigrationFiles();
  const codeSymbolMigration = migrations.find(
    (migration) => migration.fileName === '105_code_symbol_duplicate_queries.sql'
  );

  assert.ok(codeSymbolMigration);
  assert.match(
    codeSymbolMigration.sql,
    /create table if not exists planning_query_store\.code_symbols/
  );
  assert.match(
    codeSymbolMigration.sql,
    /create or replace view planning_query_store\.code_symbol_inventory_query/
  );
  assert.match(
    codeSymbolMigration.sql,
    /create or replace view planning_query_store\.code_symbol_exact_duplicate_query/
  );
  assert.match(
    codeSymbolMigration.sql,
    /create or replace view planning_query_store\.code_symbol_semantic_candidate_query/
  );
  assert.match(
    codeSymbolMigration.sql,
    /create or replace view planning_query_store\.governed_source_drift_query/
  );
  assert.match(codeSymbolMigration.sql, /exact_body_duplicate/);
  assert.match(codeSymbolMigration.sql, /missing_source_file/);
  assert.doesNotMatch(codeSymbolMigration.sql, /delete from planning_query_store\.code_symbols/);
});

test('tracked migrations project code symbols through effective component ownership', () => {
  const migrations = readMigrationFiles();
  const codeSymbolOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '174_code_symbol_effective_component_ownership.sql'
  );

  assert.ok(codeSymbolOwnershipMigration);
  assert.match(
    codeSymbolOwnershipMigration.sql,
    /planning_query_store\.component_engineering_file_ownership_query/
  );
  assert.match(codeSymbolOwnershipMigration.sql, /coalesce\(ownership\.leaf_component_id/);
  assert.match(codeSymbolOwnershipMigration.sql, /'importedComponentId'/);
  assert.match(codeSymbolOwnershipMigration.sql, /'effectiveComponentId'/);
  assert.match(
    codeSymbolOwnershipMigration.sql,
    /from planning_query_store\.code_symbol_inventory_query symbol/
  );
  assert.doesNotMatch(
    codeSymbolOwnershipMigration.sql,
    /from planning_query_store\.code_symbols symbol\s+join duplicate_/i
  );
  assert.doesNotMatch(codeSymbolOwnershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(codeSymbolOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Planning DB query read models into leaf components', () => {
  const migrations = readMigrationFiles();
  const queryLeafMigration = migrations.find(
    (migration) => migration.fileName === '175_planning_db_query_read_model_leaf_components.sql'
  );

  assert.ok(queryLeafMigration);
  assert.match(queryLeafMigration.sql, /create temporary table planning_db_query_leaf_map/);
  assert.match(
    queryLeafMigration.sql,
    /'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CODE-SYMBOLS'/
  );
  assert.match(queryLeafMigration.sql, /'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CQ-RAILS'/);
  assert.match(
    queryLeafMigration.sql,
    /'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-COMPONENT-INTEGRITY'/
  );
  assert.match(queryLeafMigration.sql, /children_required\s*,[\s\S]*true/);
  assert.match(
    queryLeafMigration.sql,
    /insert into planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.match(queryLeafMigration.sql, /cross join lateral unnest\(owns\)/);
  assert.match(queryLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(queryLeafMigration.sql, /insert into architecture\.component_storage_io/);
  assert.match(queryLeafMigration.sql, /REL-PLANNING-DB-QUERY-CONTAINS-/);
  assert.match(queryLeafMigration.sql, /PLANNING-DB-QUERY-READ-MODEL-LEAF-MAPPING-20260618/);
  assert.doesNotMatch(queryLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(queryLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint Planning DB query parent away from CLI file path', () => {
  const migrations = readMigrationFiles();
  const queryParentPathMigration = migrations.find(
    (migration) => migration.fileName === '176_repoint_planning_db_query_parent_repo_path.sql'
  );

  assert.ok(queryParentPathMigration);
  assert.match(
    queryParentPathMigration.sql,
    /PLANNING-DB-QUERY-PARENT-REPO-PATH-CANONICALIZATION-20260618/
  );
  assert.match(queryParentPathMigration.sql, /repo_path = 'scripts\/planning-db\/queries'/);
  assert.match(queryParentPathMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CLI/);
  assert.match(queryParentPathMigration.sql, /scripts\/planning-db-query\.cjs/);
  assert.doesNotMatch(queryParentPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(queryParentPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split runtime CLI validation into active and legacy leaves', () => {
  const migrations = readMigrationFiles();
  const runtimeCliLeafMigration = migrations.find(
    (migration) => migration.fileName === '177_runtime_cli_validation_leaf_components.sql'
  );

  assert.ok(runtimeCliLeafMigration);
  assert.match(
    runtimeCliLeafMigration.sql,
    /create temporary table runtime_cli_validation_leaf_map/
  );
  assert.match(runtimeCliLeafMigration.sql, /SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE/);
  assert.match(runtimeCliLeafMigration.sql, /SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE/);
  assert.match(runtimeCliLeafMigration.sql, /packages\/@dvt\/cli\/\*\*/);
  assert.match(runtimeCliLeafMigration.sql, /packages\/cli\/validate-contracts\.cjs/);
  assert.match(runtimeCliLeafMigration.sql, /local_status[\s\S]*'legacy'/);
  assert.match(runtimeCliLeafMigration.sql, /architecture_status[\s\S]*'deprecated'/);
  assert.match(runtimeCliLeafMigration.sql, /docs\/architecture\/shared\/cli\.md/);
  assert.match(
    runtimeCliLeafMigration.sql,
    /web-physical-module-decomposition-debt-plan-20260508\.md/
  );
  assert.match(runtimeCliLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(runtimeCliLeafMigration.sql, /insert into architecture\.component_storage_io/);
  assert.match(runtimeCliLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(
    runtimeCliLeafMigration.sql,
    /REL-RUNTIME-CLI-VALIDATION-CONTAINS-LEGACY-LOOSE-PACKAGE/
  );
  assert.doesNotMatch(runtimeCliLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(runtimeCliLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep runtime CLI legacy contract out of drift', () => {
  const migrations = readMigrationFiles();
  const runtimeCliContractMigration = migrations.find(
    (migration) => migration.fileName === '178_runtime_cli_legacy_contract_drift_sanitization.sql'
  );

  assert.ok(runtimeCliContractMigration);
  assert.match(
    runtimeCliContractMigration.sql,
    /CONTRACT-SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE-PATH/
  );
  assert.match(runtimeCliContractMigration.sql, /SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE/);
  assert.match(runtimeCliContractMigration.sql, /status = 'implemented'/);
  assert.match(runtimeCliContractMigration.sql, /component status carries deprecation/);
  assert.match(runtimeCliContractMigration.sql, /CheckPlanningDbComponentIntegrity/);
  assert.doesNotMatch(runtimeCliContractMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(runtimeCliContractMigration.sql, /truncate\s+/i);
});

test('runtime CLI legacy validator delegates to the active @dvt CLI validator', () => {
  const wrapperPath = path.join(__dirname, '..', 'packages', 'cli', 'validate-contracts.cjs');
  const wrapperSource = fs.readFileSync(wrapperPath, 'utf8');

  assert.match(wrapperSource, /require\('\.\.\/@dvt\/cli\/validate-contracts\.cjs'\)/);
  assert.doesNotMatch(
    wrapperSource,
    /function\s+(collectJsonFiles|runCheck|validateGoldenResultsFile)\b/
  );
  assert.doesNotMatch(wrapperSource, /require\('\.\.\/contracts\/dist\/index\.js'\)/);
});

test('tracked migrations canonicalize runtime CLI legacy wrapper delegation', () => {
  const migrations = readMigrationFiles();
  const runtimeCliWrapperMigration = migrations.find(
    (migration) => migration.fileName === '253_runtime_cli_legacy_wrapper_canonicalization.sql'
  );

  assert.ok(runtimeCliWrapperMigration);
  assert.match(runtimeCliWrapperMigration.sql, /WEB-PHYSICAL-MODULE-DECOMPOSITION-DEBT-20260508/);
  assert.match(runtimeCliWrapperMigration.sql, /SYS-RUNTIME-CLI-VALIDATION-LEGACY-LOOSE-PACKAGE/);
  assert.match(runtimeCliWrapperMigration.sql, /SYS-RUNTIME-CLI-VALIDATION-DVT-CLI-PACKAGE/);
  assert.match(runtimeCliWrapperMigration.sql, /packages\/cli\/validate-contracts\.cjs/);
  assert.match(runtimeCliWrapperMigration.sql, /packages\/@dvt\/cli\/validate-contracts\.cjs/);
  assert.match(
    runtimeCliWrapperMigration.sql,
    /REL-RUNTIME-CLI-VALIDATION-LEGACY-CALLS-DVT-CLI-PACKAGE/
  );
  assert.match(runtimeCliWrapperMigration.sql, /RunRuntimeCliValidation/);
  assert.match(runtimeCliWrapperMigration.sql, /DetectCodeSymbolDuplicates/);
  assert.match(runtimeCliWrapperMigration.sql, /delete from architecture\.component_storage_io/);
  assert.match(
    runtimeCliWrapperMigration.sql,
    /node --test scripts\/planning-db-migrate\.test\.cjs/
  );
  assert.doesNotMatch(runtimeCliWrapperMigration.sql, /delete from architecture\.component\b/i);
  assert.doesNotMatch(runtimeCliWrapperMigration.sql, /truncate\s+/i);
});

test('tracked migrations classify code-symbol duplicates against legacy components', () => {
  const migrations = readMigrationFiles();
  const codeSymbolLegacyMigration = migrations.find(
    (migration) => migration.fileName === '179_code_symbol_legacy_duplicate_classification.sql'
  );

  assert.ok(codeSymbolLegacyMigration);
  assert.match(
    codeSymbolLegacyMigration.sql,
    /create or replace view planning_query_store\.code_symbol_exact_duplicate_query/
  );
  assert.match(codeSymbolLegacyMigration.sql, /governance_component_definition_query/);
  assert.match(codeSymbolLegacyMigration.sql, /is_legacy_or_deprecated_component/);
  assert.match(codeSymbolLegacyMigration.sql, /activeComponentCount/);
  assert.match(codeSymbolLegacyMigration.sql, /legacyOrDeprecatedComponentCount/);
  assert.match(codeSymbolLegacyMigration.sql, /legacy_or_deprecated_counterpart/);
  assert.match(
    codeSymbolLegacyMigration.sql,
    /Keep the active implementation canonical and retire or wrap the legacy duplicate path/
  );
  assert.doesNotMatch(codeSymbolLegacyMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(codeSymbolLegacyMigration.sql, /truncate\s+/i);
});

test('tracked migrations split CI docs generation scripts into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const docsGenerationLeafMigration = migrations.find(
    (migration) => migration.fileName === '180_ci_docs_generation_leaf_components.sql'
  );

  assert.ok(docsGenerationLeafMigration);
  assert.match(
    docsGenerationLeafMigration.sql,
    /create temporary table ci_docs_generation_leaf_map/
  );

  for (const componentId of [
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-STATUS-REPORTS',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DB-SURFACE',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-SPEC-TRACEABILITY',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-CONTRACT-INDEX',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-KNOWLEDGE-INTAKE',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-MARKDOWN-TABLES',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DATE-POLICY',
    'SYS-RUNTIME-STATE-STORE-SNAPSHOT-BACKFILL-CLI',
  ]) {
    assert.match(docsGenerationLeafMigration.sql, new RegExp(componentId));
  }

  assert.match(docsGenerationLeafMigration.sql, /children_required[\s\S]*true/);
  assert.match(docsGenerationLeafMigration.sql, /docs\/generated-docs-policy\.json/);
  assert.match(docsGenerationLeafMigration.sql, /scripts\/rebuild-snapshots\.js/);
  assert.match(docsGenerationLeafMigration.sql, /StateStoreSnapshotRebuildMaintenanceCommand/);
  assert.match(
    docsGenerationLeafMigration.sql,
    /REL-RUNTIME-STATE-STORE-CONTAINS-SNAPSHOT-BACKFILL-CLI/
  );
  assert.match(
    docsGenerationLeafMigration.sql,
    /Function-level duplicates remain queryable in code-symbol-duplicates/
  );
  assert.match(docsGenerationLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(docsGenerationLeafMigration.sql, /insert into architecture\.component_storage_io/);
  assert.match(docsGenerationLeafMigration.sql, /insert into architecture\.contract/);
  assert.doesNotMatch(docsGenerationLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(docsGenerationLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(docsGenerationLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations close CI docs generation component integrity gaps', () => {
  const migrations = readMigrationFiles();
  const docsGenerationFollowupMigration = migrations.find(
    (migration) => migration.fileName === '181_ci_docs_generation_component_integrity_followup.sql'
  );

  assert.ok(docsGenerationFollowupMigration);
  assert.match(
    docsGenerationFollowupMigration.sql,
    /PLANNING-DB-CI-DOCS-GENERATION-INTEGRITY-FOLLOWUP-20260618/
  );
  assert.match(
    docsGenerationFollowupMigration.sql,
    /repo_path\s*=\s*'docs\/generated-docs-policy\.json'/
  );
  assert.match(
    docsGenerationFollowupMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    docsGenerationFollowupMigration.sql,
    /SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-DOCS-SYNC/
  );
  assert.match(
    docsGenerationFollowupMigration.sql,
    /SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION-PLANNING-VIEWS/
  );
  assert.match(docsGenerationFollowupMigration.sql, /docs-workboard-check-changed/);
  assert.doesNotMatch(docsGenerationFollowupMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(docsGenerationFollowupMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(docsGenerationFollowupMigration.sql, /truncate\s+/i);
});

test('tracked migrations split runtime state-store package into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const stateStoreLeafMigration = migrations.find(
    (migration) => migration.fileName === '182_runtime_state_store_leaf_components.sql'
  );

  assert.ok(stateStoreLeafMigration);
  assert.match(stateStoreLeafMigration.sql, /create temporary table runtime_state_store_leaf_map/);

  for (const componentId of [
    'SYS-RUNTIME-STATE-STORE-PACKAGE-SHELL',
    'SYS-RUNTIME-STATE-STORE-COMMAND-PORT',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-UNIT-POLICY',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RUNTIME-CONTRACTS',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ARTIFACTS',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-OBJECT-STORAGE',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-ORCHESTRATION',
    'SYS-RUNTIME-STATE-STORE-ARCHIVE-RESTORE-DELETE',
    'SYS-RUNTIME-STATE-STORE-DELIVERY-BUFFER-PURGE',
  ]) {
    assert.match(stateStoreLeafMigration.sql, new RegExp(componentId));
  }

  for (const sourcePath of [
    'packages/@dvt/state-store/src/inMemoryRunStateCommandPort.ts',
    'packages/@dvt/state-store/src/lifecycle/archiveArtifacts.ts',
    'packages/@dvt/state-store/src/lifecycle/archiveRuntime.ts',
    'packages/@dvt/state-store/src/lifecycle/ObjectStorageRunArchiveExporter.ts',
    'packages/@dvt/state-store/src/lifecycle/RunArchiveCoordinator.ts',
    'packages/@dvt/state-store/src/lifecycle/RunArchiveRestorer.ts',
    'packages/@dvt/state-store/src/lifecycle/DeliveryBufferPurger.ts',
    'packages/@dvt/state-store/test/RunArchiveLifecycleIntegration.test.ts',
  ]) {
    assert.match(stateStoreLeafMigration.sql, new RegExp(sourcePath.replaceAll('/', '\\/')));
  }

  assert.match(stateStoreLeafMigration.sql, /ADR-0037-run-event-lifecycle/);
  assert.match(stateStoreLeafMigration.sql, /ADR-0038-delivery-buffer-retention/);
  assert.match(stateStoreLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(stateStoreLeafMigration.sql, /insert into architecture\.component_storage_io/);
  assert.match(stateStoreLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(stateStoreLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.match(stateStoreLeafMigration.sql, /repo_path = 'packages\/@dvt\/state-store'/);
  assert.doesNotMatch(stateStoreLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(stateStoreLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(stateStoreLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split API HTTP entrypoints into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const apiHttpLeafMigration = migrations.find(
    (migration) => migration.fileName === '183_api_http_entrypoint_leaf_components.sql'
  );

  assert.ok(apiHttpLeafMigration);
  assert.match(apiHttpLeafMigration.sql, /create temporary table api_http_entrypoint_leaf_map/);

  for (const componentId of [
    'SYS-API-HTTP-AUTHENTICATION',
    'SYS-API-HTTP-ADMIN-REPAIR',
    'SYS-API-HTTP-RUNTIME-ROUTE-REGISTRY',
    'SYS-API-HTTP-ERROR-TRANSLATION',
    'SYS-API-HTTP-PLAN-COMMANDS',
    'SYS-API-HTTP-RUN-LIFECYCLE',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
  ]) {
    assert.match(apiHttpLeafMigration.sql, new RegExp(componentId));
  }

  for (const sourcePath of [
    'apps/api/src/entrypoints/http/httpBearerAuthentication.ts',
    'apps/api/src/entrypoints/http/projectOnboardingRoutes.ts',
    'apps/api/src/entrypoints/http/workspacePluginCatalogRoutes.ts',
    'apps/api/src/entrypoints/http/previewPlanRoute.ts',
    'apps/api/src/entrypoints/http/startRunRoute.ts',
    'apps/api/src/entrypoints/http/httpErrorTranslation.ts',
    'apps/api/test/entrypoints/http/httpBearerAuthentication.test.ts',
  ]) {
    assert.match(apiHttpLeafMigration.sql, new RegExp(sourcePath.replaceAll('/', '\\/')));
  }

  assert.match(apiHttpLeafMigration.sql, /AuthenticateHttpBearerPrincipal/);
  assert.match(apiHttpLeafMigration.sql, /StartRun/);
  assert.match(apiHttpLeafMigration.sql, /ListWorkspacePlugins/);
  assert.match(apiHttpLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(apiHttpLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(apiHttpLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.doesNotMatch(apiHttpLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(apiHttpLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiHttpLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep API HTTP authentication integrity before source refresh', () => {
  const migrations = readMigrationFiles();
  const apiHttpIntegrityFollowup = migrations.find(
    (migration) => migration.fileName === '184_api_http_entrypoint_integrity_followup.sql'
  );

  assert.ok(apiHttpIntegrityFollowup);
  assert.match(
    apiHttpIntegrityFollowup.sql,
    /PLANNING-DB-API-HTTP-ENTRYPOINT-INTEGRITY-FOLLOWUP-20260618/
  );
  assert.match(apiHttpIntegrityFollowup.sql, /SYS-API-HTTP-AUTHENTICATION/);
  assert.match(apiHttpIntegrityFollowup.sql, /apps\/api\/src\/entrypoints\/http\/authHeaders\.ts/);
  assert.match(
    apiHttpIntegrityFollowup.sql,
    /apps\/api\/src\/entrypoints\/http\/httpBearerAuthentication\.ts/
  );
  assert.match(apiHttpIntegrityFollowup.sql, /code-symbol-duplicates/);
  assert.doesNotMatch(apiHttpIntegrityFollowup.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(apiHttpIntegrityFollowup.sql, /delete\s+from/i);
  assert.doesNotMatch(apiHttpIntegrityFollowup.sql, /truncate\s+/i);
});

test('tracked migrations split API test evidence into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const apiTestLeafMigration = migrations.find(
    (migration) => migration.fileName === '185_api_test_leaf_components.sql'
  );

  assert.ok(apiTestLeafMigration);
  assert.match(apiTestLeafMigration.sql, /create temporary table api_test_leaf_map/);

  for (const componentId of [
    'SYS-API-TESTS-APP-ROUTE-SHELL',
    'SYS-API-TESTS-APPLICATION-SERVICES',
    'SYS-API-TESTS-ARCHITECTURE-CONTRACTS',
    'SYS-API-TESTS-FIXTURES',
    'SYS-API-TESTS-INFRASTRUCTURE',
    'SYS-API-TESTS-INTEGRATION',
    'SYS-API-TESTS-MODULE-COMPOSITION',
    'SYS-API-TESTS-PLUGIN-CONFIG',
  ]) {
    assert.match(apiTestLeafMigration.sql, new RegExp(componentId));
  }

  for (const sourcePath of [
    'apps/api/test/app/**',
    'apps/api/test/application/**',
    'apps/api/test/architecture/**',
    'apps/api/test/fixtures/**',
    'apps/api/test/infrastructure/**',
    'apps/api/test/integration/**',
    'apps/api/test/modules/**',
    'apps/api/test/plugins/**',
  ]) {
    assert.match(
      apiTestLeafMigration.sql,
      new RegExp(sourcePath.replaceAll('/', '\\/').replaceAll('*', '\\*'))
    );
  }

  assert.match(apiTestLeafMigration.sql, /ValidateApiApplicationServices/);
  assert.match(apiTestLeafMigration.sql, /ValidateApiProtectedRuntimeIntegration/);
  assert.match(apiTestLeafMigration.sql, /SYS-API-HTTP-ENTRYPOINT-TESTS/);
  assert.match(apiTestLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(apiTestLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(apiTestLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.match(apiTestLeafMigration.sql, /repo_path = 'apps\/api\/test'/);
  assert.doesNotMatch(apiTestLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(apiTestLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiTestLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep the governance problem dashboard on lightweight views', () => {
  const migrations = readMigrationFiles();
  const dashboardMigration = migrations.find(
    (migration) => migration.fileName === '106_lightweight_governance_problem_dashboard.sql'
  );

  assert.ok(dashboardMigration);
  assert.match(
    dashboardMigration.sql,
    /create or replace view planning_query_store\.governance_problem_dashboard_query/
  );
  assert.match(dashboardMigration.sql, /planning_query_store\.code_symbol_problem_query/);
  assert.match(dashboardMigration.sql, /planning_query_store\.governed_source_drift_query/);
  assert.doesNotMatch(dashboardMigration.sql, /planning_query_store\.component_integrity_query/);
});

test('tracked migrations retire active TAREA rail duplicates and repoint missing local rail sources', () => {
  const migrations = readMigrationFiles();
  const sourceDriftMigration = migrations.find(
    (migration) => migration.fileName === '107_retire_tarea_rail_duplicates_and_repoint_sources.sql'
  );

  assert.ok(sourceDriftMigration);
  assert.match(sourceDriftMigration.sql, /CANVAS-SOURCE-IMPORT-CONTEXT-PLACEMENT-20260617/);
  assert.match(sourceDriftMigration.sql, /CANVAS-DBT-TEST-METADATA-WORKBENCH-20260616/);
  assert.match(sourceDriftMigration.sql, /CANVAS-EMPTY-CONTEXT-MENU-PASSTHROUGH-20260616/);
  assert.match(sourceDriftMigration.sql, /CANVAS-CONTEXT-MENU-STABLE-RIGHT-CLICK-20260617/);
  assert.match(sourceDriftMigration.sql, /agent-prompt:21-component-architecture-fitness-dbfirst/);
  assert.match(sourceDriftMigration.sql, /planning-db:task:E\/E-MS-GAP-012-TRANSFORM-SELECTION-1/);
  assert.match(sourceDriftMigration.sql, /rail_status = 'retired'/);
  assert.match(sourceDriftMigration.sql, /planning-db-component-coherence-prompt-20260615\.md/);
  assert.doesNotMatch(sourceDriftMigration.sql, /delete from planning_query_store/);
});

test('tracked migrations repoint VerifyCanvasUiRail away from missing migration source', () => {
  const migrations = readMigrationFiles();
  const verifyCanvasUiRailMigration = migrations.find(
    (migration) => migration.fileName === '157_repoint_verify_canvas_ui_rail_source.sql'
  );

  assert.ok(verifyCanvasUiRailMigration);
  assert.match(verifyCanvasUiRailMigration.sql, /VerifyCanvasUiRail/);
  assert.match(verifyCanvasUiRailMigration.sql, /verifycanvasuirail/);
  assert.match(
    verifyCanvasUiRailMigration.sql,
    /150_web_canvas_context_menu_retirement_feature_mechanization\.sql/
  );
  assert.match(verifyCanvasUiRailMigration.sql, /f29c-canvas-insert-palette-plan-20260525\.md/);
  assert.match(verifyCanvasUiRailMigration.sql, /deprecatedSourcePath/);
  assert.doesNotMatch(verifyCanvasUiRailMigration.sql, /delete from planning_query_store/);
});

test('tracked migrations repoint non-canonical Canvas UI rail rows away from missing source', () => {
  const migrations = readMigrationFiles();
  const allCanvasUiRowsMigration = migrations.find(
    (migration) => migration.fileName === '158_repoint_all_canvas_ui_rail_missing_sources.sql'
  );

  assert.ok(allCanvasUiRowsMigration);
  assert.match(
    allCanvasUiRowsMigration.sql,
    /where rail\.source_path = 'tools\/planning-db\/migrations\/150_web_canvas_context_menu_retirement_feature_mechanization\.sql'/
  );
  assert.match(allCanvasUiRowsMigration.sql, /f29c-canvas-insert-palette-plan-20260525\.md/);
  assert.match(allCanvasUiRowsMigration.sql, /deprecatedSourcePath/);
  assert.match(allCanvasUiRowsMigration.sql, /non-canonical duplicate rows/);
  assert.doesNotMatch(allCanvasUiRowsMigration.sql, /delete from planning_query_store/);
});

test('tracked migrations reconcile BottomOperationalDrawer local authority to tracked files', () => {
  const migrations = readMigrationFiles();
  const bottomOperationalDrawerMigration = migrations.find(
    (migration) =>
      migration.fileName === '159_reconcile_web_bottom_operational_drawer_local_authority.sql'
  );

  assert.ok(bottomOperationalDrawerMigration);
  assert.match(
    bottomOperationalDrawerMigration.sql,
    /156_web_bottom_operational_drawer_component\.sql/
  );
  assert.match(
    bottomOperationalDrawerMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasOperationalDrawerContributionRegistrar\.tsx/
  );
  assert.match(
    bottomOperationalDrawerMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomConsoleDrawerModel\.ts/
  );
  assert.match(
    bottomOperationalDrawerMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/OperationalDrawerPanels\.tsx/
  );
  assert.match(
    bottomOperationalDrawerMigration.sql,
    /repo_path = 'apps\/web\/src\/app\/components\/console'/
  );
  assert.match(
    bottomOperationalDrawerMigration.sql,
    /TEST-SYS-WEB-APP-COMPONENTS-OPERATIONAL-DRAWER/
  );
  assert.match(bottomOperationalDrawerMigration.sql, /deprecatedSourcePath/);
  assert.match(bottomOperationalDrawerMigration.sql, /not a tracked implementation file/);
  assert.doesNotMatch(bottomOperationalDrawerMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(bottomOperationalDrawerMigration.sql, /truncate\s+/i);
});

test('tracked migrations sanitize post-import component architecture anchors', () => {
  const migrations = readMigrationFiles();
  const anchorMigration = migrations.find(
    (migration) =>
      migration.fileName === '160_component_integrity_post_import_anchor_sanitization.sql'
  );

  assert.ok(anchorMigration);
  assert.match(
    anchorMigration.sql,
    /PLANNING-DB-COMPONENT-INTEGRITY-POST-IMPORT-ANCHOR-SANITIZATION-20260618/
  );
  assert.match(
    anchorMigration.sql,
    /SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS'[\s\S]+001_content_read_model\.sql/
  );
  assert.match(
    anchorMigration.sql,
    /packages\/@dvt\/contracts\/test\/plan-version\.contract\.test\.ts/
  );
  assert.match(anchorMigration.sql, /buzon\/pretest-inventory-db\.md/);
  assert.match(anchorMigration.sql, /infra\/db\/migrations\/2026-03-04_g3_start_run_intent\.sql/);
  assert.match(anchorMigration.sql, /SYS-PLANSTORE-TEMPORAL-COMPOSITION/);
  assert.match(anchorMigration.sql, /packages\/@dvt\/adapter-temporal\/src/);
  assert.doesNotMatch(anchorMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(anchorMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint Fowler inbox architecture anchor to tracked source', () => {
  const migrations = readMigrationFiles();
  const fowlerAnchorMigration = migrations.find(
    (migration) => migration.fileName === '161_repoint_fowler_inbox_component_anchor.sql'
  );

  assert.ok(fowlerAnchorMigration);
  assert.match(fowlerAnchorMigration.sql, /SYS-REPO-METADATA-FOWLER-INBOX/);
  assert.match(
    fowlerAnchorMigration.sql,
    /buzon\/20260423-codex-fowler-access-decision-component-analysis-and-remediation\.md/
  );
  assert.doesNotMatch(fowlerAnchorMigration.sql, /pretest-inventory-db\.md/);
  assert.doesNotMatch(fowlerAnchorMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(fowlerAnchorMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep component integrity on a lightweight read model', () => {
  const migrations = readMigrationFiles();
  const lightweightIntegrityMigration = migrations.find(
    (migration) => migration.fileName === '162_component_integrity_lightweight_read_model.sql'
  );

  assert.ok(lightweightIntegrityMigration);
  assert.match(
    lightweightIntegrityMigration.sql,
    /PLANNING-DB-COMPONENT-INTEGRITY-LIGHTWEIGHT-READMODEL-20260618/
  );
  assert.match(
    lightweightIntegrityMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/
  );
  assert.match(lightweightIntegrityMigration.sql, /component_tree as materialized/);
  assert.match(lightweightIntegrityMigration.sql, /file_ownership as materialized/);
  assert.match(lightweightIntegrityMigration.sql, /sourceSummary/);
  assert.doesNotMatch(
    lightweightIntegrityMigration.sql,
    /from planning_query_store\.component_engineering_component_metadata_query/
  );
  assert.doesNotMatch(lightweightIntegrityMigration.sql, /source_paths/);
  assert.doesNotMatch(lightweightIntegrityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(lightweightIntegrityMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep component integrity off the heavy quality rollup', () => {
  const migrations = readMigrationFiles();
  const qualityLiteMigration = migrations.find(
    (migration) =>
      migration.fileName === '163_component_integrity_drop_heavy_quality_dependency.sql'
  );

  assert.ok(qualityLiteMigration);
  assert.match(qualityLiteMigration.sql, /PLANNING-DB-COMPONENT-INTEGRITY-QUALITY-LITE-20260618/);
  assert.match(
    qualityLiteMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/
  );
  assert.match(qualityLiteMigration.sql, /component_test_file_counts as materialized/);
  assert.match(qualityLiteMigration.sql, /leaf_component_id as component_id/);
  assert.match(qualityLiteMigration.sql, /file_role = 'test'/);
  assert.match(qualityLiteMigration.sql, /quality_state/);
  assert.doesNotMatch(qualityLiteMigration.sql, /component_engineering_quality_query/);
  assert.doesNotMatch(qualityLiteMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(qualityLiteMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint bottom operational drawer local feature sources', () => {
  const migrations = readMigrationFiles();
  const drawerSourceMigration = migrations.find(
    (migration) =>
      migration.fileName === '164_repoint_bottom_operational_drawer_local_feature_sources.sql'
  );

  assert.ok(drawerSourceMigration);
  assert.match(
    drawerSourceMigration.sql,
    /PLANNING-DB-BOTTOM-OPERATIONAL-DRAWER-LOCAL-SOURCE-REPOINT-20260618/
  );
  assert.match(drawerSourceMigration.sql, /feature_mechanization_local_rails/);
  assert.match(
    drawerSourceMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomConsoleDrawerModel\.ts/
  );
  assert.match(
    drawerSourceMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/OperationalDrawerPanels\.tsx/
  );
  assert.match(drawerSourceMigration.sql, /deprecatedSourcePath/);
  assert.match(
    drawerSourceMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomOperationalDrawerLogModel\.ts/
  );
  assert.match(
    drawerSourceMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/BottomOperationalDrawer\.tsx/
  );
  assert.doesNotMatch(drawerSourceMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(drawerSourceMigration.sql, /truncate\s+/i);
});

test('tracked migrations stabilize deprecated bottom operational drawer sources without inventory dependency', () => {
  const migrations = readMigrationFiles();
  const drawerSourceMigration = migrations.find(
    (migration) =>
      migration.fileName === '165_stabilize_bottom_operational_drawer_deprecated_sources.sql'
  );

  assert.ok(drawerSourceMigration);
  assert.match(drawerSourceMigration.sql, /feature_mechanization_local_rails/);
  assert.match(
    drawerSourceMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomConsoleDrawerModel\.ts/
  );
  assert.match(
    drawerSourceMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/OperationalDrawerPanels\.tsx/
  );
  assert.match(drawerSourceMigration.sql, /deprecatedSourcePaths/);
  assert.match(drawerSourceMigration.sql, /currentImplementationSourcePath/);
  assert.match(drawerSourceMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(drawerSourceMigration.sql, /coalesce\(\s*\(\s*select file_ref\.content_hash/);
  assert.doesNotMatch(drawerSourceMigration.sql, /join source_files/i);
  assert.doesNotMatch(
    drawerSourceMigration.sql,
    /from planning_query_store\.governance_file_query/i
  );
  assert.doesNotMatch(drawerSourceMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(drawerSourceMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete bottom operational drawer manifest required fields', () => {
  const migrations = readMigrationFiles();
  const drawerManifestMigration = migrations.find(
    (migration) =>
      migration.fileName === '169_bottom_operational_drawer_manifest_required_fields.sql'
  );

  assert.ok(drawerManifestMigration);
  assert.match(drawerManifestMigration.sql, /UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1/);
  assert.match(drawerManifestMigration.sql, /cypressCoverage/);
  assert.match(drawerManifestMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(drawerManifestMigration.sql, /deprecatedSourcePaths/);
  assert.match(
    drawerManifestMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomConsoleDrawerModel\.ts/
  );
  assert.match(
    drawerManifestMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/OperationalDrawerPanels\.tsx/
  );
  assert.doesNotMatch(drawerManifestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(drawerManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Web Canvas residual files into semantic components', () => {
  const migrations = readMigrationFiles();
  const canvasSplitMigration = migrations.find(
    (migration) => migration.fileName === '166_web_canvas_residual_component_split.sql'
  );

  assert.ok(canvasSplitMigration);
  assert.match(canvasSplitMigration.sql, /PLANNING-DB-WEB-CANVAS-RESIDUAL-SPLIT-20260618/);
  assert.match(canvasSplitMigration.sql, /SYS-WEB-CANVAS-DRAFT-LIFECYCLE/);
  assert.match(canvasSplitMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-INTERACTION/);
  assert.match(canvasSplitMigration.sql, /SYS-WEB-CANVAS-COPY-LOCALIZATION/);
  assert.match(canvasSplitMigration.sql, /governance_component_local_ownership_patterns/);
  assert.match(canvasSplitMigration.sql, /architecture\.component/);
  assert.match(canvasSplitMigration.sql, /architecture\.component_test/);
  assert.match(canvasSplitMigration.sql, /apps\/web\/src\/app\/views\/canvas\/copy\.test\.ts/);
  assert.match(canvasSplitMigration.sql, /SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES/);
  assert.doesNotMatch(canvasSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations sanitize Web Canvas split maturity and repo path anchors', () => {
  const migrations = readMigrationFiles();
  const canvasMaturityMigration = migrations.find(
    (migration) => migration.fileName === '167_web_canvas_split_maturity_and_path_sanitization.sql'
  );

  assert.ok(canvasMaturityMigration);
  assert.match(canvasMaturityMigration.sql, /repo_path_repoints/);
  assert.match(
    canvasMaturityMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasShellChromeStateBuilder\.ts/
  );
  assert.match(
    canvasMaturityMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuPrimitives\.tsx/
  );
  assert.match(canvasMaturityMigration.sql, /architecture\.component_observability/);
  assert.match(canvasMaturityMigration.sql, /not_applicable/);
  assert.match(canvasMaturityMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-INTERACTION/);
  assert.doesNotMatch(canvasMaturityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasMaturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations map Canvas output target template catalog out of residual ownership', () => {
  const migrations = readMigrationFiles();
  const outputTargetMigration = migrations.find(
    (migration) => migration.fileName === '168_web_canvas_output_target_template_component.sql'
  );

  assert.ok(outputTargetMigration);
  assert.match(outputTargetMigration.sql, /SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES/);
  assert.match(
    outputTargetMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasOutputTargetTemplateCatalog/
  );
  assert.match(outputTargetMigration.sql, /ListCanvasOutputTargetTemplates/);
  assert.match(outputTargetMigration.sql, /buildCanvasOutputTargetTemplateCatalog/);
  assert.match(outputTargetMigration.sql, /published_language/);
  assert.match(outputTargetMigration.sql, /architecture\.component_test/);
  assert.match(outputTargetMigration.sql, /CanvasAddNodePalette\.test\.tsx/);
  assert.match(outputTargetMigration.sql, /architecture\.component_observability/);
  assert.doesNotMatch(outputTargetMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(outputTargetMigration.sql, /truncate\s+/i);
});

test('tracked migrations deprecate Canvas output target duplicate and repoint drawer rails', () => {
  const migrations = readMigrationFiles();
  const driftRepairMigration = migrations.find(
    (migration) =>
      migration.fileName === '170_deprecate_canvas_output_target_and_repoint_drawer_rails.sql'
  );

  assert.ok(driftRepairMigration);
  assert.match(driftRepairMigration.sql, /PLANNING-DB-CANVAS-OUTPUT-TARGET-DEPRECATION/);
  assert.match(driftRepairMigration.sql, /SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES/);
  assert.match(driftRepairMigration.sql, /status = 'deprecated'/);
  assert.match(driftRepairMigration.sql, /status = 'legacy'/);
  assert.match(driftRepairMigration.sql, /SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT/);
  assert.match(
    driftRepairMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasOutputTargetTemplateCatalog\.ts/
  );
  assert.match(
    driftRepairMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomOperationalDrawerLogModel\.ts/
  );
  assert.match(
    driftRepairMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/BottomOperationalDrawer\.tsx/
  );
  assert.match(
    driftRepairMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/bottomConsoleDrawerModel\.ts/
  );
  assert.match(driftRepairMigration.sql, /deprecatedSourcePaths/);
  assert.match(driftRepairMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(driftRepairMigration.sql, /currentImplementationSourcePath/);
  assert.match(driftRepairMigration.sql, /cypressCoverage/);
  assert.doesNotMatch(driftRepairMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(driftRepairMigration.sql, /truncate\s+/i);
});

test('tracked migrations reparent deprecated Canvas output target under legacy retirement', () => {
  const migrations = readMigrationFiles();
  const reparentMigration = migrations.find(
    (migration) =>
      migration.fileName === '171_reparent_deprecated_canvas_output_target_component.sql'
  );

  assert.ok(reparentMigration);
  assert.match(reparentMigration.sql, /SYS-WEB-CANVAS-OUTPUT-TARGET-TEMPLATES/);
  assert.match(reparentMigration.sql, /SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT/);
  assert.match(
    reparentMigration.sql,
    /parent_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT'/
  );
  assert.match(reparentMigration.sql, /component-quality/);
  assert.doesNotMatch(reparentMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(reparentMigration.sql, /truncate\s+/i);
});

test('tracked migrations move Canvas output target relation to legacy retirement', () => {
  const migrations = readMigrationFiles();
  const relationMigration = migrations.find(
    (migration) =>
      migration.fileName === '172_move_canvas_output_target_relation_to_legacy_retirement.sql'
  );

  assert.ok(relationMigration);
  assert.match(relationMigration.sql, /SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT/);
  assert.match(
    relationMigration.sql,
    /REL-WEB-CANVAS-LEGACY-ADD-NODE-RETIREMENT-CONTAINS-OUTPUT-TARGET-TEMPLATES/
  );
  assert.match(
    relationMigration.sql,
    /REL-WEB-CANVAS-NODE-EDGE-AUTHORING-CONTAINS-OUTPUT-TARGET-TEMPLATES/
  );
  assert.match(
    relationMigration.sql,
    /source_component_id = 'SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT'/
  );
  assert.match(relationMigration.sql, /'deprecated'/);
  assert.doesNotMatch(relationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(relationMigration.sql, /truncate\s+/i);
});

test('tracked migrations leaf deprecated Canvas add-node palette paths', () => {
  const migrations = readMigrationFiles();
  const legacyPaletteLeafMigration = migrations.find(
    (migration) =>
      migration.fileName === '173_leaf_canvas_legacy_add_node_palette_deprecated_paths.sql'
  );

  assert.ok(legacyPaletteLeafMigration);
  assert.match(legacyPaletteLeafMigration.sql, /SYS-WEB-CANVAS-ADD-NODE-PALETTE/);
  assert.match(legacyPaletteLeafMigration.sql, /SYS-WEB-CANVAS-LEGACY-ADD-NODE-PALETTE-RETIREMENT/);
  assert.match(
    legacyPaletteLeafMigration.sql,
    /REL-WEB-CANVAS-LEGACY-ADD-NODE-RETIREMENT-CONTAINS-ADD-NODE-PALETTE/
  );
  assert.match(legacyPaletteLeafMigration.sql, /file_without_leaf_component/);
  assert.match(
    legacyPaletteLeafMigration.sql,
    /tools\/planning-db\/migrations\/149_web_canvas_legacy_palette_deprecated_paths\.sql/
  );
  assert.match(
    legacyPaletteLeafMigration.sql,
    /delete from planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.doesNotMatch(legacyPaletteLeafMigration.sql, /delete\s+from\s+architecture\./i);
  assert.doesNotMatch(legacyPaletteLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire orphan canvas node workbench overlay rails', () => {
  const migrations = readMigrationFiles();
  const orphanOverlayMigration = migrations.find(
    (migration) => migration.fileName === '108_retire_canvas_node_workbench_overlay_orphan.sql'
  );

  assert.ok(orphanOverlayMigration);
  assert.match(orphanOverlayMigration.sql, /CANVAS-NODE-WORKBENCH-PRESENTATION-BOUNDARY-20260617/);
  assert.match(orphanOverlayMigration.sql, /CanvasNodeWorkbenchOverlay\.tsx/);
  assert.match(orphanOverlayMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY/);
  assert.match(orphanOverlayMigration.sql, /CANVAS-CONTEXT-MENU-STABLE-RIGHT-CLICK-20260617/);
  assert.match(orphanOverlayMigration.sql, /rail_status = 'retired'/);
  assert.match(orphanOverlayMigration.sql, /status = 'deprecated'/);
  assert.match(orphanOverlayMigration.sql, /target_component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH'/);
  assert.match(
    orphanOverlayMigration.sql,
    /REL-WEB-CANVAS-SHELL-MAIN-PANEL-DEPENDS-ON-NODE-WORKBENCH/
  );
  assert.doesNotMatch(orphanOverlayMigration.sql, /delete\s+from/i);
});

test('tracked migrations exclude retired rails from active duplicate vocabulary checks', () => {
  const migrations = readMigrationFiles();
  const deprecationMigration = migrations.find(
    (migration) => migration.fileName === '082_rail_vocabulary_deprecation_hardening.sql'
  );

  assert.ok(deprecationMigration);
  assert.match(
    deprecationMigration.sql,
    /lower\(coalesce\(rail_status, ''\)\) not in \('deprecated', 'retired'\)/
  );
  assert.match(deprecationMigration.sql, /surfacePrefixRule', 'api\|ui\|cli\|worker\|adapter'/);
  assert.doesNotMatch(deprecationMigration.sql, /surfacePrefixRule', '.*workflow/);
});

test('tracked migrations expose surface-named gap rails in vocabulary findings', () => {
  const migrations = readMigrationFiles();
  const surfaceGapMigration = migrations.find(
    (migration) => migration.fileName === '099_surface_named_gap_rail_vocabulary.sql'
  );

  assert.ok(surfaceGapMigration);
  assert.match(
    surfaceGapMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_vocabulary_query/
  );
  assert.match(surfaceGapMigration.sql, /rail\.vocabulary_state in \('active', 'gap'\)/);
  assert.match(surfaceGapMigration.sql, /surfacePrefixRule', 'api\|ui\|cli\|worker\|adapter'/);
  assert.doesNotMatch(surfaceGapMigration.sql, /surfacePrefixRule', '.*workflow/);
});

test('tracked migrations keep surface-named rails out of the generic gap bucket', () => {
  const migrations = readMigrationFiles();
  const exclusiveGapMigration = migrations.find(
    (migration) => migration.fileName === '100_exclude_surface_named_gap_rails.sql'
  );

  assert.ok(exclusiveGapMigration);
  assert.match(
    exclusiveGapMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_vocabulary_query/
  );
  assert.match(
    exclusiveGapMigration.sql,
    /rail\.rail_name !~\* '\^\(api\|ui\|cli\|worker\|adapter\)'/
  );
  assert.match(exclusiveGapMigration.sql, /rail\.vocabulary_state in \('active', 'gap'\)/);
  assert.doesNotMatch(exclusiveGapMigration.sql, /surfacePrefixRule', '.*workflow/);
});

test('tracked migrations keep rail vocabulary rollups materialized for dashboard reads', () => {
  const migrations = readMigrationFiles();
  const vocabularyPerformanceMigration = migrations.find(
    (migration) => migration.fileName === '271_materialize_rail_vocabulary_semantic_rollup.sql'
  );

  assert.ok(vocabularyPerformanceMigration);
  assert.match(
    vocabularyPerformanceMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_vocabulary_query/
  );
  assert.match(vocabularyPerformanceMigration.sql, /semantic_rollup as materialized/i);
  assert.match(
    vocabularyPerformanceMigration.sql,
    /from planning_query_store\.command_query_rail_query rail/
  );
  assert.match(
    vocabularyPerformanceMigration.sql,
    /surfacePrefixRule', 'api\|ui\|cli\|worker\|adapter'/
  );
});

test('tracked migrations keep command query rail reference rollups materialized', () => {
  const migrations = readMigrationFiles();
  const railProjectionPerformanceMigration = migrations.find(
    (migration) => migration.fileName === '272_materialize_command_query_rail_reference_rollup.sql'
  );

  assert.ok(railProjectionPerformanceMigration);
  assert.match(
    railProjectionPerformanceMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(railProjectionPerformanceMigration.sql, /reference_rollup as materialized/i);
  assert.match(
    railProjectionPerformanceMigration.sql,
    /from planning_query_store\.command_query_rail_manifest_query rail/
  );
  assert.match(railProjectionPerformanceMigration.sql, /has_active_local_non_gap/);
});

test('tracked migrations retire the orphan canvas contextual graph surface rail duplicate', () => {
  const migrations = readMigrationFiles();
  const orphanRailMigration = migrations.find(
    (migration) =>
      migration.fileName === '091_retire_orphan_canvas_contextual_graph_surface_rail.sql'
  );

  assert.ok(orphanRailMigration);
  assert.match(orphanRailMigration.sql, /planning_query_store\.command_query_rails/);
  assert.match(orphanRailMigration.sql, /CANVAS-ACTIVE-CANVAS-TOPBAR-IDENTITY-20260615/);
  assert.match(orphanRailMigration.sql, /CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1/);
  assert.match(
    orphanRailMigration.sql,
    /normalized_rail_name = 'rendercanvascontextualgraphsurface'/
  );
  assert.match(orphanRailMigration.sql, /source_path = 'buzon\/TAREA\.TXT'/);
  assert.match(orphanRailMigration.sql, /rail_status = 'retired'/);
  assert.doesNotMatch(
    orphanRailMigration.sql,
    /delete\s+from\s+planning_query_store\.command_query_rails/i
  );
});

test('tracked migrations retire the contextual graph node card read model duplicate', () => {
  const migrations = readMigrationFiles();
  const duplicateRailMigration = migrations.find(
    (migration) =>
      migration.fileName === '092_retire_contextual_graph_node_card_read_model_duplicate.sql'
  );

  assert.ok(duplicateRailMigration);
  assert.match(
    duplicateRailMigration.sql,
    /planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(duplicateRailMigration.sql, /CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1/);
  assert.match(duplicateRailMigration.sql, /CANVAS-CARD-STRATEGY-PROJECTION-20260616/);
  assert.match(
    duplicateRailMigration.sql,
    /normalized_rail_name = 'projectgraphnodecardreadmodel'/
  );
  assert.match(duplicateRailMigration.sql, /rail_status = 'retired'/);
  assert.match(duplicateRailMigration.sql, /mechanization_status = 'closed'/);
  assert.match(duplicateRailMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.doesNotMatch(
    duplicateRailMigration.sql,
    /feature_id = 'CANVAS-CARD-STRATEGY-PROJECTION-20260616'/
  );
});

test('tracked migrations repoint the retired topbar contextual graph surface rail source', () => {
  const migrations = readMigrationFiles();
  const sourceRepointMigration = migrations.find(
    (migration) =>
      migration.fileName === '093_repoint_retired_topbar_contextual_graph_surface_rail_source.sql'
  );

  assert.ok(sourceRepointMigration);
  assert.match(
    sourceRepointMigration.sql,
    /planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(sourceRepointMigration.sql, /CANVAS-ACTIVE-CANVAS-TOPBAR-IDENTITY-20260615/);
  assert.match(sourceRepointMigration.sql, /CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1/);
  assert.match(
    sourceRepointMigration.sql,
    /normalized_rail_name = 'rendercanvascontextualgraphsurface'/
  );
  assert.match(
    sourceRepointMigration.sql,
    /docs\/planning\/proposals\/mandatory\/governance-and-docs\/planning-db-component-coherence-prompt-20260615\.md/
  );
  assert.match(sourceRepointMigration.sql, /rail_status = 'retired'/);
  assert.match(sourceRepointMigration.sql, /mechanization_status = 'closed'/);
  assert.doesNotMatch(
    sourceRepointMigration.sql,
    /feature_id = 'CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1'/
  );
});

test('tracked migrations repoint the retired contextual graph node card rail source', () => {
  const migrations = readMigrationFiles();
  const sourceRepointMigration = migrations.find(
    (migration) =>
      migration.fileName === '094_repoint_retired_contextual_graph_node_card_rail_source.sql'
  );

  assert.ok(sourceRepointMigration);
  assert.match(
    sourceRepointMigration.sql,
    /planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(sourceRepointMigration.sql, /CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1/);
  assert.match(
    sourceRepointMigration.sql,
    /normalized_rail_name = 'projectgraphnodecardreadmodel'/
  );
  assert.match(sourceRepointMigration.sql, /rail_status = 'retired'/);
  assert.match(
    sourceRepointMigration.sql,
    /docs\/planning\/proposals\/mandatory\/governance-and-docs\/planning-db-component-coherence-prompt-20260615\.md/
  );
  assert.doesNotMatch(
    sourceRepointMigration.sql,
    /feature_id = 'CANVAS-CARD-STRATEGY-PROJECTION-20260616'/
  );
});

test('tracked migrations repoint feature mechanization operation prompt sources', () => {
  const migrations = readMigrationFiles();
  const operationSourceMigration = migrations.find(
    (migration) =>
      migration.fileName === '095_repoint_feature_mechanization_operation_prompt_sources.sql'
  );

  assert.ok(operationSourceMigration);
  assert.match(
    operationSourceMigration.sql,
    /planning_query_store\.feature_mechanization_local_operations/
  );
  assert.match(operationSourceMigration.sql, /payload = jsonb_set/);
  assert.match(operationSourceMigration.sql, /\{sourceRef\}/);
  assert.match(operationSourceMigration.sql, /\{implementationPlan\}/);
  assert.match(
    operationSourceMigration.sql,
    /docs\/planning\/proposals\/mandatory\/governance-and-docs\/planning-db-component-coherence-prompt-20260615\.md/
  );
  assert.doesNotMatch(operationSourceMigration.sql, /delete\s+from/i);
});

test('tracked migrations canonicalize the canvas contextual graph surface owner', () => {
  const migrations = readMigrationFiles();
  const ownerMigration = migrations.find(
    (migration) =>
      migration.fileName === '096_canonicalize_canvas_contextual_graph_surface_owner.sql'
  );

  assert.ok(ownerMigration);
  assert.match(ownerMigration.sql, /CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1/);
  assert.match(ownerMigration.sql, /normalized_rail_name = 'rendercanvascontextualgraphsurface'/);
  assert.match(ownerMigration.sql, /ddd_owner = 'web\.component\.canvas\.CanvasViewport'/);
  assert.match(ownerMigration.sql, /rail_status = 'implemented'/);
  assert.match(ownerMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(ownerMigration.sql, /CANVAS-RESPONSIVE-SHELL-SURFACE-20260616/);
});

test('tracked migrations retire the responsive shell contextual graph surface duplicate', () => {
  const migrations = readMigrationFiles();
  const duplicateMigration = migrations.find(
    (migration) =>
      migration.fileName === '097_retire_responsive_shell_contextual_graph_surface_duplicate.sql'
  );

  assert.ok(duplicateMigration);
  assert.match(duplicateMigration.sql, /CANVAS-RESPONSIVE-SHELL-SURFACE-20260616/);
  assert.match(duplicateMigration.sql, /CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1/);
  assert.match(
    duplicateMigration.sql,
    /normalized_rail_name = 'rendercanvascontextualgraphsurface'/
  );
  assert.match(duplicateMigration.sql, /rail_status = 'retired'/);
  assert.match(duplicateMigration.sql, /mechanization_status = 'closed'/);
  assert.doesNotMatch(
    duplicateMigration.sql,
    /feature_id = 'CANVAS-CONTEXTUAL-UX-DB-FIRST-MAPPING-1'/
  );
});

test('tracked migrations retire the source import ListWarehouseConnections duplicate', () => {
  const migrations = readMigrationFiles();
  const duplicateMigration = migrations.find(
    (migration) =>
      migration.fileName === '098_retire_source_import_list_warehouse_connections_duplicate.sql'
  );

  assert.ok(duplicateMigration);
  assert.match(duplicateMigration.sql, /CANVAS-SOURCE-IMPORT-DATABASE-ONLY-FLOW-20260616/);
  assert.match(duplicateMigration.sql, /ListWarehouseConnections/);
  assert.match(duplicateMigration.sql, /normalized_rail_name = 'listwarehouseconnections'/);
  assert.match(duplicateMigration.sql, /rail_status = 'retired'/);
  assert.match(duplicateMigration.sql, /mechanization_status = 'closed'/);
  assert.match(duplicateMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(
    duplicateMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations retire the source import ImportWarehouseSources duplicate', () => {
  const migrations = readMigrationFiles();
  const duplicateMigration = migrations.find(
    (migration) =>
      migration.fileName === '104_retire_source_import_import_warehouse_sources_duplicate.sql'
  );

  assert.ok(duplicateMigration);
  assert.match(duplicateMigration.sql, /CANVAS-SOURCE-IMPORT-COLUMNS-DEFAULT-20260616/);
  assert.match(duplicateMigration.sql, /ImportWarehouseSources/);
  assert.match(duplicateMigration.sql, /normalized_rail_name = 'importwarehousesources'/);
  assert.match(duplicateMigration.sql, /rail_status = 'retired'/);
  assert.match(duplicateMigration.sql, /mechanization_status = 'closed'/);
  assert.match(duplicateMigration.sql, /ADR-0058-warehouse-source-import-rails\.md/);
  assert.match(duplicateMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(
    duplicateMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations repoint the bottom operational drawer log rail away from retired console source', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '157_repoint_bottom_operational_drawer_log_model_rail.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /BuildBottomOperationalDrawerLogModel/i);
  assert.match(migration.sql, /bottomConsoleDrawerModel\.ts/);
  assert.match(migration.sql, /bottomOperationalDrawerLogModel\.ts/);
  assert.match(
    migration.sql,
    /source_path = 'apps\/web\/src\/app\/components\/shell\/bottomOperationalDrawerLogModel\.ts'/
  );
  assert.match(migration.sql, /normalized_rail_name = 'buildbottomoperationaldrawerlogmodel'/);
  assert.doesNotMatch(
    migration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations harden bottom operational drawer manifests away from console vocabulary', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '158_harden_bottom_operational_drawer_feature_manifests.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /BuildBottomOperationalDrawerLogModel/);
  assert.match(migration.sql, /RenderBottomOperationalDrawer/);
  assert.match(migration.sql, /BottomOperationalDrawerLogModel/);
  assert.match(migration.sql, /BottomOperationalProblemsPanel/);
  assert.match(migration.sql, /forbiddenImplementationSurfaces/);
  assert.match(migration.sql, /cypressCoverage/);
  assert.doesNotMatch(migration.sql, /BottomConsoleDrawerModel/);
  assert.doesNotMatch(migration.sql, /bottomConsoleDrawerModel\.test\.ts/);
});

test('tracked migrations allow audited governance component reparent operations', () => {
  const migrations = readMigrationFiles();
  const reparentMigration = migrations.find(
    (migration) => migration.fileName === '102_governance_component_reparent_operation.sql'
  );

  assert.ok(reparentMigration);
  assert.match(reparentMigration.sql, /governance_component_local_operations_operation_type_check/);
  assert.match(reparentMigration.sql, /'component_create'/);
  assert.match(reparentMigration.sql, /'component_reparent'/);
});

test('tracked migrations persist governance component reparent overlays outside import snapshots', () => {
  const migrations = readMigrationFiles();
  const reparentOverlayMigration = migrations.find(
    (migration) => migration.fileName === '103_governance_component_reparent_persistent_overlay.sql'
  );

  assert.ok(reparentOverlayMigration);
  assert.match(
    reparentOverlayMigration.sql,
    /create table if not exists planning_query_store\.governance_component_reparent_overrides/
  );
  assert.match(reparentOverlayMigration.sql, /operation_type = 'component_reparent'/);
  assert.match(
    reparentOverlayMigration.sql,
    /create or replace view planning_query_store\.governance_component_reparent_override_query/
  );
  assert.match(
    reparentOverlayMigration.sql,
    /create or replace view component_engineering\.component_tree_query/
  );
  assert.match(reparentOverlayMigration.sql, /coalesce\(reparent\.parent_id/);
  assert.doesNotMatch(
    reparentOverlayMigration.sql,
    /update\s+planning_query_store\.governance_components/i
  );
});

test('tracked migrations retire superseded aliases and remap DBT node card ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '109_retire_superseded_component_alias_and_dbt_node_card_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /local_definition\.status <> 'superseded'/);
  assert.match(ownershipMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG/);
  assert.match(ownershipMigration.sql, /children_required = false/);
  assert.match(ownershipMigration.sql, /SYS-WEB-CANVAS-DBT-NODE-CARD/);
  assert.match(
    ownershipMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/DbtNodeComponent\*/
  );
  assert.match(
    ownershipMigration.sql,
    /join planning_query_store\.governance_component_local_definitions component/
  );
  assert.match(ownershipMigration.sql, /SYS-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL/);
  assert.match(ownershipMigration.sql, /SYS-WEB-CANVAS-NODE-RENDERING-COMPONENTS/);
  assert.doesNotMatch(
    ownershipMigration.sql,
    /delete\s+from\s+planning_query_store\.governance_component_local_definitions/i
  );
});

test('tracked migrations backfill local component architecture authority', () => {
  const migrations = readMigrationFiles();
  const authorityMigration = migrations.find(
    (migration) => migration.fileName === '110_backfill_local_component_architecture_authority.sql'
  );

  assert.ok(authorityMigration);
  assert.match(authorityMigration.sql, /PLANNING-DB-LOCAL-COMPONENT-AUTHORITY-BACKFILL-20260617/);
  assert.match(
    authorityMigration.sql,
    /insert into planning_query_store\.governance_component_local_semantic_items/
  );
  assert.match(authorityMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(authorityMigration.sql, /insert into architecture\.component_responsibility/);
  assert.match(authorityMigration.sql, /insert into architecture\.component_relation/);
  assert.match(authorityMigration.sql, /insert into architecture\.component_test/);
  assert.match(authorityMigration.sql, /ValidateComponentIntegrity/);
  assert.match(authorityMigration.sql, /component_engineering_file_ownership_query/);
  assert.match(authorityMigration.sql, /component-profile/);
  assert.match(authorityMigration.sql, /component-integrity/);
  assert.match(authorityMigration.sql, /on conflict \(component_id\) do update/);
  assert.doesNotMatch(authorityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(authorityMigration.sql, /truncate\s+/i);
});

test('tracked migrations remap canvas context menu away from child palette path', () => {
  const migrations = readMigrationFiles();
  const contextMenuMigration = migrations.find(
    (migration) => migration.fileName === '111_remap_canvas_context_menu_architecture_path.sql'
  );

  assert.ok(contextMenuMigration);
  assert.match(contextMenuMigration.sql, /SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU/);
  assert.match(contextMenuMigration.sql, /SYS-WEB-CANVAS-ADD-NODE-PALETTE/);
  assert.match(
    contextMenuMigration.sql,
    /repo_path = 'apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuView\.tsx'/
  );
  assert.match(
    contextMenuMigration.sql,
    /and repo_path = 'apps\/web\/src\/app\/views\/canvas\/CanvasAddNodePalette\.tsx'/
  );
  assert.doesNotMatch(contextMenuMigration.sql, /delete\s+from/i);
});

test('tracked migrations create the Planning DB query limit helper component', () => {
  const migrations = readMigrationFiles();
  const helperMigration = migrations.find(
    (migration) => migration.fileName === '112_planning_db_query_limit_helper_component.sql'
  );

  assert.ok(helperMigration);
  assert.match(helperMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS'/);
  assert.match(helperMigration.sql, /Repository governance automation scripts/);
  assert.match(helperMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-LIMIT/);
  assert.match(helperMigration.sql, /scripts\/planning-db\/query-limit\.cjs/);
  assert.match(helperMigration.sql, /DetectCodeSymbolDuplicates/);
  assert.match(helperMigration.sql, /TEST-CI-GOVERNANCE-SCRIPTS-UNIT-COVERAGE/);
  assert.match(
    helperMigration.sql,
    /insert into planning_query_store\.governance_component_local_definitions/
  );
  assert.match(helperMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(helperMigration.sql, /insert into architecture\.component_responsibility/);
  assert.match(helperMigration.sql, /insert into architecture\.component_relation/);
  assert.match(helperMigration.sql, /insert into architecture\.component_test/);
  assert.match(helperMigration.sql, /hidden_authority/);
  assert.doesNotMatch(helperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperMigration.sql, /truncate\s+/i);
});

test('tracked migrations create the Planning DB query filter helper component', () => {
  const migrations = readMigrationFiles();
  const helperMigration = migrations.find(
    (migration) => migration.fileName === '247_planning_db_query_filter_helper_component.sql'
  );

  assert.ok(helperMigration);
  assert.match(helperMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER/);
  assert.match(helperMigration.sql, /scripts\/planning-db\/query-filter\.cjs/);
  assert.match(helperMigration.sql, /DetectCodeSymbolDuplicates/);
  assert.match(helperMigration.sql, /appendFilter/);
  assert.match(helperMigration.sql, /hidden_authority/);
  assert.match(helperMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(helperMigration.sql, /insert into architecture\.component_port/);
  assert.match(helperMigration.sql, /insert into architecture\.component_test/);
  assert.doesNotMatch(helperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperMigration.sql, /truncate\s+/i);
});

test('tracked migrations extend the Planning DB query filter helper component', () => {
  const migrations = readMigrationFiles();
  const helperMigration = migrations.find(
    (migration) => migration.fileName === '249_planning_db_query_filter_extended_helpers.sql'
  );

  assert.ok(helperMigration);
  assert.match(helperMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FILTER/);
  assert.match(helperMigration.sql, /appendBooleanFilter/);
  assert.match(helperMigration.sql, /appendBooleanParamFilter/);
  assert.match(helperMigration.sql, /appendComponentPairFilter/);
  assert.match(helperMigration.sql, /AppendPlanningDbBooleanLiteralFilter/);
  assert.match(helperMigration.sql, /AppendPlanningDbBooleanParamFilter/);
  assert.match(helperMigration.sql, /AppendPlanningDbComponentPairFilter/);
  assert.match(helperMigration.sql, /hidden_authority/);
  assert.match(helperMigration.sql, /insert into architecture\.component_port/);
  assert.doesNotMatch(helperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperMigration.sql, /truncate\s+/i);
});

test('tracked migrations create the Planning DB query format helper component', () => {
  const migrations = readMigrationFiles();
  const helperMigration = migrations.find(
    (migration) => migration.fileName === '250_planning_db_query_format_helper_component.sql'
  );

  assert.ok(helperMigration);
  assert.match(helperMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FORMAT/);
  assert.match(helperMigration.sql, /scripts\/planning-db\/query-format\.cjs/);
  assert.match(helperMigration.sql, /DetectCodeSymbolDuplicates/);
  assert.match(helperMigration.sql, /textValue/);
  assert.match(helperMigration.sql, /FormatPlanningDbQueryTextValue/);
  assert.match(helperMigration.sql, /hidden_authority/);
  assert.match(helperMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(helperMigration.sql, /insert into architecture\.component_port/);
  assert.match(helperMigration.sql, /insert into architecture\.component_test/);
  assert.doesNotMatch(helperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperMigration.sql, /truncate\s+/i);
});

test('tracked migrations extend the Planning DB query format helper to generated status consumers', () => {
  const migrations = readMigrationFiles();
  const helperMigration = migrations.find(
    (migration) =>
      migration.fileName === '251_planning_db_query_format_helper_generated_status_consumers.sql'
  );

  assert.ok(helperMigration);
  assert.match(helperMigration.sql, /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FORMAT/);
  assert.match(helperMigration.sql, /scripts\/generate-db-surface-inventory\.cjs/);
  assert.match(helperMigration.sql, /scripts\/generate-knowledge-intake-literature\.cjs/);
  assert.match(helperMigration.sql, /scripts\/planning-db-surface-inventory-check\.cjs/);
  assert.match(helperMigration.sql, /source_refs = jsonb_build_array/);
  assert.match(helperMigration.sql, /textValue helper/);
  assert.doesNotMatch(helperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperMigration.sql, /truncate\s+/i);
});

test('tracked migrations create the Planning DB frontend inventory table helper component', () => {
  const migrations = readMigrationFiles();
  const helperMigration = migrations.find(
    (migration) =>
      migration.fileName === '252_planning_db_frontend_inventory_table_helper_component.sql'
  );

  assert.ok(helperMigration);
  assert.match(
    helperMigration.sql,
    /SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS-FRONTEND-INVENTORY-TABLE/
  );
  assert.match(helperMigration.sql, /scripts\/planning-db\/frontend-inventory-table\.cjs/);
  assert.match(helperMigration.sql, /scripts\/planning-db\/frontend-component-inventory\.cjs/);
  assert.match(
    helperMigration.sql,
    /scripts\/planning-db\/frontend-mechanical-truth-inventory\.cjs/
  );
  assert.match(helperMigration.sql, /ListFrontendMechanicalTruthSurfaces/);
  assert.match(helperMigration.sql, /ListFrontendComponentReflection/);
  assert.match(helperMigration.sql, /ParsePlanningDbFrontendInventoryMarkdownTable/);
  assert.match(helperMigration.sql, /hidden_authority/);
  assert.match(helperMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(helperMigration.sql, /insert into architecture\.component_port/);
  assert.match(helperMigration.sql, /insert into architecture\.component_test/);
  assert.doesNotMatch(helperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire Canvas context-menu echo guard duplicate rail', () => {
  const migrations = readMigrationFiles();
  const duplicateRailMigration = migrations.find(
    (migration) =>
      migration.fileName === '248_retire_canvas_context_menu_echo_guard_duplicate_rail.sql'
  );

  assert.ok(duplicateRailMigration);
  assert.match(duplicateRailMigration.sql, /CANVAS-CONTEXTUAL-PROJECT-CODE-20260619/);
  assert.match(duplicateRailMigration.sql, /DVT-CANVAS-P0-PRO-FLOW-1/);
  assert.match(duplicateRailMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(duplicateRailMigration.sql, /rail_status = 'retired'/);
  assert.match(duplicateRailMigration.sql, /mechanization_status = 'closed'/);
  assert.match(duplicateRailMigration.sql, /aliasOf/);
  assert.match(duplicateRailMigration.sql, /canonicalRailFeatureId/);
  assert.match(duplicateRailMigration.sql, /rail-vocabulary/);
  assert.doesNotMatch(duplicateRailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(duplicateRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint stale Canvas test support local rails', () => {
  const migrations = readMigrationFiles();
  const canvasTestSupportMigration = migrations.find(
    (migration) => migration.fileName === '113_repoint_canvas_test_support_local_rails.sql'
  );

  assert.ok(canvasTestSupportMigration);
  assert.match(
    canvasTestSupportMigration.sql,
    /Confirmed against tracked CanvasInspectorPanel\.test\.support\.tsx/
  );
  assert.match(
    canvasTestSupportMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasInspectorPanel\.test\.support\.tsx/
  );
  assert.match(
    canvasTestSupportMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/useCanvasGraphHandlers\.nodeAuthoring\.test\.support\.ts/
  );
  assert.match(canvasTestSupportMigration.sql, /rail_status = 'implemented'/);
  assert.match(canvasTestSupportMigration.sql, /mechanization_status = 'implemented'/);
  assert.match(canvasTestSupportMigration.sql, /sourceRepointReason/);
  assert.match(canvasTestSupportMigration.sql, /pnpm planning:db:integrity:check/);
  assert.doesNotMatch(canvasTestSupportMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasTestSupportMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint Canvas reload recovery test support rails', () => {
  const migrations = readMigrationFiles();
  const canvasReloadSupportMigration = migrations.find(
    (migration) => migration.fileName === '114_repoint_canvas_reload_recovery_test_support_rail.sql'
  );

  assert.ok(canvasReloadSupportMigration);
  assert.match(
    canvasReloadSupportMigration.sql,
    /useCanvasController\.reloadRecovery\.test\.support\.ts/
  );
  assert.match(canvasReloadSupportMigration.sql, /createReloadRecoveryHarness/);
  assert.match(canvasReloadSupportMigration.sql, /reloadLatestDraft/);
  assert.match(canvasReloadSupportMigration.sql, /sourceRepointReason/);
  assert.match(canvasReloadSupportMigration.sql, /rail_status = 'implemented'/);
  assert.match(canvasReloadSupportMigration.sql, /noHumanDecisionsRemaining/);
  assert.match(canvasReloadSupportMigration.sql, /implementationPlan/);
  assert.match(canvasReloadSupportMigration.sql, /componentGuides/);
  assert.match(canvasReloadSupportMigration.sql, /redGreenCycles/);
  assert.match(canvasReloadSupportMigration.sql, /cypressCoverage/);
  assert.match(canvasReloadSupportMigration.sql, /fowlerSignals/);
  assert.doesNotMatch(
    canvasReloadSupportMigration.sql,
    /source_path = 'apps\/web\/src\/app\/views\/canvas\/useCanvasController\.reloadConflictRecovery\.test\.support\.ts'/
  );
  assert.match(canvasReloadSupportMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(canvasReloadSupportMigration.sql, /reloadProtectedDraft\.test\.tsx/);
  assert.doesNotMatch(
    canvasReloadSupportMigration.sql,
    /source_path = 'apps\/web\/src\/app\/views\/canvas\/useCanvasController\.reloadProtectedDraft\.test\.tsx'/
  );
  assert.doesNotMatch(canvasReloadSupportMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasReloadSupportMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint Canvas create-document command test support rails', () => {
  const migrations = readMigrationFiles();
  const canvasCreateDocumentSupportMigration = migrations.find(
    (migration) => migration.fileName === '115_repoint_canvas_create_document_test_support_rail.sql'
  );

  assert.ok(canvasCreateDocumentSupportMigration);
  assert.match(
    canvasCreateDocumentSupportMigration.sql,
    /canvasCreateCanvasDocumentCommand\.test\.ts/
  );
  assert.match(canvasCreateDocumentSupportMigration.sql, /buildCommandArgs/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /buildEmptyDraft/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /deprecatedSourcePaths/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /sourceRepointReason/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /rail_status = 'implemented'/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /noHumanDecisionsRemaining/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /implementationPlan/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /componentGuides/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /redGreenCycles/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /cypressCoverage/);
  assert.match(canvasCreateDocumentSupportMigration.sql, /fowlerSignals/);
  assert.doesNotMatch(
    canvasCreateDocumentSupportMigration.sql,
    /source_path = 'apps\/web\/src\/app\/views\/canvas\/canvasCreateCanvasDocumentCommand\.test\.support\.ts'/
  );
  assert.doesNotMatch(
    canvasCreateDocumentSupportMigration.sql,
    /source_path = 'apps\/web\/src\/app\/views\/canvas\/canvasCreateCanvasDocumentCommand\.replacement\.test\.ts'/
  );
  assert.doesNotMatch(
    canvasCreateDocumentSupportMigration.sql,
    /source_path = 'apps\/web\/src\/app\/views\/canvas\/canvasCreateCanvasDocumentCommand\.guards\.test\.ts'/
  );
  assert.doesNotMatch(canvasCreateDocumentSupportMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasCreateDocumentSupportMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint Canvas viewport graph-model test support rail', () => {
  const migrations = readMigrationFiles();
  const canvasViewportGraphModelSupportMigration = migrations.find(
    (migration) =>
      migration.fileName === '121_repoint_canvas_viewport_graph_model_test_support_rail.sql'
  );

  assert.ok(canvasViewportGraphModelSupportMigration);
  assert.match(
    canvasViewportGraphModelSupportMigration.sql,
    /useCanvasViewportGraphModel\.test\.tsx/
  );
  assert.match(canvasViewportGraphModelSupportMigration.sql, /buildCanonicalNode/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /renderViewportGraphModel/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /deprecatedSourcePaths/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /sourceRepointReason/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /rail_status/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /implemented/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /noHumanDecisionsRemaining/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /implementationPlan/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /redGreenCycles/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /cypressCoverage/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /fowlerSignals/);
  assert.match(canvasViewportGraphModelSupportMigration.sql, /on conflict \(rail_id\) do update/);
  assert.doesNotMatch(
    canvasViewportGraphModelSupportMigration.sql,
    /source_path\s*=\s*'apps\/web\/src\/app\/views\/canvas\/useCanvasViewportGraphModel\.test\.support\.ts'/
  );
  assert.doesNotMatch(canvasViewportGraphModelSupportMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasViewportGraphModelSupportMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Web Canvas test ownership after source repoint', () => {
  const migrations = readMigrationFiles();
  const canvasTestOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '122_web_canvas_test_ownership_canonicalization.sql'
  );

  assert.ok(canvasTestOwnershipMigration);
  assert.match(canvasTestOwnershipMigration.sql, /SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS/);
  assert.match(canvasTestOwnershipMigration.sql, /useCanvasViewportGraphModel\.test\.tsx/);
  assert.match(canvasTestOwnershipMigration.sql, /CanvasShell\.legacyGuides\.test\.tsx/);
  assert.match(
    canvasTestOwnershipMigration.sql,
    /REL-WEB-CANVAS-GRAPH-VIEWPORT-CONTAINS-MODEL-TESTS/
  );
  assert.match(canvasTestOwnershipMigration.sql, /TEST-WEB-CANVAS-GRAPH-VIEWPORT-MODEL/);
  assert.match(canvasTestOwnershipMigration.sql, /TEST-WEB-CANVAS-SHELL-LEGACY-GUIDES/);
  assert.match(canvasTestOwnershipMigration.sql, /pattern_kind = 'excludes'/);
  assert.match(canvasTestOwnershipMigration.sql, /useCanvasViewportGraphModel\.test\.support\.ts/);
  assert.match(canvasTestOwnershipMigration.sql, /on conflict \(component_id\) do update/);
  assert.match(canvasTestOwnershipMigration.sql, /on conflict \(test_id\) do update/);
  assert.doesNotMatch(canvasTestOwnershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasTestOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Web Canvas viewport model test maturity evidence', () => {
  const migrations = readMigrationFiles();
  const viewportModelTestResponsibilityMigration = migrations.find(
    (migration) => migration.fileName === '123_web_canvas_viewport_model_test_responsibility.sql'
  );

  assert.ok(viewportModelTestResponsibilityMigration);
  assert.match(
    viewportModelTestResponsibilityMigration.sql,
    /RESP-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS/
  );
  assert.match(
    viewportModelTestResponsibilityMigration.sql,
    /SYS-WEB-CANVAS-GRAPH-VIEWPORT-MODEL-TESTS/
  );
  assert.match(viewportModelTestResponsibilityMigration.sql, /component_responsibility/);
  assert.match(
    viewportModelTestResponsibilityMigration.sql,
    /CanvasGraphViewportPresentationTestContract/
  );
  assert.match(viewportModelTestResponsibilityMigration.sql, /implemented/);
  assert.doesNotMatch(viewportModelTestResponsibilityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(viewportModelTestResponsibilityMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Web Canvas parallel test drift without deleting history', () => {
  const migrations = readMigrationFiles();
  const parallelTestDriftMigration = migrations.find(
    (migration) => migration.fileName === '124_reconcile_web_canvas_parallel_test_drift.sql'
  );

  assert.ok(parallelTestDriftMigration);
  assert.match(parallelTestDriftMigration.sql, /useCanvasViewportGraphModel\.test\.support\.ts/);
  assert.match(parallelTestDriftMigration.sql, /useCanvasViewportGraphModel\.edges\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /useCanvasViewportGraphModel\.nodeData\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /useCanvasViewportGraphModel\.layout\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /CanvasContextMenuView\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /SYS-WEB-CANVAS-CONTEXT-MENU-VIEW-TESTS/);
  assert.match(parallelTestDriftMigration.sql, /REL-WEB-CANVAS-CONTEXT-MENU-CONTAINS-VIEW-TESTS/);
  assert.match(parallelTestDriftMigration.sql, /TEST-WEB-CANVAS-CONTEXT-MENU-VIEW/);
  assert.match(parallelTestDriftMigration.sql, /pattern_kind = 'excludes'/);
  assert.match(parallelTestDriftMigration.sql, /useCanvasViewportGraphModel\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /CanvasShell\.legacyGuides\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /deprecatedSourcePaths/);
  assert.match(parallelTestDriftMigration.sql, /retired: CanvasShell\.legacyGuides\.test\.tsx/);
  assert.match(parallelTestDriftMigration.sql, /DetectGovernedSourceDrift/);
  assert.doesNotMatch(parallelTestDriftMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(parallelTestDriftMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Web Canvas viewport test mechanization user stories', () => {
  const migrations = readMigrationFiles();
  const userStoryMigration = migrations.find(
    (migration) => migration.fileName === '125_web_canvas_viewport_test_manifest_user_stories.sql'
  );

  assert.ok(userStoryMigration);
  assert.match(userStoryMigration.sql, /CANVAS-VIEWPORT-GRAPH-MODEL-TEST-MODULARIZATION-20260618/);
  assert.match(userStoryMigration.sql, /userStories/);
  assert.match(userStoryMigration.sql, /As a Canvas maintainer/);
  assert.match(userStoryMigration.sql, /As a Planning DB reviewer/);
  assert.match(userStoryMigration.sql, /not raw_manifest \? 'userStories'/);
  assert.doesNotMatch(userStoryMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(userStoryMigration.sql, /truncate\s+/i);
});

test('tracked migrations map Web Canvas source import frame leaf components', () => {
  const migrations = readMigrationFiles();
  const frameLeafMigration = migrations.find(
    (migration) => migration.fileName === '126_web_canvas_source_import_frame_leaf_mapping.sql'
  );

  assert.ok(frameLeafMigration);
  for (const componentId of [
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS-TESTS',
  ]) {
    assert.match(frameLeafMigration.sql, new RegExp(componentId));
  }

  for (const sourcePath of [
    'SourceImportWizardFrame\\.tsx',
    'WizardProgress\\.tsx',
    'SourceImportMetadataPanel\\.tsx',
    'SourceImportSectionTabs\\.tsx',
    'SourceImportSectionTabs\\.test\\.tsx',
  ]) {
    assert.match(frameLeafMigration.sql, new RegExp(sourcePath));
  }

  assert.match(frameLeafMigration.sql, /REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-FRAME/);
  assert.match(frameLeafMigration.sql, /REL-WEB-CANVAS-SOURCE-IMPORT-FRAME-CONTAINS-PRESENTATION/);
  assert.match(
    frameLeafMigration.sql,
    /REL-WEB-CANVAS-SOURCE-IMPORT-FRAME-CONTAINS-SECTION-TABS-TESTS/
  );
  assert.match(frameLeafMigration.sql, /TEST-WEB-CANVAS-SOURCE-IMPORT-FRAME/);
  assert.match(frameLeafMigration.sql, /TEST-WEB-CANVAS-SOURCE-IMPORT-FRAME-PRESENTATION/);
  assert.match(frameLeafMigration.sql, /TEST-WEB-CANVAS-SOURCE-IMPORT-SECTION-TABS/);
  assert.match(frameLeafMigration.sql, /CreateGovernanceComponent/);
  assert.match(frameLeafMigration.sql, /RecordArchitectureTestEvidence/);
  assert.match(frameLeafMigration.sql, /old or\s+-- nonfunctional paths/);
  assert.doesNotMatch(frameLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(frameLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations close Web Canvas architecture maturity evidence', () => {
  const migrations = readMigrationFiles();
  const maturityMigration = migrations.find(
    (migration) => migration.fileName === '127_web_canvas_architecture_maturity_evidence.sql'
  );

  assert.ok(maturityMigration);
  for (const componentId of [
    'SYS-WEB-ROOT',
    'SYS-WEB-VIEW-CANVAS',
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD',
  ]) {
    assert.match(maturityMigration.sql, new RegExp(componentId));
  }

  for (const testPath of [
    'Root\\.test\\.tsx',
    'Canvas\\.architecture\\.test\\.ts',
    'CanvasModalHost\\.architecture\\.test\\.tsx',
    'sourceImportWizardModel\\.test\\.ts',
  ]) {
    assert.match(maturityMigration.sql, new RegExp(testPath));
  }

  assert.match(maturityMigration.sql, /REL-WEB-ROOT-CONTAINS-CANVAS-VIEW/);
  assert.match(
    maturityMigration.sql,
    /REL-WEB-CANVAS-ADD-SOURCE-DIALOG-CONTAINS-SOURCE-IMPORT-WIZARD/
  );
  assert.match(maturityMigration.sql, /useSourceImportWizard\.ts/);
  assert.match(maturityMigration.sql, /RecordArchitectureTestEvidence/);
  assert.doesNotMatch(maturityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(maturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations map Web root filesystem leaf components', () => {
  const migrations = readMigrationFiles();
  const webRootLeafMigration = migrations.find(
    (migration) => migration.fileName === '128_web_root_filesystem_leaf_components.sql'
  );

  assert.ok(webRootLeafMigration);
  for (const componentId of [
    'SYS-WEB-PACKAGE-CONFIG',
    'SYS-WEB-CYPRESS-E2E',
    'SYS-WEB-APP-BOOTSTRAP',
    'SYS-WEB-APP-VIEWS',
    'SYS-WEB-VIEW-CANVAS-ROUTE',
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'SYS-WEB-APP-COMPONENTS-UI',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CORE',
    'SYS-WEB-SERVICES-WORKSPACE',
    'SYS-WEB-PLUGINS-CORE',
    'SYS-WEB-CAPABILITIES-PLATFORM-HEALTH',
  ]) {
    assert.match(webRootLeafMigration.sql, new RegExp(componentId));
  }

  for (const sourcePath of [
    'apps/web/cypress/e2e/\\*\\*',
    'apps/web/src/app/bootstrap/\\*\\*',
    'apps/web/src/app/views/canvas/\\*\\*',
    'apps/web/src/app/components/ui/\\*\\*',
    'apps/web/src/app/services/workspace/\\*\\*',
    'apps/web/src/capabilities/platform-health/\\*\\*',
  ]) {
    assert.match(webRootLeafMigration.sql, new RegExp(sourcePath));
  }

  assert.match(webRootLeafMigration.sql, /SYS-WEB-ROOT stays composite/);
  assert.match(webRootLeafMigration.sql, /REL-WEB-ROOT-CONTAINS-PACKAGE-CONFIG/);
  assert.match(webRootLeafMigration.sql, /REL-WEB-APP-VIEWS-CONTAINS-RUNS/);
  assert.match(webRootLeafMigration.sql, /REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-CORE/);
  assert.match(webRootLeafMigration.sql, /RecordArchitectureRelation/);
  assert.match(webRootLeafMigration.sql, /RecordArchitectureTestEvidence/);
  assert.match(webRootLeafMigration.sql, /old or nonfunctional files are deprecated/);
  assert.doesNotMatch(webRootLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webRootLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations close Web root component integrity follow-up gaps', () => {
  const migrations = readMigrationFiles();
  const integrityFollowupMigration = migrations.find(
    (migration) => migration.fileName === '129_web_root_component_integrity_followup.sql'
  );

  assert.ok(integrityFollowupMigration);
  assert.match(integrityFollowupMigration.sql, /update architecture\.component/);
  assert.match(
    integrityFollowupMigration.sql,
    /apps\/web\/src\/app\/components\/SourceImportWizard\.architecture\.test\.tsx/
  );
  assert.match(
    integrityFollowupMigration.sql,
    /apps\/web\/src\/app\/views\/Canvas\.architecture\.test\.ts/
  );
  assert.match(integrityFollowupMigration.sql, /insert into architecture\.component_observability/);
  for (const componentId of [
    'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH',
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT',
    'SYS-WEB-CANVAS-NODE-WORKBENCH',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'SYS-WEB-SERVICES-RUNS',
    'SYS-WEB-SERVICES-WORKSPACE',
    'SYS-WEB-VIEW-CANVAS',
    'SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES',
    'SYS-WEB-VIEW-CANVAS-ROUTE',
    'SYS-WEB-VIEWS-RUNS',
  ]) {
    assert.match(integrityFollowupMigration.sql, new RegExp(componentId));
  }
  assert.match(integrityFollowupMigration.sql, /not_applicable/);
  assert.match(integrityFollowupMigration.sql, /Old or nonfunctional files are not inferred/);
  assert.doesNotMatch(integrityFollowupMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(integrityFollowupMigration.sql, /truncate\s+/i);
});

test('tracked migrations correct Web Canvas component path extension', () => {
  const migrations = readMigrationFiles();
  const pathExtensionFixMigration = migrations.find(
    (migration) => migration.fileName === '130_web_canvas_component_path_extension_fix.sql'
  );

  assert.ok(pathExtensionFixMigration);
  assert.match(pathExtensionFixMigration.sql, /SYS-WEB-VIEW-CANVAS/);
  assert.match(
    pathExtensionFixMigration.sql,
    /apps\/web\/src\/app\/views\/Canvas\.architecture\.test\.tsx/
  );
  assert.doesNotMatch(pathExtensionFixMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(pathExtensionFixMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Web Canvas node properties tabs split tests', () => {
  const migrations = readMigrationFiles();
  const tabsSplitTestMigration = migrations.find(
    (migration) =>
      migration.fileName === '131_web_canvas_node_properties_tabs_split_test_reconciliation.sql'
  );

  assert.ok(tabsSplitTestMigration);
  assert.match(tabsSplitTestMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS/);
  for (const sourcePath of [
    'NodePropertiesTabs\\.overflow\\.test\\.tsx',
    'NodePropertiesTabs\\.primarySections\\.test\\.tsx',
    'NodePropertiesTabs\\.sectionContent\\.test\\.tsx',
  ]) {
    assert.match(tabsSplitTestMigration.sql, new RegExp(sourcePath));
  }

  assert.match(tabsSplitTestMigration.sql, /pattern_kind = 'excludes'/);
  assert.match(tabsSplitTestMigration.sql, /NodePropertiesTabs\.test\.tsx/);
  assert.match(tabsSplitTestMigration.sql, /deprecated removed test path/);
  assert.match(tabsSplitTestMigration.sql, /DetectGovernedSourceDrift/);
  assert.match(
    tabsSplitTestMigration.sql,
    /TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-OVERFLOW/
  );
  assert.match(
    tabsSplitTestMigration.sql,
    /TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRIMARY-SECTIONS/
  );
  assert.match(
    tabsSplitTestMigration.sql,
    /TEST-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-SECTION-CONTENT/
  );
  assert.doesNotMatch(tabsSplitTestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(tabsSplitTestMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Web Canvas context menu presenter split tests', () => {
  const migrations = readMigrationFiles();
  const presenterSplitTestMigration = migrations.find(
    (migration) =>
      migration.fileName === '132_web_canvas_context_menu_presenter_split_test_reconciliation.sql'
  );

  assert.ok(presenterSplitTestMigration);
  assert.match(presenterSplitTestMigration.sql, /SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS/);
  for (const sourcePath of [
    'useCanvasContextMenuPresenter\\.lifecycle\\.test\\.tsx',
    'useCanvasContextMenuPresenter\\.graphActions\\.test\\.tsx',
    'useCanvasContextMenuPresenter\\.canvasActions\\.test\\.tsx',
  ]) {
    assert.match(presenterSplitTestMigration.sql, new RegExp(sourcePath));
  }

  assert.match(presenterSplitTestMigration.sql, /pattern_kind = 'excludes'/);
  assert.match(presenterSplitTestMigration.sql, /useCanvasContextMenuPresenter\.test\.tsx/);
  assert.match(presenterSplitTestMigration.sql, /deprecated removed test path/);
  assert.match(presenterSplitTestMigration.sql, /DetectGovernedSourceDrift/);
  assert.match(presenterSplitTestMigration.sql, /TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-LIFECYCLE/);
  assert.match(
    presenterSplitTestMigration.sql,
    /TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-GRAPH-ACTIONS/
  );
  assert.match(
    presenterSplitTestMigration.sql,
    /TEST-WEB-CANVAS-CONTEXT-MENU-PRESENTER-CANVAS-ACTIONS/
  );
  assert.doesNotMatch(presenterSplitTestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(presenterSplitTestMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Docs governance root into leaf components', () => {
  const migrations = readMigrationFiles();
  const docsGovernanceSplitMigration = migrations.find(
    (migration) => migration.fileName === '133_docs_governance_root_leaf_components.sql'
  );

  assert.ok(docsGovernanceSplitMigration);
  for (const componentId of [
    'SYS-DOCS-GOVERNANCE-ENTRYPOINTS',
    'SYS-DOCS-GOVERNANCE-ADR',
    'SYS-DOCS-GOVERNANCE-ARCHITECTURE',
    'SYS-DOCS-GOVERNANCE-PLANNING',
    'SYS-DOCS-GOVERNANCE-ARCHIVE',
    'SYS-DOCS-GOVERNANCE-EVIDENCE',
    'SYS-DOCS-GOVERNANCE-RISK-REGISTER',
    'SYS-DOCS-GOVERNANCE-GUIDES',
    'SYS-DOCS-GOVERNANCE-CONTRACTS',
    'SYS-DOCS-GOVERNANCE-CONCEPTS',
    'SYS-DOCS-GOVERNANCE-RUNBOOKS',
    'SYS-DOCS-GOVERNANCE-JAVASCRIPTS',
  ]) {
    assert.match(docsGovernanceSplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'AGENTS\\.md',
    'docs/adr/\\*\\*',
    'docs/architecture/\\*\\*',
    'docs/planning/\\*\\*',
    'docs/archive/\\*\\*',
    'docs/evidence/\\*\\*',
    'docs/risk-register/\\*\\*',
    'docs/runbooks/\\*\\*',
    'runbooks/\\*\\*',
    'docs/javascripts/\\*\\*',
  ]) {
    assert.match(docsGovernanceSplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(docsGovernanceSplitMigration.sql, /SYS-DOCS-GOVERNANCE-ROOT/);
  assert.match(docsGovernanceSplitMigration.sql, /architecture\.component/);
  assert.match(docsGovernanceSplitMigration.sql, /architecture\.component_relation/);
  assert.match(docsGovernanceSplitMigration.sql, /architecture\.component_test/);
  assert.match(docsGovernanceSplitMigration.sql, /REL-DOCS-GOVERNANCE-ROOT-CONTAINS-/);
  assert.match(docsGovernanceSplitMigration.sql, /TEST-SYS-DOCS-GOVERNANCE-ROOT-COMPONENT-PROFILE/);
  assert.match(
    docsGovernanceSplitMigration.sql,
    /old or nonfunctional files are deprecated or retired explicitly/
  );
  assert.doesNotMatch(docsGovernanceSplitMigration.sql, /docs\/\*\.md/);
  assert.doesNotMatch(docsGovernanceSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(docsGovernanceSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Docs root entrypoint files after leaf split', () => {
  const migrations = readMigrationFiles();
  const docsEntrypointReconciliationMigration = migrations.find(
    (migration) =>
      migration.fileName === '134_docs_governance_entrypoint_root_file_reconciliation.sql'
  );

  assert.ok(docsEntrypointReconciliationMigration);
  assert.match(docsEntrypointReconciliationMigration.sql, /SYS-DOCS-GOVERNANCE-ENTRYPOINTS/);
  assert.match(docsEntrypointReconciliationMigration.sql, /docs\/index\.md/);
  assert.match(docsEntrypointReconciliationMigration.sql, /docs\/generated-docs-policy\.json/);
  assert.match(
    docsEntrypointReconciliationMigration.sql,
    /rather than the composite documentation root/
  );
  assert.doesNotMatch(docsEntrypointReconciliationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(docsEntrypointReconciliationMigration.sql, /truncate\s+/i);
});

test('tracked migrations split planning documentation into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const planningDocsLeafMigration = migrations.find(
    (migration) => migration.fileName === '186_docs_planning_leaf_components.sql'
  );

  assert.ok(planningDocsLeafMigration);
  assert.match(planningDocsLeafMigration.sql, /create temporary table docs_planning_leaf_map/);

  for (const componentId of [
    'SYS-DOCS-PLANNING-ENTRYPOINTS',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
    'SYS-DOCS-PLANNING-PROPOSALS-ROOT',
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY',
    'SYS-DOCS-PLANNING-PROPOSALS-DISPOSABLE',
    'SYS-DOCS-PLANNING-PROPOSALS-SUPERSEDED',
    'SYS-DOCS-PLANNING-PROPOSALS-NICE-TO-HAVE',
    'SYS-DOCS-PLANNING-PROPOSALS-BUNDLES',
    'SYS-DOCS-PLANNING-REVIEWS-ROOT',
    'SYS-DOCS-PLANNING-REVIEWS-ARCHITECTURE-GOVERNANCE',
    'SYS-DOCS-PLANNING-REVIEWS-SPRINTS',
    'SYS-DOCS-PLANNING-REVIEWS-EXECUTION-RUNTIME',
    'SYS-DOCS-PLANNING-REVIEWS-CI-DELIVERY',
    'SYS-DOCS-PLANNING-REVIEWS-EVENT-TRACEABILITY',
    'SYS-DOCS-PLANNING-ARCHIVE',
    'SYS-DOCS-PLANNING-STATUS',
    'SYS-DOCS-PLANNING-STATE',
    'SYS-DOCS-PLANNING-ROADMAP',
    'SYS-DOCS-PLANNING-TEMPLATES',
    'SYS-DOCS-PLANNING-DOMAINS',
    'SYS-DOCS-PLANNING-EXECUTION-MODEL',
    'SYS-DOCS-PLANNING-GAPS',
  ]) {
    assert.match(planningDocsLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/planning/index\\.md',
    'docs/planning/closeouts/202603\\*\\.md',
    'docs/planning/closeouts/202604\\*\\.md',
    'docs/planning/closeouts/202605\\*\\.md',
    'docs/planning/closeouts/202606\\*\\.md',
    'docs/planning/proposals/mandatory/\\*\\*',
    'docs/planning/proposals/disposable/\\*\\*',
    'docs/planning/proposals/superseded/\\*\\*',
    'docs/planning/reviews/architecture-and-governance/\\*\\*',
    'docs/planning/reviews/event-lifecycle-and-retention/\\*\\*',
    'docs/planning/status/\\*\\*',
    'docs/planning/state/\\*\\*',
    'docs/planning/roadmap/\\*\\*',
    'docs/planning/templates/\\*\\*',
    'docs/planning/domains/\\*\\*',
    'docs/planning/execution-model/\\*\\*',
    'docs/planning/gaps/\\*\\*',
  ]) {
    assert.match(planningDocsLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(planningDocsLeafMigration.sql, /SYS-DOCS-GOVERNANCE-PLANNING/);
  assert.match(planningDocsLeafMigration.sql, /REL-DOCS-PLANNING-CONTAINS-/);
  assert.match(planningDocsLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(planningDocsLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(planningDocsLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(planningDocsLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.match(planningDocsLeafMigration.sql, /ReadMandatoryPlanningProposals/);
  assert.match(planningDocsLeafMigration.sql, /ReadPlanningLegacyCloseoutRecords/);
  assert.doesNotMatch(planningDocsLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(planningDocsLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(planningDocsLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize nonphysical planning closeout leaves', () => {
  const migrations = readMigrationFiles();
  const planningDocsCloseoutMigration = migrations.find(
    (migration) => migration.fileName === '187_docs_planning_closeout_path_canonicalization.sql'
  );

  assert.ok(planningDocsCloseoutMigration);
  assert.match(planningDocsCloseoutMigration.sql, /SYS-DOCS-PLANNING-CLOSEOUTS/);
  assert.match(planningDocsCloseoutMigration.sql, /docs\/planning\/closeouts\/\*\*/);
  assert.match(planningDocsCloseoutMigration.sql, /ReadPlanningCloseoutRecords/);
  assert.match(planningDocsCloseoutMigration.sql, /REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS/);

  for (const componentId of [
    'SYS-DOCS-PLANNING-ENTRYPOINTS',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
  ]) {
    assert.match(planningDocsCloseoutMigration.sql, new RegExp(componentId));
  }

  assert.match(planningDocsCloseoutMigration.sql, /status\s*=\s*'superseded'/);
  assert.match(planningDocsCloseoutMigration.sql, /status\s*=\s*'deprecated'/);
  assert.match(planningDocsCloseoutMigration.sql, /status\s*=\s*'approved'/);
  assert.match(planningDocsCloseoutMigration.sql, /'transition'/);
  assert.match(planningDocsCloseoutMigration.sql, /Superseded by SYS-DOCS-PLANNING-CLOSEOUTS/);
  assert.doesNotMatch(planningDocsCloseoutMigration.sql, /retirement_rationale/);
  assert.match(planningDocsCloseoutMigration.sql, /insert into architecture\.contract/);
  assert.match(planningDocsCloseoutMigration.sql, /insert into architecture\.component_port/);
  assert.match(planningDocsCloseoutMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    planningDocsCloseoutMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(planningDocsCloseoutMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(planningDocsCloseoutMigration.sql, /truncate\s+/i);
});

test('tracked migrations restore planning closeout cohorts under the closeout aggregate', () => {
  const migrations = readMigrationFiles();
  const closeoutCohortRestoreMigration = migrations.find(
    (migration) => migration.fileName === '198_docs_planning_closeout_cohort_leaf_restore.sql'
  );

  assert.ok(closeoutCohortRestoreMigration);
  assert.match(
    closeoutCohortRestoreMigration.sql,
    /create temporary table docs_planning_closeout_cohort_leaf_map/
  );

  for (const componentId of [
    'SYS-DOCS-PLANNING-CLOSEOUTS-202603',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202604',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202605',
    'SYS-DOCS-PLANNING-CLOSEOUTS-202606',
    'SYS-DOCS-PLANNING-CLOSEOUTS-LEGACY',
  ]) {
    assert.match(closeoutCohortRestoreMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/planning/closeouts/202603\\*\\.md',
    'docs/planning/closeouts/202604\\*\\.md',
    'docs/planning/closeouts/202605\\*\\.md',
    'docs/planning/closeouts/202606\\*\\.md',
    'docs/planning/closeouts/index\\.md',
    'docs/planning/closeouts/F-04-RISK-A-QA-03-backend-owned-planref-closeout\\.md',
  ]) {
    assert.match(closeoutCohortRestoreMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    closeoutCohortRestoreMigration.sql,
    /PLANNING-DB-DOCS-CLOSEOUT-COHORT-LEAF-RESTORE-20260619/
  );
  assert.match(closeoutCohortRestoreMigration.sql, /SYS-DOCS-PLANNING-CLOSEOUTS/);
  assert.match(closeoutCohortRestoreMigration.sql, /children_required = true/);
  assert.match(closeoutCohortRestoreMigration.sql, /ReadPlanningCloseoutRecords202603/);
  assert.match(closeoutCohortRestoreMigration.sql, /ReadPlanningCloseoutRecords202604/);
  assert.match(closeoutCohortRestoreMigration.sql, /ReadPlanningCloseoutRecords202605/);
  assert.match(closeoutCohortRestoreMigration.sql, /ReadPlanningCloseoutRecords202606/);
  assert.match(closeoutCohortRestoreMigration.sql, /ReadPlanningLegacyCloseoutRecords/);
  assert.match(closeoutCohortRestoreMigration.sql, /REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-/);
  assert.match(closeoutCohortRestoreMigration.sql, /status = 'drift'/);
  assert.match(closeoutCohortRestoreMigration.sql, /obsolete planning-catalog-to-cohort relations/);
  assert.match(closeoutCohortRestoreMigration.sql, /Deprecated by PLANNING-DB-DOCS-CLOSEOUT/);
  assert.match(closeoutCohortRestoreMigration.sql, /Closeout evidence is not deprecated by age/);
  assert.match(closeoutCohortRestoreMigration.sql, /insert into architecture\.contract/);
  assert.match(closeoutCohortRestoreMigration.sql, /insert into architecture\.component_port/);
  assert.match(closeoutCohortRestoreMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    closeoutCohortRestoreMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(closeoutCohortRestoreMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(closeoutCohortRestoreMigration.sql, /truncate\s+/i);
});

test('tracked migrations repair planning closeout cohort relation drift', () => {
  const migrations = readMigrationFiles();
  const closeoutRelationRepairMigration = migrations.find(
    (migration) => migration.fileName === '199_docs_planning_closeout_relation_drift_repair.sql'
  );

  assert.ok(closeoutRelationRepairMigration);
  assert.match(
    closeoutRelationRepairMigration.sql,
    /create temporary table docs_planning_closeout_relation_repair_map/
  );

  for (const relationId of [
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202603',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202604',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202605',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-202606',
    'REL-DOCS-PLANNING-CONTAINS-CLOSEOUTS-LEGACY',
  ]) {
    assert.match(closeoutRelationRepairMigration.sql, new RegExp(relationId));
  }

  for (const duplicateRelationId of [
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202603',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202604',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202605',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-202606',
    'REL-DOCS-PLANNING-CLOSEOUTS-CONTAINS-LEGACY',
  ]) {
    assert.match(closeoutRelationRepairMigration.sql, new RegExp(duplicateRelationId));
  }

  assert.match(
    closeoutRelationRepairMigration.sql,
    /PLANNING-DB-DOCS-CLOSEOUT-RELATION-DRIFT-REPAIR-20260619/
  );
  assert.match(
    closeoutRelationRepairMigration.sql,
    /source_component_id = 'SYS-DOCS-PLANNING-CLOSEOUTS'/
  );
  assert.match(closeoutRelationRepairMigration.sql, /status = 'implemented'/);
  assert.match(closeoutRelationRepairMigration.sql, /ReadArchitectureDrift/);
  assert.match(closeoutRelationRepairMigration.sql, /delete from architecture\.component_relation/);
  assert.match(closeoutRelationRepairMigration.sql, /repair\.duplicate_relation_id/);
  assert.match(closeoutRelationRepairMigration.sql, /duplicate relation IDs from migration 198/);
  assert.doesNotMatch(closeoutRelationRepairMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Canvas controller interaction into functional leaves', () => {
  const migrations = readMigrationFiles();
  const canvasControllerLeafMigration = migrations.find(
    (migration) =>
      migration.fileName === '200_web_canvas_controller_interaction_leaf_components.sql'
  );

  assert.ok(canvasControllerLeafMigration);
  assert.match(
    canvasControllerLeafMigration.sql,
    /create temporary table web_canvas_controller_leaf_map/
  );

  for (const componentId of [
    'SYS-WEB-CANVAS-CONTROLLER-READ-MODEL',
    'SYS-WEB-CANVAS-CONTROLLER-GRAPH-MUTATIONS',
    'SYS-WEB-CANVAS-CONTROLLER-COMMAND-SURFACE',
    'SYS-WEB-CANVAS-CONTROLLER-PRESENTATION-POLICY',
    'SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION',
    'SYS-WEB-CANVAS-CONTROLLER-ENVIRONMENT',
  ]) {
    assert.match(canvasControllerLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/web/src/app/views/canvas/canvasBackendPosture%',
    'apps/web/src/app/views/canvas/canvasMutationHandler%',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface%',
    'apps/web/src/app/views/canvas/canvasPalette%',
    'apps/web/src/app/views/canvas/useCanvasController%',
    'apps/web/src/app/views/canvas/useCanvasControllerEnvironment.ts',
  ]) {
    assert.match(canvasControllerLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    canvasControllerLeafMigration.sql,
    /PLANNING-DB-WEB-CANVAS-CONTROLLER-LEAF-COMPONENTS-20260619/
  );
  assert.match(canvasControllerLeafMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-INTERACTION/);
  assert.match(canvasControllerLeafMigration.sql, /children_required = true/);
  assert.match(canvasControllerLeafMigration.sql, /ReadCanvasControllerViewModel/);
  assert.match(canvasControllerLeafMigration.sql, /AuthorCanvasGraphMutation/);
  assert.match(canvasControllerLeafMigration.sql, /ExecuteCanvasInteractionCommand/);
  assert.match(canvasControllerLeafMigration.sql, /OrchestrateCanvasController/);
  assert.match(canvasControllerLeafMigration.sql, /ResolveCanvasControllerEnvironment/);
  assert.match(canvasControllerLeafMigration.sql, /'excludes'/);
  assert.match(canvasControllerLeafMigration.sql, /REL-WEB-CANVAS-CONTROLLER-CONTAINS-/);
  assert.match(canvasControllerLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(canvasControllerLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(canvasControllerLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    canvasControllerLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(canvasControllerLeafMigration.sql, /No live Canvas controller file is deprecated/);
  assert.doesNotMatch(canvasControllerLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasControllerLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Canvas controller aggregate repo path', () => {
  const migrations = readMigrationFiles();
  const canvasControllerPathMigration = migrations.find(
    (migration) =>
      migration.fileName === '201_web_canvas_controller_parent_path_canonicalization.sql'
  );

  assert.ok(canvasControllerPathMigration);
  assert.match(
    canvasControllerPathMigration.sql,
    /PLANNING-DB-WEB-CANVAS-CONTROLLER-PARENT-PATH-20260619/
  );
  assert.match(canvasControllerPathMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-INTERACTION/);
  assert.match(canvasControllerPathMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION/);
  assert.match(canvasControllerPathMigration.sql, /apps\/web\/src\/app\/views\/canvas'/);
  assert.match(
    canvasControllerPathMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/useCanvasController\.ts/
  );
  assert.match(canvasControllerPathMigration.sql, /duplicate_repo_path drift/);
  assert.doesNotMatch(canvasControllerPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasControllerPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations deprecate zero-file Canvas residual surfaces component', () => {
  const migrations = readMigrationFiles();
  const residualDeprecationMigration = migrations.find(
    (migration) => migration.fileName === '202_web_canvas_residual_surfaces_deprecation.sql'
  );

  assert.ok(residualDeprecationMigration);
  assert.match(
    residualDeprecationMigration.sql,
    /PLANNING-DB-WEB-CANVAS-RESIDUAL-SURFACES-DEPRECATION-20260619/
  );
  assert.match(residualDeprecationMigration.sql, /SYS-WEB-VIEW-CANVAS-RESIDUAL-SURFACES/);
  assert.match(residualDeprecationMigration.sql, /REL-WEB-CANVAS-VIEW-CONTAINS-RESIDUAL-SURFACES/);
  assert.match(residualDeprecationMigration.sql, /owns no files, has no children/);
  assert.match(residualDeprecationMigration.sql, /status = 'deprecated'/);
  assert.match(residualDeprecationMigration.sql, /status = 'superseded'/);
  assert.match(residualDeprecationMigration.sql, /Do not recreate residual placeholder files/);
  assert.doesNotMatch(residualDeprecationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(residualDeprecationMigration.sql, /truncate\s+/i);
});

test('tracked migrations map 200-series migration files to the leaf mapping component', () => {
  const migrations = readMigrationFiles();
  const migrationCatalog200sMapping = migrations.find(
    (migration) => migration.fileName === '203_planning_db_migration_catalog_200s_leaf_mapping.sql'
  );

  assert.ok(migrationCatalog200sMapping);
  assert.match(
    migrationCatalog200sMapping.sql,
    /PLANNING-DB-MIGRATION-CATALOG-200S-LEAF-MAPPING-20260619/
  );
  assert.match(
    migrationCatalog200sMapping.sql,
    /SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING/
  );
  assert.match(migrationCatalog200sMapping.sql, /tools\/planning-db\/migrations\/2\*\.sql/);
  assert.match(migrationCatalog200sMapping.sql, /file_without_leaf_component/);
  assert.match(migrationCatalog200sMapping.sql, /ReadPlanningDbLeafMappingMigrations/);
  assert.match(migrationCatalog200sMapping.sql, /ValidateComponentIntegrity/);
  assert.match(migrationCatalog200sMapping.sql, /Do not deprecate applied Planning DB migrations/);
  assert.doesNotMatch(migrationCatalog200sMapping.sql, /delete\s+from/i);
  assert.doesNotMatch(migrationCatalog200sMapping.sql, /truncate\s+/i);
});

test('tracked migrations split architecture documentation into physical leaves', () => {
  const migrations = readMigrationFiles();
  const architectureDocsLeafMigration = migrations.find(
    (migration) => migration.fileName === '188_docs_architecture_leaf_components.sql'
  );

  assert.ok(architectureDocsLeafMigration);
  assert.match(
    architectureDocsLeafMigration.sql,
    /create temporary table docs_architecture_leaf_map/
  );

  for (const componentId of [
    'SYS-DOCS-ARCHITECTURE-ENTRYPOINTS',
    'SYS-DOCS-ARCHITECTURE-TEMPLATES',
    'SYS-DOCS-ARCHITECTURE-ATLAS',
    'SYS-DOCS-ARCHITECTURE-DIAGRAMS',
    'SYS-DOCS-ARCHITECTURE-SHARED',
    'SYS-DOCS-ARCHITECTURE-SYSTEM',
    'SYS-DOCS-ARCHITECTURE-INFRA',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-ROOT',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-API',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-CI-GOVERNANCE',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-DELIVERY',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-LINEAGE-WORKER',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-OUTBOX-WORKER',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-PLANNER',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-PROJECTOR-WORKER',
    'SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB',
  ]) {
    assert.match(architectureDocsLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/architecture/\\*',
    'docs/architecture/_templates/\\*\\*',
    'docs/architecture/atlas/\\*\\*',
    'docs/architecture/diagrams/\\*\\*',
    'docs/architecture/shared/\\*\\*',
    'docs/architecture/system/\\*\\*',
    'docs/architecture/infra/\\*\\*',
    'docs/architecture/components/index\\.md',
    'docs/architecture/components/api/\\*\\*',
    'docs/architecture/components/ci-governance/\\*\\*',
    'docs/architecture/components/delivery/\\*\\*',
    'docs/architecture/components/engine/\\*\\*',
    'docs/architecture/components/lineage-worker/\\*\\*',
    'docs/architecture/components/outbox-worker/\\*\\*',
    'docs/architecture/components/planner/\\*\\*',
    'docs/architecture/components/projector-worker/\\*\\*',
    'docs/architecture/components/web/\\*\\*',
  ]) {
    assert.match(architectureDocsLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(architectureDocsLeafMigration.sql, /SYS-DOCS-GOVERNANCE-ARCHITECTURE/);
  assert.match(
    architectureDocsLeafMigration.sql,
    /PLANNING-DB-DOCS-ARCHITECTURE-LEAF-MAPPING-20260618/
  );
  assert.match(architectureDocsLeafMigration.sql, /REL-DOCS-ARCHITECTURE-CONTAINS-/);
  assert.match(architectureDocsLeafMigration.sql, /ReadArchitectureRootEntrypoints/);
  assert.match(architectureDocsLeafMigration.sql, /ReadEngineArchitectureDocs/);
  assert.match(architectureDocsLeafMigration.sql, /ReadWebArchitectureDocs/);
  assert.match(architectureDocsLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(architectureDocsLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(architectureDocsLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    architectureDocsLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(architectureDocsLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(architectureDocsLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split archive documentation into deprecated physical leaves', () => {
  const migrations = readMigrationFiles();
  const archiveDocsLeafMigration = migrations.find(
    (migration) => migration.fileName === '189_docs_archive_leaf_components.sql'
  );

  assert.ok(archiveDocsLeafMigration);
  assert.match(archiveDocsLeafMigration.sql, /create temporary table docs_archive_leaf_map/);

  for (const componentId of [
    'SYS-DOCS-ARCHIVE-ROOT-RECORDS',
    'SYS-DOCS-ARCHIVE-ARCHITECTURE-ROOT',
    'SYS-DOCS-ARCHIVE-ARCHITECTURE-COMPONENTS',
    'SYS-DOCS-ARCHIVE-PLANNING-GAPS',
    'SYS-DOCS-ARCHIVE-PLANNING-PROPOSALS',
    'SYS-DOCS-ARCHIVE-PLANNING-ROOT',
    'SYS-DOCS-ARCHIVE-TRACEABILITY-PACK',
    'SYS-DOCS-ARCHIVE-PLANNER',
    'SYS-DOCS-ARCHIVE-ARTIFACT-STORE-PACK',
    'SYS-DOCS-ARCHIVE-WORKING-NOTES',
    'SYS-DOCS-ARCHIVE-HISTORICAL-BLUEPRINTS',
  ]) {
    assert.match(archiveDocsLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/archive/\\*',
    'docs/archive/closeouts/\\*\\*',
    'docs/archive/architecture/\\*',
    'docs/archive/architecture/engine/\\*\\*',
    'docs/archive/architecture/frontend/\\*\\*',
    'docs/archive/architecture/components/\\*\\*',
    'docs/archive/planning/gaps/\\*\\*',
    'docs/archive/planning/proposals/\\*\\*',
    'docs/archive/planning/index\\.md',
    'docs/archive/dvt-traceability-pack-v2-lite-R6/\\*\\*',
    'docs/archive/planner/\\*\\*',
    'docs/archive/dvt_artifact_store_spec_pack/\\*\\*',
    'docs/archive/working-notes/\\*\\*',
    'docs/archive/historical-blueprints/\\*\\*',
  ]) {
    assert.match(archiveDocsLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(archiveDocsLeafMigration.sql, /SYS-DOCS-GOVERNANCE-ARCHIVE/);
  assert.match(archiveDocsLeafMigration.sql, /PLANNING-DB-DOCS-ARCHIVE-LEAF-MAPPING-20260618/);
  assert.match(archiveDocsLeafMigration.sql, /status,\r?\n\s+children_required/);
  assert.match(archiveDocsLeafMigration.sql, /'legacy',/);
  assert.match(archiveDocsLeafMigration.sql, /'deprecated'/);
  assert.match(archiveDocsLeafMigration.sql, /old or nonfunctional material remains queryable/);
  assert.match(archiveDocsLeafMigration.sql, /REL-DOCS-ARCHIVE-CONTAINS-/);
  assert.match(archiveDocsLeafMigration.sql, /ReadArchivedPlanningGapRecords/);
  assert.match(archiveDocsLeafMigration.sql, /ReadArchivedTraceabilityPack/);
  assert.match(archiveDocsLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(archiveDocsLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(archiveDocsLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(archiveDocsLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.doesNotMatch(archiveDocsLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(archiveDocsLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep archive contracts out of architecture drift', () => {
  const migrations = readMigrationFiles();
  const archiveContractStatusMigration = migrations.find(
    (migration) => migration.fileName === '190_docs_archive_contract_status_canonicalization.sql'
  );

  assert.ok(archiveContractStatusMigration);
  assert.match(archiveContractStatusMigration.sql, /update architecture\.contract/);
  assert.match(archiveContractStatusMigration.sql, /owner_component_id like 'SYS-DOCS-ARCHIVE-%'/);
  assert.match(archiveContractStatusMigration.sql, /status = 'implemented'/);
  assert.match(archiveContractStatusMigration.sql, /architecture-drift/);
  assert.match(archiveContractStatusMigration.sql, /archive leaves themselves remain deprecated/i);
  assert.doesNotMatch(archiveContractStatusMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(archiveContractStatusMigration.sql, /truncate\s+/i);
});

test('tracked migrations split mandatory planning proposals into physical leaves', () => {
  const migrations = readMigrationFiles();
  const mandatoryProposalLeafMigration = migrations.find(
    (migration) => migration.fileName === '191_docs_mandatory_proposal_leaf_components.sql'
  );

  assert.ok(mandatoryProposalLeafMigration);
  assert.match(
    mandatoryProposalLeafMigration.sql,
    /create temporary table docs_mandatory_proposal_leaf_map/
  );

  for (const componentId of [
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-FRONTEND-UX',
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-RUNTIME-CONTRACTS',
    'SYS-DOCS-PLANNING-PROPOSALS-MANDATORY-GOVERNANCE-DOCS',
  ]) {
    assert.match(mandatoryProposalLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/planning/proposals/mandatory/frontend-and-ux/\\*\\*',
    'docs/planning/proposals/mandatory/runtime-and-contracts/\\*\\*',
    'docs/planning/proposals/mandatory/governance-and-docs/\\*\\*',
  ]) {
    assert.match(mandatoryProposalLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    mandatoryProposalLeafMigration.sql,
    /PLANNING-DB-DOCS-MANDATORY-PROPOSAL-LEAF-MAPPING-20260618/
  );
  assert.match(mandatoryProposalLeafMigration.sql, /SYS-DOCS-PLANNING-PROPOSALS-MANDATORY/);
  assert.match(mandatoryProposalLeafMigration.sql, /REL-DOCS-MANDATORY-PROPOSALS-CONTAINS-/);
  assert.match(mandatoryProposalLeafMigration.sql, /ReadFrontendUxMandatoryProposals/);
  assert.match(mandatoryProposalLeafMigration.sql, /ReadRuntimeContractMandatoryProposals/);
  assert.match(mandatoryProposalLeafMigration.sql, /ReadGovernanceDocMandatoryProposals/);
  assert.match(mandatoryProposalLeafMigration.sql, /lifecycle\/deprecation semantics/);
  assert.match(mandatoryProposalLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(mandatoryProposalLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(mandatoryProposalLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    mandatoryProposalLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(mandatoryProposalLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(mandatoryProposalLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split web architecture documentation into physical leaves', () => {
  const migrations = readMigrationFiles();
  const webArchitectureLeafMigration = migrations.find(
    (migration) => migration.fileName === '192_docs_web_architecture_leaf_components.sql'
  );

  assert.ok(webArchitectureLeafMigration);
  assert.match(
    webArchitectureLeafMigration.sql,
    /create temporary table docs_web_architecture_leaf_map/
  );

  for (const componentId of [
    'SYS-DOCS-ARCHITECTURE-WEB-ROOT-RECORDS',
    'SYS-DOCS-ARCHITECTURE-WEB-GRAPH',
    'SYS-DOCS-ARCHITECTURE-WEB-APP-SHELL',
    'SYS-DOCS-ARCHITECTURE-WEB-RUNS',
    'SYS-DOCS-ARCHITECTURE-WEB-WORKSPACE',
    'SYS-DOCS-ARCHITECTURE-WEB-MONACO',
    'SYS-DOCS-ARCHITECTURE-WEB-TEMPLATES',
    'SYS-DOCS-ARCHITECTURE-WEB-PLUGINS',
    'SYS-DOCS-ARCHITECTURE-WEB-PUBLIC-DATA',
    'SYS-DOCS-ARCHITECTURE-WEB-DIFF',
    'SYS-DOCS-ARCHITECTURE-WEB-LINEAGE',
    'SYS-DOCS-ARCHITECTURE-WEB-ARTIFACTS',
    'SYS-DOCS-ARCHITECTURE-WEB-GIT',
    'SYS-DOCS-ARCHITECTURE-WEB-CANVAS',
    'SYS-DOCS-ARCHITECTURE-WEB-INSPECTOR',
    'SYS-DOCS-ARCHITECTURE-WEB-OBSERVABILITY',
    'SYS-DOCS-ARCHITECTURE-WEB-PLANNING',
    'SYS-DOCS-ARCHITECTURE-WEB-VIEWS',
  ]) {
    assert.match(webArchitectureLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/architecture/components/web/\\*',
    'docs/architecture/components/web/graph/\\*\\*',
    'docs/architecture/components/web/appshell/\\*\\*',
    'docs/architecture/components/web/runs/\\*\\*',
    'docs/architecture/components/web/workspace/\\*\\*',
    'docs/architecture/components/web/monaco/\\*\\*',
    'docs/architecture/components/web/templates/\\*\\*',
    'docs/architecture/components/web/plugins/\\*\\*',
    'docs/architecture/components/web/public-data/\\*\\*',
    'docs/architecture/components/web/diff/\\*\\*',
    'docs/architecture/components/web/lineage/\\*\\*',
    'docs/architecture/components/web/artifacts/\\*\\*',
    'docs/architecture/components/web/git/\\*\\*',
    'docs/architecture/components/web/canvas/\\*\\*',
    'docs/architecture/components/web/inspector/\\*\\*',
    'docs/architecture/components/web/observability/\\*\\*',
    'docs/architecture/components/web/planning/\\*\\*',
    'docs/architecture/components/web/views/\\*\\*',
  ]) {
    assert.match(webArchitectureLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    webArchitectureLeafMigration.sql,
    /PLANNING-DB-DOCS-WEB-ARCHITECTURE-LEAF-MAPPING-20260618/
  );
  assert.match(webArchitectureLeafMigration.sql, /SYS-DOCS-ARCHITECTURE-COMPONENTS-WEB/);
  assert.match(webArchitectureLeafMigration.sql, /REL-DOCS-WEB-ARCHITECTURE-CONTAINS-/);
  assert.match(webArchitectureLeafMigration.sql, /ReadWebGraphArchitectureDocs/);
  assert.match(webArchitectureLeafMigration.sql, /ReadWebAppShellArchitectureDocs/);
  assert.match(webArchitectureLeafMigration.sql, /ReadWebRunsArchitectureDocs/);
  assert.match(webArchitectureLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(webArchitectureLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(webArchitectureLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    webArchitectureLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(webArchitectureLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webArchitectureLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize web architecture root leaf path after split', () => {
  const migrations = readMigrationFiles();
  const webArchitectureRootPathMigration = migrations.find(
    (migration) => migration.fileName === '193_docs_web_architecture_root_path_canonicalization.sql'
  );

  assert.ok(webArchitectureRootPathMigration);
  assert.match(webArchitectureRootPathMigration.sql, /SYS-DOCS-ARCHITECTURE-WEB-ROOT-RECORDS/);
  assert.match(
    webArchitectureRootPathMigration.sql,
    /docs\/architecture\/components\/web\/index\.md/
  );
  assert.match(webArchitectureRootPathMigration.sql, /docs\/architecture\/components\/web\/\*/);
  assert.match(webArchitectureRootPathMigration.sql, /repo_path =/);
  assert.doesNotMatch(webArchitectureRootPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webArchitectureRootPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split evidence documentation and deprecate archive leaf', () => {
  const migrations = readMigrationFiles();
  const evidenceLeafMigration = migrations.find(
    (migration) => migration.fileName === '194_docs_evidence_leaf_components.sql'
  );

  assert.ok(evidenceLeafMigration);
  assert.match(evidenceLeafMigration.sql, /create temporary table docs_evidence_leaf_map/);

  for (const componentId of [
    'SYS-DOCS-EVIDENCE-ROOT-RECORDS',
    'SYS-DOCS-EVIDENCE-CRITICAL',
    'SYS-DOCS-EVIDENCE-CONTEXT',
    'SYS-DOCS-EVIDENCE-SUPPORTING',
    'SYS-DOCS-EVIDENCE-ASSETS',
    'SYS-DOCS-EVIDENCE-ARCHIVE',
  ]) {
    assert.match(evidenceLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/evidence/\\*.md',
    'docs/evidence/critical/\\*\\*',
    'docs/evidence/context/\\*\\*',
    'docs/evidence/supporting/\\*\\*',
    'docs/evidence/assets/\\*\\*',
    'docs/evidence/archive/\\*\\*',
  ]) {
    assert.match(evidenceLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(evidenceLeafMigration.sql, /PLANNING-DB-DOCS-EVIDENCE-LEAF-MAPPING-20260618/);
  assert.match(evidenceLeafMigration.sql, /SYS-DOCS-GOVERNANCE-EVIDENCE/);
  assert.match(evidenceLeafMigration.sql, /REL-DOCS-EVIDENCE-CONTAINS-/);
  assert.match(evidenceLeafMigration.sql, /ReadEvidenceRootRecords/);
  assert.match(evidenceLeafMigration.sql, /ReadCriticalEvidenceRecords/);
  assert.match(evidenceLeafMigration.sql, /ReadArchivedEvidenceRecords/);
  assert.match(evidenceLeafMigration.sql, /documentation_lifecycle_archive/);
  assert.match(evidenceLeafMigration.sql, /component_status = 'deprecated'/);
  assert.match(evidenceLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(evidenceLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(evidenceLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(evidenceLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.doesNotMatch(evidenceLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(evidenceLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split risk-register documentation into physical leaves', () => {
  const migrations = readMigrationFiles();
  const riskRegisterLeafMigration = migrations.find(
    (migration) => migration.fileName === '195_docs_risk_register_leaf_components.sql'
  );

  assert.ok(riskRegisterLeafMigration);
  assert.match(riskRegisterLeafMigration.sql, /create temporary table docs_risk_register_leaf_map/);

  for (const componentId of [
    'SYS-DOCS-RISK-REGISTER-ROOT-RECORDS',
    'SYS-DOCS-RISK-REGISTER-ADAPTERS',
    'SYS-DOCS-RISK-REGISTER-QUALITY',
  ]) {
    assert.match(riskRegisterLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/risk-register/index\\.md',
    'docs/risk-register/adapters/\\*\\*',
    'docs/risk-register/quality/\\*\\*',
  ]) {
    assert.match(riskRegisterLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    riskRegisterLeafMigration.sql,
    /PLANNING-DB-DOCS-RISK-REGISTER-LEAF-MAPPING-20260618/
  );
  assert.match(riskRegisterLeafMigration.sql, /SYS-DOCS-GOVERNANCE-RISK-REGISTER/);
  assert.match(riskRegisterLeafMigration.sql, /REL-DOCS-RISK-REGISTER-CONTAINS-/);
  assert.match(riskRegisterLeafMigration.sql, /ReadRiskRegisterRootRecords/);
  assert.match(riskRegisterLeafMigration.sql, /ReadAdapterRiskRegisterRecords/);
  assert.match(riskRegisterLeafMigration.sql, /ReadQualityRiskRegisterRecords/);
  assert.match(riskRegisterLeafMigration.sql, /Old risk records are not deprecated by age/);
  assert.match(riskRegisterLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(riskRegisterLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(riskRegisterLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(riskRegisterLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.doesNotMatch(riskRegisterLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(riskRegisterLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split engine architecture documentation into physical leaves', () => {
  const migrations = readMigrationFiles();
  const engineArchitectureLeafMigration = migrations.find(
    (migration) => migration.fileName === '196_docs_engine_architecture_leaf_components.sql'
  );

  assert.ok(engineArchitectureLeafMigration);
  assert.match(
    engineArchitectureLeafMigration.sql,
    /create temporary table docs_engine_architecture_leaf_map/
  );

  for (const componentId of [
    'SYS-DOCS-ARCHITECTURE-ENGINE-ROOT-RECORDS',
    'SYS-DOCS-ARCHITECTURE-ENGINE-ADAPTERS',
    'SYS-DOCS-ARCHITECTURE-ENGINE-ARCHITECTURE',
    'SYS-DOCS-ARCHITECTURE-ENGINE-CONTRACTS',
    'SYS-DOCS-ARCHITECTURE-ENGINE-DEV',
    'SYS-DOCS-ARCHITECTURE-ENGINE-OPS',
    'SYS-DOCS-ARCHITECTURE-ENGINE-REVIEWS',
    'SYS-DOCS-ARCHITECTURE-ENGINE-ROADMAP',
    'SYS-DOCS-ARCHITECTURE-ENGINE-SCHEMAS',
    'SYS-DOCS-ARCHITECTURE-ENGINE-SECURITY',
  ]) {
    assert.match(engineArchitectureLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'docs/architecture/components/engine/index\\.md',
    'docs/architecture/components/engine/adapters/\\*\\*',
    'docs/architecture/components/engine/architecture/\\*\\*',
    'docs/architecture/components/engine/contracts/\\*\\*',
    'docs/architecture/components/engine/dev/\\*\\*',
    'docs/architecture/components/engine/ops/\\*\\*',
    'docs/architecture/components/engine/reviews/\\*\\*',
    'docs/architecture/components/engine/roadmap/\\*\\*',
    'docs/architecture/components/engine/schemas/\\*\\*',
    'docs/architecture/components/engine/security/\\*\\*',
  ]) {
    assert.match(engineArchitectureLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    engineArchitectureLeafMigration.sql,
    /PLANNING-DB-DOCS-ENGINE-ARCHITECTURE-LEAF-MAPPING-20260619/
  );
  assert.match(engineArchitectureLeafMigration.sql, /SYS-DOCS-ARCHITECTURE-COMPONENTS-ENGINE/);
  assert.match(engineArchitectureLeafMigration.sql, /REL-DOCS-ENGINE-ARCHITECTURE-CONTAINS-/);
  assert.match(engineArchitectureLeafMigration.sql, /ReadEngineArchitectureRootDocs/);
  assert.match(engineArchitectureLeafMigration.sql, /ReadEngineAdapterArchitectureDocs/);
  assert.match(engineArchitectureLeafMigration.sql, /ReadEngineCoreArchitectureDocs/);
  assert.match(engineArchitectureLeafMigration.sql, /ReadEngineContractArchitectureDocs/);
  assert.match(engineArchitectureLeafMigration.sql, /ReadEngineOperationsArchitectureDocs/);
  assert.match(engineArchitectureLeafMigration.sql, /ReadEngineSecurityArchitectureDocs/);
  assert.match(engineArchitectureLeafMigration.sql, /No engine architecture docs are deprecated/);
  assert.match(engineArchitectureLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(engineArchitectureLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(engineArchitectureLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    engineArchitectureLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(engineArchitectureLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(engineArchitectureLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Planning DB migration catalog into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const migrationCatalogLeafMigration = migrations.find(
    (migration) => migration.fileName === '197_planning_db_migration_catalog_leaf_components.sql'
  );

  assert.ok(migrationCatalogLeafMigration);
  assert.match(
    migrationCatalogLeafMigration.sql,
    /create temporary table planning_db_migration_catalog_leaf_map/
  );

  for (const componentId of [
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-FOUNDATION',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-RAIL-INTEGRITY',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-API-WEB-HARDENING',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-COMPONENT-AUTHORITY',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
  ]) {
    assert.match(migrationCatalogLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'tools/planning-db/migrations/00\\*\\.sql',
    'tools/planning-db/migrations/04\\*\\.sql',
    'tools/planning-db/migrations/05\\*\\.sql',
    'tools/planning-db/migrations/08\\*\\.sql',
    'tools/planning-db/migrations/09\\*\\.sql',
    'tools/planning-db/migrations/12\\*\\.sql',
    'tools/planning-db/migrations/13\\*\\.sql',
    'tools/planning-db/migrations/17\\*\\.sql',
    'tools/planning-db/migrations/18\\*\\.sql',
    'tools/planning-db/migrations/19\\*\\.sql',
  ]) {
    assert.match(migrationCatalogLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    migrationCatalogLeafMigration.sql,
    /PLANNING-DB-MIGRATION-CATALOG-LEAF-MAPPING-20260619/
  );
  assert.match(migrationCatalogLeafMigration.sql, /SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS/);
  assert.match(migrationCatalogLeafMigration.sql, /repo_path = 'tools\/planning-db\/migrations'/);
  assert.match(migrationCatalogLeafMigration.sql, /REL-PLANNING-DB-MIGRATIONS-CONTAINS-/);
  assert.match(migrationCatalogLeafMigration.sql, /ReadPlanningDbFoundationMigrations/);
  assert.match(migrationCatalogLeafMigration.sql, /ReadPlanningDbRailIntegrityMigrations/);
  assert.match(migrationCatalogLeafMigration.sql, /ReadPlanningDbApiWebHardeningMigrations/);
  assert.match(migrationCatalogLeafMigration.sql, /ReadPlanningDbComponentAuthorityMigrations/);
  assert.match(migrationCatalogLeafMigration.sql, /ReadPlanningDbLeafMappingMigrations/);
  assert.match(migrationCatalogLeafMigration.sql, /No Planning DB migration files are deprecated/);
  assert.match(migrationCatalogLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(migrationCatalogLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(migrationCatalogLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    migrationCatalogLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.doesNotMatch(migrationCatalogLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(migrationCatalogLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split CI governance root and materialize scripts parent', () => {
  const migrations = readMigrationFiles();
  const ciGovernanceSplitMigration = migrations.find(
    (migration) => migration.fileName === '135_ci_governance_root_leaf_components.sql'
  );

  assert.ok(ciGovernanceSplitMigration);
  for (const componentId of [
    'SYS-CI-GOVERNANCE-SCRIPTS',
    'SYS-CI-GOVERNANCE-GITHUB',
    'SYS-CI-GOVERNANCE-HOOKS',
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'SYS-CI-GOVERNANCE-TOOLS-DOCS',
    'SYS-CI-GOVERNANCE-PACKAGE-TESTS',
  ]) {
    assert.match(ciGovernanceSplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    '\\.github/\\*\\*',
    '\\.husky/\\*\\*',
    'tools/ci/\\*\\*',
    'tools/docs/\\*\\*',
    'packages/test/\\*\\*',
    '\\.dependency-cruiser\\.cjs',
  ]) {
    assert.match(ciGovernanceSplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(ciGovernanceSplitMigration.sql, /REL-CI-GOVERNANCE-ROOT-CONTAINS-SCRIPTS/);
  assert.match(ciGovernanceSplitMigration.sql, /TEST-SYS-CI-GOVERNANCE-SCRIPTS-COMPONENT-PROFILE/);
  assert.match(ciGovernanceSplitMigration.sql, /unresolved_parent drift/);
  assert.match(ciGovernanceSplitMigration.sql, /architecture\.component_relation/);
  assert.match(ciGovernanceSplitMigration.sql, /architecture\.component_test/);
  assert.doesNotMatch(ciGovernanceSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ciGovernanceSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations map Planning DB migrations out of CI governance root', () => {
  const migrations = readMigrationFiles();
  const planningDbMigrationCatalogMigration = migrations.find(
    (migration) => migration.fileName === '136_ci_governance_planning_db_migrations_component.sql'
  );

  assert.ok(planningDbMigrationCatalogMigration);
  assert.match(planningDbMigrationCatalogMigration.sql, /SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS/);
  assert.match(planningDbMigrationCatalogMigration.sql, /tools\/planning-db\/migrations\/\*\*/);
  assert.match(planningDbMigrationCatalogMigration.sql, /vitest\.config\.ts/);
  assert.match(
    planningDbMigrationCatalogMigration.sql,
    /REL-CI-GOVERNANCE-ROOT-CONTAINS-PLANNING-DB-MIGRATIONS/
  );
  assert.match(
    planningDbMigrationCatalogMigration.sql,
    /TEST-SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS/
  );
  assert.match(planningDbMigrationCatalogMigration.sql, /not remain as direct files/);
  assert.doesNotMatch(planningDbMigrationCatalogMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(planningDbMigrationCatalogMigration.sql, /truncate\s+/i);
});

test('tracked migrations map remaining CI governance tool files', () => {
  const migrations = readMigrationFiles();
  const remainingCiToolMigration = migrations.find(
    (migration) => migration.fileName === '137_ci_governance_remaining_tool_leaf_components.sql'
  );

  assert.ok(remainingCiToolMigration);
  for (const componentId of [
    'SYS-CI-GOVERNANCE-PLANNING-DB-KNOWLEDGE-TOOLS',
    'SYS-CI-GOVERNANCE-OPS-EVIDENCE-COLLECTOR',
  ]) {
    assert.match(remainingCiToolMigration.sql, new RegExp(componentId));
  }

  assert.match(remainingCiToolMigration.sql, /tools\/planning-db\/knowledge\/\*\*/);
  assert.match(remainingCiToolMigration.sql, /tools\/ops\/ar-c2-evidence-collector\.mjs/);
  assert.match(remainingCiToolMigration.sql, /ar-c2-evidence-collector\.architecture\.test\.mjs/);
  assert.match(remainingCiToolMigration.sql, /instead of deprecating functional files/);
  assert.match(remainingCiToolMigration.sql, /architecture\.component_relation/);
  assert.match(remainingCiToolMigration.sql, /architecture\.component_test/);
  assert.doesNotMatch(remainingCiToolMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(remainingCiToolMigration.sql, /truncate\s+/i);
});

test('tracked migrations split CI tools into responsibility leaves', () => {
  const migrations = readMigrationFiles();
  const ciToolsLeafMigration = migrations.find(
    (migration) => migration.fileName === '204_ci_tools_leaf_components.sql'
  );

  assert.ok(ciToolsLeafMigration);
  assert.match(ciToolsLeafMigration.sql, /create temporary table ci_tools_leaf_map/);

  for (const componentId of [
    'SYS-CI-GOVERNANCE-TOOLS-CI-SCOPE-MATRIX',
    'SYS-CI-GOVERNANCE-TOOLS-CI-PR-QUALITY',
    'SYS-CI-GOVERNANCE-TOOLS-CI-ARCHITECTURE-BOUNDARIES',
    'SYS-CI-GOVERNANCE-TOOLS-CI-DOCS-CANON',
    'SYS-CI-GOVERNANCE-TOOLS-CI-COMMAND-CATALOG',
    'SYS-CI-GOVERNANCE-TOOLS-CI-HARNESS',
    'SYS-CI-GOVERNANCE-TOOLS-CI-WEB-HARNESS',
  ]) {
    assert.match(ciToolsLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'tools/ci/repository-change-scope\\.mjs',
    'tools/ci/pr-check-triage\\.mjs',
    '\\.dependency-cruiser\\.cjs',
    'tools/ci/canonization-guard\\.mjs',
    'tools/ci/repository-command-catalog\\.mjs',
    'tools/ci/ci-tool-test-suite\\.mjs',
    'tools/ci/run-web-cypress-native\\.mjs',
    'vitest\\.config\\.ts',
  ]) {
    assert.match(ciToolsLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(ciToolsLeafMigration.sql, /SYS-CI-GOVERNANCE-TOOLS-CI/);
  assert.match(ciToolsLeafMigration.sql, /children_required = true/);
  assert.match(ciToolsLeafMigration.sql, /REL-CI-GOVERNANCE-TOOLS-CI-CONTAINS-/);
  assert.match(ciToolsLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(ciToolsLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(ciToolsLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(ciToolsLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.match(ciToolsLeafMigration.sql, /No tools\/ci file is deprecated/);
  assert.doesNotMatch(ciToolsLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ciToolsLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split API application services into responsibility leaves', () => {
  const migrations = readMigrationFiles();
  const apiServiceLeafMigration = migrations.find(
    (migration) => migration.fileName === '205_api_application_service_leaf_components.sql'
  );

  assert.ok(apiServiceLeafMigration);
  assert.match(
    apiServiceLeafMigration.sql,
    /create temporary table api_application_service_leaf_map/
  );

  for (const componentId of [
    'SYS-API-APPLICATION-SERVICES-AUTHORIZATION',
    'SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'SYS-API-APPLICATION-SERVICES-PLAN-COMMANDS',
    'SYS-API-APPLICATION-SERVICES-WORKSPACE',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'SYS-API-APPLICATION-SERVICES-PROJECTS-COST',
  ]) {
    assert.match(apiServiceLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/api/src/application/services/authorizeCommandScopeService\\.ts',
    'apps/api/src/application/services/startRunAuthorizedFacade\\.ts',
    'apps/api/src/application/services/CompilePlanUseCase\\.ts',
    'apps/api/src/application/services/getWorkspaceGraphDraftUseCase\\.ts',
    'apps/api/src/application/services/importWarehouseSourcesUseCase\\.ts',
    'apps/api/src/application/services/getCostAttributionSummaryUseCase\\.ts',
    'apps/api/src/application/services/warehouseSourceYamlTypes\\.ts',
  ]) {
    assert.match(apiServiceLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(apiServiceLeafMigration.sql, /SYS-API-APPLICATION-SERVICES/);
  assert.match(apiServiceLeafMigration.sql, /children_required = true/);
  assert.match(apiServiceLeafMigration.sql, /REL-API-APPLICATION-SERVICES-CONTAINS-/);
  assert.match(apiServiceLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(apiServiceLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(apiServiceLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(apiServiceLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.match(
    apiServiceLeafMigration.sql,
    /no active service\s+-- file is deprecated|no active service file is deprecated/i
  );
  assert.doesNotMatch(apiServiceLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiServiceLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize API application service aggregate repo path', () => {
  const migrations = readMigrationFiles();
  const apiServiceParentAnchorMigration = migrations.find(
    (migration) =>
      migration.fileName === '206_api_application_service_parent_repo_path_canonicalization.sql'
  );

  assert.ok(apiServiceParentAnchorMigration);
  assert.match(apiServiceParentAnchorMigration.sql, /SYS-API-APPLICATION-SERVICES/);
  assert.match(apiServiceParentAnchorMigration.sql, /SYS-PLANSTORE-API-COMPOSITION/);
  assert.match(
    apiServiceParentAnchorMigration.sql,
    /planning_query_store\.governance_component_local_definitions#SYS-API-APPLICATION-SERVICES/
  );
  assert.match(apiServiceParentAnchorMigration.sql, /duplicate repo_path integrity findings/);
  assert.match(apiServiceParentAnchorMigration.sql, /insert into architecture\.design/);
  assert.match(apiServiceParentAnchorMigration.sql, /insert into architecture\.design_scope/);
  assert.doesNotMatch(apiServiceParentAnchorMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiServiceParentAnchorMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep API application service aggregate on an existing path', () => {
  const migrations = readMigrationFiles();
  const apiServiceExistingPathMigration = migrations.find(
    (migration) => migration.fileName === '207_api_application_service_parent_existing_path.sql'
  );

  assert.ok(apiServiceExistingPathMigration);
  assert.match(apiServiceExistingPathMigration.sql, /SYS-API-APPLICATION-SERVICES/);
  assert.match(apiServiceExistingPathMigration.sql, /apps\/api\/src\/application/);
  assert.match(apiServiceExistingPathMigration.sql, /SYS-API-APPLICATION-PORTS/);
  assert.match(apiServiceExistingPathMigration.sql, /SYS-PLANSTORE-API-COMPOSITION/);
  assert.match(
    apiServiceExistingPathMigration.sql,
    /component-integrity while avoiding the duplicate/
  );
  assert.match(apiServiceExistingPathMigration.sql, /insert into architecture\.design/);
  assert.match(apiServiceExistingPathMigration.sql, /insert into architecture\.design_scope/);
  assert.doesNotMatch(apiServiceExistingPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiServiceExistingPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split API application service tests into evidence leaves', () => {
  const migrations = readMigrationFiles();
  const apiServiceTestLeafMigration = migrations.find(
    (migration) => migration.fileName === '208_api_application_service_test_leaf_components.sql'
  );

  assert.ok(apiServiceTestLeafMigration);
  assert.match(
    apiServiceTestLeafMigration.sql,
    /create temporary table api_application_service_test_leaf_map/
  );

  for (const componentId of [
    'SYS-API-TESTS-APPLICATION-SERVICES-AUTHORIZATION',
    'SYS-API-TESTS-APPLICATION-SERVICES-RUN-LIFECYCLE',
    'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'SYS-API-TESTS-APPLICATION-SERVICES-PLAN-COMMANDS',
    'SYS-API-TESTS-APPLICATION-SERVICES-WORKSPACE',
    'SYS-API-TESTS-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'SYS-API-TESTS-APPLICATION-SERVICES-PROJECTS-COST',
    'SYS-API-TESTS-APPLICATION-SERVICES-PLANSTORE',
    'SYS-API-TESTS-APPLICATION-SERVICES-ARCHITECTURE-HARNESS',
  ]) {
    assert.match(apiServiceTestLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/api/test/application/ports/accessDecision\\.test\\.ts',
    'apps/api/test/application/services/startRunAuthorizedFacade\\.auth\\.test\\.ts',
    'apps/api/test/application/services/CompilePlanUseCase\\.test\\.ts',
    'apps/api/test/application/services/workspaceGraphDraftCapabilityPolicy\\.test\\.ts',
    'apps/api/test/application/services/warehouseSourceYaml\\.test\\.ts',
    'apps/api/test/application/services/StoredPlanExecutabilityValidator\\.test\\.ts',
    'apps/api/test/application/services/applicationArchitectureAst\\.support\\.ts',
  ]) {
    assert.match(apiServiceTestLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(apiServiceTestLeafMigration.sql, /SYS-API-TESTS-APPLICATION-SERVICES/);
  assert.match(apiServiceTestLeafMigration.sql, /children_required = true/);
  assert.match(apiServiceTestLeafMigration.sql, /REL-API-TESTS-APPLICATION-SERVICES-CONTAINS-/);
  assert.match(apiServiceTestLeafMigration.sql, /'guards'/);
  assert.match(apiServiceTestLeafMigration.sql, /SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION/);
  assert.match(apiServiceTestLeafMigration.sql, /SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION/);
  assert.match(apiServiceTestLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(apiServiceTestLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(apiServiceTestLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    apiServiceTestLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    apiServiceTestLeafMigration.sql,
    /no\s+(?:--\s*)?application-service\s+test file is deprecated/i
  );
  assert.doesNotMatch(apiServiceTestLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiServiceTestLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split API infrastructure into adapter leaves', () => {
  const migrations = readMigrationFiles();
  const apiInfrastructureLeafMigration = migrations.find(
    (migration) => migration.fileName === '221_api_infrastructure_leaf_components.sql'
  );

  assert.ok(apiInfrastructureLeafMigration);
  assert.match(
    apiInfrastructureLeafMigration.sql,
    /create temporary table api_infrastructure_leaf_map/
  );

  for (const componentId of [
    'SYS-API-INFRA-AUTH',
    'SYS-API-INFRA-BACKPRESSURE',
    'SYS-API-INFRA-START-RUN-ADMISSION',
    'SYS-API-INFRA-RUNTIME-TELEMETRY',
    'SYS-API-INFRA-WORKSPACE-DRAFT',
    'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS',
    'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'SYS-API-INFRA-RUNTIME-FOUNDATION',
  ]) {
    assert.match(apiInfrastructureLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/api/src/infrastructure/auth/oidcAuthenticator\\.ts',
    'apps/api/src/infrastructure/backpressure/RawSqlBackpressureStore\\.ts',
    'apps/api/src/infrastructure/startRun/PostgresDuplicateRunProbe\\.ts',
    'apps/api/src/infrastructure/telemetry/ObservabilityStartRunSlaTelemetry\\.ts',
    'apps/api/src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore\\.ts',
    'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository\\.ts',
    'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog\\.ts',
    'apps/api/src/db/pool\\.ts',
    'apps/api/src/plugins/observability\\.ts',
  ]) {
    assert.match(apiInfrastructureLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(apiInfrastructureLeafMigration.sql, /SYS-API-INFRASTRUCTURE/);
  assert.match(apiInfrastructureLeafMigration.sql, /children_required = true/);
  assert.match(apiInfrastructureLeafMigration.sql, /REL-API-INFRASTRUCTURE-CONTAINS-/);
  assert.match(apiInfrastructureLeafMigration.sql, /'depends_on'/);
  assert.match(
    apiInfrastructureLeafMigration.sql,
    /SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION/
  );
  assert.match(apiInfrastructureLeafMigration.sql, /SYS-API-APPLICATION-SERVICES-WORKSPACE/);
  assert.match(apiInfrastructureLeafMigration.sql, /SYS-API-RUNTIME-COMPOSITION/);
  assert.match(apiInfrastructureLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(apiInfrastructureLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(apiInfrastructureLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    apiInfrastructureLeafMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    apiInfrastructureLeafMigration.sql,
    /nonfunctional\s+-- files require explicit deprecation evidence|nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(apiInfrastructureLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(apiInfrastructureLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiInfrastructureLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations deprecate stale Canvas contextual workbench local rail source', () => {
  const migrations = readMigrationFiles();
  const staleCanvasRailMigration = migrations.find(
    (migration) => migration.fileName === '222_deprecate_stale_canvas_contextual_workbench_rail.sql'
  );

  assert.ok(staleCanvasRailMigration);
  assert.match(
    staleCanvasRailMigration.sql,
    /update planning_query_store\.feature_mechanization_local_rails rail/
  );
  assert.match(staleCanvasRailMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(staleCanvasRailMigration.sql, /rail_status = 'deprecated'/);
  assert.match(
    staleCanvasRailMigration.sql,
    /CanvasContextualWorkbenchPanel\.tsx[\s\S]*deprecatedSourcePaths/
  );
  assert.match(staleCanvasRailMigration.sql, /canonicalRailSources/);
  assert.match(
    staleCanvasRailMigration.sql,
    /docs\/architecture\/components\/web\/graph\/canvas-workbench-command-query-catalog\.md/
  );
  assert.match(staleCanvasRailMigration.sql, /canvasInteractionCommandSurface\.ts/);
  assert.match(staleCanvasRailMigration.sql, /canvasNodeContextMenuModel\.ts/);
  assert.match(staleCanvasRailMigration.sql, /sourcePathReconciledBy/);
  assert.doesNotMatch(staleCanvasRailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(staleCanvasRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations harden deprecated Canvas contextual workbench rail completion gate', () => {
  const migrations = readMigrationFiles();
  const staleCanvasRailGateMigration = migrations.find(
    (migration) =>
      migration.fileName === '223_canvas_contextual_workbench_deprecation_gate_hardening.sql'
  );

  assert.ok(staleCanvasRailGateMigration);
  assert.match(
    staleCanvasRailGateMigration.sql,
    /local#CANVAS-CONTEXTUAL-PROJECT-CODE-20260619#query#resolvecanvascontextmenu/
  );
  assert.match(staleCanvasRailGateMigration.sql, /rail\.rail_status = 'deprecated'/);
  assert.match(staleCanvasRailGateMigration.sql, /completion_gate = target_gate\.completion_gate/);
  assert.match(staleCanvasRailGateMigration.sql, /pnpm verify:prepush/);
  assert.match(staleCanvasRailGateMigration.sql, /completionGateHardenedBy/);
  assert.doesNotMatch(staleCanvasRailGateMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(staleCanvasRailGateMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile active Canvas contextual workbench panel ownership', () => {
  const migrations = readMigrationFiles();
  const contextualWorkbenchPanelMigration = migrations.find(
    (migration) => migration.fileName === '224_web_canvas_contextual_workbench_panel_reconcile.sql'
  );

  assert.ok(contextualWorkbenchPanelMigration);
  assert.match(contextualWorkbenchPanelMigration.sql, /SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL/);
  assert.match(
    contextualWorkbenchPanelMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextualWorkbenchPanel\.tsx/
  );
  assert.match(contextualWorkbenchPanelMigration.sql, /CanvasContextualWorkbenchPanelProps/);
  assert.match(
    contextualWorkbenchPanelMigration.sql,
    /REL-WEB-CANVAS-CONTEXTUAL-WORKBENCH-CONTAINS-PANEL/
  );
  assert.match(
    contextualWorkbenchPanelMigration.sql,
    /REL-WEB-CANVAS-SHELL-COMPOSITION-DEPENDS-ON-CONTEXTUAL-WORKBENCH-PANEL/
  );
  assert.match(contextualWorkbenchPanelMigration.sql, /ReadCanvasShellContextualWorkbench/);
  assert.match(contextualWorkbenchPanelMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(
    contextualWorkbenchPanelMigration.sql,
    /CanvasShell\.contextMenuIntegration\.test\.tsx/
  );
  assert.match(contextualWorkbenchPanelMigration.sql, /CanvasShell\.graphSurface\.test\.tsx/);
  assert.match(contextualWorkbenchPanelMigration.sql, /rail_status = 'deprecated'/);
  assert.match(
    contextualWorkbenchPanelMigration.sql,
    /duplicates the canonical Canvas context-menu query rail/
  );
  assert.match(
    contextualWorkbenchPanelMigration.sql,
    /activePresentationComponent', 'SYS-WEB-CANVAS-CONTEXTUAL-WORKBENCH-PANEL'/
  );
  assert.match(contextualWorkbenchPanelMigration.sql, /- 'deprecatedSourcePaths'/);
  assert.doesNotMatch(contextualWorkbenchPanelMigration.sql, /deprecatedSourcePaths', to_jsonb/);
  assert.doesNotMatch(
    contextualWorkbenchPanelMigration.sql,
    /CanvasContextualWorkbenchPanel\.tsx is no longer tracked/
  );
  assert.doesNotMatch(contextualWorkbenchPanelMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(contextualWorkbenchPanelMigration.sql, /truncate\s+/i);
});

test('tracked migrations map source import catalog view and retire duplicate table rail', () => {
  const migrations = readMigrationFiles();
  const sourceImportCatalogViewMigration = migrations.find(
    (migration) => migration.fileName === '225_web_source_import_catalog_view_component.sql'
  );

  assert.ok(sourceImportCatalogViewMigration);
  assert.match(sourceImportCatalogViewMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/);
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/SourceImportCatalogView\.tsx/
  );
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/SourceImportCatalogView\.test\.tsx/
  );
  assert.match(sourceImportCatalogViewMigration.sql, /SourceImportCatalogViewPresentation/);
  assert.match(sourceImportCatalogViewMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /REL-WEB-CANVAS-SOURCE-IMPORT-WIZARD-CONTAINS-CATALOG-VIEW/
  );
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /REL-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW-DEPENDS-ON-CORE/
  );
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /REL-WEB-CANVAS-SOURCE-IMPORT-STEPS-DEPENDS-ON-CATALOG-VIEW/
  );
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /WEB-SOURCE-IMPORT-CONTEXTUAL-CATALOG-20260619/
  );
  assert.match(sourceImportCatalogViewMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(sourceImportCatalogViewMigration.sql, /rail_status = 'retired'/);
  assert.match(sourceImportCatalogViewMigration.sql, /mechanization_status = 'closed'/);
  assert.match(
    sourceImportCatalogViewMigration.sql,
    /Duplicate local frontend component projection/
  );
  assert.match(sourceImportCatalogViewMigration.sql, /frontend-command-query-rail-inventory\.md/);
  assert.match(sourceImportCatalogViewMigration.sql, /ADR-0058-warehouse-source-import-rails\.md/);
  assert.doesNotMatch(
    sourceImportCatalogViewMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
  assert.doesNotMatch(sourceImportCatalogViewMigration.sql, /truncate\s+/i);
});

test('tracked migrations map source import catalog primitives under catalog view ownership', () => {
  const migrations = readMigrationFiles();
  const sourceImportCatalogPrimitivesMigration = migrations.find(
    (migration) =>
      migration.fileName === '327_source_import_catalog_primitives_component_boundary.sql'
  );

  assert.ok(sourceImportCatalogPrimitivesMigration);
  assert.match(
    sourceImportCatalogPrimitivesMigration.sql,
    /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/
  );
  assert.match(
    sourceImportCatalogPrimitivesMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/SourceImportCatalogPrimitives\.tsx/
  );
  assert.match(
    sourceImportCatalogPrimitivesMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/SourceImportCatalogView\.architecture\.test\.ts/
  );
  assert.match(sourceImportCatalogPrimitivesMigration.sql, /frontend_component_local_files/);
  assert.match(sourceImportCatalogPrimitivesMigration.sql, /frontend_component_local_evidence/);
  assert.match(sourceImportCatalogPrimitivesMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(sourceImportCatalogPrimitivesMigration.sql, /SourceImportTableCard/);
  assert.match(sourceImportCatalogPrimitivesMigration.sql, /SourceImportColumnPreviewList/);
  assert.doesNotMatch(
    sourceImportCatalogPrimitivesMigration.sql,
    /delete\s+from\s+planning_query_store\.frontend_component_local_files/i
  );
  assert.doesNotMatch(sourceImportCatalogPrimitivesMigration.sql, /truncate\s+/i);
});

test('tracked migrations register transform column metadata workbench projection', () => {
  const migrations = readMigrationFiles();
  const columnMetadataWorkbenchMigration = migrations.find(
    (migration) => migration.fileName === '328_canvas_column_metadata_workbench_projection.sql'
  );

  assert.ok(columnMetadataWorkbenchMigration);
  assert.match(columnMetadataWorkbenchMigration.sql, /E-CANVAS-COLUMN-METADATA-SELECTION-1/);
  assert.match(columnMetadataWorkbenchMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(
    columnMetadataWorkbenchMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/dvtTransformColumnModel\.ts#TransformColumnOption/
  );
  assert.match(
    columnMetadataWorkbenchMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/dvtTransformColumnModel\.ts#buildTransformColumnOptions/
  );
  assert.match(
    columnMetadataWorkbenchMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/dvtTransformColumnModel\.ts#readSelectedColumnRefs/
  );
  assert.match(
    columnMetadataWorkbenchMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/nodePropertiesReadModel\.ts#buildTransformInputColumnRows/
  );
  assert.match(
    columnMetadataWorkbenchMigration.sql,
    /projects dbt model input columns with source and selection state/
  );
  assert.match(columnMetadataWorkbenchMigration.sql, /feature_mechanization_local_rails/);
  assert.match(columnMetadataWorkbenchMigration.sql, /frontend_component_local_files/);
  assert.match(
    columnMetadataWorkbenchMigration.sql,
    /pnpm docs:feature-mechanization:implementation/
  );
  assert.doesNotMatch(
    columnMetadataWorkbenchMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
  assert.doesNotMatch(columnMetadataWorkbenchMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile remaining frontend gap rails and tighten local retirement precedence', () => {
  const migrations = readMigrationFiles();
  const frontendGapRailMigration = migrations.find(
    (migration) => migration.fileName === '226_reconcile_remaining_frontend_gap_rails.sql'
  );

  assert.ok(frontendGapRailMigration);
  assert.match(frontendGapRailMigration.sql, /FRONTEND-GAP-RAIL-RECONCILIATION-20260619/);
  assert.match(frontendGapRailMigration.sql, /ApplyWorkspaceGraphAuthoringCommand/);
  assert.match(frontendGapRailMigration.sql, /WorkspaceGraphAuthoringCommandSchema/);
  assert.match(frontendGapRailMigration.sql, /ValidateCanvasTransformationRun/);
  assert.match(frontendGapRailMigration.sql, /validateTransformationGraph/);
  assert.match(frontendGapRailMigration.sql, /ListAdminRoles/);
  assert.match(frontendGapRailMigration.sql, /ListAdminAuditLog/);
  assert.match(frontendGapRailMigration.sql, /createApiWorkspaceAdminReadPort/);
  assert.match(frontendGapRailMigration.sql, /SaveExecutionTemplateArtifact/);
  assert.match(frontendGapRailMigration.sql, /RunPersistedDbtProject/);
  assert.match(frontendGapRailMigration.sql, /'retired'/);
  assert.match(frontendGapRailMigration.sql, /not rail_group\.has_active_non_gap/);
  assert.match(frontendGapRailMigration.sql, /rail\.rail_source = 'local'/);
  assert.doesNotMatch(frontendGapRailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(frontendGapRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations ignore imported gap duplicate candidates when local implementation exists', () => {
  const migrations = readMigrationFiles();
  const importedGapDuplicateMigration = migrations.find(
    (migration) =>
      migration.fileName === '227_ignore_imported_gap_refs_when_local_implementation_exists.sql'
  );

  assert.ok(importedGapDuplicateMigration);
  assert.match(importedGapDuplicateMigration.sql, /has_active_non_gap/);
  assert.match(
    importedGapDuplicateMigration.sql,
    /not \(rail_group\.has_active_non_gap and rail\.is_gap\)/
  );
  assert.match(importedGapDuplicateMigration.sql, /canonical_candidate_count > 1/);
  assert.match(importedGapDuplicateMigration.sql, /rail\.rail_source = 'local'/);
  assert.doesNotMatch(importedGapDuplicateMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(importedGapDuplicateMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire phantom Canvas node workbench panel reactivation', () => {
  const migrations = readMigrationFiles();
  const phantomPanelMigration = migrations.find(
    (migration) =>
      migration.fileName === '228_retire_canvas_node_workbench_panel_phantom_reactivation.sql'
  );

  assert.ok(phantomPanelMigration);
  assert.match(phantomPanelMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(phantomPanelMigration.sql, /PANEL-PHANTOM-RETIREMENT-20260619/);
  assert.match(phantomPanelMigration.sql, /CanvasNodeWorkbenchPanel\.tsx is not tracked/);
  assert.match(
    phantomPanelMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL/
  );
  assert.match(phantomPanelMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-PANEL/);
  assert.match(phantomPanelMigration.sql, /status = 'deprecated'/);
  assert.match(phantomPanelMigration.sql, /status = 'drift'/);
  assert.match(phantomPanelMigration.sql, /scripts\/planning-db-migrate\.test\.cjs/);
  assert.doesNotMatch(phantomPanelMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(phantomPanelMigration.sql, /truncate\s+/i);
});

test('tracked migrations sanitize Canvas node workbench phantom panel drift relations', () => {
  const migrations = readMigrationFiles();
  const relationDriftMigration = migrations.find(
    (migration) =>
      migration.fileName === '229_sanitize_canvas_node_workbench_panel_drift_relations.sql'
  );

  assert.ok(relationDriftMigration);
  assert.match(relationDriftMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(relationDriftMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-PANEL/);
  assert.match(relationDriftMigration.sql, /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL/);
  assert.match(
    relationDriftMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(relationDriftMigration.sql, /status = 'implemented'/);
  assert.match(relationDriftMigration.sql, /Legacy relation id retained/);
  assert.doesNotMatch(relationDriftMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(relationDriftMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Canvas node workbench phantom panel retirement evidence', () => {
  const migrations = readMigrationFiles();
  const retirementEvidenceMigration = migrations.find(
    (migration) =>
      migration.fileName === '230_complete_canvas_node_workbench_panel_retirement_evidence.sql'
  );

  assert.ok(retirementEvidenceMigration);
  assert.match(
    retirementEvidenceMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PHANTOM-RETIREMENT-20260619/
  );
  assert.match(retirementEvidenceMigration.sql, /architecture\.design_scope/);
  assert.match(retirementEvidenceMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(retirementEvidenceMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-PANEL/);
  assert.match(retirementEvidenceMigration.sql, /deprecated phantom component/);
  assert.doesNotMatch(retirementEvidenceMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(retirementEvidenceMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire Canvas node workbench overlay panel alias relation', () => {
  const migrations = readMigrationFiles();
  const relationAliasRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '231_retire_canvas_node_workbench_overlay_panel_alias_relation.sql'
  );

  assert.ok(relationAliasRetirementMigration);
  assert.match(
    relationAliasRetirementMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-RELATION-DEDUP-20260619/
  );
  assert.match(relationAliasRetirementMigration.sql, /architecture\.design_scope/);
  assert.match(relationAliasRetirementMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY/);
  assert.match(relationAliasRetirementMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-PANEL/);
  assert.match(
    relationAliasRetirementMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-INSPECTOR-PANEL/
  );
  assert.match(
    relationAliasRetirementMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(relationAliasRetirementMigration.sql, /'may_delete'/);
  assert.match(
    relationAliasRetirementMigration.sql,
    /delete from architecture\.component_relation relation\s+where relation\.relation_id = 'REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL'/m
  );
  assert.doesNotMatch(relationAliasRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations revert untracked Canvas node workbench panel reactivation', () => {
  const migrations = readMigrationFiles();
  const untrackedReactivationReversalMigration = migrations.find(
    (migration) =>
      migration.fileName === '232_revert_untracked_canvas_node_workbench_panel_reactivation.sql'
  );

  assert.ok(untrackedReactivationReversalMigration);
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNTRACKED-REACTIVATION-REVERSAL-20260619/
  );
  assert.match(untrackedReactivationReversalMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(untrackedReactivationReversalMigration.sql, /status = 'superseded'/);
  assert.match(untrackedReactivationReversalMigration.sql, /status = 'deprecated'/);
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /delete from planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /delete from planning_query_store\.governance_files/
  );
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /delete from planning_query_store\.schema_migrations/
  );
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /225_web_canvas_node_workbench_panel_reactivation/
  );
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /226_web_canvas_node_workbench_panel_effective_reactivation/
  );
  assert.match(
    untrackedReactivationReversalMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL/
  );
  assert.doesNotMatch(untrackedReactivationReversalMigration.sql, /truncate\s+/i);
});

test('tracked migrations harden untracked Canvas node workbench panel reversal', () => {
  const migrations = readMigrationFiles();
  const untrackedReactivationHardeningMigration = migrations.find(
    (migration) =>
      migration.fileName === '233_harden_untracked_canvas_node_workbench_panel_reversal.sql'
  );

  assert.ok(untrackedReactivationHardeningMigration);
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNTRACKED-REACTIVATION-HARDENING-20260619/
  );
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /delete from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties/
  );
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /delete from planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /delete from architecture\.component_port/
  );
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(
    untrackedReactivationHardeningMigration.sql,
    /227_web_canvas_node_workbench_panel_feature_mechanization/
  );
  assert.match(untrackedReactivationHardeningMigration.sql, /status = 'deprecated'/);
  assert.match(untrackedReactivationHardeningMigration.sql, /status = 'superseded'/);
  assert.doesNotMatch(untrackedReactivationHardeningMigration.sql, /truncate\s+/i);
});

test('tracked migrations neutralize parallel Canvas node workbench panel reactivation without reopening it', () => {
  const migrations = readMigrationFiles();
  const parallelReactivationNeutralizationMigration = migrations.find(
    (migration) =>
      migration.fileName === '234_neutralize_parallel_canvas_node_workbench_panel_reactivation.sql'
  );

  assert.ok(parallelReactivationNeutralizationMigration);
  assert.match(
    parallelReactivationNeutralizationMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PARALLEL-REACTIVATION-NEUTRALIZATION-20260619/
  );
  assert.match(
    parallelReactivationNeutralizationMigration.sql,
    /delete from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    parallelReactivationNeutralizationMigration.sql,
    /local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties/
  );
  assert.match(
    parallelReactivationNeutralizationMigration.sql,
    /delete from architecture\.component_port/
  );
  assert.match(
    parallelReactivationNeutralizationMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(parallelReactivationNeutralizationMigration.sql, /status = 'deprecated'/);
  assert.match(parallelReactivationNeutralizationMigration.sql, /status = 'superseded'/);
  assert.doesNotMatch(
    parallelReactivationNeutralizationMigration.sql,
    /delete from planning_query_store\.schema_migrations/
  );
  assert.doesNotMatch(parallelReactivationNeutralizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations neutralize Canvas panel reassertion and prefer local implemented rails', () => {
  const migrations = readMigrationFiles();
  const panelReassertionNeutralizationMigration = migrations.find(
    (migration) =>
      migration.fileName === '235_canvas_panel_reassertion_neutralization_and_rail_precedence.sql'
  );

  assert.ok(panelReassertionNeutralizationMigration);
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-REASSERTION-NEUTRALIZATION-20260619/
  );
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-PROFILE-REASSERTION-20260619/
  );
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /delete from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /delete from architecture\.component_port/
  );
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(panelReassertionNeutralizationMigration.sql, /has_active_local_non_gap/);
  assert.match(
    panelReassertionNeutralizationMigration.sql,
    /not \(rail_group\.has_active_local_non_gap and rail\.rail_source <> 'local'\)/
  );
  assert.match(panelReassertionNeutralizationMigration.sql, /status = 'deprecated'/);
  assert.match(panelReassertionNeutralizationMigration.sql, /status = 'superseded'/);
  assert.doesNotMatch(panelReassertionNeutralizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations neutralize Canvas panel feature manifest rehydration', () => {
  const migrations = readMigrationFiles();
  const featureManifestRehydrationMigration = migrations.find(
    (migration) =>
      migration.fileName === '236_neutralize_canvas_panel_feature_manifest_rehydration.sql'
  );

  assert.ok(featureManifestRehydrationMigration);
  assert.match(
    featureManifestRehydrationMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-REHYDRATION-NEUTRALIZATION-20260619/
  );
  assert.match(
    featureManifestRehydrationMigration.sql,
    /local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties/
  );
  assert.match(
    featureManifestRehydrationMigration.sql,
    /delete from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(featureManifestRehydrationMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(featureManifestRehydrationMigration.sql, /status = 'deprecated'/);
  assert.match(featureManifestRehydrationMigration.sql, /status = 'superseded'/);
  assert.doesNotMatch(featureManifestRehydrationMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire stale Canvas panel feature manifest without reopening component files', () => {
  const migrations = readMigrationFiles();
  const staleFeatureManifestRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '239_retire_canvas_node_workbench_panel_feature_manifest.sql'
  );

  assert.ok(staleFeatureManifestRetirementMigration);
  assert.match(
    staleFeatureManifestRetirementMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-FEATURE-MANIFEST-RETIREMENT-20260619/
  );
  assert.match(
    staleFeatureManifestRetirementMigration.sql,
    /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/
  );
  assert.match(
    staleFeatureManifestRetirementMigration.sql,
    /local#WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619#query#inspectcanvasnodeproperties/
  );
  assert.match(
    staleFeatureManifestRetirementMigration.sql,
    /delete from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    staleFeatureManifestRetirementMigration.sql,
    /delete from planning_query_store\.governance_component_files/
  );
  assert.match(staleFeatureManifestRetirementMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(staleFeatureManifestRetirementMigration.sql, /status = 'deprecated'/);
  assert.doesNotMatch(staleFeatureManifestRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations restore active Canvas panel authority after retirement merge', () => {
  const migrations = readMigrationFiles();
  const activeMergeReconciliationMigration = migrations.find(
    (migration) =>
      migration.fileName === '242_restore_canvas_node_workbench_panel_after_retirement_merge.sql'
  );

  assert.ok(activeMergeReconciliationMigration);
  assert.match(
    activeMergeReconciliationMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-ACTIVE-MERGE-RECONCILIATION-20260619/
  );
  assert.match(activeMergeReconciliationMigration.sql, /'implemented'/);
  assert.match(activeMergeReconciliationMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(activeMergeReconciliationMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(activeMergeReconciliationMigration.sql, /ConfigureCanvasDbtNode/);
  assert.match(activeMergeReconciliationMigration.sql, /ConfigureCanvasDvtNode/);
  assert.match(activeMergeReconciliationMigration.sql, /PRIMARY_NODE_WORKBENCH_SECTION_IDS/);
  assert.match(activeMergeReconciliationMigration.sql, /NodeWorkbenchTabItem/);
  assert.match(activeMergeReconciliationMigration.sql, /renderSectionBody/);
  assert.match(activeMergeReconciliationMigration.sql, /resolveActiveNodeWorkbenchTab/);
  assert.match(activeMergeReconciliationMigration.sql, /docs:feature-mechanization:implementation/);
  assert.doesNotMatch(activeMergeReconciliationMigration.sql, /truncate\s+/i);
});

test('tracked migrations restore active Canvas panel relations after retirement merge', () => {
  const migrations = readMigrationFiles();
  const relationRestoreMigration = migrations.find(
    (migration) => migration.fileName === '243_restore_canvas_node_workbench_panel_relations.sql'
  );

  assert.ok(relationRestoreMigration);
  assert.match(
    relationRestoreMigration.sql,
    /PLANNING-DB-WEB-CANVAS-NODE-WORKBENCH-PANEL-RELATION-RESTORE-20260619/
  );
  assert.match(relationRestoreMigration.sql, /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL/);
  assert.match(
    relationRestoreMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(relationRestoreMigration.sql, /architecture\.component_relation/);
  assert.match(relationRestoreMigration.sql, /must_prove/);
  assert.match(relationRestoreMigration.sql, /'implemented'/);
  assert.doesNotMatch(relationRestoreMigration.sql, /truncate\s+/i);
});

test('tracked migrations split API HTTP entrypoint tests into evidence leaves', () => {
  const migrations = readMigrationFiles();
  const apiHttpTestLeafMigration = migrations.find(
    (migration) => migration.fileName === '209_api_http_entrypoint_test_leaf_components.sql'
  );

  assert.ok(apiHttpTestLeafMigration);
  assert.match(
    apiHttpTestLeafMigration.sql,
    /create temporary table api_http_entrypoint_test_leaf_map/
  );

  for (const componentId of [
    'SYS-API-HTTP-ENTRYPOINT-TESTS-ADMIN-REPAIR',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-AUTHENTICATION',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-ERROR-TRANSLATION',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-PLAN-COMMANDS',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-RUN-LIFECYCLE',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-RUNTIME-ROUTE-REGISTRY',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-WORKSPACE-ROUTES',
    'SYS-API-HTTP-ENTRYPOINT-TESTS-ARCHITECTURE-HARNESS',
  ]) {
    assert.match(apiHttpTestLeafMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/api/test/entrypoints/http/adminRoutes\\.test\\.ts',
    'apps/api/test/entrypoints/http/httpBearerAuthentication\\.test\\.ts',
    'apps/api/test/entrypoints/http/httpErrorTranslation\\.respondAndStatic\\.test\\.ts',
    'apps/api/test/entrypoints/http/previewPlanRoute\\.outcomes\\.test\\.ts',
    'apps/api/test/entrypoints/http/startRunRoute\\.authAndSuccess\\.test\\.ts',
    'apps/api/test/entrypoints/http/registerProtectedRuntimeRoutes\\.test\\.ts',
    'apps/api/test/entrypoints/http/workspacePluginCatalogRoutes\\.test\\.ts',
    'apps/api/test/entrypoints/http/httpArchitectureAst\\.support\\.ts',
  ]) {
    assert.match(apiHttpTestLeafMigration.sql, new RegExp(ownedPath));
  }

  assert.match(apiHttpTestLeafMigration.sql, /SYS-API-HTTP-ENTRYPOINT-TESTS/);
  assert.match(apiHttpTestLeafMigration.sql, /children_required = true/);
  assert.match(apiHttpTestLeafMigration.sql, /REL-API-HTTP-ENTRYPOINT-TESTS-CONTAINS-/);
  assert.match(apiHttpTestLeafMigration.sql, /'guards'/);
  assert.match(apiHttpTestLeafMigration.sql, /SYS-API-HTTP-RUN-LIFECYCLE/);
  assert.match(apiHttpTestLeafMigration.sql, /SYS-API-HTTP-WORKSPACE-ROUTES/);
  assert.match(apiHttpTestLeafMigration.sql, /SYS-API-HTTP-ERROR-TRANSLATION/);
  assert.match(apiHttpTestLeafMigration.sql, /insert into architecture\.contract/);
  assert.match(apiHttpTestLeafMigration.sql, /insert into architecture\.component_port/);
  assert.match(apiHttpTestLeafMigration.sql, /insert into architecture\.component_test/);
  assert.match(apiHttpTestLeafMigration.sql, /insert into architecture\.component_observability/);
  assert.match(
    apiHttpTestLeafMigration.sql,
    /nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(apiHttpTestLeafMigration.sql, /planRoutePlanSourcePolicy\.test\.ts/);
  assert.doesNotMatch(apiHttpTestLeafMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(apiHttpTestLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(apiHttpTestLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Web Canvas draft lifecycle into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const webCanvasDraftMigration = migrations.find(
    (migration) => migration.fileName === '210_web_canvas_draft_lifecycle_leaf_components.sql'
  );

  assert.ok(webCanvasDraftMigration);
  assert.match(
    webCanvasDraftMigration.sql,
    /create temporary table web_canvas_draft_lifecycle_leaf_map/
  );

  for (const componentId of [
    'SYS-WEB-CANVAS-DRAFT-ACCESS-POSTURE',
    'SYS-WEB-CANVAS-DRAFT-AUTHORING-MODEL',
    'SYS-WEB-CANVAS-DRAFT-REPOSITORY-SCOPE',
    'SYS-WEB-CANVAS-DRAFT-SESSION-STATE',
    'SYS-WEB-CANVAS-DRAFT-READ-PRESENTATION',
    'SYS-WEB-CANVAS-DRAFT-AUTOSAVE-PERSISTENCE',
    'SYS-WEB-CANVAS-DRAFT-BOOTSTRAP-RECOVERY',
  ]) {
    assert.match(webCanvasDraftMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/web/src/app/views/canvas/canvasDraftAccessPostureModel\\.ts',
    'apps/web/src/app/views/canvas/canvasDraftAuthoring\\.ts',
    'apps/web/src/app/views/canvas/canvasDraftRepository\\.ts',
    'apps/web/src/app/views/canvas/canvasDraftSession\\.ts',
    'apps/web/src/app/views/canvas/canvasDraftReadModel\\.ts',
    'apps/web/src/app/views/canvas/useCanvasDraftAutosave\\.ts',
    'apps/web/src/app/views/canvas/useCanvasDraftBootstrapping\\.ts',
    'apps/web/src/app/views/canvas/useCanvasDraftReloadHydration\\.ts',
  ]) {
    assert.match(webCanvasDraftMigration.sql, new RegExp(ownedPath));
  }

  assert.match(webCanvasDraftMigration.sql, /SYS-WEB-CANVAS-DRAFT-LIFECYCLE/);
  assert.match(webCanvasDraftMigration.sql, /children_required = true/);
  assert.match(webCanvasDraftMigration.sql, /REL-WEB-CANVAS-DRAFT-LIFECYCLE-CONTAINS-/);
  assert.match(webCanvasDraftMigration.sql, /'depends_on'/);
  assert.match(webCanvasDraftMigration.sql, /ManageCanvasDraftSessionState/);
  assert.match(webCanvasDraftMigration.sql, /WriteCanvasDraftRecord/);
  assert.match(webCanvasDraftMigration.sql, /ReadCanvasDraftPresentation/);
  assert.match(webCanvasDraftMigration.sql, /RecoverCanvasDraft/);
  assert.match(webCanvasDraftMigration.sql, /insert into architecture\.contract/);
  assert.match(webCanvasDraftMigration.sql, /insert into architecture\.component_port/);
  assert.match(webCanvasDraftMigration.sql, /insert into architecture\.component_test/);
  assert.match(webCanvasDraftMigration.sql, /insert into architecture\.component_observability/);
  assert.match(
    webCanvasDraftMigration.sql,
    /nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(webCanvasDraftMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasDraftMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasDraftMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Web Canvas draft lifecycle aggregate repo path', () => {
  const migrations = readMigrationFiles();
  const webCanvasDraftPathMigration = migrations.find(
    (migration) =>
      migration.fileName === '211_web_canvas_draft_lifecycle_parent_path_canonicalization.sql'
  );

  assert.ok(webCanvasDraftPathMigration);
  assert.match(
    webCanvasDraftPathMigration.sql,
    /PLANNING-DB-WEB-CANVAS-DRAFT-LIFECYCLE-PARENT-PATH-20260619/
  );
  assert.match(webCanvasDraftPathMigration.sql, /SYS-WEB-CANVAS-DRAFT-LIFECYCLE/);
  assert.match(webCanvasDraftPathMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-INTERACTION/);
  assert.match(
    webCanvasDraftPathMigration.sql,
    /repo_path = 'apps\/web\/src\/app\/views\/canvas\/useCanvasDraftLifecycle\.ts'/
  );
  assert.match(webCanvasDraftPathMigration.sql, /duplicate_repo_path drift/);
  assert.doesNotMatch(webCanvasDraftPathMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasDraftPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasDraftPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Web UI primitives into design-system leaves', () => {
  const migrations = readMigrationFiles();
  const webUiPrimitiveMigration = migrations.find(
    (migration) => migration.fileName === '212_web_ui_primitive_leaf_components.sql'
  );

  assert.ok(webUiPrimitiveMigration);
  assert.match(webUiPrimitiveMigration.sql, /create temporary table web_ui_primitive_leaf_map/);

  for (const componentId of [
    'SYS-WEB-UI-PRIMITIVES-FOUNDATION',
    'SYS-WEB-UI-PRIMITIVES-FORM-CONTROLS',
    'SYS-WEB-UI-PRIMITIVES-OVERLAYS',
    'SYS-WEB-UI-PRIMITIVES-NAVIGATION',
    'SYS-WEB-UI-PRIMITIVES-FEEDBACK',
    'SYS-WEB-UI-PRIMITIVES-DATA-DISPLAY',
    'SYS-WEB-UI-PRIMITIVES-COMPOSITION-LAYOUT',
  ]) {
    assert.match(webUiPrimitiveMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/web/src/app/components/ui/button\\.tsx',
    'apps/web/src/app/components/ui/dialog\\.tsx',
    'apps/web/src/app/components/ui/navigation-menu\\.tsx',
    'apps/web/src/app/components/ui/alert\\.tsx',
    'apps/web/src/app/components/ui/table\\.tsx',
    'apps/web/src/app/components/ui/sidebar\\.tsx',
    'apps/web/src/app/components/ui/utils\\.ts',
  ]) {
    assert.match(webUiPrimitiveMigration.sql, new RegExp(ownedPath));
  }

  assert.match(webUiPrimitiveMigration.sql, /SYS-WEB-APP-COMPONENTS-UI/);
  assert.match(webUiPrimitiveMigration.sql, /children_required = true/);
  assert.match(webUiPrimitiveMigration.sql, /REL-WEB-APP-COMPONENTS-UI-CONTAINS-/);
  assert.match(webUiPrimitiveMigration.sql, /'depends_on'/);
  assert.match(webUiPrimitiveMigration.sql, /ReadWebUiPrimitiveFoundation/);
  assert.match(webUiPrimitiveMigration.sql, /RenderWebUiFormControlPrimitive/);
  assert.match(webUiPrimitiveMigration.sql, /RenderWebUiOverlayPrimitive/);
  assert.match(webUiPrimitiveMigration.sql, /insert into architecture\.contract/);
  assert.match(webUiPrimitiveMigration.sql, /insert into architecture\.component_port/);
  assert.match(webUiPrimitiveMigration.sql, /insert into architecture\.component_test/);
  assert.match(webUiPrimitiveMigration.sql, /insert into architecture\.component_observability/);
  assert.match(
    webUiPrimitiveMigration.sql,
    /nonfunctional primitives require explicit deprecation evidence/i
  );
  assert.doesNotMatch(webUiPrimitiveMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webUiPrimitiveMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webUiPrimitiveMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Temporal workflow runtime into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const temporalWorkflowRuntimeMigration = migrations.find(
    (migration) => migration.fileName === '213_temporal_workflow_runtime_leaf_components.sql'
  );

  assert.ok(temporalWorkflowRuntimeMigration);
  assert.match(
    temporalWorkflowRuntimeMigration.sql,
    /create temporary table temporal_workflow_runtime_leaf_map/
  );

  for (const componentId of [
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUN-MAPPING',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LIFECYCLE-CONTROL',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-CURSOR-STATE',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-LAYER-EXECUTION',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-SEGMENT-RESOLUTION',
    'SYS-ADAPTERS-TEMPORAL-WORKFLOW-INTEGRATION-HARNESS',
  ]) {
    assert.match(temporalWorkflowRuntimeMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'packages/@dvt/adapter-temporal/src/WorkflowMapper\\.ts',
    'packages/@dvt/adapter-temporal/src/workflows/RunPlanWorkflow\\.ts',
    'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow\\.signals\\.ts',
    'packages/@dvt/adapter-temporal/src/workflows/workflowCursorHelpers\\.ts',
    'packages/@dvt/adapter-temporal/src/workflows/runPlanWorkflow\\.layers\\.ts',
    'packages/@dvt/adapter-temporal/src/workflows/executionSegmentResolver\\.ts',
    'packages/@dvt/adapter-temporal/test/integration\\.time-skipping\\.shared\\.ts',
  ]) {
    assert.match(temporalWorkflowRuntimeMigration.sql, new RegExp(ownedPath));
  }

  assert.match(temporalWorkflowRuntimeMigration.sql, /SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME/);
  assert.match(temporalWorkflowRuntimeMigration.sql, /children_required = true/);
  assert.match(
    temporalWorkflowRuntimeMigration.sql,
    /REL-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME-CONTAINS-/
  );
  assert.match(temporalWorkflowRuntimeMigration.sql, /'depends_on'/);
  assert.match(
    temporalWorkflowRuntimeMigration.sql,
    /SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS/
  );
  assert.match(temporalWorkflowRuntimeMigration.sql, /ExecuteTemporalRunPlanWorkflow/);
  assert.match(temporalWorkflowRuntimeMigration.sql, /MapTemporalRunReference/);
  assert.match(temporalWorkflowRuntimeMigration.sql, /ResolveTemporalWorkflowExecutionSegment/);
  assert.match(temporalWorkflowRuntimeMigration.sql, /insert into architecture\.contract/);
  assert.match(temporalWorkflowRuntimeMigration.sql, /insert into architecture\.component_port/);
  assert.match(temporalWorkflowRuntimeMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    temporalWorkflowRuntimeMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    temporalWorkflowRuntimeMigration.sql,
    /nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(temporalWorkflowRuntimeMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(temporalWorkflowRuntimeMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(temporalWorkflowRuntimeMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Temporal workflow runtime aggregate repo path', () => {
  const migrations = readMigrationFiles();
  const temporalWorkflowRuntimePathMigration = migrations.find(
    (migration) =>
      migration.fileName === '214_temporal_workflow_runtime_parent_path_canonicalization.sql'
  );

  assert.ok(temporalWorkflowRuntimePathMigration);
  assert.match(
    temporalWorkflowRuntimePathMigration.sql,
    /PLANNING-DB-TEMPORAL-WORKFLOW-RUNTIME-PARENT-PATH-20260619/
  );
  assert.match(temporalWorkflowRuntimePathMigration.sql, /SYS-ADAPTERS-TEMPORAL-WORKFLOW-RUNTIME/);
  assert.match(
    temporalWorkflowRuntimePathMigration.sql,
    /SYS-ADAPTERS-TEMPORAL-WORKFLOW-ENTRYPOINT/
  );
  assert.match(
    temporalWorkflowRuntimePathMigration.sql,
    /repo_path = 'packages\/@dvt\/adapter-temporal\/src\/workflows'/
  );
  assert.match(temporalWorkflowRuntimePathMigration.sql, /duplicate_repo_path drift/);
  assert.doesNotMatch(temporalWorkflowRuntimePathMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(temporalWorkflowRuntimePathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(temporalWorkflowRuntimePathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split contracts package tests into evidence leaves', () => {
  const migrations = readMigrationFiles();
  const contractsTestMigration = migrations.find(
    (migration) => migration.fileName === '215_contracts_package_test_leaf_components.sql'
  );

  assert.ok(contractsTestMigration);
  assert.match(
    contractsTestMigration.sql,
    /create temporary table contracts_package_test_leaf_map/
  );

  for (const componentId of [
    'SYS-CONTRACTS-TESTS-COMPILED-CODE-SCHEMA',
    'SYS-CONTRACTS-TESTS-PLAN-ADMISSION',
    'SYS-CONTRACTS-TESTS-PLANNER',
    'SYS-CONTRACTS-TESTS-PLANSTORE-VERSION',
    'SYS-CONTRACTS-TESTS-PROVIDER-ADAPTER',
    'SYS-CONTRACTS-TESTS-START-RUN-BOUNDARY',
    'SYS-CONTRACTS-TESTS-VALIDATION-HARNESS',
    'SYS-CONTRACTS-TESTS-WORKSPACE-GRAPH-DRAFT',
  ]) {
    assert.match(contractsTestMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'packages/@dvt/contracts/test/compiled-code-ref\\.contract\\.test\\.ts',
    'packages/@dvt/contracts/test/plan-admission-matrix\\.contract\\.test\\.ts',
    'packages/@dvt/contracts/test/planner\\.contract\\.test\\.ts',
    'packages/@dvt/contracts/test/plan-store-records-shape-sync\\.test\\.ts',
    'packages/@dvt/contracts/test/provider-adapter\\.architecture\\.test\\.ts',
    'packages/@dvt/contracts/test/start-run-boundary\\.contract\\.test\\.ts',
    'packages/@dvt/contracts/test/validation\\.test\\.ts',
    'packages/@dvt/contracts/test/workspace-graph-authoring-draft\\.contract\\.test\\.ts',
  ]) {
    assert.match(contractsTestMigration.sql, new RegExp(ownedPath));
  }

  assert.match(contractsTestMigration.sql, /SYS-CONTRACTS-PACKAGE-TESTS/);
  assert.match(contractsTestMigration.sql, /children_required = true/);
  assert.match(contractsTestMigration.sql, /repo_path = 'packages\/@dvt\/contracts\/test'/);
  assert.match(contractsTestMigration.sql, /REL-CONTRACTS-PACKAGE-TESTS-CONTAINS-/);
  assert.match(contractsTestMigration.sql, /'guards'/);
  assert.match(contractsTestMigration.sql, /SYS-CONTRACTS-PLANNER-CONTRACTS/);
  assert.match(contractsTestMigration.sql, /SYS-RUNTIME-ENGINE-CONTRACTS/);
  assert.match(contractsTestMigration.sql, /ValidateContractsPackageTests/);
  assert.match(contractsTestMigration.sql, /ValidateStartRunBoundaryContract/);
  assert.match(contractsTestMigration.sql, /insert into architecture\.contract/);
  assert.match(contractsTestMigration.sql, /insert into architecture\.component_port/);
  assert.match(contractsTestMigration.sql, /insert into architecture\.component_test/);
  assert.match(contractsTestMigration.sql, /insert into architecture\.component_observability/);
  assert.match(
    contractsTestMigration.sql,
    /nonfunctional tests require explicit deprecation evidence/i
  );
  assert.doesNotMatch(contractsTestMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(contractsTestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(contractsTestMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Web Canvas execution/runs into semantic leaves', () => {
  const migrations = readMigrationFiles();
  const webCanvasExecutionMigration = migrations.find(
    (migration) => migration.fileName === '216_web_canvas_execution_runs_leaf_components.sql'
  );

  assert.ok(webCanvasExecutionMigration);
  assert.match(
    webCanvasExecutionMigration.sql,
    /create temporary table web_canvas_execution_runs_leaf_map/
  );

  for (const componentId of [
    'SYS-WEB-CANVAS-EXECUTION-ACTION-COMPOSITION',
    'SYS-WEB-CANVAS-EXECUTION-DRAFT-FLUSH',
    'SYS-WEB-CANVAS-EXECUTION-SELECTION',
    'SYS-WEB-CANVAS-RUN-START-ACTION',
    'SYS-WEB-CANVAS-RUNTIME-POLICY',
    'SYS-WEB-CANVAS-PLAN-RUN-READINESS',
    'SYS-WEB-CANVAS-OPERATIONAL-DRAWER-CONTRIBUTION',
  ]) {
    assert.match(webCanvasExecutionMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/web/src/app/views/canvas/useCanvasExecutionActions\\.ts',
    'apps/web/src/app/views/canvas/useCanvasExecutionDraftFlush\\.ts',
    'apps/web/src/app/views/canvas/canvasRunSelection\\.ts',
    'apps/web/src/app/views/canvas/canvasRunStartAction\\.ts',
    'apps/web/src/app/views/canvas/canvasRuntimePolicy\\.ts',
    'apps/web/src/app/views/canvas/canvasExecutionState\\.ts',
    'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar\\.tsx',
  ]) {
    assert.match(webCanvasExecutionMigration.sql, new RegExp(ownedPath));
  }

  assert.match(webCanvasExecutionMigration.sql, /SYS-WEB-CANVAS-EXECUTION-RUNS/);
  assert.match(webCanvasExecutionMigration.sql, /children_required = true/);
  assert.match(webCanvasExecutionMigration.sql, /REL-WEB-CANVAS-EXECUTION-RUNS-CONTAINS-/);
  assert.match(webCanvasExecutionMigration.sql, /'depends_on'/);
  assert.match(webCanvasExecutionMigration.sql, /ObservePlanRunReadiness/);
  assert.match(webCanvasExecutionMigration.sql, /StartCanvasRun/);
  assert.match(webCanvasExecutionMigration.sql, /RegisterCanvasOperationalDrawerContribution/);
  assert.match(webCanvasExecutionMigration.sql, /SYS-API-HTTP-RUN-LIFECYCLE/);
  assert.match(webCanvasExecutionMigration.sql, /SYS-WEB-APP-COMPONENTS-CONSOLE/);
  assert.match(webCanvasExecutionMigration.sql, /insert into architecture\.contract/);
  assert.match(webCanvasExecutionMigration.sql, /insert into architecture\.component_port/);
  assert.match(webCanvasExecutionMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    webCanvasExecutionMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    webCanvasExecutionMigration.sql,
    /nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(webCanvasExecutionMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasExecutionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasExecutionMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Web Canvas execution/runs aggregate repo path', () => {
  const migrations = readMigrationFiles();
  const webCanvasExecutionPathMigration = migrations.find(
    (migration) =>
      migration.fileName === '217_web_canvas_execution_runs_parent_path_canonicalization.sql'
  );

  assert.ok(webCanvasExecutionPathMigration);
  assert.match(
    webCanvasExecutionPathMigration.sql,
    /PLANNING-DB-WEB-CANVAS-EXECUTION-RUNS-PARENT-PATH-20260619/
  );
  assert.match(webCanvasExecutionPathMigration.sql, /SYS-WEB-CANVAS-EXECUTION-RUNS/);
  assert.match(webCanvasExecutionPathMigration.sql, /SYS-WEB-CANVAS-CONTROLLER-INTERACTION/);
  assert.match(
    webCanvasExecutionPathMigration.sql,
    /repo_path = 'docs\/architecture\/components\/web\/graph\/canvas-execution-selection-component\.md'/
  );
  assert.match(webCanvasExecutionPathMigration.sql, /boundary_drift/);
  assert.doesNotMatch(webCanvasExecutionPathMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasExecutionPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasExecutionPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Web Canvas controller orchestration into responsibility leaves', () => {
  const migrations = readMigrationFiles();
  const webCanvasControllerOrchestrationMigration = migrations.find(
    (migration) =>
      migration.fileName === '218_web_canvas_controller_orchestration_leaf_components.sql'
  );

  assert.ok(webCanvasControllerOrchestrationMigration);
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /create temporary table web_canvas_controller_orchestration_leaf_map/
  );

  for (const componentId of [
    'SYS-WEB-CANVAS-CONTROLLER-HOOK-CORE',
    'SYS-WEB-CANVAS-CONTROLLER-ACTIVE-DRAFT-AUTHORING',
    'SYS-WEB-CANVAS-CONTROLLER-DRAFT-RECOVERY',
    'SYS-WEB-CANVAS-CONTROLLER-PERSISTENCE-GUARDS',
    'SYS-WEB-CANVAS-CONTROLLER-TEST-HARNESS',
  ]) {
    assert.match(webCanvasControllerOrchestrationMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/web/src/app/views/canvas/useCanvasController\\.ts',
    'apps/web/src/app/views/canvas/useCanvasController\\.activeDraftNodeAuthoring\\.test\\.tsx',
    'apps/web/src/app/views/canvas/useCanvasController\\.reloadHydrationGuards\\.test\\.tsx',
    'apps/web/src/app/views/canvas/useCanvasController\\.persistence\\.test\\.tsx',
    'apps/web/src/app/views/canvas/useCanvasController\\.test\\.harness\\.tsx',
  ]) {
    assert.match(webCanvasControllerOrchestrationMigration.sql, new RegExp(ownedPath));
  }

  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /SYS-WEB-CANVAS-CONTROLLER-ORCHESTRATION/
  );
  assert.match(webCanvasControllerOrchestrationMigration.sql, /children_required = true/);
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /REL-WEB-CANVAS-CONTROLLER-ORCHESTRATION-CONTAINS-/
  );
  assert.match(webCanvasControllerOrchestrationMigration.sql, /'depends_on'/);
  assert.match(webCanvasControllerOrchestrationMigration.sql, /OrchestrateCanvasController/);
  assert.match(webCanvasControllerOrchestrationMigration.sql, /RecoverCanvasControllerDraft/);
  assert.match(webCanvasControllerOrchestrationMigration.sql, /PersistCanvasControllerDraft/);
  assert.match(webCanvasControllerOrchestrationMigration.sql, /BuildCanvasControllerTestHarness/);
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /SYS-WEB-CANVAS-DRAFT-AUTOSAVE-PERSISTENCE/
  );
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD/
  );
  assert.match(webCanvasControllerOrchestrationMigration.sql, /insert into architecture\.contract/);
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /insert into architecture\.component_port/
  );
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /insert into architecture\.component_test/
  );
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    webCanvasControllerOrchestrationMigration.sql,
    /nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(webCanvasControllerOrchestrationMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasControllerOrchestrationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasControllerOrchestrationMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Web Canvas shell chrome into responsibility leaves', () => {
  const migrations = readMigrationFiles();
  const webCanvasShellChromeMigration = migrations.find(
    (migration) => migration.fileName === '219_web_canvas_shell_chrome_leaf_components.sql'
  );

  assert.ok(webCanvasShellChromeMigration);
  assert.match(
    webCanvasShellChromeMigration.sql,
    /create temporary table web_canvas_shell_chrome_leaf_map/
  );

  for (const componentId of [
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'SYS-WEB-CANVAS-SHELL-ROUTE-STATE',
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
    'SYS-WEB-CANVAS-SHELL-GRAPH-COMMANDS',
    'SYS-WEB-CANVAS-SHELL-MENU-CONTRIBUTIONS',
  ]) {
    assert.match(webCanvasShellChromeMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/web/src/app/views/canvas/CanvasCenterSurface\\.tsx',
    'apps/web/src/app/views/canvas/canvasRouteViewState\\.ts',
    'apps/web/src/app/views/canvas/CanvasShell\\.tsx',
    'apps/web/src/app/views/canvas/canvasShellGraphBuilder\\.ts',
    'apps/web/src/app/views/canvas/CanvasWorkspaceMenuControls\\.tsx',
  ]) {
    assert.match(webCanvasShellChromeMigration.sql, new RegExp(ownedPath));
  }

  assert.match(webCanvasShellChromeMigration.sql, /SYS-WEB-CANVAS-SHELL-CHROME/);
  assert.match(webCanvasShellChromeMigration.sql, /children_required = true/);
  assert.match(webCanvasShellChromeMigration.sql, /REL-WEB-CANVAS-SHELL-CHROME-CONTAINS-/);
  assert.match(webCanvasShellChromeMigration.sql, /'depends_on'/);
  assert.match(webCanvasShellChromeMigration.sql, /ComposeCanvasShellChrome/);
  assert.match(webCanvasShellChromeMigration.sql, /ReadCanvasRouteViewState/);
  assert.match(webCanvasShellChromeMigration.sql, /RegisterCanvasShellMenuContribution/);
  assert.match(webCanvasShellChromeMigration.sql, /SYS-WEB-CANVAS-GRAPH-SURFACE/);
  assert.match(webCanvasShellChromeMigration.sql, /SYS-WEB-CANVAS-CANVAS-CONTEXT-MENU/);
  assert.match(webCanvasShellChromeMigration.sql, /SYS-WEB-APP-COMPONENTS-CONSOLE/);
  assert.match(webCanvasShellChromeMigration.sql, /insert into architecture\.contract/);
  assert.match(webCanvasShellChromeMigration.sql, /insert into architecture\.component_port/);
  assert.match(webCanvasShellChromeMigration.sql, /insert into architecture\.component_test/);
  assert.match(
    webCanvasShellChromeMigration.sql,
    /insert into architecture\.component_observability/
  );
  assert.match(
    webCanvasShellChromeMigration.sql,
    /nonfunctional files require explicit deprecation evidence/i
  );
  assert.doesNotMatch(webCanvasShellChromeMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasShellChromeMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasShellChromeMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Web Canvas shell chrome aggregate repo paths', () => {
  const migrations = readMigrationFiles();
  const webCanvasShellChromePathMigration = migrations.find(
    (migration) =>
      migration.fileName === '220_web_canvas_shell_chrome_parent_path_canonicalization.sql'
  );

  assert.ok(webCanvasShellChromePathMigration);
  assert.match(
    webCanvasShellChromePathMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SHELL-CHROME-PARENT-PATHS-20260619/
  );

  for (const componentId of [
    'SYS-WEB-CANVAS-GRAPH-SURFACE',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL',
    'SYS-WEB-CANVAS-SHELL-CENTER-SURFACE',
    'SYS-WEB-CANVAS-SHELL-COMPOSITION-BUILDERS',
  ]) {
    assert.match(webCanvasShellChromePathMigration.sql, new RegExp(componentId));
  }

  assert.match(
    webCanvasShellChromePathMigration.sql,
    /docs\/architecture\/components\/web\/graph\/canvas-fowler-canon-component\.md/
  );
  assert.match(
    webCanvasShellChromePathMigration.sql,
    /docs\/architecture\/components\/web\/graph\/canvas-component-map-and-modernization-review\.md/
  );
  assert.match(webCanvasShellChromePathMigration.sql, /duplicate_repo_path/);
  assert.match(webCanvasShellChromePathMigration.sql, /boundary_drift/);
  assert.match(webCanvasShellChromePathMigration.sql, /concrete CanvasCenterSurface\.tsx/);
  assert.match(webCanvasShellChromePathMigration.sql, /concrete CanvasShell\.tsx/);
  assert.doesNotMatch(webCanvasShellChromePathMigration.sql, /status\s*=\s*'deprecated'/);
  assert.doesNotMatch(webCanvasShellChromePathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(webCanvasShellChromePathMigration.sql, /truncate\s+/i);
});

test('tracked migrations split repository metadata root into leaf components', () => {
  const migrations = readMigrationFiles();
  const repoMetadataSplitMigration = migrations.find(
    (migration) => migration.fileName === '138_repo_metadata_root_leaf_components.sql'
  );

  assert.ok(repoMetadataSplitMigration);
  for (const componentId of [
    'SYS-REPO-METADATA-ARC-POLICY',
    'SYS-REPO-METADATA-FOWLER-INBOX',
    'SYS-REPO-METADATA-ROOT-TOOLCHAIN-CONFIG',
    'SYS-REPO-METADATA-GITHUB-COMMENT-ARCHIVE',
    'SYS-REPO-METADATA-GIT-HISTORY-REWRITE-ARCHIVE',
    'SYS-REPO-METADATA-LEGACY-PROTOTYPE-INFRA',
    'SYS-REPO-METADATA-PLANNING-DB-INFRA',
  ]) {
    assert.match(repoMetadataSplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    '\\.arc-policy\\.yaml',
    'buzon/\\*\\*',
    '\\.gh-comments/\\*\\*',
    '\\.git\\.bfg-report/\\*\\*',
    'infra/prototypes/\\*\\*',
    'package\\.json',
  ]) {
    assert.match(repoMetadataSplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(repoMetadataSplitMigration.sql, /legacy/);
  assert.match(repoMetadataSplitMigration.sql, /deprecated:/);
  assert.match(repoMetadataSplitMigration.sql, /architecture\.component_relation/);
  assert.match(repoMetadataSplitMigration.sql, /architecture\.component_test/);
  assert.match(
    repoMetadataSplitMigration.sql,
    /component-drift --component SYS-REPO-METADATA-ROOT/
  );
  assert.doesNotMatch(repoMetadataSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(repoMetadataSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations split contracts root into bounded contract components', () => {
  const migrations = readMigrationFiles();
  const contractsSplitMigration = migrations.find(
    (migration) => migration.fileName === '139_contracts_root_leaf_components.sql'
  );

  assert.ok(contractsSplitMigration);
  for (const componentId of [
    'SYS-CONTRACTS-COMPAT-MATRIX',
    'SYS-CONTRACTS-PACKAGE-ENTRYPOINTS',
    'SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS',
    'SYS-CONTRACTS-PLANNER-CONTRACTS',
    'SYS-CONTRACTS-SCHEMA-PACKS',
    'SYS-CONTRACTS-VALIDATION-RUNTIME',
    'SYS-CONTRACTS-PACKAGE-TESTS',
    'SYS-PLANNER-CONTRACTS-PACKAGE',
  ]) {
    assert.match(contractsSplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'packages/@dvt/contracts/src/contracts/engine/\\*\\*',
    'packages/@dvt/contracts/src/contracts/planner/\\*\\*',
    'packages/@dvt/contracts/src/schema-packs/\\*\\*',
    'packages/@dvt/contracts/test/\\*\\*',
    'packages/@dvt/planner-contracts/\\*\\*',
    'contracts/compat/\\*\\*',
  ]) {
    assert.match(contractsSplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(contractsSplitMigration.sql, /architecture\.contract/);
  assert.match(contractsSplitMigration.sql, /'CONTRACT-' \|\| component_id/);
  assert.match(contractsSplitMigration.sql, /'REL-CONTRACTS-ROOT-CONTAINS-' \|\|/);
  assert.match(contractsSplitMigration.sql, /'SYS-PLANNER-CONTRACTS-'/);
  assert.match(contractsSplitMigration.sql, /'PLANNER-CONTRACTS-'/);
  assert.match(contractsSplitMigration.sql, /component-drift --component SYS-CONTRACTS-ROOT/);
  assert.doesNotMatch(contractsSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(contractsSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations deprecate legacy Web DiffView harness references', () => {
  const migrations = readMigrationFiles();
  const legacyDiffHarnessMigration = migrations.find(
    (migration) => migration.fileName === '140_web_views_legacy_diff_harness_deprecation.sql'
  );

  assert.ok(legacyDiffHarnessMigration);
  assert.match(legacyDiffHarnessMigration.sql, /SYS-WEB-VIEWS-LEGACY-DIFF-HARNESS/);
  assert.match(legacyDiffHarnessMigration.sql, /DiffViewHarness\.tsx/);
  assert.match(legacyDiffHarnessMigration.sql, /'legacy'/);
  assert.match(legacyDiffHarnessMigration.sql, /'deprecated'/);
  assert.match(legacyDiffHarnessMigration.sql, /must not be recreated as a stub/);
  assert.match(legacyDiffHarnessMigration.sql, /REL-WEB-APP-VIEWS-CONTAINS-LEGACY-DIFF-HARNESS/);
  assert.match(legacyDiffHarnessMigration.sql, /component-drift --component SYS-WEB-ROOT/);
  assert.doesNotMatch(legacyDiffHarnessMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(legacyDiffHarnessMigration.sql, /truncate\s+/i);
});

test('tracked migrations split workers root into runtime adapter and ops components', () => {
  const migrations = readMigrationFiles();
  const workersSplitMigration = migrations.find(
    (migration) => migration.fileName === '141_workers_root_leaf_components.sql'
  );

  assert.ok(workersSplitMigration);
  for (const componentId of [
    'SYS-WORKERS-LINEAGE-HOST',
    'SYS-WORKERS-LINEAGE-COMPILED-CODE-RESOLVER',
    'SYS-WORKERS-OUTBOX-BUS-ADAPTERS',
    'SYS-WORKERS-OUTBOX-DB-ADAPTER',
    'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE',
    'SYS-WORKERS-OUTBOX-OPS',
    'SYS-WORKERS-OUTBOX-OWNERSHIP',
    'SYS-WORKERS-OUTBOX-RUNTIME',
    'SYS-WORKERS-OUTBOX-CANARY-TESTS',
    'SYS-WORKERS-PROJECTOR-APP',
    'SYS-WORKERS-TEMPORAL-APP',
  ]) {
    assert.match(workersSplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'apps/lineage-worker/\\*\\*',
    'apps/outbox-worker/src/runtime/\\*\\*',
    'apps/outbox-worker/src/bus/\\*\\*',
    'apps/outbox-worker/src/ops/\\*\\*',
    'apps/outbox-worker/test/canary/\\*\\*',
    'apps/projector-worker/\\*\\*',
    'apps/temporal-worker/\\*\\*',
  ]) {
    assert.match(workersSplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(workersSplitMigration.sql, /architecture\.component_port/);
  assert.match(workersSplitMigration.sql, /RunOutboxDeliveryLoop/);
  assert.match(workersSplitMigration.sql, /ReadOutboxWorkerHealth/);
  assert.match(workersSplitMigration.sql, /PublishOutboxEvent/);
  assert.match(workersSplitMigration.sql, /component-drift --component SYS-WORKERS-ROOT/);
  assert.doesNotMatch(workersSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(workersSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete outbox worker host test leaf ownership', () => {
  const migrations = readMigrationFiles();
  const outboxHostTestMigration = migrations.find(
    (migration) => migration.fileName === '142_workers_outbox_host_test_leaf_ownership.sql'
  );

  assert.ok(outboxHostTestMigration);
  for (const ownedPath of [
    'apps/outbox-worker/test/host/\\*\\*',
    'apps/outbox-worker/test/lifecycle/\\*\\*',
    'apps/outbox-worker/test/plugins/\\*\\*',
    'apps/outbox-worker/test/tsconfig.json',
  ]) {
    assert.match(outboxHostTestMigration.sql, new RegExp(ownedPath));
  }

  assert.match(outboxHostTestMigration.sql, /SYS-WORKERS-OUTBOX-HOST-LIFECYCLE/);
  assert.match(outboxHostTestMigration.sql, /architecture\.component_test/);
  assert.doesNotMatch(outboxHostTestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(outboxHostTestMigration.sql, /truncate\s+/i);
});

test('tracked migrations split traceability root into service manifest lineage and docs components', () => {
  const migrations = readMigrationFiles();
  const traceabilitySplitMigration = migrations.find(
    (migration) => migration.fileName === '143_traceability_root_leaf_components.sql'
  );

  assert.ok(traceabilitySplitMigration);
  for (const componentId of [
    'SYS-TRACEABILITY-SERVICE-ENTRYPOINTS',
    'SYS-TRACEABILITY-CORE-MANIFEST',
    'SYS-TRACEABILITY-FILESYSTEM-ADAPTERS',
    'SYS-TRACEABILITY-LINEAGE-CONTRACTS',
    'SYS-TRACEABILITY-LINEAGE-COMPILED-CODE',
    'SYS-TRACEABILITY-LINEAGE-MAPPER',
    'SYS-TRACEABILITY-LINEAGE-SINK-OBSERVER',
    'SYS-TRACEABILITY-LINEAGE-WORKER-RUNTIME',
    'SYS-TRACEABILITY-DOCS-CONFIG',
  ]) {
    assert.match(traceabilitySplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'packages/@dvt/traceability-service/src/core/\\*\\*',
    'packages/@dvt/traceability-service/src/adapters/\\*\\*',
    'packages/@dvt/traceability-service/src/lineage/runtime/\\*\\*',
    'packages/@dvt/traceability-service/test/fixtures/lineage/\\*\\*',
    'packages/@dvt/traceability-service/docs/\\*\\*',
    'traceability.manifest.json',
  ]) {
    assert.match(traceabilitySplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(traceabilitySplitMigration.sql, /architecture\.component_port/);
  assert.match(traceabilitySplitMigration.sql, /RunTraceabilityValidation/);
  assert.match(traceabilitySplitMigration.sql, /ValidateTraceabilityManifest/);
  assert.match(traceabilitySplitMigration.sql, /MapStepStartedLineageEvent/);
  assert.match(traceabilitySplitMigration.sql, /RunLineageWorkerRuntime/);
  assert.match(traceabilitySplitMigration.sql, /component-drift --component SYS-TRACEABILITY-ROOT/);
  assert.doesNotMatch(traceabilitySplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(traceabilitySplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations split planner root and deprecate legacy planner artifacts', () => {
  const migrations = readMigrationFiles();
  const plannerSplitMigration = migrations.find(
    (migration) => migration.fileName === '144_planner_root_leaf_components.sql'
  );

  assert.ok(plannerSplitMigration);
  for (const componentId of [
    'SYS-PLANNER-PACKAGE-SHELL',
    'SYS-PLANNER-APPLICATION-FACADE',
    'SYS-PLANNER-EXECUTABLE-SUBGRAPH',
    'SYS-PLANNER-DOMAIN-GRAPH',
    'SYS-PLANNER-DOMAIN-MANIFEST-INPUT',
    'SYS-PLANNER-DOMAIN-PLAN-ASSEMBLY',
    'SYS-PLANNER-STEP-FACTORY',
    'SYS-PLANNER-CONTRACT-PORTS',
    'SYS-PLANNER-ARTIFACT-COMPAT-BRIDGE',
    'SYS-PLANNER-DOCS-EXAMPLES',
    'SYS-PLANNER-LEGACY-AUDIT-ARTIFACT',
  ]) {
    assert.match(plannerSplitMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'packages/@dvt/planner/src/domain/graph/\\*\\*',
    'packages/@dvt/planner/src/domain/stepFactory/\\*\\*',
    'packages/@dvt/planner/test/compiledCode/\\*\\*',
    'packages/@dvt/planner/docs/audit/planner_v2_3_2_audit\\.commented\\.ts',
    'packages/@dvt/planner/examples/\\*\\*',
  ]) {
    assert.match(plannerSplitMigration.sql, new RegExp(ownedPath));
  }

  assert.match(plannerSplitMigration.sql, /'legacy'/);
  assert.match(plannerSplitMigration.sql, /'deprecated'/);
  assert.match(plannerSplitMigration.sql, /architecture\.component_port/);
  assert.match(plannerSplitMigration.sql, /BuildExecutionPlan/);
  assert.match(plannerSplitMigration.sql, /DeriveExecutableSubgraph/);
  assert.match(plannerSplitMigration.sql, /ValidatePlanExecutability/);
  assert.match(plannerSplitMigration.sql, /ReadPlannerCompiledCodeStorageCompat/);
  assert.match(plannerSplitMigration.sql, /component-drift --component SYS-PLANNER-ROOT/);
  assert.doesNotMatch(plannerSplitMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(plannerSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations split PlanStore and Observability buckets into leaves', () => {
  const migrations = readMigrationFiles();
  const planstoreObservabilityMigration = migrations.find(
    (migration) => migration.fileName === '145_planstore_observability_leaf_components.sql'
  );

  assert.ok(planstoreObservabilityMigration);
  for (const componentId of [
    'SYS-PLANSTORE-ARTIFACTS-PACKAGE-SHELL',
    'SYS-PLANSTORE-ARTIFACTS-COMPILED-CODE-STORAGE',
    'SYS-PLANSTORE-ARTIFACTS-RUNTIME-READERS',
    'SYS-PLANSTORE-API-STORED-PLAN-RESOLUTION',
    'SYS-PLANSTORE-API-EXECUTABILITY-VALIDATION',
    'SYS-PLANSTORE-API-ARTIFACT-RESOLUTION-ADAPTERS',
    'SYS-PLANSTORE-API-PLANREF-HTTP',
    'SYS-PLANSTORE-API-WORKFLOW-ENGINE-FACTORY',
    'SYS-PLANSTORE-POSTGRES-SCHEMA-SQL',
    'SYS-PLANSTORE-POSTGRES-REPOSITORIES',
    'SYS-PLANSTORE-TEMPORAL-ARTIFACT-READER',
    'SYS-PLANSTORE-TEMPORAL-CAPACITY-SLA',
    'SYS-PLANSTORE-TEMPORAL-WORKFLOW-ARTIFACT-HELPERS',
    'SYS-PLANSTORE-ENGINE-PLANREF-POLICY',
    'SYS-PLANSTORE-ENGINE-INTEGRITY-PORT',
    'SYS-PLANSTORE-CONTRACTS-READER-WRITER-PORTS',
    'SYS-OBSERVABILITY-CONTRACTS-NOOP',
    'SYS-OBSERVABILITY-OTEL-ADAPTER',
  ]) {
    assert.match(planstoreObservabilityMigration.sql, new RegExp(componentId));
  }

  for (const ownedPath of [
    'packages/@dvt/artifacts/src/compiledCode/\\*\\*',
    'apps/api/test/application/services/storedPlanExecutabilityValidator/\\*\\*',
    'packages/@dvt/adapter-postgres/src/PostgresPlanStore\\.sql\\.ts',
    'packages/@dvt/adapter-temporal/src/workflows/workflowArtifactHelpers\\.ts',
    'packages/@dvt/engine/src/security/planRefPolicy\\.ts',
    'packages/@dvt/observability/src/\\*\\*',
    'packages/@dvt/observability-otel/src/\\*\\*',
  ]) {
    assert.match(planstoreObservabilityMigration.sql, new RegExp(ownedPath));
  }

  assert.match(planstoreObservabilityMigration.sql, /SYS-PLANSTORE-DOCS-RISK/);
  assert.match(
    planstoreObservabilityMigration.sql,
    /s08-plan-store-command-query-matrix-20260501\.md/
  );
  assert.match(
    planstoreObservabilityMigration.sql,
    /docs\/risk-register\/quality\/R-20260514-S08-PLAN-STORE-INVENTORY-DRIFT\.yaml/
  );
  assert.match(
    planstoreObservabilityMigration.sql,
    /docs-risk-governance: owns tracked PlanStore docs/
  );
  assert.match(planstoreObservabilityMigration.sql, /architecture\.component_port/);
  assert.match(planstoreObservabilityMigration.sql, /ResolveStoredExecutablePlan/);
  assert.match(planstoreObservabilityMigration.sql, /ValidateStoredPlanExecutability/);
  assert.match(planstoreObservabilityMigration.sql, /MigratePostgresPlanStoreSchema/);
  assert.match(planstoreObservabilityMigration.sql, /ExportObservabilityToOpenTelemetry/);
  assert.doesNotMatch(planstoreObservabilityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(planstoreObservabilityMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile PlanStore docs risk as an imported document leaf', () => {
  const migrations = readMigrationFiles();
  const planstoreDocsRiskMigration = migrations.find(
    (migration) => migration.fileName === '146_planstore_docs_risk_imported_leaf_reconciliation.sql'
  );

  assert.ok(planstoreDocsRiskMigration);
  assert.match(planstoreDocsRiskMigration.sql, /SYS-PLANSTORE-DOCS-RISK/);
  assert.match(
    planstoreDocsRiskMigration.sql,
    /update planning_query_store\.governance_components/
  );
  assert.match(planstoreDocsRiskMigration.sql, /children_required = false/);
  assert.match(planstoreDocsRiskMigration.sql, /file\.component_unit = 'SYS-PLANSTORE-DOCS-RISK'/);
  assert.match(planstoreDocsRiskMigration.sql, /PlanStoreDocsRiskEvidence/);
  assert.match(planstoreDocsRiskMigration.sql, /ReadPlanStoreCommandQueryMatrix/);
  assert.match(planstoreDocsRiskMigration.sql, /published_language/);
  assert.doesNotMatch(planstoreDocsRiskMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(planstoreDocsRiskMigration.sql, /truncate\s+/i);
});

test('tracked migrations persist Web Canvas leaf component mapping', () => {
  const migrations = readMigrationFiles();
  const canvasLeafMappingMigration = migrations.find(
    (migration) => migration.fileName === '116_web_canvas_leaf_component_mapping.sql'
  );

  assert.ok(canvasLeafMappingMigration);
  for (const componentId of [
    'SYS-WEB-CANVAS-GRAPH-VIEWPORT-PRESENTATION',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-FIELD-TESTS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL',
    'SYS-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE-TEST',
    'SYS-WEB-CANVAS-SHELL-TEST-HARNESS',
    'SYS-WEB-CANVAS-VIEWPORT-TEST-HARNESS',
  ]) {
    assert.match(canvasLeafMappingMigration.sql, new RegExp(componentId));
  }

  assert.match(canvasLeafMappingMigration.sql, /CanvasNodeWorkbenchOverlay\.tsx/);
  assert.match(canvasLeafMappingMigration.sql, /status = excluded\.status/);
  assert.match(canvasLeafMappingMigration.sql, /RESP-WEB-CANVAS-NODE-WORKBENCH-OVERLAY/);
  assert.match(canvasLeafMappingMigration.sql, /status = 'drift'/);
  assert.match(canvasLeafMappingMigration.sql, /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-OVERLAY/);
  assert.match(canvasLeafMappingMigration.sql, /TEST-WEB-CANVAS-SHELL-MAIN-PANEL-ARCHITECTURE/);
  assert.match(
    canvasLeafMappingMigration.sql,
    /insert into planning_query_store\.governance_component_local_definitions/
  );
  assert.match(canvasLeafMappingMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(canvasLeafMappingMigration.sql, /insert into architecture\.component_relation/);
  assert.match(canvasLeafMappingMigration.sql, /insert into architecture\.component_test/);
  assert.doesNotMatch(canvasLeafMappingMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canvasLeafMappingMigration.sql, /truncate\s+/i);
});

test('tracked migrations resolve duplicate Web Canvas node workbench panel mapping', () => {
  const migrations = readMigrationFiles();
  const duplicateResolutionMigration = migrations.find(
    (migration) => migration.fileName === '117_web_canvas_node_workbench_duplicate_resolution.sql'
  );

  assert.ok(duplicateResolutionMigration);
  assert.match(duplicateResolutionMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS/);
  assert.match(duplicateResolutionMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-PANEL/);
  assert.match(duplicateResolutionMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(duplicateResolutionMigration.sql, /status = 'superseded'/);
  assert.match(duplicateResolutionMigration.sql, /status = 'deprecated'/);
  assert.match(duplicateResolutionMigration.sql, /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS/);
  assert.match(
    duplicateResolutionMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-INSPECTOR-PANEL/
  );
  assert.match(
    duplicateResolutionMigration.sql,
    /REL-WEB-APP-COMPONENTS-CONTAINS-CANVAS-INSPECTOR-PANEL/
  );
  assert.match(duplicateResolutionMigration.sql, /useCanvasViewportGraphModel\.ts/);
  assert.match(duplicateResolutionMigration.sql, /required = false/);
  assert.doesNotMatch(duplicateResolutionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(duplicateResolutionMigration.sql, /truncate\s+/i);
});

test('tracked migrations reactivate Web Canvas node workbench panel with a real panel source', () => {
  const migrations = readMigrationFiles();
  const nodeWorkbenchPanelMigration = migrations.find(
    (migration) => migration.fileName === '225_web_canvas_node_workbench_panel_reactivation.sql'
  );

  assert.ok(nodeWorkbenchPanelMigration);
  assert.match(nodeWorkbenchPanelMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(nodeWorkbenchPanelMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(nodeWorkbenchPanelMigration.sql, /CanvasNodeWorkbenchPanel\.test\.tsx/);
  assert.match(nodeWorkbenchPanelMigration.sql, /CanvasNodeWorkbenchOverlay\.test\.tsx/);
  assert.match(nodeWorkbenchPanelMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(nodeWorkbenchPanelMigration.sql, /ConfigureCanvasDbtNode;ConfigureCanvasDvtNode/);
  assert.match(
    nodeWorkbenchPanelMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(
    nodeWorkbenchPanelMigration.sql,
    /The contextual overlay mounts CanvasNodeWorkbenchPanel, not CanvasInspectorPanel/
  );
  assert.match(nodeWorkbenchPanelMigration.sql, /insert into architecture\.component_test/);
  assert.match(nodeWorkbenchPanelMigration.sql, /'unit'/);
  assert.match(nodeWorkbenchPanelMigration.sql, /'architecture'/);
  assert.doesNotMatch(nodeWorkbenchPanelMigration.sql, /'presentation'/);
  assert.doesNotMatch(nodeWorkbenchPanelMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep Web Canvas node workbench panel reactivation effective', () => {
  const migrations = readMigrationFiles();
  const effectiveReactivationMigration = migrations.find(
    (migration) =>
      migration.fileName === '226_web_canvas_node_workbench_panel_effective_reactivation.sql'
  );

  assert.ok(effectiveReactivationMigration);
  assert.match(effectiveReactivationMigration.sql, /local_definitions/);
  assert.match(effectiveReactivationMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(effectiveReactivationMigration.sql, /CanvasNodeWorkbenchPanel\.test\.tsx/);
  assert.match(effectiveReactivationMigration.sql, /source_path = excluded\.source_path/);
  assert.match(effectiveReactivationMigration.sql, /status = excluded\.status/);
  assert.match(
    effectiveReactivationMigration.sql,
    /where component_id = 'SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL'/
  );
  assert.match(
    effectiveReactivationMigration.sql,
    /REL-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-DEPENDS-ON-PANEL/
  );
  assert.match(effectiveReactivationMigration.sql, /TEST-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(effectiveReactivationMigration.sql, /Prior phantom retirement is superseded/);
  assert.doesNotMatch(effectiveReactivationMigration.sql, /CanvasNodeWorkbenchDuplicateResolution/);
  assert.doesNotMatch(effectiveReactivationMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Web Canvas node workbench panel feature mechanization', () => {
  const migrations = readMigrationFiles();
  const featureMechanizationMigration = migrations.find(
    (migration) =>
      migration.fileName === '227_web_canvas_node_workbench_panel_feature_mechanization.sql'
  );

  assert.ok(featureMechanizationMigration);
  assert.match(featureMechanizationMigration.sql, /feature_mechanization_local_rails/);
  assert.match(featureMechanizationMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(featureMechanizationMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(featureMechanizationMigration.sql, /PRIMARY_NODE_WORKBENCH_SECTION_IDS/);
  assert.match(featureMechanizationMigration.sql, /resolveActiveNodeWorkbenchTab/);
  assert.match(featureMechanizationMigration.sql, /CanvasNodeWorkbenchSection/);
  assert.match(featureMechanizationMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(featureMechanizationMigration.sql, /ConfigureCanvasDbtNode/);
  assert.match(featureMechanizationMigration.sql, /ConfigureCanvasDvtNode/);
  assert.match(
    featureMechanizationMigration.sql,
    /docs\/architecture\/command-query-rail-governance\.md/
  );
  assert.match(
    featureMechanizationMigration.sql,
    /docs\/architecture\/fowler-opportunity-planning-governance\.md/
  );
  assert.match(featureMechanizationMigration.sql, /pnpm verify:prepush/);
  assert.match(
    featureMechanizationMigration.sql,
    /local#post-import-rail-reconciliation#FRONTEND-GAP-RAIL-RECONCILIATION-20260619#/
  );
  assert.match(featureMechanizationMigration.sql, /- 'featureId'/);
  assert.match(featureMechanizationMigration.sql, /localRailReconciliation/);
  assert.doesNotMatch(featureMechanizationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(featureMechanizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations shadow imported frontend gap reconciliation manifests locally', () => {
  const migrations = readMigrationFiles();
  const frontendGapReconciliationMigration = migrations.find(
    (migration) =>
      migration.fileName === '228_frontend_gap_rail_reconciliation_feature_manifest_shadow.sql'
  );

  assert.ok(frontendGapReconciliationMigration);
  assert.match(frontendGapReconciliationMigration.sql, /feature_mechanization_local_rails/);
  assert.match(frontendGapReconciliationMigration.sql, /command_query_rails imported/);
  assert.match(frontendGapReconciliationMigration.sql, /FRONTEND-GAP-RAIL-RECONCILIATION-20260619/);
  assert.match(frontendGapReconciliationMigration.sql, /distinct on/);
  assert.match(frontendGapReconciliationMigration.sql, /- 'featureId'/);
  assert.match(frontendGapReconciliationMigration.sql, /- 'mechanizationStatus'/);
  assert.match(frontendGapReconciliationMigration.sql, /localRailReconciliation/);
  assert.match(frontendGapReconciliationMigration.sql, /source_rank/);
  assert.doesNotMatch(frontendGapReconciliationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(frontendGapReconciliationMigration.sql, /truncate\s+/i);
});

test('tracked migrations sanitize local frontend gap reconciliation feature manifests', () => {
  const migrations = readMigrationFiles();
  const localFrontendGapManifestMigration = migrations.find(
    (migration) =>
      migration.fileName === '229_frontend_gap_rail_reconciliation_local_manifest_sanitize.sql'
  );

  assert.ok(localFrontendGapManifestMigration);
  assert.match(localFrontendGapManifestMigration.sql, /feature_mechanization_local_rails rail/);
  assert.match(
    localFrontendGapManifestMigration.sql,
    /local#frontend-gap-rail-reconciliation-20260619#/
  );
  assert.match(localFrontendGapManifestMigration.sql, /- 'featureId'/);
  assert.match(localFrontendGapManifestMigration.sql, /- 'mechanizationStatus'/);
  assert.match(localFrontendGapManifestMigration.sql, /localRailReconciliation/);
  assert.match(localFrontendGapManifestMigration.sql, /docs_feature_mechanization_excluded/);
  assert.doesNotMatch(localFrontendGapManifestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(localFrontendGapManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations reassert effective Web Canvas node workbench panel profile', () => {
  const migrations = readMigrationFiles();
  const nodeWorkbenchProfileMigration = migrations.find(
    (migration) =>
      migration.fileName === '230_web_canvas_node_workbench_panel_profile_reassertion.sql'
  );

  assert.ok(nodeWorkbenchProfileMigration);
  assert.match(nodeWorkbenchProfileMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(
    nodeWorkbenchProfileMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.tsx/
  );
  assert.match(
    nodeWorkbenchProfileMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.test\.tsx/
  );
  assert.match(nodeWorkbenchProfileMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(nodeWorkbenchProfileMigration.sql, /CanvasNodeWorkbenchPanel/);
  assert.match(nodeWorkbenchProfileMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(nodeWorkbenchProfileMigration.sql, /ConfigureCanvasDbtNode/);
  assert.match(nodeWorkbenchProfileMigration.sql, /ConfigureCanvasDvtNode/);
  assert.match(nodeWorkbenchProfileMigration.sql, /component-profile/);
  assert.match(nodeWorkbenchProfileMigration.sql, /files query ownership/);
  assert.doesNotMatch(nodeWorkbenchProfileMigration.sql, /CanvasNodeWorkbenchDuplicateResolution/);
  assert.doesNotMatch(nodeWorkbenchProfileMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(nodeWorkbenchProfileMigration.sql, /truncate\s+/i);
});

test('tracked migrations rehydrate Web Canvas node workbench feature manifest after imports', () => {
  const migrations = readMigrationFiles();
  const featureManifestRehydrationMigration = migrations.find(
    (migration) =>
      migration.fileName === '231_web_canvas_node_workbench_panel_feature_manifest_rehydration.sql'
  );

  assert.ok(featureManifestRehydrationMigration);
  assert.match(featureManifestRehydrationMigration.sql, /feature_mechanization_local_rails/);
  assert.match(featureManifestRehydrationMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(featureManifestRehydrationMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(featureManifestRehydrationMigration.sql, /PRIMARY_NODE_WORKBENCH_SECTION_IDS/);
  assert.match(featureManifestRehydrationMigration.sql, /resolveActiveNodeWorkbenchTab/);
  assert.match(featureManifestRehydrationMigration.sql, /symbols/);
  assert.match(featureManifestRehydrationMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(featureManifestRehydrationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(featureManifestRehydrationMigration.sql, /truncate\s+/i);
});

test('tracked migrations restore Web Canvas node workbench panel after post-import legacy rows', () => {
  const migrations = readMigrationFiles();
  const postImportPanelMigration = migrations.find(
    (migration) =>
      migration.fileName === '232_web_canvas_node_workbench_panel_post_import_authority.sql'
  );

  assert.ok(postImportPanelMigration);
  assert.match(postImportPanelMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(postImportPanelMigration.sql, /CanvasNodeWorkbenchPanel/);
  assert.match(
    postImportPanelMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.tsx/
  );
  assert.match(
    postImportPanelMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.test\.tsx/
  );
  assert.match(
    postImportPanelMigration.sql,
    /delete\s+from\s+planning_query_store\.governance_component_local_ownership_patterns/i
  );
  assert.match(
    postImportPanelMigration.sql,
    /delete\s+from\s+planning_query_store\.governance_component_local_semantic_items/i
  );
  assert.match(
    postImportPanelMigration.sql,
    /delete\s+from\s+architecture\.component_observability/i
  );
  assert.match(postImportPanelMigration.sql, /CanvasNodeWorkbenchDuplicateResolution/);
  assert.match(postImportPanelMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(postImportPanelMigration.sql, /component-profile/);
  assert.match(postImportPanelMigration.sql, /files query ownership/);
  assert.doesNotMatch(postImportPanelMigration.sql, /truncate\s+/i);
});

test('tracked migrations restore Web Canvas node workbench feature manifest after fixed imports', () => {
  const migrations = readMigrationFiles();
  const postImportFeatureManifestMigration = migrations.find(
    (migration) =>
      migration.fileName ===
      '233_web_canvas_node_workbench_panel_feature_manifest_post_import_restore.sql'
  );

  assert.ok(postImportFeatureManifestMigration);
  assert.match(postImportFeatureManifestMigration.sql, /feature_mechanization_local_rails/);
  assert.match(postImportFeatureManifestMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(postImportFeatureManifestMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(postImportFeatureManifestMigration.sql, /PRIMARY_NODE_WORKBENCH_SECTION_IDS/);
  assert.match(postImportFeatureManifestMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(postImportFeatureManifestMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(postImportFeatureManifestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(postImportFeatureManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Planning DB import local rail persistence feature', () => {
  const migrations = readMigrationFiles();
  const importRailPersistenceMigration = migrations.find(
    (migration) =>
      migration.fileName === '234_planning_db_import_local_feature_rail_persistence_manifest.sql'
  );

  assert.ok(importRailPersistenceMigration);
  assert.match(importRailPersistenceMigration.sql, /feature_mechanization_local_rails/);
  assert.match(
    importRailPersistenceMigration.sql,
    /PLANNING-DB-IMPORT-LOCAL-FEATURE-RAIL-PERSISTENCE-20260619/
  );
  assert.match(importRailPersistenceMigration.sql, /readLocalFeatureMechanizationRails/);
  assert.match(
    importRailPersistenceMigration.sql,
    /refreshLocalFeatureMechanizationRailSourceHashes/
  );
  assert.match(importRailPersistenceMigration.sql, /restoreLocalFeatureMechanizationRails/);
  assert.match(importRailPersistenceMigration.sql, /PreserveLocalFeatureMechanizationRails/);
  assert.match(
    importRailPersistenceMigration.sql,
    /node --test scripts\/planning-db-import\.test\.cjs/
  );
  assert.match(
    importRailPersistenceMigration.sql,
    /pnpm docs:feature-mechanization:implementation/
  );
  assert.doesNotMatch(importRailPersistenceMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(importRailPersistenceMigration.sql, /truncate\s+/i);
});

test('tracked migrations provide final DB-first authority for Canvas node workbench panel', () => {
  const migrations = readMigrationFiles();
  const finalPanelAuthorityMigration = migrations.find(
    (migration) =>
      migration.fileName === '238_web_canvas_node_workbench_panel_final_dbfirst_authority.sql'
  );

  assert.ok(finalPanelAuthorityMigration);
  assert.match(finalPanelAuthorityMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-PANEL/);
  assert.match(finalPanelAuthorityMigration.sql, /CanvasNodeWorkbenchPanel/);
  assert.match(finalPanelAuthorityMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(finalPanelAuthorityMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(finalPanelAuthorityMigration.sql, /feature_mechanization_local_rails/);
  assert.match(finalPanelAuthorityMigration.sql, /governance_component_local_definitions/);
  assert.match(
    finalPanelAuthorityMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.tsx/
  );
  assert.match(
    finalPanelAuthorityMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.test\.tsx/
  );
  assert.match(finalPanelAuthorityMigration.sql, /files query ownership/);
  assert.doesNotMatch(finalPanelAuthorityMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DVT node card runtime metrics feature mechanization', () => {
  const migrations = readMigrationFiles();
  const runtimeMetricsMigration = migrations.find(
    (migration) => migration.fileName === '282_register_dvt_node_card_runtime_metrics_feature.sql'
  );

  assert.ok(runtimeMetricsMigration);
  assert.match(runtimeMetricsMigration.sql, /DVT-CANVAS-P0-PRO-FLOW-1/);
  assert.match(runtimeMetricsMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(runtimeMetricsMigration.sql, /GraphNodeCardStrategy/);
  assert.match(runtimeMetricsMigration.sql, /dvtGraphNodeCardStrategy\.ts/);
  assert.match(runtimeMetricsMigration.sql, /resolveCanonicalDurationMs/);
  assert.match(runtimeMetricsMigration.sql, /pushCanonicalCostMetric/);
  assert.match(runtimeMetricsMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(runtimeMetricsMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(runtimeMetricsMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(runtimeMetricsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(runtimeMetricsMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DVT destination target authoring feature mechanization', () => {
  const migrations = readMigrationFiles();
  const destinationTargetMigration = migrations.find(
    (migration) =>
      migration.fileName === '283_register_dvt_destination_target_authoring_feature.sql'
  );

  assert.ok(destinationTargetMigration);
  assert.match(destinationTargetMigration.sql, /DVT-CANVAS-P0-PRO-FLOW-1/);
  assert.match(destinationTargetMigration.sql, /ConfigureDvtDestinationTarget/);
  assert.match(destinationTargetMigration.sql, /CanvasInspectorAuthoringModel/);
  assert.match(destinationTargetMigration.sql, /canvasDvtAuthoringModel\.ts/);
  assert.match(destinationTargetMigration.sql, /DvtAuthoringFields\.tsx/);
  assert.match(destinationTargetMigration.sql, /createSourceMetadata/);
  assert.match(destinationTargetMigration.sql, /createSinkMetadata/);
  assert.match(destinationTargetMigration.sql, /applyDvtNodeAuthoringMetadata/);
  assert.match(destinationTargetMigration.sql, /formatQualifiedTarget/);
  assert.match(destinationTargetMigration.sql, /partition strategy metadata/);
  assert.match(destinationTargetMigration.sql, /packages\/@dvt\/contracts\/\*\*/);
  assert.match(destinationTargetMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(destinationTargetMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(destinationTargetMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(destinationTargetMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DVT authoring field section components', () => {
  const migrations = readMigrationFiles();
  const authoringSectionMigration = migrations.find(
    (migration) => migration.fileName === '286_register_dvt_authoring_field_sections.sql'
  );

  assert.ok(authoringSectionMigration);
  assert.match(authoringSectionMigration.sql, /DVT-CANVAS-P0-PRO-FLOW-1/);
  assert.match(authoringSectionMigration.sql, /frontend_component_local_components/);
  assert.match(authoringSectionMigration.sql, /frontend_component_local_files/);
  assert.match(authoringSectionMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(authoringSectionMigration.sql, /feature_mechanization_local_rails/);
  assert.match(authoringSectionMigration.sql, /DvtSourceAuthoringSection/);
  assert.match(authoringSectionMigration.sql, /DvtSqlTransformAuthoringSection/);
  assert.match(authoringSectionMigration.sql, /DvtSinkAuthoringSection/);
  assert.match(authoringSectionMigration.sql, /ConfigureCanvasDvtNode/);
  assert.match(authoringSectionMigration.sql, /ConfigureDvtDestinationTarget/);
  assert.match(authoringSectionMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(authoringSectionMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(authoringSectionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(authoringSectionMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DVT transform column selection', () => {
  const migrations = readMigrationFiles();
  const transformColumnMigration = migrations.find(
    (migration) => migration.fileName === '289_register_dvt_transform_column_selection.sql'
  );

  assert.ok(transformColumnMigration);
  assert.match(transformColumnMigration.sql, /DVT-CANVAS-P0-PRO-FLOW-1/);
  assert.match(transformColumnMigration.sql, /ReadDvtTransformInputColumns/);
  assert.match(transformColumnMigration.sql, /ConfigureDvtTransformInputColumns/);
  assert.match(transformColumnMigration.sql, /DvtSqlTransformAuthoringSection/);
  assert.match(transformColumnMigration.sql, /canvasDvtTransformColumnModel\.ts/);
  assert.match(transformColumnMigration.sql, /buildDvtTransformColumnOptions/);
  assert.match(transformColumnMigration.sql, /readDvtSelectedColumnRefs/);
  assert.match(transformColumnMigration.sql, /metadata\.config\.selectedColumns/);
  assert.match(transformColumnMigration.sql, /frontend_component_local_files/);
  assert.match(transformColumnMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(transformColumnMigration.sql, /feature_mechanization_local_rails/);
  assert.match(transformColumnMigration.sql, /p0FlowClosed', false/);
  assert.match(transformColumnMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(transformColumnMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(transformColumnMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(transformColumnMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas source import live proof feature mechanization', () => {
  const migrations = readMigrationFiles();
  const sourceImportLiveProofMigration = migrations.find(
    (migration) => migration.fileName === '290_register_canvas_source_import_live_proof.sql'
  );

  assert.ok(sourceImportLiveProofMigration);
  assert.match(sourceImportLiveProofMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(sourceImportLiveProofMigration.sql, /AttachWarehouseSourceFromCanvasContext/);
  assert.match(sourceImportLiveProofMigration.sql, /CanvasSourceImportDialog/);
  assert.match(sourceImportLiveProofMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(sourceImportLiveProofMigration.sql, /run-canvas-source-import-live-proof\.cjs/);
  assert.match(sourceImportLiveProofMigration.sql, /visitCleanDbtCanvas/);
  assert.match(sourceImportLiveProofMigration.sql, /waitForLiveDraftSaved/);
  assert.match(sourceImportLiveProofMigration.sql, /CanvasSourceImportLiveProofRunner/);
  assert.match(sourceImportLiveProofMigration.sql, /feature_mechanization_local_rails/);
  assert.match(
    sourceImportLiveProofMigration.sql,
    /pnpm docs:feature-mechanization:implementation/
  );
  assert.match(sourceImportLiveProofMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(sourceImportLiveProofMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(sourceImportLiveProofMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Source Import live proof feature symbols', () => {
  const migrations = readMigrationFiles();
  const symbolReconcileMigration = migrations.find(
    (migration) => migration.fileName === '524_source_import_live_proof_symbol_reconcile.sql'
  );

  assert.ok(symbolReconcileMigration);
  assert.match(symbolReconcileMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(symbolReconcileMigration.sql, /waitForPersistedWarehousePaymentsConfig/);
  assert.match(symbolReconcileMigration.sql, /connectCanvasNodes/);
  assert.match(symbolReconcileMigration.sql, /waitForLiveDraftEdgeSaved/);
  assert.match(symbolReconcileMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(symbolReconcileMigration.sql, /CanvasContextMenuViewport/);
  assert.match(symbolReconcileMigration.sql, /resolveCanvasContextMenuSurfaceStyle/);
  assert.match(symbolReconcileMigration.sql, /E-CANVAS-WORKFLOW-E2E-USABILITY-20260601/);
  assert.match(symbolReconcileMigration.sql, /mergeRemoteWorkingSetWithLocalAuthoring/);
  assert.match(symbolReconcileMigration.sql, /TF-E2-M-C/);
  assert.match(symbolReconcileMigration.sql, /waitForLiveFirstAuthoringDraftRecord/);
  assert.match(
    symbolReconcileMigration.sql,
    /PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612/
  );
  assert.match(symbolReconcileMigration.sql, /appendTextSearchFilter/);
  assert.match(symbolReconcileMigration.sql, /feature_mechanization_local_rails/);
  assert.match(symbolReconcileMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(symbolReconcileMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(symbolReconcileMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(symbolReconcileMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Source Import live proof runner Temporal bootstrap coverage', () => {
  const migrations = readMigrationFiles();
  const temporalBootstrapMigration = migrations.find(
    (migration) =>
      migration.fileName === '533_source_import_live_proof_temporal_bootstrap_coverage.sql'
  );

  assert.ok(temporalBootstrapMigration);
  assert.match(temporalBootstrapMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(temporalBootstrapMigration.sql, /run-canvas-source-import-live-proof\.test\.cjs/);
  assert.match(temporalBootstrapMigration.sql, /buildTemporalTimeSkippingOptions/);
  assert.match(temporalBootstrapMigration.sql, /createTemporalEnvironment/);
  assert.match(temporalBootstrapMigration.sql, /DVT_TEMPORAL_TEST_SERVER_PATH/);
  assert.match(
    temporalBootstrapMigration.sql,
    /node --test scripts\/run-canvas-source-import-live-proof\.test\.cjs/
  );
  assert.match(temporalBootstrapMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(temporalBootstrapMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(temporalBootstrapMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(temporalBootstrapMigration.sql, /truncate\s+/i);
});

test('tracked migrations register compact Planning DB query filter symbols', () => {
  const migrations = readMigrationFiles();
  const compactFilterMigration = migrations.find(
    (migration) => migration.fileName === '556_planning_db_query_compact_filter_symbols.sql'
  );

  assert.ok(compactFilterMigration);
  assert.match(
    compactFilterMigration.sql,
    /PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612/
  );
  assert.match(compactFilterMigration.sql, /ApplyPlanningDbQueryTextSearchFilter/);
  assert.match(compactFilterMigration.sql, /appendCompactTextSearchFilter/);
  assert.match(compactFilterMigration.sql, /compactTextSearchColumnExpression/);
  assert.match(compactFilterMigration.sql, /normalizeCompactTextSearchValue/);
  assert.match(compactFilterMigration.sql, /planning-db-command-query-rail-spaced-filter/);
  assert.match(compactFilterMigration.sql, /scripts\/planning-db-query\.test\.cjs/);
  assert.doesNotMatch(compactFilterMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(compactFilterMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Canvas draft reload local removal preservation symbols', () => {
  const migrations = readMigrationFiles();
  const reloadRemovalMigration = migrations.find(
    (migration) => migration.fileName === '525_canvas_draft_reload_removal_preservation_symbols.sql'
  );

  assert.ok(reloadRemovalMigration);
  assert.match(reloadRemovalMigration.sql, /E-CANVAS-WORKFLOW-E2E-USABILITY-20260601/);
  assert.match(reloadRemovalMigration.sql, /AdoptExternalCanvasDraftRevision/);
  assert.match(reloadRemovalMigration.sql, /draftEdgeSignature/);
  assert.match(reloadRemovalMigration.sql, /readBaselineWorkingSet/);
  assert.match(reloadRemovalMigration.sql, /local_removal_preservation/);
  assert.match(reloadRemovalMigration.sql, /feature_mechanization_local_rails/);
  assert.match(reloadRemovalMigration.sql, /canvasDraftSession\.test\.ts/);
  assert.doesNotMatch(reloadRemovalMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(reloadRemovalMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Source Import Postgres metadata probe feature mechanization', () => {
  const migrations = readMigrationFiles();
  const metadataProbeMigration = migrations.find(
    (migration) => migration.fileName === '341_register_source_import_postgres_metadata_probe.sql'
  );

  assert.ok(metadataProbeMigration);
  assert.match(metadataProbeMigration.sql, /E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1/);
  assert.match(metadataProbeMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(metadataProbeMigration.sql, /CreateWarehouseConnection/);
  assert.match(metadataProbeMigration.sql, /TestWarehouseConnection/);
  assert.match(metadataProbeMigration.sql, /WorkspaceWarehouseConnectionProbe\.ts/);
  assert.match(metadataProbeMigration.sql, /WorkspaceWarehouseConnectionProbe\.test\.ts/);
  assert.match(metadataProbeMigration.sql, /PostgresColumnDiscoveryRow/);
  assert.match(metadataProbeMigration.sql, /PostgresTableDiscoveryRow/);
  assert.match(metadataProbeMigration.sql, /groupPostgresColumnsByTable/);
  assert.match(metadataProbeMigration.sql, /parseOptionalRowCount/);
  assert.match(metadataProbeMigration.sql, /postgresTableKey/);
  assert.match(metadataProbeMigration.sql, /toWarehouseTable/);
  assert.match(metadataProbeMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(metadataProbeMigration.sql, /pnpm verify:prepush/);
  assert.match(metadataProbeMigration.sql, /sourceImportAvailable_false/);
  assert.doesNotMatch(metadataProbeMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(metadataProbeMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DBT node card metadata metrics feature mechanization', () => {
  const migrations = readMigrationFiles();
  const dbtCardMetricsMigration = migrations.find(
    (migration) => migration.fileName === '285_register_dbt_node_card_metadata_metrics_feature.sql'
  );

  assert.ok(dbtCardMetricsMigration);
  assert.match(dbtCardMetricsMigration.sql, /DBT-CANVAS-P0-PRO-FLOW-1/);
  assert.match(dbtCardMetricsMigration.sql, /RenderDbtGraphNodeCardMetrics/);
  assert.match(dbtCardMetricsMigration.sql, /GraphNodeCardStrategy/);
  assert.match(dbtCardMetricsMigration.sql, /dbtGraphNodeCardStrategy\.ts/);
  assert.match(dbtCardMetricsMigration.sql, /dbtGraphNodeCardStrategy/);
  assert.match(dbtCardMetricsMigration.sql, /canvas-source-import-contextual\.cy\.ts/);
  assert.match(dbtCardMetricsMigration.sql, /workspace graph draft read model/);
  assert.match(dbtCardMetricsMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(dbtCardMetricsMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(dbtCardMetricsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(dbtCardMetricsMigration.sql, /truncate\s+/i);
});

test('tracked migrations reseed Canvas node workbench feature manifests after import refresh', () => {
  const migrations = readMigrationFiles();
  const reseedMigration = migrations.find(
    (migration) =>
      migration.fileName === '239_web_canvas_node_workbench_panel_local_manifest_reseed.sql'
  );

  assert.ok(reseedMigration);
  assert.match(reseedMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(reseedMigration.sql, /feature_mechanization_local_rails/);
  assert.match(reseedMigration.sql, /CanvasNodeWorkbenchPanel/);
  assert.match(reseedMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(reseedMigration.sql, /NodeWorkbenchTabItem/);
  assert.match(reseedMigration.sql, /renderSectionBody/);
  assert.match(reseedMigration.sql, /resolveActiveNodeWorkbenchTab/);
  assert.match(reseedMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(reseedMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(reseedMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(reseedMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Canvas node workbench DB-local feature manifests', () => {
  const migrations = readMigrationFiles();
  const completenessMigration = migrations.find(
    (migration) =>
      migration.fileName === '240_web_canvas_node_workbench_panel_manifest_completeness.sql'
  );

  assert.ok(completenessMigration);
  assert.match(completenessMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(completenessMigration.sql, /userStories/);
  assert.match(completenessMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(completenessMigration.sql, /domainObjects/);
  assert.match(completenessMigration.sql, /fowlerSignals/);
  assert.match(completenessMigration.sql, /architectureGuards/);
  assert.match(completenessMigration.sql, /cypressFlows/);
  assert.match(completenessMigration.sql, /allowedImplementationSurfaces/);
  assert.doesNotMatch(completenessMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(completenessMigration.sql, /truncate\s+/i);
});

test('tracked migrations restore Canvas node workbench manifests after governance refresh', () => {
  const migrations = readMigrationFiles();
  const postRefreshMigration = migrations.find(
    (migration) =>
      migration.fileName === '241_web_canvas_node_workbench_panel_post_refresh_manifest.sql'
  );

  assert.ok(postRefreshMigration);
  assert.match(postRefreshMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(postRefreshMigration.sql, /feature_mechanization_local_rails/);
  assert.match(postRefreshMigration.sql, /CanvasNodeWorkbenchPanel/);
  assert.match(postRefreshMigration.sql, /CanvasNodeWorkbenchPanelProps/);
  assert.match(postRefreshMigration.sql, /NodeWorkbenchTabItem/);
  assert.match(postRefreshMigration.sql, /userStories/);
  assert.match(postRefreshMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(postRefreshMigration.sql, /domainObjects/);
  assert.match(postRefreshMigration.sql, /fowlerSignals/);
  assert.match(postRefreshMigration.sql, /architectureGuards/);
  assert.match(postRefreshMigration.sql, /cypressFlows/);
  assert.match(postRefreshMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.match(postRefreshMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(postRefreshMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(postRefreshMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize Web Canvas DBT and DVT field components', () => {
  const migrations = readMigrationFiles();
  const fieldCanonicalizationMigration = migrations.find(
    (migration) => migration.fileName === '118_web_canvas_field_component_canonicalization.sql'
  );

  assert.ok(fieldCanonicalizationMigration);
  assert.match(fieldCanonicalizationMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-DBT-FIELDS/);
  assert.match(fieldCanonicalizationMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-DVT-FIELDS/);
  assert.match(fieldCanonicalizationMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH-FIELDS/);
  assert.match(fieldCanonicalizationMigration.sql, /status = 'superseded'/);
  assert.match(fieldCanonicalizationMigration.sql, /status = 'deprecated'/);
  assert.match(fieldCanonicalizationMigration.sql, /relation-retirement rail/);
  assert.match(fieldCanonicalizationMigration.sql, /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-FIELDS/);
  assert.match(fieldCanonicalizationMigration.sql, /REL-WEB-CANVAS-NODE-WORKBENCH-CONTAINS-PANEL/);
  assert.match(fieldCanonicalizationMigration.sql, /status = 'implemented'/);
  assert.match(fieldCanonicalizationMigration.sql, /required = false/);
  assert.doesNotMatch(fieldCanonicalizationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(fieldCanonicalizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations persist Web Canvas modularized test leaf mapping', () => {
  const migrations = readMigrationFiles();
  const modularizedTestLeafMigration = migrations.find(
    (migration) => migration.fileName === '119_web_canvas_modularized_test_leaf_mapping.sql'
  );

  assert.ok(modularizedTestLeafMigration);
  for (const componentId of [
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-PRESENTER',
    'SYS-WEB-CANVAS-INSPECTOR-NODE-PROPERTIES-TABS-TESTS',
    'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-TEST-HARNESS',
    'SYS-WEB-CANVAS-SHELL-CONTEXTUAL-DIALOG-TESTS',
    'SYS-WEB-CANVAS-SHELL-SOURCE-IMPORT-TESTS',
    'SYS-WEB-CANVAS-NODE-WORKBENCH-OVERLAY-TESTS',
    'SYS-WEB-CANVAS-GRAPH-STATUS-OVERLAY-TESTS',
    'SYS-WEB-CANVAS-CONTEXT-MENU-PRESENTER-TESTS',
  ]) {
    assert.match(modularizedTestLeafMigration.sql, new RegExp(componentId));
  }

  assert.match(modularizedTestLeafMigration.sql, /CanvasShell\.sourceImportLifecycle\.test\.tsx/);
  assert.match(modularizedTestLeafMigration.sql, /CanvasShell\.contextualDialogs\.test\.tsx/);
  assert.match(modularizedTestLeafMigration.sql, /CanvasNodeWorkbenchOverlay\.test\.tsx/);
  assert.match(modularizedTestLeafMigration.sql, /CanvasGraphStatusOverlay\.test\.tsx/);
  assert.match(modularizedTestLeafMigration.sql, /useCanvasContextMenuPresenter\.test\.tsx/);
  assert.match(
    modularizedTestLeafMigration.sql,
    /apps\/web\/src\/app\/components\/inspector', 'Composite inspector tabs directory boundary/
  );
  assert.match(
    modularizedTestLeafMigration.sql,
    /REL-WEB-CANVAS-SHELL-MAIN-PANEL-CONTAINS-SOURCE-IMPORT-TESTS/
  );
  assert.match(modularizedTestLeafMigration.sql, /TEST-WEB-CANVAS-SHELL-SOURCE-IMPORT/);
  assert.match(
    modularizedTestLeafMigration.sql,
    /PLANNING-DB-WEB-CANVAS-TEST-EVIDENCE-COMMAND-CANONICALIZATION-20260617/
  );
  assert.match(modularizedTestLeafMigration.sql, /test:presentation:run/);
  assert.doesNotMatch(modularizedTestLeafMigration.sql, /@dvt\/web test --/);
  assert.match(
    modularizedTestLeafMigration.sql,
    /insert into planning_query_store\.governance_component_local_definitions/
  );
  assert.match(modularizedTestLeafMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(modularizedTestLeafMigration.sql, /insert into architecture\.component_relation/);
  assert.match(modularizedTestLeafMigration.sql, /insert into architecture\.component_test/);
  assert.doesNotMatch(modularizedTestLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(modularizedTestLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations persist CI governance scripts leaf mapping', () => {
  const migrations = readMigrationFiles();
  const ciScriptsLeafMigration = migrations.find(
    (migration) => migration.fileName === '120_ci_governance_scripts_leaf_mapping.sql'
  );

  assert.ok(ciScriptsLeafMigration);
  for (const componentId of [
    'SYS-CI-GOVERNANCE-SCRIPTS-AI-INTAKE',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-GENERATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-DOCS-QUALITY',
    'SYS-CI-GOVERNANCE-SCRIPTS-GOVERNANCE-INDEXES',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CORE',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-OPERATE',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-CATALOGS',
    'SYS-CI-GOVERNANCE-SCRIPTS-CHANGED-CLOSEOUT',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION',
    'SYS-CI-GOVERNANCE-SCRIPTS-RUNTIME-PROOFS',
  ]) {
    assert.match(ciScriptsLeafMigration.sql, new RegExp(componentId));
  }

  assert.match(ciScriptsLeafMigration.sql, /create temporary table ci_governance_script_leaf_map/);
  assert.match(ciScriptsLeafMigration.sql, /scripts\/planning-db-operate-tests\/\*\*/);
  assert.match(ciScriptsLeafMigration.sql, /scripts\/planning-db\/queries\/\*\*/);
  assert.match(ciScriptsLeafMigration.sql, /scripts\/run-\*\.cjs/);
  assert.match(ciScriptsLeafMigration.sql, /REL-CI-GOVERNANCE-SCRIPTS-CONTAINS-/);
  assert.match(ciScriptsLeafMigration.sql, /TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY/);
  assert.match(
    ciScriptsLeafMigration.sql,
    /component-profile --component SYS-CI-GOVERNANCE-SCRIPTS/
  );
  assert.doesNotMatch(ciScriptsLeafMigration.sql, /component-profile SYS-CI-GOVERNANCE-SCRIPTS/);
  assert.match(
    ciScriptsLeafMigration.sql,
    /insert into planning_query_store\.governance_component_local_definitions/
  );
  assert.match(ciScriptsLeafMigration.sql, /insert into architecture\.component\s*\(/);
  assert.match(ciScriptsLeafMigration.sql, /insert into architecture\.component_relation/);
  assert.match(ciScriptsLeafMigration.sql, /insert into architecture\.component_test/);
  assert.doesNotMatch(ciScriptsLeafMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ciScriptsLeafMigration.sql, /truncate\s+/i);
});

test('tracked migrations split policy validation text normalization leaves', () => {
  const migrations = readMigrationFiles();
  const policyValidationTextMigration = migrations.find(
    (migration) => migration.fileName === '254_policy_validation_text_helper_components.sql'
  );

  assert.ok(policyValidationTextMigration);
  for (const componentId of [
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119',
    'SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-TEXT',
  ]) {
    assert.match(policyValidationTextMigration.sql, new RegExp(componentId));
  }

  assert.match(policyValidationTextMigration.sql, /scripts\/validate-references\.cjs/);
  assert.match(policyValidationTextMigration.sql, /scripts\/validate-rfc2119\.cjs/);
  assert.match(policyValidationTextMigration.sql, /scripts\/policy-validation-text\.cjs/);
  assert.match(policyValidationTextMigration.sql, /stripInlineCodeFragments/);
  assert.match(policyValidationTextMigration.sql, /ValidateContractReferences/);
  assert.match(policyValidationTextMigration.sql, /ValidateRfc2119Language/);
  assert.match(policyValidationTextMigration.sql, /NormalizePolicyValidationMarkdownText/);
  assert.match(policyValidationTextMigration.sql, /'invariant'/);
  assert.match(policyValidationTextMigration.sql, /'transition'/);
  assert.match(policyValidationTextMigration.sql, /'consumer'/);
  assert.match(
    policyValidationTextMigration.sql,
    /REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CALLS-TEXT/
  );
  assert.match(
    policyValidationTextMigration.sql,
    /REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CALLS-TEXT/
  );
  assert.match(
    policyValidationTextMigration.sql,
    /node --test scripts\/policy-validation-text\.test\.cjs/
  );
  assert.match(policyValidationTextMigration.sql, /node scripts\/validate-references\.cjs/);
  assert.match(policyValidationTextMigration.sql, /node scripts\/validate-rfc2119\.cjs/);
  assert.doesNotMatch(policyValidationTextMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(policyValidationTextMigration.sql, /truncate\s+/i);
});

test('tracked migrations split policy validation Markdown file catalog leaf', () => {
  const migrations = readMigrationFiles();
  const policyValidationFilesMigration = migrations.find(
    (migration) =>
      migration.fileName === '255_policy_validation_markdown_file_catalog_component.sql'
  );

  assert.ok(policyValidationFilesMigration);
  assert.match(
    policyValidationFilesMigration.sql,
    /SYS-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-FILES/
  );
  assert.match(policyValidationFilesMigration.sql, /scripts\/policy-validation-files\.cjs/);
  assert.match(policyValidationFilesMigration.sql, /scripts\/policy-validation-files\.test\.cjs/);
  assert.match(policyValidationFilesMigration.sql, /listMarkdownFiles/);
  assert.match(policyValidationFilesMigration.sql, /ListPolicyValidationMarkdownFiles/);
  assert.match(policyValidationFilesMigration.sql, /'invariant'/);
  assert.match(policyValidationFilesMigration.sql, /'transition'/);
  assert.match(policyValidationFilesMigration.sql, /'consumer'/);
  assert.match(
    policyValidationFilesMigration.sql,
    /REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-REFERENCES-CALLS-FILES/
  );
  assert.match(
    policyValidationFilesMigration.sql,
    /REL-CI-GOVERNANCE-SCRIPTS-POLICY-VALIDATION-RFC2119-CALLS-FILES/
  );
  assert.match(
    policyValidationFilesMigration.sql,
    /node --test scripts\/policy-validation-files\.test\.cjs/
  );
  assert.doesNotMatch(policyValidationFilesMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(policyValidationFilesMigration.sql, /truncate\s+/i);
});

test('tracked migrations repoint phantom governance component retirement rail source', () => {
  const migrations = readMigrationFiles();
  const sourceRepairMigration = migrations.find(
    (migration) =>
      migration.fileName === '256_repoint_phantom_governance_component_retirement_rail_source.sql'
  );

  assert.ok(sourceRepairMigration);
  assert.match(sourceRepairMigration.sql, /RetirePhantomGovernanceComponents/);
  assert.match(sourceRepairMigration.sql, /feature_mechanization_local_rails/);
  assert.match(
    sourceRepairMigration.sql,
    /246_retire_phantom_ci_governance_helper_components\.sql/
  );
  assert.match(
    sourceRepairMigration.sql,
    /256_repoint_phantom_governance_component_retirement_rail_source\.sql/
  );
  assert.match(sourceRepairMigration.sql, /source_path = repair\.new_source_path/);
  assert.match(sourceRepairMigration.sql, /symbol_refs = jsonb_build_array/);
  assert.match(sourceRepairMigration.sql, /implementation_refs = jsonb_build_array/);
  assert.doesNotMatch(sourceRepairMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(sourceRepairMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire phantom Canvas source import dialog host', () => {
  const migrations = readMigrationFiles();
  const sourceImportHostRetirementMigration = migrations.find(
    (migration) => migration.fileName === '257_retire_canvas_source_import_dialog_host_phantom.sql'
  );

  assert.ok(sourceImportHostRetirementMigration);
  assert.match(
    sourceImportHostRetirementMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PHANTOM-RETIREMENT-20260625/
  );
  assert.match(sourceImportHostRetirementMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST/);
  assert.match(sourceImportHostRetirementMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD/);
  assert.match(
    sourceImportHostRetirementMigration.sql,
    /REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-WIZARD/
  );
  assert.match(
    sourceImportHostRetirementMigration.sql,
    /254_web_canvas_source_import_dialog_host\.sql/
  );
  assert.match(
    sourceImportHostRetirementMigration.sql,
    /257_retire_canvas_source_import_dialog_host_phantom\.sql/
  );
  assert.match(sourceImportHostRetirementMigration.sql, /DVT-CANVAS-UXDB-SOURCE-DIALOG-1/);
  assert.match(sourceImportHostRetirementMigration.sql, /CanvasSourceImportDialogHost\.tsx/);
  assert.match(sourceImportHostRetirementMigration.sql, /status = 'deprecated'/);
  assert.match(sourceImportHostRetirementMigration.sql, /status = 'superseded'/);
  assert.match(sourceImportHostRetirementMigration.sql, /rail_status = 'retired'/);
  assert.match(
    sourceImportHostRetirementMigration.sql,
    /'ValidateComponentIntegrity;ValidateSourceDrift;ReadComponentProfile',\s+null,\s+now\(\)/
  );
  assert.match(
    sourceImportHostRetirementMigration.sql,
    /where exists \(\s+select 1\s+from architecture\.component component\s+where component\.component_id = 'SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST'\s+\)/
  );
  assert.doesNotMatch(sourceImportHostRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations delete stale Canvas source import dialog host drift relation', () => {
  const migrations = readMigrationFiles();
  const sourceImportHostRelationRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '258_delete_canvas_source_import_dialog_host_drift_relation.sql'
  );

  assert.ok(sourceImportHostRelationRetirementMigration);
  assert.match(
    sourceImportHostRelationRetirementMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RELATION-RETIREMENT-20260625/
  );
  assert.match(
    sourceImportHostRelationRetirementMigration.sql,
    /REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-DIALOG-HOST/
  );
  assert.match(
    sourceImportHostRelationRetirementMigration.sql,
    /REL-WEB-CANVAS-SHELL-CHROME-USES-SOURCE-IMPORT-WIZARD/
  );
  assert.match(
    sourceImportHostRelationRetirementMigration.sql,
    /delete from architecture\.component_relation/
  );
  assert.match(sourceImportHostRelationRetirementMigration.sql, /may_delete/);
  assert.doesNotMatch(sourceImportHostRelationRetirementMigration.sql, /status = 'drift'/);
  assert.doesNotMatch(sourceImportHostRelationRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile stale Canvas source import dialog rail sources', () => {
  const migrations = readMigrationFiles();
  const sourceImportHostRailSourceMigration = migrations.find(
    (migration) =>
      migration.fileName === '259_reconcile_canvas_source_import_dialog_host_local_rail_source.sql'
  );

  assert.ok(sourceImportHostRailSourceMigration);
  assert.match(
    sourceImportHostRailSourceMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-SOURCE-RECONCILIATION-20260625/
  );
  assert.match(
    sourceImportHostRailSourceMigration.sql,
    /254_web_canvas_source_import_dialog_host\.sql/
  );
  assert.match(
    sourceImportHostRailSourceMigration.sql,
    /257_retire_canvas_source_import_dialog_host_phantom\.sql/
  );
  assert.match(sourceImportHostRailSourceMigration.sql, /sourcePathReconciledBy/);
  assert.match(sourceImportHostRailSourceMigration.sql, /currentImplementationSourcePath/);
  assert.match(sourceImportHostRailSourceMigration.sql, /deprecatedSourcePaths/);
  assert.match(sourceImportHostRailSourceMigration.sql, /rail_status = 'retired'/);
  assert.match(sourceImportHostRailSourceMigration.sql, /mechanization_status = 'closed'/);
  assert.match(
    sourceImportHostRailSourceMigration.sql,
    /where rail\.source_path = 'tools\/planning-db\/migrations\/254_web_canvas_source_import_dialog_host\.sql'/
  );
  assert.doesNotMatch(sourceImportHostRailSourceMigration.sql, /truncate\s+/i);
});

test('tracked migrations sanitize retired Canvas source import dialog local rail manifests', () => {
  const migrations = readMigrationFiles();
  const sourceImportHostManifestSanitizerMigration = migrations.find(
    (migration) =>
      migration.fileName === '260_sanitize_canvas_source_import_dialog_local_rail_manifest.sql'
  );

  assert.ok(sourceImportHostManifestSanitizerMigration);
  assert.match(
    sourceImportHostManifestSanitizerMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LOCAL-RAIL-MANIFEST-SANITIZE-20260625/
  );
  assert.match(sourceImportHostManifestSanitizerMigration.sql, /DVT-CANVAS-UXDB-SOURCE-DIALOG-1/);
  assert.match(sourceImportHostManifestSanitizerMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(sourceImportHostManifestSanitizerMigration.sql, /- 'featureId'/);
  assert.match(
    sourceImportHostManifestSanitizerMigration.sql,
    /featureMechanizationManifestSource/
  );
  assert.match(
    sourceImportHostManifestSanitizerMigration.sql,
    /docs\/planning\/proposals\/mandatory\/governance-and-docs\/planning-db-component-integrity-vocabulary-rail-plan-20260612\.md/
  );
  assert.doesNotMatch(sourceImportHostManifestSanitizerMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile legacy Canvas source import dialog local rails', () => {
  const migrations = readMigrationFiles();
  const sourceImportHostLegacyRailMigration = migrations.find(
    (migration) =>
      migration.fileName === '261_reconcile_canvas_source_import_dialog_legacy_local_rails.sql'
  );

  assert.ok(sourceImportHostLegacyRailMigration);
  assert.match(
    sourceImportHostLegacyRailMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-LEGACY-LOCAL-RAIL-RECONCILIATION-20260625/
  );
  assert.match(
    sourceImportHostLegacyRailMigration.sql,
    /255_web_canvas_source_import_dialog_post_import_persistence\.sql/
  );
  assert.match(
    sourceImportHostLegacyRailMigration.sql,
    /257_retire_canvas_source_import_dialog_host_phantom\.sql/
  );
  assert.match(sourceImportHostLegacyRailMigration.sql, /- 'featureId'/);
  assert.match(sourceImportHostLegacyRailMigration.sql, /- 'symbols'/);
  assert.match(sourceImportHostLegacyRailMigration.sql, /rail_status = 'retired'/);
  assert.match(sourceImportHostLegacyRailMigration.sql, /mechanization_status = 'closed'/);
  assert.match(
    sourceImportHostLegacyRailMigration.sql,
    /where rail\.feature_id = 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'/
  );
  assert.doesNotMatch(sourceImportHostLegacyRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile restored Canvas source import dialog feature manifests', () => {
  const migrations = readMigrationFiles();
  const restoredFeatureManifestMigration = migrations.find(
    (migration) =>
      migration.fileName ===
      '263_reconcile_restored_canvas_source_import_dialog_feature_manifest.sql'
  );

  assert.ok(restoredFeatureManifestMigration);
  assert.match(
    restoredFeatureManifestMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-RESTORED-FEATURE-MANIFEST-RECONCILIATION-20260625/
  );
  assert.match(
    restoredFeatureManifestMigration.sql,
    /262_restore_canvas_source_import_dialog_feature_manifest\.sql/
  );
  assert.match(
    restoredFeatureManifestMigration.sql,
    /263_reconcile_restored_canvas_source_import_dialog_feature_manifest\.sql/
  );
  assert.match(restoredFeatureManifestMigration.sql, /- 'featureId'/);
  assert.match(restoredFeatureManifestMigration.sql, /- 'symbols'/);
  assert.match(restoredFeatureManifestMigration.sql, /rail_status = 'retired'/);
  assert.match(restoredFeatureManifestMigration.sql, /mechanization_status = 'closed'/);
  assert.match(restoredFeatureManifestMigration.sql, /restoredFeatureManifestReconciledBy/);
  assert.doesNotMatch(restoredFeatureManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile post-import Canvas source import dialog feature manifests', () => {
  const migrations = readMigrationFiles();
  const postImportFeatureManifestMigration = migrations.find(
    (migration) =>
      migration.fileName ===
      '264_reconcile_post_import_canvas_source_import_dialog_feature_manifest.sql'
  );

  assert.ok(postImportFeatureManifestMigration);
  assert.match(
    postImportFeatureManifestMigration.sql,
    /PLANNING-DB-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-POST-IMPORT-FEATURE-MANIFEST-RECONCILIATION-20260625/
  );
  assert.match(
    postImportFeatureManifestMigration.sql,
    /262_restore_canvas_source_import_dialog_feature_manifest\.sql/
  );
  assert.match(
    postImportFeatureManifestMigration.sql,
    /264_reconcile_post_import_canvas_source_import_dialog_feature_manifest\.sql/
  );
  assert.match(postImportFeatureManifestMigration.sql, /- 'featureId'/);
  assert.match(postImportFeatureManifestMigration.sql, /- 'symbols'/);
  assert.match(postImportFeatureManifestMigration.sql, /postImportFeatureManifestReconciledBy/);
  assert.match(postImportFeatureManifestMigration.sql, /rail_status = 'retired'/);
  assert.match(postImportFeatureManifestMigration.sql, /mechanization_status = 'closed'/);
  assert.doesNotMatch(postImportFeatureManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations include architecture test evidence operations after W83', () => {
  const migrations = readMigrationFiles();
  const architectureEvidenceMigration = migrations.find(
    (migration) => migration.fileName === '083_architecture_test_evidence_operation_rail.sql'
  );

  assert.ok(architectureEvidenceMigration);
  assert.match(architectureEvidenceMigration.sql, /architecture_design_operations_type_check/);
  assert.match(architectureEvidenceMigration.sql, /'architecture_test_record'/);
});

test('tracked migrations include architecture observability evidence operations after W84', () => {
  const migrations = readMigrationFiles();
  const architectureEvidenceMigration = migrations.find(
    (migration) =>
      migration.fileName === '084_architecture_observability_evidence_operation_rail.sql'
  );

  assert.ok(architectureEvidenceMigration);
  assert.match(architectureEvidenceMigration.sql, /architecture_design_operations_type_check/);
  assert.match(architectureEvidenceMigration.sql, /'architecture_observability_record'/);
});

test('tracked migrations exclude deprecated architecture components from maturity gaps after W85', () => {
  const migrations = readMigrationFiles();
  const maturityMigration = migrations.find(
    (migration) => migration.fileName === '085_architecture_maturity_deprecated_components.sql'
  );

  assert.ok(maturityMigration);
  assert.match(
    maturityMigration.sql,
    /create or replace view architecture\.component_maturity_query/
  );
  assert.match(maturityMigration.sql, /component\.status = 'deprecated' then array\[\]::text\[\]/);
});

test('tracked migrations count architecture tests in component evidence gaps after W86', () => {
  const migrations = readMigrationFiles();
  const integrityMigration = migrations.find(
    (migration) => migration.fileName === '086_component_integrity_architecture_test_evidence.sql'
  );

  assert.ok(integrityMigration);
  assert.match(
    integrityMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/
  );
  assert.match(integrityMigration.sql, /from architecture\.component_test component_test/);
  assert.match(integrityMigration.sql, /component_test\.required/);
  assert.match(integrityMigration.sql, /architectureTestCount/);
  assert.match(
    integrityMigration.sql,
    /coalesce\(engineering\.test_file_count, 0\)[\s\S]*\+[\s\S]*coalesce\(architecture_test_evidence\.architecture_test_count, 0\)/
  );
});

test('tracked migrations trust architecture maturity for component evidence gaps after W87', () => {
  const migrations = readMigrationFiles();
  const integrityMigration = migrations.find(
    (migration) =>
      migration.fileName === '087_component_integrity_architecture_metadata_authority.sql'
  );

  assert.ok(integrityMigration);
  assert.match(
    integrityMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/
  );
  assert.match(integrityMigration.sql, /architecture_maturity_evidence/);
  assert.match(integrityMigration.sql, /architectureMaturityScore/);
  assert.match(integrityMigration.sql, /architectureMissingReasons/);
  assert.match(
    integrityMigration.sql,
    /coalesce\(array_length\(architecture_maturity_evidence\.missing_reasons, 1\), 0\) = 0/
  );
});

test('tracked migrations include architecture contract and port operations after W88', () => {
  const migrations = readMigrationFiles();
  const architecturePortMigration = migrations.find(
    (migration) => migration.fileName === '088_architecture_contract_port_operation_rail.sql'
  );

  assert.ok(architecturePortMigration);
  assert.match(architecturePortMigration.sql, /architecture_design_scope_subject_kind_check/);
  assert.match(architecturePortMigration.sql, /'port'/);
  assert.match(architecturePortMigration.sql, /architecture_design_operations_type_check/);
  assert.match(architecturePortMigration.sql, /'architecture_contract_record'/);
  assert.match(architecturePortMigration.sql, /'architecture_port_record'/);
});

test('tracked migrations include DB-first surface inventory command rail tables', () => {
  const migrations = readMigrationFiles();
  const surfaceInventoryMigration = migrations.find(
    (migration) => migration.fileName === '059_db_surface_inventory.sql'
  );

  assert.ok(surfaceInventoryMigration);
  assert.match(
    surfaceInventoryMigration.sql,
    /create table if not exists planning_query_store\.db_governance_surfaces/
  );
  assert.match(
    surfaceInventoryMigration.sql,
    /create table if not exists planning_query_store\.db_governance_surface_operations/
  );
  assert.match(
    surfaceInventoryMigration.sql,
    /create or replace view planning_query_store\.db_governance_surface_query/
  );
  assert.match(
    surfaceInventoryMigration.sql,
    /migration_state <> 'DB-first'\s+or write_rail_kind = 'db_command'/s
  );
  assert.match(surfaceInventoryMigration.sql, /Architecture design authority/);
});

test('tracked migrations repair component definition surface inventory to DB-first', () => {
  const migrations = readMigrationFiles();
  const componentSurfaceRepairMigration = migrations.find(
    (migration) => migration.fileName === '060_component_definition_surface_db_first.sql'
  );

  assert.ok(componentSurfaceRepairMigration);
  assert.match(componentSurfaceRepairMigration.sql, /Governance component definition/);
  assert.match(componentSurfaceRepairMigration.sql, /migration_state = 'DB-first'/);
  assert.match(componentSurfaceRepairMigration.sql, /raw_surface = jsonb_set/);
});

test('tracked migrations include governance component definition command rail tables', () => {
  const migrations = readMigrationFiles();
  const componentDefinitionMigration = migrations.find(
    (migration) => migration.fileName === '037_governance_component_definition_commands.sql'
  );

  assert.ok(componentDefinitionMigration);
  assert.match(
    componentDefinitionMigration.sql,
    /create table if not exists planning_query_store\.governance_component_local_definitions/
  );
  assert.match(
    componentDefinitionMigration.sql,
    /create table if not exists planning_query_store\.governance_component_local_operations/
  );
  assert.match(
    componentDefinitionMigration.sql,
    /create or replace view planning_query_store\.governance_component_definition_query/
  );
});

test('tracked migrations include the effective planning task read model after W11', () => {
  const migrations = readMigrationFiles();
  const effectiveTaskMigration = migrations.find(
    (migration) => migration.fileName === '005_planning_effective_task_read_model.sql'
  );

  assert.ok(effectiveTaskMigration);
  assert.match(
    effectiveTaskMigration.sql,
    /create or replace view planning_query_store\.planning_effective_tasks/
  );
  assert.match(
    effectiveTaskMigration.sql,
    /left join planning_query_store\.planning_task_local_state/
  );
});

test('tracked migrations guard effective task overlays by source hash after review hardening', () => {
  const migrations = readMigrationFiles();
  const overlayGuardMigration = migrations.find(
    (migration) => migration.fileName === '006_planning_effective_task_overlay_guard.sql'
  );

  assert.ok(overlayGuardMigration);
  assert.match(
    overlayGuardMigration.sql,
    /create or replace view planning_query_store\.planning_effective_tasks/
  );
  assert.match(
    overlayGuardMigration.sql,
    /local\.base_source_content_sha256 = task\.source_content_sha256/
  );
  assert.match(
    overlayGuardMigration.sql,
    /case\s+when local\.task_id is null\s+then task\.status_reason\s+else local\.status_reason\s+end as status_reason/s
  );
});

test('tracked migrations include the open planning task view after W11C', () => {
  const migrations = readMigrationFiles();
  const openTaskMigration = migrations.find(
    (migration) => migration.fileName === '007_planning_open_task_views.sql'
  );

  assert.ok(openTaskMigration);
  assert.match(
    openTaskMigration.sql,
    /create or replace view planning_query_store\.planning_open_tasks/
  );
  assert.match(openTaskMigration.sql, /from planning_query_store\.planning_effective_tasks/);
  assert.match(openTaskMigration.sql, /where status not in \('done', 'blocked'\)/);
});

test('tracked migrations include the actionable next planning task view after W11D', () => {
  const migrations = readMigrationFiles();
  const nextTaskMigration = migrations.find(
    (migration) => migration.fileName === '008_planning_next_task_views.sql'
  );

  assert.ok(nextTaskMigration);
  assert.match(
    nextTaskMigration.sql,
    /create or replace view planning_query_store\.planning_next_tasks/
  );
  assert.match(nextTaskMigration.sql, /from planning_query_store\.planning_open_tasks/);
  assert.match(nextTaskMigration.sql, /lower\(candidate\.status\) = 'queued'/);
  assert.match(nextTaskMigration.sql, /regexp_split_to_table/);
  assert.match(nextTaskMigration.sql, /lower\(prerequisite\.status\) = 'done'/);
});

test('tracked migrations include governance query views after W12A', () => {
  const migrations = readMigrationFiles();
  const governanceQueryMigration = migrations.find(
    (migration) => migration.fileName === '009_governance_query_views.sql'
  );

  assert.ok(governanceQueryMigration);
  assert.match(
    governanceQueryMigration.sql,
    /create or replace view planning_query_store\.governance_file_query/
  );
  assert.match(
    governanceQueryMigration.sql,
    /create or replace view planning_query_store\.governance_component_query/
  );
  assert.match(
    governanceQueryMigration.sql,
    /create or replace view planning_query_store\.governance_coverage_query/
  );
  assert.match(
    governanceQueryMigration.sql,
    /create or replace view planning_query_store\.governance_remediation_query/
  );
  assert.match(
    governanceQueryMigration.sql,
    /create or replace view planning_query_store\.governance_drift_query/
  );
});

test('tracked migrations include governance report query payloads after W12B', () => {
  const migrations = readMigrationFiles();
  const reportQueryPayloadMigration = migrations.find(
    (migration) => migration.fileName === '010_governance_report_query_payloads.sql'
  );

  assert.ok(reportQueryPayloadMigration);
  assert.match(reportQueryPayloadMigration.sql, /governance_refs/);
  assert.match(reportQueryPayloadMigration.sql, /raw_coverage/);
  assert.match(reportQueryPayloadMigration.sql, /expected_validation/);
  assert.match(reportQueryPayloadMigration.sql, /raw_task/);
  assert.match(
    reportQueryPayloadMigration.sql,
    /create or replace view planning_query_store\.governance_remediation_query/
  );
});

test('tracked migrations include DB-owned task lifecycle commands after W13', () => {
  const migrations = readMigrationFiles();
  const taskLifecycleMigration = migrations.find(
    (migration) => migration.fileName === '011_planning_task_lifecycle_commands.sql'
  );

  assert.ok(taskLifecycleMigration);
  assert.match(
    taskLifecycleMigration.sql,
    /create table if not exists planning_query_store\.planning_task_local_definitions/
  );
  assert.match(
    taskLifecycleMigration.sql,
    /create table if not exists planning_query_store\.planning_task_local_tombstones/
  );
  assert.match(taskLifecycleMigration.sql, /'task_create'/);
  assert.match(taskLifecycleMigration.sql, /'task_delete'/);
  assert.match(taskLifecycleMigration.sql, /union all/);
  assert.match(taskLifecycleMigration.sql, /imported_task\.task_id is null/);
});

test('tracked migrations include normalized planning task relation views after W14', () => {
  const migrations = readMigrationFiles();
  const normalizedMigration = migrations.find(
    (migration) => migration.fileName === '012_planning_task_normalized_relations.sql'
  );

  assert.ok(normalizedMigration);
  assert.match(
    normalizedMigration.sql,
    /create or replace view planning_query_store\.planning_task_dependencies/
  );
  assert.match(
    normalizedMigration.sql,
    /create or replace view planning_query_store\.planning_task_evidence_refs/
  );
  assert.match(
    normalizedMigration.sql,
    /create or replace view planning_query_store\.planning_task_status_events/
  );
  assert.match(
    normalizedMigration.sql,
    /create table if not exists planning_query_store\.planning_artifacts/
  );
  assert.match(normalizedMigration.sql, /from planning_query_store\.planning_task_dependencies/);
});

test('tracked migrations include canonical governance source documents after W15', () => {
  const migrations = readMigrationFiles();
  const sourceDocumentsMigration = migrations.find(
    (migration) => migration.fileName === '013_governance_source_documents.sql'
  );
  const sourceTextMigration = migrations.find(
    (migration) => migration.fileName === '014_source_document_text_exports.sql'
  );

  assert.ok(sourceDocumentsMigration);
  assert.match(sourceDocumentsMigration.sql, /alter table planning_query_store\.planning_sources/);
  assert.match(sourceDocumentsMigration.sql, /raw_source jsonb/);
  assert.match(
    sourceDocumentsMigration.sql,
    /alter table planning_query_store\.governance_sources/
  );
  assert.match(sourceDocumentsMigration.sql, /source_authority text not null default 'database'/);
  assert.ok(sourceTextMigration);
  assert.match(sourceTextMigration.sql, /raw_source_text text/);
});

test('tracked migrations include repository command catalog read model after W16', () => {
  const migrations = readMigrationFiles();
  const commandCatalogMigration = migrations.find(
    (migration) => migration.fileName === '015_repository_command_catalog.sql'
  );

  assert.ok(commandCatalogMigration);
  assert.match(
    commandCatalogMigration.sql,
    /create table if not exists planning_query_store\.repository_commands/
  );
  assert.match(
    commandCatalogMigration.sql,
    /create or replace view planning_query_store\.repository_command_query/
  );
});

test('tracked migrations include PR readiness projection after W17', () => {
  const migrations = readMigrationFiles();
  const prReadinessMigration = migrations.find(
    (migration) => migration.fileName === '016_pr_readiness_projection.sql'
  );

  assert.ok(prReadinessMigration);
  assert.match(
    prReadinessMigration.sql,
    /create table if not exists planning_query_store\.pr_readiness_checks/
  );
  assert.match(
    prReadinessMigration.sql,
    /create or replace view planning_query_store\.pr_readiness_query/
  );
});

test('tracked migrations include docs disposition queue after W18', () => {
  const migrations = readMigrationFiles();
  const docsDispositionMigration = migrations.find(
    (migration) => migration.fileName === '017_docs_disposition_queue.sql'
  );

  assert.ok(docsDispositionMigration);
  assert.match(
    docsDispositionMigration.sql,
    /create table if not exists planning_query_store\.doc_disposition_documents/
  );
  assert.match(
    docsDispositionMigration.sql,
    /create table if not exists planning_query_store\.doc_task_like_references/
  );
  assert.match(
    docsDispositionMigration.sql,
    /create table if not exists planning_query_store\.doc_disposition_actions/
  );
  assert.match(
    docsDispositionMigration.sql,
    /create or replace view planning_query_store\.doc_disposition_action_query/
  );
  assert.match(
    docsDispositionMigration.sql,
    /create or replace view planning_query_store\.doc_task_reference_query/
  );
});

test('tracked migrations include task provenance ledger after W19', () => {
  const migrations = readMigrationFiles();
  const taskProvenanceMigration = migrations.find(
    (migration) => migration.fileName === '018_task_provenance_ledger.sql'
  );

  assert.ok(taskProvenanceMigration);
  assert.match(
    taskProvenanceMigration.sql,
    /create or replace view planning_query_store\.planning_task_trace_query/
  );
  assert.match(
    taskProvenanceMigration.sql,
    /create or replace view planning_query_store\.planning_task_gap_query/
  );
  assert.match(taskProvenanceMigration.sql, /doc_task_reference_query/);
  assert.match(taskProvenanceMigration.sql, /doc_disposition_action_query/);
});

test('tracked migrations include planning work intake focus query after W20', () => {
  const migrations = readMigrationFiles();
  const workIntakeMigration = migrations.find(
    (migration) => migration.fileName === '019_planning_work_intake_query.sql'
  );

  assert.ok(workIntakeMigration);
  assert.match(
    workIntakeMigration.sql,
    /create or replace view planning_query_store\.planning_work_intake_query/
  );
  assert.match(workIntakeMigration.sql, /planning_next_tasks/);
  assert.match(workIntakeMigration.sql, /planning_task_gap_query/);
  assert.match(workIntakeMigration.sql, /doc_disposition_action_query/);
  assert.match(workIntakeMigration.sql, /governance_remediation_query/);
  assert.match(workIntakeMigration.sql, /pr_readiness_query/);
  assert.match(workIntakeMigration.sql, /intake_kind/);
  assert.match(workIntakeMigration.sql, /suggested_query/);
});

test('tracked migrations quote focus suggested query arguments after W20 hardening', () => {
  const migrations = readMigrationFiles();
  const workIntakeHardeningMigration = migrations.find(
    (migration) => migration.fileName === '020_planning_work_intake_query_suggestions.sql'
  );

  assert.ok(workIntakeHardeningMigration);
  assert.match(
    workIntakeHardeningMigration.sql,
    /create or replace view planning_query_store\.planning_work_intake_query/
  );
  assert.match(workIntakeHardeningMigration.sql, /quote_literal\(task\.task_id\)/);
  assert.match(workIntakeHardeningMigration.sql, /quote_literal\(gap\.task_id\)/);
  assert.match(workIntakeHardeningMigration.sql, /quote_literal\(gap\.document_path\)/);
  assert.match(workIntakeHardeningMigration.sql, /quote_literal\(action\.document_path\)/);
});

test('tracked migrations include docs resolution overlays after W21', () => {
  const migrations = readMigrationFiles();
  const docsResolutionMigration = migrations.find(
    (migration) => migration.fileName === '021_docs_resolution_overlays.sql'
  );

  assert.ok(docsResolutionMigration);
  assert.match(
    docsResolutionMigration.sql,
    /create table if not exists planning_query_store\.doc_resolution_overlays/
  );
  assert.match(
    docsResolutionMigration.sql,
    /create table if not exists planning_query_store\.doc_resolution_operations/
  );
  assert.match(docsResolutionMigration.sql, /source_content_sha256/);
  assert.match(docsResolutionMigration.sql, /resolution_status/);
  assert.match(docsResolutionMigration.sql, /doc_disposition_action_query/);
  assert.match(docsResolutionMigration.sql, /planning_task_gap_query/);
});

test('tracked migrations keep resolved docs issues out of the focus queue after W22', () => {
  const migrations = readMigrationFiles();
  const focusResolutionMigration = migrations.find(
    (migration) => migration.fileName === '022_planning_work_intake_resolution_filter.sql'
  );

  assert.ok(focusResolutionMigration);
  assert.match(
    focusResolutionMigration.sql,
    /create or replace view planning_query_store\.planning_work_intake_query/
  );
  assert.match(focusResolutionMigration.sql, /planning_task_gap_query gap/);
  assert.match(focusResolutionMigration.sql, /where gap\.resolution_status = 'pending'/);
  assert.match(focusResolutionMigration.sql, /doc_disposition_action_query action/);
  assert.match(focusResolutionMigration.sql, /where action\.resolution_status = 'pending'/);
});

test('tracked migrations include component engineering record query after W23', () => {
  const migrations = readMigrationFiles();
  const cerMigration = migrations.find(
    (migration) => migration.fileName === '023_component_engineering_record_query.sql'
  );

  assert.ok(cerMigration);
  assert.match(
    cerMigration.sql,
    /create or replace view planning_query_store\.governance_component_engineering_record_query/
  );
  assert.match(cerMigration.sql, /governance_component_query/);
  assert.match(cerMigration.sql, /governance_remediation_query/);
  assert.match(cerMigration.sql, /doc_task_reference_query/);
  assert.match(cerMigration.sql, /componentEngineeringRecord/);
});

test('tracked migrations expose risk register debt as DB work intake after W36', () => {
  const migrations = readMigrationFiles();
  const riskDebtMigration = migrations.find(
    (migration) => migration.fileName === '036_risk_debt_work_intake.sql'
  );

  assert.ok(riskDebtMigration);
  assert.match(
    riskDebtMigration.sql,
    /create table if not exists planning_query_store\.risk_debt_items/
  );
  assert.match(
    riskDebtMigration.sql,
    /create or replace view planning_query_store\.risk_debt_query/
  );
  assert.match(
    riskDebtMigration.sql,
    /create or replace view planning_query_store\.planning_work_intake_query/
  );
  assert.match(riskDebtMigration.sql, /'risk_debt'::text as intake_kind/);
  assert.match(riskDebtMigration.sql, /risk_debt_query debt/);
});

test('tracked migrations keep risk debt out of the next-task table shape', () => {
  const migrations = readMigrationFiles();
  const riskDebtMigration = migrations.find(
    (migration) => migration.fileName === '036_risk_debt_work_intake.sql'
  );

  assert.ok(riskDebtMigration);
  assert.doesNotMatch(riskDebtMigration.sql, /insert into planning_query_store\.planning_tasks/);
  assert.doesNotMatch(riskDebtMigration.sql, /alter table planning_query_store\.planning_tasks/);
});

test('tracked migrations link component engineering records to related test components after W24', () => {
  const migrations = readMigrationFiles();
  const cerTestMigration = migrations.find(
    (migration) => migration.fileName === '024_component_engineering_record_test_components.sql'
  );

  assert.ok(cerTestMigration);
  assert.match(
    cerTestMigration.sql,
    /create or replace view planning_query_store\.governance_component_engineering_record_query/
  );
  assert.match(cerTestMigration.sql, /related_test_component_links/);
  assert.match(cerTestMigration.sql, /testComponents/);
  assert.match(cerTestMigration.sql, /related_test_files/);
});

test('tracked migrations expose governance unit tree query after W25', () => {
  const migrations = readMigrationFiles();
  const unitQueryMigration = migrations.find(
    (migration) => migration.fileName === '025_governance_unit_tree_query.sql'
  );

  assert.ok(unitQueryMigration);
  assert.match(
    unitQueryMigration.sql,
    /create or replace view planning_query_store\.governance_unit_query/
  );
  assert.match(unitQueryMigration.sql, /unitReferences/);
  assert.match(unitQueryMigration.sql, /parent_id/);
  assert.match(unitQueryMigration.sql, /is_materialized_component/);
});

test('tracked migrations constrain task-gap disposition actions to their referenced task after W26', () => {
  const migrations = readMigrationFiles();
  const taskGapMigration = migrations.find(
    (migration) => migration.fileName === '026_task_gap_reference_filter.sql'
  );

  assert.ok(taskGapMigration);
  assert.match(
    taskGapMigration.sql,
    /create or replace view planning_query_store\.planning_task_gap_raw_query/
  );
  assert.match(taskGapMigration.sql, /action\.reference_text is not null/);
  assert.match(
    taskGapMigration.sql,
    /upper\(reference\.reference_text\) = upper\(action\.reference_text\)/
  );
  assert.doesNotMatch(
    taskGapMigration.sql,
    /on reference\.document_path = action\.document_path\s+and reference\.registered_planning_task = true\s+join/s
  );
});

test('tracked migrations expose component engineering record v2 after W27', () => {
  const migrations = readMigrationFiles();
  const cerV2Migration = migrations.find(
    (migration) => migration.fileName === '027_component_engineering_record_v2.sql'
  );

  assert.ok(cerV2Migration);
  assert.match(
    cerV2Migration.sql,
    /create or replace view planning_query_store\.governance_component_engineering_record_v2_query/
  );
  assert.match(cerV2Migration.sql, /governance_component_engineering_record_query/);
  assert.match(cerV2Migration.sql, /'schemaVersion', 'v2'/);
  assert.match(cerV2Migration.sql, /'contracts'/);
  assert.match(cerV2Migration.sql, /'capabilities'/);
  assert.match(cerV2Migration.sql, /'failureModes'/);
  assert.match(cerV2Migration.sql, /'costModel'/);
});

test('tracked migrations normalize component engineering record v2 surfaces after W28', () => {
  const migrations = readMigrationFiles();
  const cerV21Migration = migrations.find(
    (migration) => migration.fileName === '028_component_engineering_record_v21.sql'
  );

  assert.ok(cerV21Migration);
  assert.match(
    cerV21Migration.sql,
    /create or replace view planning_query_store\.governance_component_engineering_record_v2_query/
  );
  assert.match(cerV21Migration.sql, /governance_component_engineering_record_query/);
  assert.match(cerV21Migration.sql, /'relatedDocuments'/);
  assert.match(cerV21Migration.sql, /'domain'/);
  assert.match(cerV21Migration.sql, /'composition'/);
  assert.match(cerV21Migration.sql, /'codeSurface'/);
  assert.match(cerV21Migration.sql, /'connections'/);
  assert.match(cerV21Migration.sql, /missing_code_symbol_index/);
  assert.match(cerV21Migration.sql, /missing_component_connection_index/);
});

test('tracked migrations expose relational component engineering records after W29', () => {
  const migrations = readMigrationFiles();
  const cerRelationalMigration = migrations.find(
    (migration) => migration.fileName === '029_component_engineering_record_relational_core.sql'
  );

  assert.ok(cerRelationalMigration);
  assert.match(
    cerRelationalMigration.sql,
    /create or replace view planning_query_store\.component_engineering_component_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /create or replace view planning_query_store\.component_engineering_document_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /create or replace view planning_query_store\.component_engineering_file_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /create or replace view planning_query_store\.component_engineering_relation_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /create or replace view planning_query_store\.component_engineering_contract_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /create or replace view planning_query_store\.component_engineering_gap_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /from planning_query_store\.component_engineering_document_query/
  );
  assert.match(
    cerRelationalMigration.sql,
    /from planning_query_store\.component_engineering_relation_query/
  );
});

test('tracked migrations keep component engineering owned and test files disjoint after W30', () => {
  const migrations = readMigrationFiles();
  const cerFileRoleMigration = migrations.find(
    (migration) =>
      migration.fileName === '030_component_engineering_record_file_role_projection.sql'
  );

  assert.ok(cerFileRoleMigration);
  assert.match(
    cerFileRoleMigration.sql,
    /create or replace view planning_query_store\.component_engineering_file_rollup_query/
  );
  assert.match(
    cerFileRoleMigration.sql,
    /jsonb_agg\(file_path order by file_path\) filter \(where file_role = 'owned'\)/
  );
  assert.match(
    cerFileRoleMigration.sql,
    /jsonb_agg\(file_path order by file_path\) filter \(where file_role = 'test'\)/
  );
  assert.match(
    cerFileRoleMigration.sql,
    /join planning_query_store\.component_engineering_file_rollup_query/
  );
});

test('tracked migrations keep feature mechanization links distinct from planning task links after W31', () => {
  const migrations = readMigrationFiles();
  const featureMechanizationMigration = migrations.find(
    (migration) => migration.fileName === '031_feature_mechanization_task_gap_links.sql'
  );

  assert.ok(featureMechanizationMigration);
  assert.match(
    featureMechanizationMigration.sql,
    /create or replace view planning_query_store\.planning_task_gap_raw_query/
  );
  assert.match(featureMechanizationMigration.sql, /document_governed_work_links/);
  assert.match(
    featureMechanizationMigration.sql,
    /classification = 'registered_feature_mechanization'/
  );
  assert.match(featureMechanizationMigration.sql, /registered_planning_task = true/);
});

test('tracked migrations expose local feature mechanization rails after W59', () => {
  const migrations = readMigrationFiles();
  const localFeatureMechanizationMigration = migrations.find(
    (migration) => migration.fileName === '059_feature_mechanization_local_writer.sql'
  );

  assert.ok(localFeatureMechanizationMigration);
  assert.match(
    localFeatureMechanizationMigration.sql,
    /create table if not exists planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    localFeatureMechanizationMigration.sql,
    /create table if not exists planning_query_store\.feature_mechanization_local_operations/
  );
  assert.match(
    localFeatureMechanizationMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(localFeatureMechanizationMigration.sql, /from imported_rails/);
  assert.match(localFeatureMechanizationMigration.sql, /union all/);
  assert.match(localFeatureMechanizationMigration.sql, /from local_rails/);
});

test('tracked migrations expose raw manifests through the effective rail projection after W60', () => {
  const migrations = readMigrationFiles();
  const effectiveRailManifestMigration = migrations.find(
    (migration) => migration.fileName === '060_command_query_rail_effective_manifest_projection.sql'
  );

  assert.ok(effectiveRailManifestMigration);
  assert.match(
    effectiveRailManifestMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(effectiveRailManifestMigration.sql, /raw_rail/);
  assert.match(
    effectiveRailManifestMigration.sql,
    /select\s+rail_id,[\s\S]*raw_manifest,[\s\S]*imported_at\s+from effective_rails/
  );
});

test('tracked migrations prefer DB-authored local rails over matching imported rails after W61', () => {
  const migrations = readMigrationFiles();
  const localPrecedenceMigration = migrations.find(
    (migration) => migration.fileName === '061_command_query_rail_local_precedence.sql'
  );

  assert.ok(localPrecedenceMigration);
  assert.match(localPrecedenceMigration.sql, /0 as source_priority/);
  assert.match(localPrecedenceMigration.sql, /1 as source_priority/);
  assert.match(
    localPrecedenceMigration.sql,
    /partition by feature_id, rail_type, normalized_rail_name/
  );
  assert.match(localPrecedenceMigration.sql, /where source_rank = 1/);
});

test('tracked migrations separate rail manifests from canonical creation queries after W62', () => {
  const migrations = readMigrationFiles();
  const canonicalRailProjectionMigration = migrations.find(
    (migration) => migration.fileName === '062_command_query_rail_canonical_projection.sql'
  );

  assert.ok(canonicalRailProjectionMigration);
  assert.match(
    canonicalRailProjectionMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_manifest_query/
  );
  assert.match(
    canonicalRailProjectionMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(canonicalRailProjectionMigration.sql, /canonical_rank = 1/);
  assert.match(
    canonicalRailProjectionMigration.sql,
    /partition by rail_type, normalized_rail_name/
  );
  assert.match(canonicalRailProjectionMigration.sql, /reference_count/);
});

test('latest command/query rail projection counts canonical component docs as duplicate candidates', () => {
  const migrations = readMigrationFiles();
  const latestRailProjectionMigration = migrations
    .filter((migration) =>
      /create or replace view planning_query_store\.command_query_rail_query/.test(migration.sql)
    )
    .at(-1);

  assert.ok(latestRailProjectionMigration);
  assert.match(
    latestRailProjectionMigration.sql,
    /when rail\.source_path like 'docs\/architecture\/components\/%' then 2/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /count\(distinct case\s+when rail\.rail_source = 'local' then rail\.canonical_declaration_key\s+else rail\.canonical_declaration_key \|\| ':' \|\| rail\.rail_id\s+end\) filter \(/
  );
  assert.match(latestRailProjectionMigration.sql, /where rail\.authority_priority <= 2/);
  assert.match(
    latestRailProjectionMigration.sql,
    /not \(rail_group\.has_active_non_gap and rail\.is_gap\)/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /not \(rail_group\.has_active_local_non_gap and rail\.rail_source <> 'local'\)/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /lower\(coalesce\(rail_status, ''\)\) not in \('deprecated', 'retired'\)/
  );
  assert.match(latestRailProjectionMigration.sql, /as canonical_candidate_count/);
});

test('latest command/query rail projection collapses same-owner local feature evidence', () => {
  const migrations = readMigrationFiles();
  const latestRailProjectionMigration = migrations
    .filter((migration) =>
      /create or replace view planning_query_store\.command_query_rail_query/.test(migration.sql)
    )
    .at(-1);

  assert.ok(latestRailProjectionMigration);
  assert.match(latestRailProjectionMigration.sql, /canonical_declaration_key/);
  assert.match(
    latestRailProjectionMigration.sql,
    /rail\.rail_type\s+\|\|\s+':'\s+\|\|\s+rail\.normalized_rail_name\s+\|\|\s+':'\s+\|\|\s+coalesce\(nullif\(rail\.ddd_owner, ''\), '-'\)/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /count\(distinct case[\s\S]*when rail\.rail_source = 'local' then rail\.canonical_declaration_key[\s\S]*else rail\.canonical_declaration_key \|\| ':' \|\| rail\.rail_id[\s\S]*as canonical_candidate_count/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /jsonb_agg\(distinct rail\.feature_id order by rail\.feature_id\)/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /jsonb_agg\(distinct rail\.source_path order by rail\.source_path\)/
  );
});

test('latest command/query rail projection prefers local implemented refs over imported declarations', () => {
  const migrations = readMigrationFiles();
  const latestRailProjectionMigration = migrations
    .filter((migration) =>
      /create or replace view planning_query_store\.command_query_rail_query/.test(migration.sql)
    )
    .at(-1);

  assert.ok(latestRailProjectionMigration);
  assert.equal(
    latestRailProjectionMigration.fileName,
    '326_review_comment_closeout_canvas_rails.sql'
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /when rail\.source_path like 'docs\/archive\/%' then 5/
  );
  assert.match(latestRailProjectionMigration.sql, /has_active_non_gap/);
  assert.match(latestRailProjectionMigration.sql, /has_active_local_non_gap/);
  assert.match(
    latestRailProjectionMigration.sql,
    /not \(rail_group\.has_active_local_non_gap and rail\.rail_source <> 'local'\)/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /case when rail\.rail_source = 'local' then 0 else 1 end,\s+rail\.is_gap,\s+rail\.authority_priority/
  );
});

test('Canvas review comment closeout projection keeps canonical rail duplicates visible', () => {
  const migrations = readMigrationFiles();
  const reviewCloseoutMigration = migrations.find(
    (migration) => migration.fileName === '326_review_comment_closeout_canvas_rails.sql'
  );

  assert.ok(reviewCloseoutMigration);
  assert.match(
    reviewCloseoutMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(
    reviewCloseoutMigration.sql,
    /when rail\.rail_source = 'local' then rail\.canonical_declaration_key/
  );
  assert.match(
    reviewCloseoutMigration.sql,
    /else rail\.canonical_declaration_key \|\| ':' \|\| rail\.rail_id/
  );
  assert.match(reviewCloseoutMigration.sql, /as canonical_candidate_count/);
});

test('Canvas review comment closeout preserves local feature rail overlays', () => {
  const migrations = readMigrationFiles();
  const reviewCloseoutMigration = migrations.find(
    (migration) => migration.fileName === '326_review_comment_closeout_canvas_rails.sql'
  );

  assert.ok(reviewCloseoutMigration);
  assert.match(
    reviewCloseoutMigration.sql,
    /existing_local_target_rail as \([\s\S]*from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    reviewCloseoutMigration.sql,
    /imported_target_rail as \([\s\S]*from planning_query_store\.command_query_rails/
  );
  assert.match(
    reviewCloseoutMigration.sql,
    /where not exists \(select 1 from existing_local_target_rail\)/
  );
  assert.match(reviewCloseoutMigration.sql, /rejectCrossPluginIncomingInputEdge/);
  assert.match(reviewCloseoutMigration.sql, /CONTEXT_MENU_PANE_CLICK_ECHO_SUPPRESSION_MS/);
  assert.match(reviewCloseoutMigration.sql, /isNearPosition/);
  assert.match(
    reviewCloseoutMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/useCanvasContextMenuPresenter\.ts/
  );
  assert.match(reviewCloseoutMigration.sql, /ResolveCanvasWorkbenchContext/);
  assert.match(
    reviewCloseoutMigration.sql,
    /apps\/web\/src\/app\/bootstrap\/usePublishedRouteBootstrap\.ts/
  );
  assert.match(reviewCloseoutMigration.sql, /apps\/web\/src\/app\/views\/CodeView\.tsx/);
  assert.match(
    reviewCloseoutMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/dvtTransformColumnModel\.ts#buildDvtTransformColumnOptions/
  );
  assert.match(
    reviewCloseoutMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/dvtTransformColumnModel\.ts#readDvtSelectedColumnRefs/
  );
});

test('tracked migrations expose composite component hierarchy records after W32', () => {
  const migrations = readMigrationFiles();
  const compositeHierarchyMigration = migrations.find(
    (migration) => migration.fileName === '032_component_engineering_composite_hierarchy.sql'
  );

  assert.ok(compositeHierarchyMigration);
  assert.match(
    compositeHierarchyMigration.sql,
    /create or replace view planning_query_store\.component_engineering_component_tree_query/
  );
  assert.match(
    compositeHierarchyMigration.sql,
    /create or replace view planning_query_store\.component_engineering_file_ownership_query/
  );
  assert.match(
    compositeHierarchyMigration.sql,
    /create or replace view planning_query_store\.component_engineering_component_metadata_query/
  );
  assert.match(
    compositeHierarchyMigration.sql,
    /create or replace view planning_query_store\.component_engineering_drift_query/
  );
  assert.match(compositeHierarchyMigration.sql, /leaf_component_id/);
  assert.match(compositeHierarchyMigration.sql, /children_required_without_children/);
});

test('tracked migrations keep component tree leaf checks source-neutral after W33', () => {
  const migrations = readMigrationFiles();
  const sourceChildFilterMigration = migrations.find(
    (migration) => migration.fileName === '033_component_engineering_component_tree_leaf_filter.sql'
  );

  assert.ok(sourceChildFilterMigration);
  assert.match(
    sourceChildFilterMigration.sql,
    /create or replace view planning_query_store\.component_engineering_component_tree_query/
  );
  assert.match(
    sourceChildFilterMigration.sql,
    /child\.parent_id = unit\.unit_id\s+and child\.level = 'component'/
  );
  assert.match(sourceChildFilterMigration.sql, /where unit\.level = 'component'/);
});

test('tracked migrations expose DB-backed component engineering rules after W34', () => {
  const migrations = readMigrationFiles();
  const ruleRuntimeMigration = migrations.find(
    (migration) => migration.fileName === '034_component_engineering_rule_runtime.sql'
  );

  assert.ok(ruleRuntimeMigration);
  assert.match(
    ruleRuntimeMigration.sql,
    /create or replace view planning_query_store\.component_engineering_rule_catalog_query/
  );
  assert.match(
    ruleRuntimeMigration.sql,
    /create or replace view planning_query_store\.component_engineering_rule_evaluation_query/
  );
  assert.match(
    ruleRuntimeMigration.sql,
    /create or replace view planning_query_store\.component_engineering_quality_query/
  );
  assert.match(ruleRuntimeMigration.sql, /CEI-ID-002/);
  assert.match(ruleRuntimeMigration.sql, /CEI-RESP-001/);
  assert.match(ruleRuntimeMigration.sql, /'CEI-RESP-001'[\s\S]*?'error'[\s\S]*?'component'/);
  assert.match(ruleRuntimeMigration.sql, /'CEI-API-001'[\s\S]*?'error'[\s\S]*?'component'/);
  assert.match(ruleRuntimeMigration.sql, /CEI-SIZE-005/);
  assert.match(ruleRuntimeMigration.sql, /from planning_query_store\.governance_unit_query parent/);
});

test('tracked migrations separate component engineering views into an owning schema after W35', () => {
  const migrations = readMigrationFiles();
  const schemaBoundaryMigration = migrations.find(
    (migration) => migration.fileName === '035_component_engineering_schema_boundary.sql'
  );

  assert.ok(schemaBoundaryMigration);
  assert.match(schemaBoundaryMigration.sql, /create schema if not exists component_engineering/);
  assert.match(
    schemaBoundaryMigration.sql,
    /create or replace view component_engineering\.component_tree_query/
  );
  assert.match(
    schemaBoundaryMigration.sql,
    /create or replace view component_engineering\.component_metadata_query/
  );
  assert.match(
    schemaBoundaryMigration.sql,
    /create or replace view component_engineering\.rule_evaluation_query/
  );
  assert.match(
    schemaBoundaryMigration.sql,
    /drop view if exists planning_query_store\.component_engineering_component_metadata_query/
  );
  assert.match(
    schemaBoundaryMigration.sql,
    /create view planning_query_store\.component_engineering_component_metadata_query as/
  );
  assert.match(schemaBoundaryMigration.sql, /owned_concern/);
  assert.match(schemaBoundaryMigration.sql, /responsibilities/);
  assert.match(schemaBoundaryMigration.sql, /metadata_state/);
});

test('tracked migrations reconcile DB-authored component file ownership after W38', () => {
  const migrations = readMigrationFiles();
  const ownershipReconciliationMigration = migrations.find(
    (migration) => migration.fileName === '038_component_engineering_local_file_ownership.sql'
  );

  assert.ok(ownershipReconciliationMigration);
  assert.match(
    ownershipReconciliationMigration.sql,
    /create or replace view planning_query_store\.component_engineering_file_ownership_query/
  );
  assert.match(ownershipReconciliationMigration.sql, /governance_component_local_definitions/);
  assert.match(ownershipReconciliationMigration.sql, /local_file_claims/);
  assert.match(ownershipReconciliationMigration.sql, /claim_rank = 1/);
  assert.match(ownershipReconciliationMigration.sql, /leaf_component_id/);
  assert.match(ownershipReconciliationMigration.sql, /component_engineering\.file_ownership_query/);
});

test('tracked migrations derive component quality from effective file ownership after W39', () => {
  const migrations = readMigrationFiles();
  const effectiveQualityMigration = migrations.find(
    (migration) => migration.fileName === '039_component_engineering_effective_quality.sql'
  );

  assert.ok(effectiveQualityMigration);
  assert.match(
    effectiveQualityMigration.sql,
    /create or replace view planning_query_store\.component_engineering_quality_query/
  );
  assert.match(effectiveQualityMigration.sql, /effective_file_counts/);
  assert.match(effectiveQualityMigration.sql, /component_descendants/);
  assert.match(effectiveQualityMigration.sql, /component_engineering_file_ownership_query/);
  assert.match(effectiveQualityMigration.sql, /component_engineering\.component_quality_query/);
});

test('tracked migrations normalize local component metadata after W48', () => {
  const migrations = readMigrationFiles();
  const relationalComponentMetadataMigration = migrations.find(
    (migration) => migration.fileName === '048_component_definition_relational_metadata.sql'
  );

  assert.ok(relationalComponentMetadataMigration);
  assert.match(
    relationalComponentMetadataMigration.sql,
    /create table if not exists planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /create table if not exists planning_query_store\.governance_component_local_semantic_items/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /primary key \(component_id, pattern_kind, pattern\)/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /primary key \(component_id, item_kind, item_value\)/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /governance_component_local_ownership_patterns_component_kind_order_idx/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /governance_component_local_semantic_items_component_kind_order_idx/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /from planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.doesNotMatch(
    relationalComponentMetadataMigration.sql,
    /jsonb_array_elements_text\(local_component\.owns\)/
  );
  assert.match(
    relationalComponentMetadataMigration.sql,
    /from planning_query_store\.governance_component_definition_query definition/
  );
});

test('tracked migrations remove legacy local component JSONB storage after W49', () => {
  const migrations = readMigrationFiles();
  const localComponentJsonbRemovalMigration = migrations.find(
    (migration) => migration.fileName === '049_component_definition_drop_local_jsonb_storage.sql'
  );

  assert.ok(localComponentJsonbRemovalMigration);
  assert.match(
    localComponentJsonbRemovalMigration.sql,
    /create or replace view planning_query_store\.governance_component_local_metadata_query/
  );
  assert.match(
    localComponentJsonbRemovalMigration.sql,
    /create or replace view planning_query_store\.governance_unit_query/
  );
  assert.match(localComponentJsonbRemovalMigration.sql, /drop column if exists owns/);
  assert.match(localComponentJsonbRemovalMigration.sql, /drop column if exists public_api/);
  assert.match(localComponentJsonbRemovalMigration.sql, /drop column if exists raw_unit/);
  assert.doesNotMatch(localComponentJsonbRemovalMigration.sql, /local_definition\.raw_unit/);
  assert.doesNotMatch(localComponentJsonbRemovalMigration.sql, /local_definition\.owns/);
});

test('tracked migrations preserve normalized local component invariants after W50', () => {
  const migrations = readMigrationFiles();
  const normalizedInvariantMigration = migrations.find(
    (migration) => migration.fileName === '050_component_definition_normalized_invariants.sql'
  );

  assert.ok(normalizedInvariantMigration);
  assert.match(
    normalizedInvariantMigration.sql,
    /create or replace function planning_query_store\.assert_governance_component_local_definition_invariants/
  );
  assert.match(
    normalizedInvariantMigration.sql,
    /create or replace function planning_query_store\.check_governance_component_local_definition_invariants/
  );
  assert.match(
    normalizedInvariantMigration.sql,
    /create constraint trigger governance_component_local_definitions_invariants/
  );
  assert.match(
    normalizedInvariantMigration.sql,
    /create constraint trigger governance_component_local_ownership_patterns_invariants/
  );
  assert.match(
    normalizedInvariantMigration.sql,
    /create constraint trigger governance_component_local_semantic_items_invariants/
  );
  assert.match(normalizedInvariantMigration.sql, /deferrable initially deferred/);
  assert.match(normalizedInvariantMigration.sql, /pattern_kind = 'owns'/);
  assert.match(
    normalizedInvariantMigration.sql,
    /item_kind in \('public_api', 'invariant', 'transition', 'consumer'\)/
  );
  assert.doesNotMatch(normalizedInvariantMigration.sql, /jsonb_array_length/);
});

test('tracked migrations prefer local leaf component claims after W51', () => {
  const migrations = readMigrationFiles();
  const leafClaimPrecedenceMigration = migrations.find(
    (migration) => migration.fileName === '051_component_engineering_leaf_claim_precedence.sql'
  );

  assert.ok(leafClaimPrecedenceMigration);
  assert.match(
    leafClaimPrecedenceMigration.sql,
    /create or replace view planning_query_store\.component_engineering_file_ownership_query/
  );
  assert.match(leafClaimPrecedenceMigration.sql, /component_depth_rollup/);
  assert.match(
    leafClaimPrecedenceMigration.sql,
    /order by\s+matched_file\.claim_depth desc,\s+matched_file\.is_leaf_component desc,\s+matched_file\.exact_match desc,\s+length\(matched_file\.own_pattern\) desc,\s+matched_file\.component_id/
  );
  assert.match(leafClaimPrecedenceMigration.sql, /component_engineering\.file_ownership_query/);
  assert.doesNotMatch(
    leafClaimPrecedenceMigration.sql,
    /order by\s+length\(matched_file\.own_pattern\) desc,\s+matched_file\.component_id/
  );
});

test('tracked migrations keep local authority effective for imported components after W156', () => {
  const migrations = readMigrationFiles();
  const importedLocalAuthorityMigration = migrations.find(
    (migration) => migration.fileName === '156_imported_component_local_authority_projection.sql'
  );

  assert.ok(importedLocalAuthorityMigration);
  assert.match(importedLocalAuthorityMigration.sql, /local_import_override/);
  assert.match(
    importedLocalAuthorityMigration.sql,
    /left join planning_query_store\.governance_component_local_metadata_query local_metadata/
  );
  assert.match(
    importedLocalAuthorityMigration.sql,
    /from planning_query_store\.governance_component_local_metadata_query local_metadata\s+where local_metadata\.status <> 'superseded'/
  );
  assert.match(importedLocalAuthorityMigration.sql, /SYS-ADAPTERS-TEMPORAL-DBT-PLUGIN/);
  assert.match(importedLocalAuthorityMigration.sql, /SYS-PLANSTORE-DOCS-RISK/);
  assert.match(
    importedLocalAuthorityMigration.sql,
    /create or replace view planning_query_store\.component_engineering_file_ownership_query/
  );
});

test('tracked migrations remove redundant parent ownership claims after W52', () => {
  const migrations = readMigrationFiles();
  const ownershipDedupeMigration = migrations.find(
    (migration) => migration.fileName === '052_component_definition_assembly_ownership_dedupe.sql'
  );

  assert.ok(ownershipDedupeMigration);
  assert.match(ownershipDedupeMigration.sql, /parent_child_claim_overlaps/);
  assert.match(ownershipDedupeMigration.sql, /child_file_claims/);
  assert.match(
    ownershipDedupeMigration.sql,
    /from child_pattern_files child_pattern_file[\s\S]*not exists \([\s\S]*from planning_query_store\.governance_component_local_ownership_patterns exclude_pattern[\s\S]*exclude_pattern\.component_id = child_pattern_file\.child_component_id[\s\S]*exclude_pattern\.pattern_kind = 'excludes'/
  );
  assert.match(ownershipDedupeMigration.sql, /children_required = true/);
  assert.match(
    ownershipDedupeMigration.sql,
    /delete from planning_query_store\.governance_component_local_ownership_patterns parent_pattern/
  );
  assert.match(
    ownershipDedupeMigration.sql,
    /parent_pattern\.component_id = overlap\.parent_component_id/
  );
  assert.match(ownershipDedupeMigration.sql, /parent_pattern\.pattern = overlap\.parent_pattern/);
});

test('tracked migrations route claimed active work and clean queued work into next tasks', () => {
  const migrations = readMigrationFiles();
  const nextTaskClaimMigration = migrations.find(
    (migration) => migration.fileName === '040_planning_next_task_claim_boundary.sql'
  );
  const activeClaimBoundaryMigration = migrations.find(
    (migration) => migration.fileName === '041_planning_claim_recovery_active_claim_boundary.sql'
  );

  assert.ok(nextTaskClaimMigration);
  assert.ok(activeClaimBoundaryMigration);
  assert.match(
    nextTaskClaimMigration.sql,
    /create or replace view planning_query_store\.planning_next_tasks/
  );
  assert.match(
    nextTaskClaimMigration.sql,
    /lower\(candidate\.status\) in \('in_progress', 'review'\)/
  );
  assert.match(nextTaskClaimMigration.sql, /candidate\.claimed_by is not null/);
  assert.match(nextTaskClaimMigration.sql, /candidate\.claim_expires_at > now\(\)/);
  assert.match(nextTaskClaimMigration.sql, /lower\(candidate\.status\) = 'queued'/);
  assert.match(nextTaskClaimMigration.sql, /candidate\.claimed_by is null/);
  assert.match(
    nextTaskClaimMigration.sql,
    /Dependency-satisfied active planning task with a live claim by/
  );
  assert.match(
    nextTaskClaimMigration.sql,
    /create or replace view planning_query_store\.planning_claim_recovery_tasks/
  );
  assert.match(
    activeClaimBoundaryMigration.sql,
    /create or replace view planning_query_store\.planning_claim_recovery_tasks/
  );
  assert.match(activeClaimBoundaryMigration.sql, /in_progress_claim_missing/);
  assert.match(activeClaimBoundaryMigration.sql, /claim_expired/);
  assert.match(activeClaimBoundaryMigration.sql, /queued_claim_owner_missing/);
  assert.doesNotMatch(
    activeClaimBoundaryMigration.sql,
    /lower\(task\.status\) = 'queued'\s+and\s+\(\s+task\.claimed_by is not null\s+or task\.claim_expires_at is not null/s
  );
});

test('tracked migrations expose required knowledge actions as planning intake', () => {
  const migrations = readMigrationFiles();
  const knowledgeRelationMigration = migrations.find(
    (migration) => migration.fileName === '034_planning_knowledge_document_relations.sql'
  );
  const nextTaskClaimMigration = migrations.find(
    (migration) => migration.fileName === '040_planning_next_task_claim_boundary.sql'
  );

  assert.ok(knowledgeRelationMigration);
  assert.ok(nextTaskClaimMigration);
  assert.match(
    knowledgeRelationMigration.sql,
    /create or replace view planning_query_store\.knowledge_action_work_intake_query/
  );
  assert.match(knowledgeRelationMigration.sql, /'knowledge_action'::text as intake_kind/);
  assert.match(knowledgeRelationMigration.sql, /jsonb_array_elements\(action\.links\)/);
  assert.match(knowledgeRelationMigration.sql, /targetType/);
  assert.match(nextTaskClaimMigration.sql, /planning_work_intake_query/);
  assert.match(nextTaskClaimMigration.sql, /knowledge_action_work_intake_query/);
});

test('tracked migrations route unowned review tasks through claim recovery', () => {
  const migrations = readMigrationFiles();
  const reviewClaimRecoveryMigration = migrations.find(
    (migration) => migration.fileName === '041_planning_claim_recovery_active_claim_boundary.sql'
  );
  const nextTaskClaimMigration = migrations.find(
    (migration) => migration.fileName === '040_planning_next_task_claim_boundary.sql'
  );

  assert.ok(reviewClaimRecoveryMigration);
  assert.ok(nextTaskClaimMigration);
  assert.match(
    reviewClaimRecoveryMigration.sql,
    /create or replace view planning_query_store\.planning_claim_recovery_tasks/
  );
  assert.match(reviewClaimRecoveryMigration.sql, /review_claim_missing/);
  assert.match(reviewClaimRecoveryMigration.sql, /review_claim_expired/);
  assert.match(
    reviewClaimRecoveryMigration.sql,
    /lower\(task\.status\) in \('in_progress', 'review'\)/
  );
  assert.match(nextTaskClaimMigration.sql, /planning_work_intake_query/);
  assert.match(nextTaskClaimMigration.sql, /planning_claim_recovery_tasks/);
});

test('tracked migrations expose aggregated real work backlog query', () => {
  const migrations = readMigrationFiles();
  const realWorkMigration = migrations.find(
    (migration) => migration.fileName === '044_planning_real_work_query.sql'
  );

  assert.ok(realWorkMigration);
  assert.match(
    realWorkMigration.sql,
    /create or replace view planning_query_store\.planning_real_work_query/
  );
  assert.match(realWorkMigration.sql, /planning_open_tasks task/);
  assert.match(realWorkMigration.sql, /planning_work_intake_query intake/);
  assert.match(realWorkMigration.sql, /'blocked_by_dependency'/);
  assert.match(realWorkMigration.sql, /'unlinked_required_action'/);
  assert.match(realWorkMigration.sql, /open_item_count/);
  assert.match(realWorkMigration.sql, /linked_task_count/);
});

test('tracked migrations keep real work disposition groups semantically aligned', () => {
  const migrations = readMigrationFiles();
  const groupingMigration = migrations.find(
    (migration) => migration.fileName === '045_planning_real_work_query_grouping_hardening.sql'
  );

  assert.ok(groupingMigration);
  assert.match(groupingMigration.sql, /work_group_key/);
  assert.match(groupingMigration.sql, /intake\.intake_kind in \('docs_disposition', 'task_gap'\)/);
  assert.match(
    groupingMigration.sql,
    /group by intake\.intake_kind, intake\.work_source_path, intake\.work_group_key/
  );
});

test('tracked migrations create the DB-first architecture authority schema', () => {
  const migrations = readMigrationFiles();
  const authorityMigration = migrations.find(
    (migration) => migration.fileName === '042_db_first_architecture_authority_schema.sql'
  );

  assert.ok(authorityMigration);
  assert.match(authorityMigration.sql, /create schema if not exists architecture/);

  for (const tableName of [
    'design',
    'design_scope',
    'component',
    'component_responsibility',
    'component_metric',
    'contract',
    'component_relation',
    'component_port',
    'decision',
    'component_flow',
    'component_transformation',
    'component_flow_step',
    'component_event_io',
    'component_storage_io',
    'component_test',
    'component_observability',
    'risk',
    'evidence',
    'component_health_check',
  ]) {
    assert.match(
      authorityMigration.sql,
      new RegExp(`create table if not exists architecture\\.${tableName}\\b`)
    );
  }

  assert.match(authorityMigration.sql, /architecture_design_status_check/);
  assert.match(authorityMigration.sql, /architecture_component_kind_check/);
  assert.match(authorityMigration.sql, /architecture_component_layer_check/);
  assert.match(authorityMigration.sql, /architecture_component_relation_type_check/);
  assert.match(authorityMigration.sql, /architecture_component_health_check_status_check/);
  assert.match(authorityMigration.sql, /references architecture\.component\(component_id\)/);
  assert.match(authorityMigration.sql, /references architecture\.contract\(contract_id\)/);
  assert.match(authorityMigration.sql, /source_component_id <> target_component_id/);
  assert.match(
    authorityMigration.sql,
    /create index if not exists architecture_component_owner_idx/
  );
  assert.match(
    authorityMigration.sql,
    /create index if not exists architecture_relation_source_idx/
  );
  assert.match(
    authorityMigration.sql,
    /create index if not exists architecture_evidence_subject_idx/
  );
});

test('tracked migrations expose DB-first architecture authority query surfaces', () => {
  const migrations = readMigrationFiles();
  const authorityQueryMigration = migrations.find(
    (migration) => migration.fileName === '043_db_first_architecture_authority_queries.sql'
  );

  assert.ok(authorityQueryMigration);

  for (const viewName of [
    'design_query',
    'design_scope_query',
    'component_query',
    'component_relation_query',
    'component_responsibility_query',
    'component_io_query',
    'component_flow_query',
    'component_flow_step_query',
    'component_contract_query',
    'component_maturity_query',
    'component_drift_query',
    'implementation_authorization_query',
    'implementation_violation_query',
    'evidence_query',
  ]) {
    assert.match(
      authorityQueryMigration.sql,
      new RegExp(`create or replace view architecture\\.${viewName}\\b`)
    );
  }

  assert.match(authorityQueryMigration.sql, /from architecture\.design_scope scope/);
  assert.match(
    authorityQueryMigration.sql,
    /status in \('approved', 'implementing', 'implemented'\)/
  );
  assert.match(
    authorityQueryMigration.sql,
    /union all[\s\S]*from architecture\.component_event_io/
  );
  assert.match(
    authorityQueryMigration.sql,
    /union all[\s\S]*from architecture\.component_storage_io/
  );
  assert.match(authorityQueryMigration.sql, /missing_reasons/);
  assert.match(authorityQueryMigration.sql, /required_evidence_missing/);
  assert.match(authorityQueryMigration.sql, /health_check_failed/);
});

test('tracked migrations include architecture design command audit rail', () => {
  const migrations = readMigrationFiles();
  const designCommandMigration = migrations.find(
    (migration) => migration.fileName === '044_architecture_design_command_rail.sql'
  );

  assert.ok(designCommandMigration);
  assert.match(
    designCommandMigration.sql,
    /create table if not exists architecture\.design_operations/
  );
  assert.match(designCommandMigration.sql, /operation_type in \('architecture_design_create'\)/);
  assert.match(designCommandMigration.sql, /idempotency_key text not null unique/);
  assert.match(designCommandMigration.sql, /source_content_sha256/);
  assert.match(designCommandMigration.sql, /references architecture\.design\(design_id\)/);
});

test('tracked migrations require explicit architecture design rail references', () => {
  const migrations = readMigrationFiles();
  const explicitRailMigration = migrations.find(
    (migration) => migration.fileName === '045_architecture_design_explicit_rail_ref.sql'
  );

  assert.ok(explicitRailMigration);
  assert.match(explicitRailMigration.sql, /alter column rail_ref drop default/);
  assert.match(explicitRailMigration.sql, /architecture_design_explicit_rail_ref_check/);
  assert.match(explicitRailMigration.sql, /raise exception/);
  assert.match(explicitRailMigration.sql, /none - architecture-authority-only/);
  assert.doesNotMatch(explicitRailMigration.sql, /delete from architecture\.design\b/);
});

test('tracked migrations widen architecture design operations for component graph commands', () => {
  const migrations = readMigrationFiles();
  const componentGraphCommandMigration = migrations.find(
    (migration) => migration.fileName === '046_architecture_component_graph_command_rail.sql'
  );

  assert.ok(componentGraphCommandMigration);
  assert.match(componentGraphCommandMigration.sql, /architecture_component_record/);
  assert.match(componentGraphCommandMigration.sql, /architecture_relation_record/);
  assert.match(componentGraphCommandMigration.sql, /architecture_design_operations_type_check/);
  assert.doesNotMatch(
    componentGraphCommandMigration.sql,
    /delete from architecture\.design_operations\b/
  );
});

test('tracked migrations include DB-first command/query rail catalog projection', () => {
  const migrations = readMigrationFiles();
  const railCatalogMigration = migrations.find(
    (migration) => migration.fileName === '053_command_query_rail_catalog.sql'
  );

  assert.ok(railCatalogMigration);
  assert.match(
    railCatalogMigration.sql,
    /create table if not exists planning_query_store\.command_query_rails/
  );
  assert.match(railCatalogMigration.sql, /rail_type in \('command', 'query'\)/);
  assert.match(railCatalogMigration.sql, /symbol_refs jsonb not null default '\[\]'::jsonb/);
  assert.match(
    railCatalogMigration.sql,
    /create or replace view planning_query_store\.command_query_rail_query/
  );
  assert.match(
    railCatalogMigration.sql,
    /count\(\*\) over \(partition by rail_type, normalized_rail_name\)/
  );
  assert.match(railCatalogMigration.sql, /is_gap/);
  assert.doesNotMatch(
    railCatalogMigration.sql,
    /delete from planning_query_store\.repository_commands\b/
  );
});

test('tracked migrations add command/query rail implementation and documentation refs', () => {
  const migrations = readMigrationFiles();
  const railCatalogSourceRefsMigration = migrations.find(
    (migration) => migration.fileName === '054_command_query_rail_catalog_source_refs.sql'
  );

  assert.ok(railCatalogSourceRefsMigration);
  assert.match(
    railCatalogSourceRefsMigration.sql,
    /add column if not exists implementation_refs jsonb not null default '\[\]'::jsonb/
  );
  assert.match(
    railCatalogSourceRefsMigration.sql,
    /add column if not exists documentation_refs jsonb not null default '\[\]'::jsonb/
  );
  assert.match(
    railCatalogSourceRefsMigration.sql,
    /drop view if exists planning_query_store\.command_query_rail_query/
  );
  assert.match(
    railCatalogSourceRefsMigration.sql,
    /jsonb_array_length\(implementation_refs\) as implementation_ref_count/
  );
  assert.match(
    railCatalogSourceRefsMigration.sql,
    /jsonb_array_length\(documentation_refs\) as documentation_ref_count/
  );
});

test('tracked migrations include frontend mechanical truth inventory projection', () => {
  const migrations = readMigrationFiles();
  const frontendTruthMigration = migrations.find(
    (migration) => migration.fileName === '055_frontend_mechanical_truth_inventory.sql'
  );

  assert.ok(frontendTruthMigration);
  assert.match(
    frontendTruthMigration.sql,
    /create table if not exists planning_query_store\.frontend_mechanical_truth_surfaces/
  );
  assert.match(
    frontendTruthMigration.sql,
    /screen_state in \('operational-product', 'preview', 'disabled-unsupported', 'experimental'\)/
  );
  assert.match(
    frontendTruthMigration.sql,
    /create or replace view planning_query_store\.frontend_mechanical_truth_query/
  );
  assert.match(
    frontendTruthMigration.sql,
    /jsonb_array_length\(capability_gaps\) as capability_gap_count/
  );
});

test('tracked migrations include frontend component reflection inventory projection', () => {
  const migrations = readMigrationFiles();
  const frontendComponentMigration = migrations.find(
    (migration) => migration.fileName === '056_frontend_component_reflection_inventory.sql'
  );

  assert.ok(frontendComponentMigration);
  assert.match(
    frontendComponentMigration.sql,
    /create table if not exists planning_query_store\.frontend_components/
  );
  assert.match(
    frontendComponentMigration.sql,
    /create table if not exists planning_query_store\.frontend_surface_component_links/
  );
  assert.match(
    frontendComponentMigration.sql,
    /references planning_query_store\.frontend_mechanical_truth_surfaces\(surface_id\)/
  );
  assert.match(
    frontendComponentMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(
    frontendComponentMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(
    frontendComponentMigration.sql,
    /create or replace view planning_query_store\.frontend_component_rail_query/
  );
});

test('tracked migrations persist local frontend component overlays after imports', () => {
  const migrations = readMigrationFiles();
  const overlayMigration = migrations.find(
    (migration) =>
      migration.fileName === '255_web_canvas_source_import_dialog_post_import_persistence.sql'
  );

  assert.ok(overlayMigration);
  assert.match(
    overlayMigration.sql,
    /create table if not exists planning_query_store\.frontend_component_local_files/
  );
  assert.match(
    overlayMigration.sql,
    /create table if not exists planning_query_store\.frontend_component_local_cq_rails/
  );
  assert.match(
    overlayMigration.sql,
    /create table if not exists planning_query_store\.frontend_component_local_evidence/
  );
  assert.match(
    overlayMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(overlayMigration.sql, /frontend_component_local_files local_file/);
  assert.match(overlayMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(
    overlayMigration.sql,
    /local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#command#opencanvassourceimportdialog/
  );
});

test('tracked migrations support DB-local frontend component declarations', () => {
  const migrations = readMigrationFiles();
  const localComponentMigration = migrations.find(
    (migration) => migration.fileName === '273_frontend_component_local_component_overlay.sql'
  );

  assert.ok(localComponentMigration);
  assert.match(
    localComponentMigration.sql,
    /create table if not exists planning_query_store\.frontend_component_local_components/
  );
  assert.match(
    localComponentMigration.sql,
    /create table if not exists planning_query_store\.frontend_component_local_surface_links/
  );
  assert.match(
    localComponentMigration.sql,
    /create or replace view planning_query_store\.frontend_component_effective_component_query/
  );
  assert.match(
    localComponentMigration.sql,
    /create or replace view planning_query_store\.frontend_component_surface_link_query/
  );
  assert.match(
    localComponentMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(
    localComponentMigration.sql,
    /frontend_component_effective_component_query component/
  );
  assert.match(localComponentMigration.sql, /frontend_component_local_components local_component/);
  assert.match(localComponentMigration.sql, /frontend_component_local_surface_links local_link/);
  assert.match(
    localComponentMigration.sql,
    /create index if not exists frontend_component_files_component_idx/
  );
  assert.match(localComponentMigration.sql, /web\.component\.canvas\.CanvasContextMenuPresenter/);
  assert.match(localComponentMigration.sql, /useCanvasContextMenuPresenter\.ts/);
  assert.match(localComponentMigration.sql, /ResolveCanvasContextMenu/);
});

test('tracked migrations index frontend component profile evidence lookups', () => {
  const migrations = readMigrationFiles();
  const profileIndexMigration = migrations.find(
    (migration) => migration.fileName === '256_frontend_component_profile_query_indexes.sql'
  );

  assert.ok(profileIndexMigration);
  assert.match(
    profileIndexMigration.sql,
    /create index if not exists frontend_component_evidence_component_idx/
  );
  assert.match(profileIndexMigration.sql, /on planning_query_store\.frontend_component_evidence/);
  assert.match(profileIndexMigration.sql, /\(component_id, evidence_id\)/);
});

test('tracked migrations index feature mechanization manifest symbol lookups', () => {
  const migrations = readMigrationFiles();
  const symbolLookupMigration = migrations.find(
    (migration) => migration.fileName === '287_feature_mechanization_symbol_lookup_indexes.sql'
  );

  assert.ok(symbolLookupMigration);
  assert.match(
    symbolLookupMigration.sql,
    /create index if not exists command_query_rails_raw_manifest_gin_idx/
  );
  assert.match(
    symbolLookupMigration.sql,
    /on planning_query_store\.command_query_rails using gin \(raw_manifest jsonb_path_ops\)/
  );
  assert.match(
    symbolLookupMigration.sql,
    /create index if not exists feature_mechanization_local_rails_raw_manifest_gin_idx/
  );
  assert.match(
    symbolLookupMigration.sql,
    /on planning_query_store\.feature_mechanization_local_rails using gin \(raw_manifest jsonb_path_ops\)/
  );
});

test('tracked migrations register Canvas context menu shell layer authority', () => {
  const migrations = readMigrationFiles();
  const layerMigration = migrations.find(
    (migration) => migration.fileName === '288_register_canvas_context_menu_layer.sql'
  );

  assert.ok(layerMigration);
  assert.match(layerMigration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(layerMigration.sql, /CanvasContextMenuLayer/);
  assert.match(
    layerMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuLayer\.tsx/
  );
  assert.match(
    layerMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasShell\.contextMenuIntegration\.test\.tsx/
  );
  assert.match(layerMigration.sql, /frontend_component_local_files/);
  assert.match(layerMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(layerMigration.sql, /feature_mechanization_local_rails/);
  assert.match(layerMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(layerMigration.sql, /CANVAS-CONTEXT-MENU-SHELL-LAYER-20260625/);
  assert.doesNotMatch(layerMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(layerMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas context menu echo consumption repair', () => {
  const migrations = readMigrationFiles();
  const echoRepairMigration = migrations.find(
    (migration) => migration.fileName === '329_canvas_context_menu_echo_consumption_repair.sql'
  );

  assert.ok(echoRepairMigration);
  assert.match(echoRepairMigration.sql, /E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1/);
  assert.match(echoRepairMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(echoRepairMigration.sql, /CanvasContextMenuReadModel/);
  assert.match(echoRepairMigration.sql, /consumePendingPaneClickEcho/);
  assert.match(
    echoRepairMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/useCanvasContextMenuPresenter\.lifecycle\.test\.tsx/
  );
  assert.match(echoRepairMigration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(echoRepairMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(echoRepairMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Canvas context menu echo repair manifest', () => {
  const migrations = readMigrationFiles();
  const manifestCompletionMigration = migrations.find(
    (migration) =>
      migration.fileName === '330_canvas_context_menu_echo_consumption_manifest_completion.sql'
  );

  assert.ok(manifestCompletionMigration);
  assert.match(manifestCompletionMigration.sql, /E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1/);
  assert.match(manifestCompletionMigration.sql, /'version', 1/);
  assert.match(manifestCompletionMigration.sql, /'implementationPlan'/);
  assert.match(manifestCompletionMigration.sql, /'forbiddenImplementationSurfaces'/);
  assert.match(manifestCompletionMigration.sql, /'redGreenCycles'/);
  assert.match(manifestCompletionMigration.sql, /'completionGate'/);
  assert.match(manifestCompletionMigration.sql, /'pnpm verify:prepush'/);
  assert.match(manifestCompletionMigration.sql, /consumePendingPaneClickEcho/);
  assert.match(manifestCompletionMigration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(manifestCompletionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(manifestCompletionMigration.sql, /truncate\s+/i);
});

test('tracked migrations reuse the canonical Canvas context menu rail owner', () => {
  const migrations = readMigrationFiles();
  const ownerAlignmentMigration = migrations.find(
    (migration) =>
      migration.fileName === '331_canvas_context_menu_echo_repair_canonical_rail_owner.sql'
  );

  assert.ok(ownerAlignmentMigration);
  assert.match(ownerAlignmentMigration.sql, /E-CANVAS-CONTEXT-MENU-GRAMMAR-REPAIR-1/);
  assert.match(ownerAlignmentMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(ownerAlignmentMigration.sql, /CanvasNodeContextMenuView/);
  assert.match(ownerAlignmentMigration.sql, /command_query_rail_vocabulary_query/);
  assert.match(ownerAlignmentMigration.sql, /exact_duplicate/);
  assert.doesNotMatch(ownerAlignmentMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ownerAlignmentMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas bottom drawer actionable read model', () => {
  const migrations = readMigrationFiles();
  const drawerActionMigration = migrations.find(
    (migration) => migration.fileName === '332_canvas_bottom_drawer_actionable_read_model.sql'
  );
  const drawerManifestHardeningMigration = migrations.find(
    (migration) => migration.fileName === '333_canvas_bottom_drawer_feature_manifest_hardening.sql'
  );
  const drawerTopBarRunStatusMigration = migrations.find(
    (migration) => migration.fileName === '335_canvas_topbar_run_status_indicator_manifest.sql'
  );

  assert.ok(drawerActionMigration);
  assert.ok(drawerManifestHardeningMigration);
  assert.ok(drawerTopBarRunStatusMigration);
  assert.match(drawerActionMigration.sql, /E-CANVAS-BOTTOM-DRAWER-OPS-1/);
  assert.match(drawerActionMigration.sql, /UXDB-BOTTOM-OPERATIONAL-DRAWER-P0-1/);
  assert.match(drawerActionMigration.sql, /RenderBottomOperationalDrawer/);
  assert.match(drawerActionMigration.sql, /web\.component\.shell\.BottomOperationalDrawer/);
  assert.match(
    drawerActionMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasOperationalDrawerContribution\.ts/
  );
  assert.match(
    drawerActionMigration.sql,
    /apps\/web\/src\/app\/components\/shell\/OperationalDrawerPanels\.actions\.test\.tsx/
  );
  assert.match(drawerActionMigration.sql, /OperationalDrawerRunStatusSummary/);
  assert.match(drawerActionMigration.sql, /feature_mechanization_local_rails/);
  assert.match(drawerActionMigration.sql, /frontend_component_local_files/);
  assert.doesNotMatch(drawerActionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(drawerActionMigration.sql, /truncate\s+/i);
  assert.match(drawerManifestHardeningMigration.sql, /forbiddenImplementationSurfaces/);
  assert.match(drawerManifestHardeningMigration.sql, /redGreenCycles/);
  assert.match(drawerManifestHardeningMigration.sql, /symbols/);
  assert.match(drawerManifestHardeningMigration.sql, /OperationalDrawerSecondaryAction/);
  assert.match(drawerManifestHardeningMigration.sql, /buildCanvasOperationalDrawerContribution/);
  assert.doesNotMatch(drawerManifestHardeningMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(drawerManifestHardeningMigration.sql, /truncate\s+/i);
  assert.match(drawerTopBarRunStatusMigration.sql, /ShellRunStatusIndicator/);
  assert.match(
    drawerTopBarRunStatusMigration.sql,
    /apps\/web\/src\/app\/components\/TopAppBar\.tsx/
  );
  assert.match(drawerTopBarRunStatusMigration.sql, /RenderBottomOperationalDrawer/);
  assert.match(drawerTopBarRunStatusMigration.sql, /E-CANVAS-EXECUTION-PREVIEW-READINESS-1/);
  assert.doesNotMatch(drawerTopBarRunStatusMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(drawerTopBarRunStatusMigration.sql, /truncate\s+/i);
});

test('tracked migrations materialize code symbol duplicate query inputs', () => {
  const migrations = readMigrationFiles();
  const codeSymbolProjectionMigration = migrations.find(
    (migration) =>
      migration.fileName === '269_code_symbol_problem_query_materialized_projection.sql'
  );

  assert.ok(codeSymbolProjectionMigration);
  assert.match(
    codeSymbolProjectionMigration.sql,
    /create materialized view planning_query_store\.code_symbol_effective_inventory_projection/
  );
  assert.match(
    codeSymbolProjectionMigration.sql,
    /from planning_query_store\.code_symbol_inventory_query/
  );
  assert.match(
    codeSymbolProjectionMigration.sql,
    /create index if not exists code_symbol_effective_inventory_projection_body_idx/
  );
  assert.match(
    codeSymbolProjectionMigration.sql,
    /create index if not exists code_symbol_effective_inventory_projection_name_idx/
  );
  assert.match(
    codeSymbolProjectionMigration.sql,
    /from planning_query_store\.code_symbol_effective_inventory_projection/
  );
  assert.doesNotMatch(
    codeSymbolProjectionMigration.sql,
    /from planning_query_store\.code_symbol_inventory_query symbol\s+join duplicate_bodies/i
  );
});

test('tracked migrations materialize component ownership for priority integrity reads', () => {
  const migrations = readMigrationFiles();
  const ownershipProjectionMigration = migrations.find(
    (migration) => migration.fileName === '274_component_ownership_priority_projection.sql'
  );

  assert.ok(ownershipProjectionMigration);
  assert.match(
    ownershipProjectionMigration.sql,
    /create materialized view planning_query_store\.component_engineering_file_ownership_projection/
  );
  assert.match(
    ownershipProjectionMigration.sql,
    /from planning_query_store\.component_engineering_file_ownership_query/
  );
  assert.match(
    ownershipProjectionMigration.sql,
    /create unique index if not exists component_engineering_file_ownership_projection_file_idx/
  );
  assert.match(
    ownershipProjectionMigration.sql,
    /create index if not exists component_engineering_file_ownership_projection_component_idx/
  );
  assert.match(
    ownershipProjectionMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/
  );
  assert.match(
    ownershipProjectionMigration.sql,
    /from planning_query_store\.component_engineering_file_ownership_projection/
  );
  assert.doesNotMatch(
    ownershipProjectionMigration.sql,
    /from planning_query_store\.component_engineering_file_ownership_query\s+ownership/
  );
});

test('tracked migrations keep component path coverage on indexed ownership projection', () => {
  const migrations = readMigrationFiles();
  const pathCoverageMigration = migrations.find(
    (migration) => migration.fileName === '284_component_integrity_path_coverage_projection.sql'
  );

  assert.ok(pathCoverageMigration);
  assert.match(
    pathCoverageMigration.sql,
    /not exists \(\s*select 1\s+from planning_query_store\.component_engineering_file_ownership_projection ownership\s+where ownership\.file_path = component\.repo_path\s*\)/i
  );
  assert.match(
    pathCoverageMigration.sql,
    /not exists \(\s*select 1\s+from planning_query_store\.component_engineering_file_ownership_projection ownership\s+where ownership\.file_path like component\.repo_path \|\| '\/%'\s*\)/i
  );
  assert.doesNotMatch(
    pathCoverageMigration.sql,
    /from file_ownership ownership\s+where ownership\.file_path = component\.repo_path\s+or ownership\.file_path like component\.repo_path \|\| '\/%'/i
  );
});

test('tracked migrations restore Canvas source import feature mechanization manifest', () => {
  const migrations = readMigrationFiles();
  const manifestRestoreMigration = migrations.find(
    (migration) =>
      migration.fileName === '262_restore_canvas_source_import_dialog_feature_manifest.sql'
  );

  assert.ok(manifestRestoreMigration);
  assert.match(
    manifestRestoreMigration.sql,
    /local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#command#opencanvassourceimportdialog/
  );
  assert.match(manifestRestoreMigration.sql, /'version', 1/);
  assert.match(manifestRestoreMigration.sql, /'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'/);
  assert.match(manifestRestoreMigration.sql, /'mechanizationStatus', 'implemented'/);
  assert.match(manifestRestoreMigration.sql, /'noHumanDecisionsRemaining', true/);
  assert.match(manifestRestoreMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(manifestRestoreMigration.sql, /readFrontendComponentProfileRows/);
});

test('tracked migrations keep Canvas source import component files fresh-DB safe', () => {
  const migrations = readMigrationFiles();
  const sourceDialogHostMigration = migrations.find(
    (migration) => migration.fileName === '254_web_canvas_source_import_dialog_host.sql'
  );

  assert.ok(sourceDialogHostMigration);
  assert.match(
    sourceDialogHostMigration.sql,
    /insert into planning_query_store\.frontend_components/
  );
  assert.match(sourceDialogHostMigration.sql, /on conflict \(component_id\) do nothing/);
  assert.match(
    sourceDialogHostMigration.sql,
    /insert into planning_query_store\.frontend_component_files/
  );
  assert.match(sourceDialogHostMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
});

test('tracked migrations make Canvas source import dialog component DB-first', () => {
  const migrations = readMigrationFiles();
  const dbFirstMigration = migrations.find(
    (migration) => migration.fileName === '569_source_import_dialog_dbfirst_component_source.sql'
  );

  assert.ok(dbFirstMigration);
  assert.match(dbFirstMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(dbFirstMigration.sql, /frontend_component_local_components/);
  assert.match(
    dbFirstMigration.sql,
    /source_path\s*=\s*excluded\.source_path|source_path,\s*source_content_sha256/s
  );
  assert.match(
    dbFirstMigration.sql,
    /tools\/planning-db\/migrations\/569_source_import_dialog_dbfirst_component_source\.sql/
  );
  assert.match(dbFirstMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(dbFirstMigration.sql, /ImportWarehouseSources/);
  assert.doesNotMatch(
    dbFirstMigration.sql,
    /source_path\s*=\s*'docs\/architecture\/components\/web\/frontend-component-inventory\.md'/
  );
});

test('tracked migrations scope Source Import no-stub evidence to executable Source Import surfaces', () => {
  const migrations = readMigrationFiles();
  const evidenceScopeMigration = migrations.find(
    (migration) => migration.fileName === '570_source_import_dialog_no_stub_evidence_scope.sql'
  );

  assert.ok(evidenceScopeMigration);
  assert.match(evidenceScopeMigration.sql, /EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-NO-STUB-SCAN/);
  assert.match(evidenceScopeMigration.sql, /importWarehouseSourcesUseCase\.ts/);
  assert.match(evidenceScopeMigration.sql, /warehouseSourceImportRoutes\.ts/);
  assert.match(
    evidenceScopeMigration.sql,
    /excludedTerms', jsonb_build_array\(\s*'placeholder'\s*\)/
  );
  assert.doesNotMatch(evidenceScopeMigration.sql, /apps\/api\/src'|apps\/web\/src\/app'/);
});

test('tracked migrations align Source Import architecture docs to implemented rails', () => {
  const migrations = readMigrationFiles();
  const docRailAlignmentMigration = migrations.find(
    (migration) => migration.fileName === '586_source_import_documentation_rail_alignment.sql'
  );

  assert.ok(docRailAlignmentMigration);
  assert.match(docRailAlignmentMigration.sql, /EV-WEB-CANVAS-SOURCE-IMPORT-DOC-RAIL-ALIGNMENT/);
  assert.match(docRailAlignmentMigration.sql, /ListWarehouseConnections/);
  assert.match(docRailAlignmentMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(docRailAlignmentMigration.sql, /ImportWarehouseSources/);
  assert.match(docRailAlignmentMigration.sql, /workspace-port-decomposition-user-stories\.md/);
  assert.match(docRailAlignmentMigration.sql, /graph-frontend-architecture\.md/);
  assert.match(docRailAlignmentMigration.sql, /documentation_drift/);
  assert.doesNotMatch(docRailAlignmentMigration.sql, /frontend-component-inventory\.md/);
});

test('tracked migrations complete Source Import component family ownership', () => {
  const migrations = readMigrationFiles();
  const familyOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '571_source_import_component_family_ownership.sql'
  );

  assert.ok(familyOwnershipMigration);
  assert.match(familyOwnershipMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(familyOwnershipMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/);
  assert.match(familyOwnershipMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS/);
  assert.match(familyOwnershipMigration.sql, /SourceImportWizard\.architecture\.test\.tsx/);
  assert.match(familyOwnershipMigration.sql, /SourceImportWizard\.pluginOptions\.test\.tsx/);
  assert.match(familyOwnershipMigration.sql, /SourceImportWizard\.testHarness\.tsx/);
  assert.match(familyOwnershipMigration.sql, /SourceImportSectionTabs\.test\.tsx/);
  assert.match(familyOwnershipMigration.sql, /constants\.ts/);
  assert.match(familyOwnershipMigration.sql, /WizardStep/);
  assert.match(familyOwnershipMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(familyOwnershipMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(familyOwnershipMigration.sql, /ImportWarehouseSources/);
  assert.match(familyOwnershipMigration.sql, /EV-SOURCE-IMPORT-COMPONENT-FAMILY-OWNERSHIP/);
  assert.match(familyOwnershipMigration.sql, /frontend-component-files --component/);
  assert.doesNotMatch(familyOwnershipMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(familyOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations reassert Canvas source import symbols after post-import reconciliation', () => {
  const migrations = readMigrationFiles();
  const symbolRestoreMigration = migrations.find(
    (migration) =>
      migration.fileName ===
      '265_restore_canvas_source_import_dialog_symbols_after_post_import_reconcile.sql'
  );

  assert.ok(symbolRestoreMigration);
  assert.match(symbolRestoreMigration.sql, /'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'/);
  assert.match(symbolRestoreMigration.sql, /CanvasSourceImportDialogHost/);
  assert.match(symbolRestoreMigration.sql, /useCanvasSourceImportDialogState/);
  assert.match(symbolRestoreMigration.sql, /readFrontendComponentProfileRows/);
  assert.match(symbolRestoreMigration.sql, /OpenCanvasSourceImportDialog/);
});

test('tracked migrations repoint stale local feature rail sources to versioned files', () => {
  const migrations = readMigrationFiles();
  const sourceRepointMigration = migrations.find(
    (migration) => migration.fileName === '266_repoint_stale_local_feature_rail_sources.sql'
  );

  assert.ok(sourceRepointMigration);
  assert.match(
    sourceRepointMigration.sql,
    /256_repoint_phantom_governance_component_retirement_rail_source\.sql/
  );
  assert.match(
    sourceRepointMigration.sql,
    /246_retire_phantom_ci_governance_helper_components\.sql/
  );
  assert.match(
    sourceRepointMigration.sql,
    /264_reconcile_post_import_canvas_source_import_dialog_feature_manifest\.sql/
  );
  assert.match(sourceRepointMigration.sql, /266_repoint_stale_local_feature_rail_sources\.sql/);
  assert.match(sourceRepointMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(sourceRepointMigration.sql, /readFrontendComponentProfileRows/);
  assert.doesNotMatch(
    sourceRepointMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations repoint DBT test semantics workbench rail away from raw intake', () => {
  const migrations = readMigrationFiles();
  const sourceRepairMigration = migrations.find(
    (migration) => migration.fileName === '308_repoint_dbt_test_semantics_workbench_rail_source.sql'
  );

  assert.ok(sourceRepairMigration);
  assert.match(
    sourceRepairMigration.sql,
    /local#E-CANVAS-DBT-TEST-SEMANTICS-WORKBENCH-1#query#inspectcanvasnodeproperties/
  );
  assert.match(
    sourceRepairMigration.sql,
    /source_path = 'apps\/web\/src\/app\/views\/canvas\/CanvasNodeWorkbenchPanel\.tsx'/
  );
  assert.match(sourceRepairMigration.sql, /'implementationPlan',/);
  assert.match(
    sourceRepairMigration.sql,
    /planning-db:\/\/canvas-uxdb-specification\/component\.node-workbench\.tests/
  );
  assert.match(sourceRepairMigration.sql, /'userStories',\s+jsonb_build_array\(/);
  assert.match(
    sourceRepairMigration.sql,
    /'forbiddenSurfaces', jsonb_build_array\('buzon\/\*\*'\)/
  );
  assert.doesNotMatch(sourceRepairMigration.sql, /source_path = 'buzon\/TAREA\.TXT'/);
});

test('tracked migrations anchor Canvas source import active rail to governed frontend source', () => {
  const migrations = readMigrationFiles();
  const sourceRepointMigration = migrations.find(
    (migration) =>
      migration.fileName === '267_repoint_canvas_source_import_dialog_active_rail_source.sql'
  );

  assert.ok(sourceRepointMigration);
  assert.match(
    sourceRepointMigration.sql,
    /265_restore_canvas_source_import_dialog_symbols_after_post_import_reconcile\.sql/
  );
  assert.match(sourceRepointMigration.sql, /apps\/web\/src\/app\/views\/canvas\/CanvasShell\.tsx/);
  assert.match(sourceRepointMigration.sql, /currentImplementationSourcePath/);
  assert.match(sourceRepointMigration.sql, /CanvasSourceImportDialogHostProps/);
  assert.match(sourceRepointMigration.sql, /useCanvasSourceImportDialogState/);
  assert.match(sourceRepointMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(
    sourceRepointMigration.sql,
    /postImportFeatureManifestReconciledBy'.*267_repoint_canvas_source_import_dialog_active_rail_source/s
  );
  assert.doesNotMatch(
    sourceRepointMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations reconcile Canvas source import dialog host ownership after projection', () => {
  const migrations = readMigrationFiles();
  const hostOwnershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '278_reconcile_canvas_source_import_dialog_host_ownership.sql'
  );

  assert.ok(hostOwnershipMigration);
  assert.match(hostOwnershipMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST/);
  assert.match(hostOwnershipMigration.sql, /SYS-WEB-CANVAS-ADD-SOURCE-DIALOG/);
  assert.match(
    hostOwnershipMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasSourceImportDialogHost\.tsx/
  );
  assert.match(
    hostOwnershipMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/useCanvasSourceImportDialogState\.ts/
  );
  assert.match(hostOwnershipMigration.sql, /governance_component_local_ownership_patterns/);
  assert.match(
    hostOwnershipMigration.sql,
    /SYS-WEB-CANVAS-SOURCE-PREVIEW-TRANSFORMATION[\s\S]*excludes[\s\S]*useCanvasSourceImportDialogState\.ts/
  );
  assert.match(hostOwnershipMigration.sql, /component_engineering_file_ownership_projection/);
  assert.doesNotMatch(
    hostOwnershipMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations declare CI policy validation import reconcile symbol', () => {
  const migrations = readMigrationFiles();
  const symbolRegistrationMigration = migrations.find(
    (migration) => migration.fileName === '268_register_ci_policy_validation_reconcile_symbol.sql'
  );

  assert.ok(symbolRegistrationMigration);
  assert.match(
    symbolRegistrationMigration.sql,
    /CI-GOVERNANCE-PHANTOM-COMPONENT-RETIREMENT-20260625/
  );
  assert.match(
    symbolRegistrationMigration.sql,
    /reconcileSupersededCiPolicyValidationSplitComponents/
  );
  assert.match(symbolRegistrationMigration.sql, /scripts\/planning-db-import\.cjs/);
  assert.match(symbolRegistrationMigration.sql, /scripts\/planning-db-import\.test\.cjs/);
  assert.match(symbolRegistrationMigration.sql, /RetirePhantomGovernanceComponents/);
});

test('tracked migrations declare code symbol projection refresh mechanization', () => {
  const migrations = readMigrationFiles();
  const symbolProjectionMigration = migrations.find(
    (migration) => migration.fileName === '270_register_code_symbol_projection_refresh_feature.sql'
  );

  assert.ok(symbolProjectionMigration);
  assert.match(
    symbolProjectionMigration.sql,
    /PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625/
  );
  assert.match(symbolProjectionMigration.sql, /RefreshCodeSymbolDuplicateProjection/);
  assert.match(symbolProjectionMigration.sql, /ListCodeSymbolDuplicateDiagnostics/);
  assert.match(symbolProjectionMigration.sql, /refreshCodeSymbolMaterializedProjection/);
  assert.match(symbolProjectionMigration.sql, /code_symbol_effective_inventory_projection/);
  assert.match(
    symbolProjectionMigration.sql,
    /269_code_symbol_problem_query_materialized_projection\.sql/
  );
  assert.match(symbolProjectionMigration.sql, /scripts\/planning-db-import\.test\.cjs/);
  assert.match(symbolProjectionMigration.sql, /scripts\/planning-db-migrate\.test\.cjs/);
  assert.doesNotMatch(
    symbolProjectionMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations declare component ownership projection refresh mechanization', () => {
  const migrations = readMigrationFiles();
  const ownershipProjectionMigration = migrations.find(
    (migration) =>
      migration.fileName === '275_register_component_ownership_projection_refresh_feature.sql'
  );

  assert.ok(ownershipProjectionMigration);
  assert.match(
    ownershipProjectionMigration.sql,
    /PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625/
  );
  assert.match(
    ownershipProjectionMigration.sql,
    /refreshComponentFileOwnershipMaterializedProjection/
  );
  assert.match(ownershipProjectionMigration.sql, /component_engineering_file_ownership_projection/);
  assert.match(
    ownershipProjectionMigration.sql,
    /274_component_ownership_priority_projection\.sql/
  );
  assert.match(ownershipProjectionMigration.sql, /scripts\/planning-db-import\.test\.cjs/);
  assert.match(ownershipProjectionMigration.sql, /scripts\/planning-db-migrate\.test\.cjs/);
  assert.doesNotMatch(
    ownershipProjectionMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations materialize component rule evaluations for priority drift reads', () => {
  const migrations = readMigrationFiles();
  const ruleEvaluationProjectionMigration = migrations.find(
    (migration) => migration.fileName === '276_component_rule_evaluation_priority_projection.sql'
  );

  assert.ok(ruleEvaluationProjectionMigration);
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /create materialized view if not exists planning_query_store\.component_engineering_rule_evaluation_projection/i
  );
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /create or replace view planning_query_store\.component_engineering_drift_query/i
  );
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /from planning_query_store\.component_engineering_rule_evaluation_projection evaluation/i
  );
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /component_engineering_rule_evaluation_projection_state_idx/i
  );
});

test('tracked migrations declare component rule evaluation projection refresh mechanization', () => {
  const migrations = readMigrationFiles();
  const ruleEvaluationProjectionMigration = migrations.find(
    (migration) =>
      migration.fileName === '277_register_component_rule_evaluation_projection_refresh_feature.sql'
  );

  assert.ok(ruleEvaluationProjectionMigration);
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625/
  );
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /refreshComponentRuleEvaluationMaterializedProjection/
  );
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /component_engineering_rule_evaluation_projection/
  );
  assert.match(
    ruleEvaluationProjectionMigration.sql,
    /276_component_rule_evaluation_priority_projection\.sql/
  );
  assert.match(ruleEvaluationProjectionMigration.sql, /scripts\/planning-db-import\.test\.cjs/);
  assert.match(ruleEvaluationProjectionMigration.sql, /scripts\/planning-db-migrate\.test\.cjs/);
  assert.doesNotMatch(
    ruleEvaluationProjectionMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations route Fowler reference reads through ownership projection', () => {
  const migrations = readMigrationFiles();
  const fowlerReferenceProjectionMigration = migrations.find(
    (migration) => migration.fileName === '279_fowler_reference_component_profile_projection.sql'
  );

  assert.ok(fowlerReferenceProjectionMigration);
  assert.match(
    fowlerReferenceProjectionMigration.sql,
    /create or replace view planning_query_store\.fowler_analysis_reference_query/i
  );
  assert.match(
    fowlerReferenceProjectionMigration.sql,
    /planning_query_store\.component_engineering_file_ownership_projection ownership/i
  );
  assert.doesNotMatch(
    fowlerReferenceProjectionMigration.sql,
    /planning_query_store\.component_engineering_file_ownership_query ownership/i
  );
});

test('tracked migrations materialize component tree for profile reads', () => {
  const migrations = readMigrationFiles();
  const componentTreeProjectionMigration = migrations.find(
    (migration) => migration.fileName === '280_component_tree_priority_projection.sql'
  );

  assert.ok(componentTreeProjectionMigration);
  assert.match(
    componentTreeProjectionMigration.sql,
    /create materialized view planning_query_store\.component_engineering_component_tree_projection/i
  );
  assert.match(
    componentTreeProjectionMigration.sql,
    /from planning_query_store\.governance_unit_query unit/i
  );
  assert.match(
    componentTreeProjectionMigration.sql,
    /create unique index if not exists component_engineering_component_tree_projection_id_idx/i
  );
  assert.match(
    componentTreeProjectionMigration.sql,
    /create or replace view planning_query_store\.component_engineering_component_tree_query/i
  );
  assert.match(
    componentTreeProjectionMigration.sql,
    /from planning_query_store\.component_engineering_component_tree_projection/
  );
});

test('tracked migrations declare component tree projection refresh mechanization', () => {
  const migrations = readMigrationFiles();
  const componentTreeRefreshMigration = migrations.find(
    (migration) =>
      migration.fileName === '281_register_component_tree_projection_refresh_feature.sql'
  );

  assert.ok(componentTreeRefreshMigration);
  assert.match(
    componentTreeRefreshMigration.sql,
    /PLANNING-DB-CODE-SYMBOL-DUPLICATE-QUERY-PERF-20260625/
  );
  assert.match(componentTreeRefreshMigration.sql, /refreshComponentTreeMaterializedProjection/);
  assert.match(
    componentTreeRefreshMigration.sql,
    /component_engineering_component_tree_projection/
  );
  assert.match(componentTreeRefreshMigration.sql, /280_component_tree_priority_projection\.sql/);
  assert.match(componentTreeRefreshMigration.sql, /scripts\/planning-db-import\.test\.cjs/);
  assert.match(componentTreeRefreshMigration.sql, /scripts\/planning-db-migrate\.test\.cjs/);
  assert.doesNotMatch(
    componentTreeRefreshMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
});

test('tracked migrations keep planned Canvas backlog components out of maturity blockers', () => {
  const migrations = readMigrationFiles();
  const canvasBacklogIntegrityMigration = migrations.find(
    (migration) => migration.fileName === '291_canvas_backlog_integrity_readiness_projection.sql'
  );

  assert.ok(canvasBacklogIntegrityMigration);
  assert.match(
    canvasBacklogIntegrityMigration.sql,
    /create or replace view planning_query_store\.component_integrity_query/i
  );
  assert.match(
    canvasBacklogIntegrityMigration.sql,
    /component\.status\s+in\s+\('approved',\s*'implemented',\s*'drift'\)/i
  );
  assert.match(
    canvasBacklogIntegrityMigration.sql,
    /local#E-CANVAS-UXDB-COMPONENT-SLICES-1#query#rendercanvasshellmainpanelframe/
  );
  assert.match(
    canvasBacklogIntegrityMigration.sql,
    /planning-db:task\/E-CANVAS-UXDB-COMPONENT-SLICES-1/
  );
  assert.match(
    canvasBacklogIntegrityMigration.sql,
    /tools\/planning-db\/migrations\/291_canvas_backlog_integrity_readiness_projection\.sql/
  );
  assert.doesNotMatch(
    canvasBacklogIntegrityMigration.sql,
    /delete\s+from\s+planning_query_store\.feature_mechanization_local_rails/i
  );
  assert.doesNotMatch(canvasBacklogIntegrityMigration.sql, /truncate\s+/i);
});

test('tracked migrations expose Canvas UX DB-first traceability review as a query', () => {
  const migrations = readMigrationFiles();
  const traceabilityMigration = migrations.find(
    (migration) => migration.fileName === '292_canvas_uxdb_traceability_review_query.sql'
  );

  assert.ok(traceabilityMigration);
  assert.match(
    traceabilityMigration.sql,
    /create or replace view planning_query_store\.canvas_uxdb_traceability_query/i
  );
  assert.match(traceabilityMigration.sql, /source_path', 'buzon\/TAREA\.TXT'/);
  assert.match(traceabilityMigration.sql, /UX-009/);
  assert.match(traceabilityMigration.sql, /DB-001/);
  assert.match(traceabilityMigration.sql, /E-CANVAS-CONTEXT-MENU-HUMAN-PROOF-1/);
  assert.match(traceabilityMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(traceabilityMigration.sql, /E-CANVAS-UXDB-SPEC-PERSISTENCE-1/);
  assert.match(traceabilityMigration.sql, /duplicate_owner_count/);
  assert.match(traceabilityMigration.sql, /coverage_state/);
  assert.doesNotMatch(traceabilityMigration.sql, /'DVT-CANVAS-UXDB-SOURCE-DIALOG-1'/);
});

test('tracked migrations persist Canvas UX specification records in the Planning DB', () => {
  const migrations = readMigrationFiles();
  const specificationMigration = migrations.find(
    (migration) => migration.fileName === '293_canvas_uxdb_specification_persistence.sql'
  );

  assert.ok(specificationMigration);
  assert.match(
    specificationMigration.sql,
    /create or replace view planning_query_store\.canvas_uxdb_specification_query/i
  );
  assert.match(specificationMigration.sql, /'graph-base'/);
  assert.match(specificationMigration.sql, /'canvas-menu\.add-source'/);
  assert.match(specificationMigration.sql, /'node-menu\.open-workbench'/);
  assert.match(specificationMigration.sql, /'node-workbench\.properties'/);
  assert.match(specificationMigration.sql, /'acceptance\.dvt-flow-e2e'/);
  assert.match(specificationMigration.sql, /'test\.context-menu-human-proof'/);
  assert.match(specificationMigration.sql, /'evidence\.tarea-intake'/);
  assert.match(specificationMigration.sql, /'export\.db-generated-manual'/);
  assert.match(specificationMigration.sql, /'React Flow'/);
  assert.match(specificationMigration.sql, /'OpenCanvasNodeWorkbench'/);
  assert.match(specificationMigration.sql, /'replaces-direct-properties-inputs-tests-actions'/);
  assert.match(specificationMigration.sql, /E-CANVAS-UXDB-SPEC-PERSISTENCE-1/);
  assert.match(specificationMigration.sql, /ListCanvasUxdbSpecification/);
  assert.doesNotMatch(specificationMigration.sql, /^\s+'node-menu\.properties',/m);
  assert.doesNotMatch(specificationMigration.sql, /^\s+'node-menu\.inputs',/m);
  assert.doesNotMatch(specificationMigration.sql, /^\s+'node-menu\.tests',/m);
});

test('tracked migrations persist the Canvas UX acceptance and test catalog in the Planning DB', () => {
  const migrations = readMigrationFiles();
  const acceptanceCatalogMigration = migrations.find(
    (migration) => migration.fileName === '294_canvas_uxdb_acceptance_catalog.sql'
  );

  assert.ok(acceptanceCatalogMigration);
  assert.match(
    acceptanceCatalogMigration.sql,
    /create table if not exists planning_query_store\.canvas_uxdb_specification_records/i
  );
  assert.match(
    acceptanceCatalogMigration.sql,
    /create or replace view planning_query_store\.canvas_uxdb_specification_query/i
  );

  for (let index = 1; index <= 16; index += 1) {
    assert.match(
      acceptanceCatalogMigration.sql,
      new RegExp(`'TEST-UX-${String(index).padStart(3, '0')}'`)
    );
  }

  for (let index = 1; index <= 10; index += 1) {
    assert.match(
      acceptanceCatalogMigration.sql,
      new RegExp(`'TEST-DB-${String(index).padStart(3, '0')}'`)
    );
  }

  for (const criterionId of [
    'ACCEPTANCE-CANVAS-PRODUCT-01',
    'ACCEPTANCE-CANVAS-PRODUCT-13',
    'ACCEPTANCE-CANVAS-IMPLEMENTATION-05',
    'ACCEPTANCE-CANVAS-VALIDATION-04',
  ]) {
    assert.match(acceptanceCatalogMigration.sql, new RegExp(`'${criterionId}'`));
  }

  assert.match(acceptanceCatalogMigration.sql, /'E-CANVAS-UXDB-ACCEPTANCE-CATALOG-1'/);
  assert.match(acceptanceCatalogMigration.sql, /'ListCanvasUxdbSpecification'/);
  assert.doesNotMatch(acceptanceCatalogMigration.sql, /feature_mechanization_local_rails/);
});

test('tracked migrations add a Canvas command-query rail drift guard', () => {
  const migrations = readMigrationFiles();
  const railDriftMigration = migrations.find(
    (migration) => migration.fileName === '295_canvas_cq_rail_drift_guard.sql'
  );

  assert.ok(railDriftMigration);
  assert.match(
    railDriftMigration.sql,
    /create or replace view planning_query_store\.canvas_cq_rail_drift_query/i
  );
  assert.match(
    railDriftMigration.sql,
    /from planning_query_store\.canvas_uxdb_specification_query/i
  );
  assert.match(railDriftMigration.sql, /planning_query_store\.command_query_rail_query/i);
  assert.match(railDriftMigration.sql, /OpenCanvasAddSourceDialog/);
  assert.match(railDriftMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(railDriftMigration.sql, /OpenCanvasNodeWorkbench/);
  assert.match(railDriftMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(railDriftMigration.sql, /PreviewCanvasExecutionPlan/);
  assert.match(railDriftMigration.sql, /PreviewExecutionPlan/);
  assert.match(railDriftMigration.sql, /OpenCanvasSqlContextWorkbench/);
  assert.match(railDriftMigration.sql, /ResolveCanvasWorkbenchContext/);
  assert.match(railDriftMigration.sql, /legacy_alias/);
  assert.match(railDriftMigration.sql, /missing_canonical_rail/);
  assert.match(railDriftMigration.sql, /E-CANVAS-CQ-RAIL-DRIFT-GUARD-1/);
  assert.doesNotMatch(railDriftMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(railDriftMigration.sql, /truncate\s+/i);
});

test('tracked migrations normalize Canvas UX command-query rail vocabulary', () => {
  const migrations = readMigrationFiles();
  const normalizationMigration = migrations.find(
    (migration) => migration.fileName === '296_canvas_cq_rail_vocabulary_normalization.sql'
  );

  assert.ok(normalizationMigration);
  assert.match(
    normalizationMigration.sql,
    /create or replace view planning_query_store\.canvas_uxdb_canonical_specification_query/i
  );
  assert.match(
    normalizationMigration.sql,
    /from planning_query_store\.canvas_uxdb_specification_query/i
  );
  assert.match(normalizationMigration.sql, /OpenCanvasAddSourceDialog/);
  assert.match(normalizationMigration.sql, /OpenCanvasSourceImportDialog/);
  assert.match(normalizationMigration.sql, /OpenCanvasNodeWorkbench/);
  assert.match(normalizationMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(normalizationMigration.sql, /PreviewCanvasExecutionPlan/);
  assert.match(normalizationMigration.sql, /PreviewExecutionPlan/);
  assert.match(normalizationMigration.sql, /OpenCanvasSqlContextWorkbench/);
  assert.match(normalizationMigration.sql, /ResolveCanvasWorkbenchContext/);
  assert.match(normalizationMigration.sql, /RenderCanvasGraphBase/);
  assert.match(normalizationMigration.sql, /RenderCanvasShellChrome/);
  assert.match(normalizationMigration.sql, /OpenCanvasProjectExplorer/);
  assert.match(normalizationMigration.sql, /ExportCanvasUxdbManual/);
  assert.match(normalizationMigration.sql, /VerifyDbtCanvasFlowInBrowser/);
  assert.match(normalizationMigration.sql, /VerifyDvtCanvasFlowInBrowser/);
  assert.match(
    normalizationMigration.sql,
    /from planning_query_store\.canvas_uxdb_canonical_specification_query spec/i
  );
  assert.match(normalizationMigration.sql, /E-CANVAS-CQ-RAIL-VOCABULARY-NORMALIZE-1/);
  assert.match(normalizationMigration.sql, /componentGuides/);
  assert.match(normalizationMigration.sql, /userStories/);
  assert.match(normalizationMigration.sql, /domainObjects/);
  assert.match(normalizationMigration.sql, /fowlerSignals/);
  assert.match(normalizationMigration.sql, /architectureGuards/);
  assert.match(normalizationMigration.sql, /cypressFlows/);
  assert.match(normalizationMigration.sql, /completionGate/);
  assert.match(normalizationMigration.sql, /patchSurfaces/);
  assert.match(normalizationMigration.sql, /cypressCoverage/);
  assert.doesNotMatch(normalizationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(normalizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire legacy Canvas execution preview rail aliases from frontend inventory', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '339_canvas_frontend_execution_preview_rail_alias_retirement.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /frontend_component_cq_rails/i);
  assert.match(migration.sql, /command_query_rails/i);
  assert.match(migration.sql, /PreviewExecutablePlan/);
  assert.match(migration.sql, /PreviewExecutionPlan/);
  assert.match(migration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(migration.sql, /E-CANVAS-UX-DBFIRST-MAP-1/);
  assert.match(migration.sql, /legacyRailName/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations retire protected runtime execution preview rail alias from active rails', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '340_preview_execution_plan_protected_rail_alias_retirement.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /command_query_rails/i);
  assert.match(migration.sql, /feature_mechanization_local_rails/i);
  assert.match(migration.sql, /PreviewExecutablePlan/);
  assert.match(migration.sql, /previewexecutableplan/);
  assert.match(migration.sql, /PreviewExecutionPlan/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations persist the professional Canvas UX reference catalog', () => {
  const migrations = readMigrationFiles();
  const referenceCatalogMigration = migrations.find(
    (migration) => migration.fileName === '309_canvas_uxdb_professional_reference_catalog.sql'
  );

  assert.ok(referenceCatalogMigration);
  assert.match(referenceCatalogMigration.sql, /E-CANVAS-UXDB-REFERENCE-CATALOG-1/);
  assert.match(referenceCatalogMigration.sql, /CANVAS-UXDB-PROFESSIONAL-REFERENCE-CATALOG/);
  assert.match(referenceCatalogMigration.sql, /canvas_uxdb_specification_records/);

  for (const ruleId of ['UX-001', 'UX-015', 'DB-001', 'DB-010']) {
    assert.match(referenceCatalogMigration.sql, new RegExp(`'${ruleId}'`));
  }

  for (const componentId of [
    'component.edge-context-menu',
    'component.port-context-menu',
    'component.command-palette',
    'component.global-menu-bar',
    'component.run-status-indicator',
  ]) {
    assert.match(referenceCatalogMigration.sql, new RegExp(`'${componentId}'`));
  }

  for (const railSpecId of [
    'command.open-canvas-context-menu',
    'command.open-node-context-menu',
    'command.preview-execution-plan',
    'query.get-canvas-context-menu-items',
    'query.get-node-workbench-tabs',
    'query.get-available-sources',
  ]) {
    assert.match(referenceCatalogMigration.sql, new RegExp(`'${railSpecId}'`));
  }

  for (const referenceId of [
    'reference.comfyui',
    'reference.unreal-blueprints',
    'reference.kestra',
    'reference.dbt-cloud-ide',
    'reference.datahub',
    'reference.jetbrains',
    'reference.github-actions',
    'reference.raycast',
    'reference.linear',
  ]) {
    assert.match(referenceCatalogMigration.sql, new RegExp(`'${referenceId}'`));
  }

  assert.match(referenceCatalogMigration.sql, /'manual-export.canvas-uxdb'/);
  assert.match(referenceCatalogMigration.sql, /ListCanvasUxdbProfessionalReferenceCatalog/);
  assert.match(referenceCatalogMigration.sql, /feature_mechanization_local_rails/);
  assert.match(referenceCatalogMigration.sql, /'cypressFlows'/);
  assert.match(referenceCatalogMigration.sql, /'fowlerSignals'/);
  assert.match(referenceCatalogMigration.sql, /'cypressCoverage'/);
  assert.doesNotMatch(referenceCatalogMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(referenceCatalogMigration.sql, /truncate\s+/i);
});

test('tracked migrations register the Canvas viewport component slice boundaries', () => {
  const migrations = readMigrationFiles();
  const viewportSliceMigration = migrations.find(
    (migration) => migration.fileName === '297_canvas_viewport_component_slice_boundaries.sql'
  );

  assert.ok(viewportSliceMigration);
  assert.match(viewportSliceMigration.sql, /E-CANVAS-UXDB-COMPONENT-SLICES-1/);
  assert.match(viewportSliceMigration.sql, /CANVAS-VIEWPORT-COMPONENT-SLICE-20260626/);
  assert.match(viewportSliceMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(viewportSliceMigration.sql, /CanvasViewportSurfaceView\.tsx/);
  assert.match(viewportSliceMigration.sql, /canvasViewportStyle\.ts/);
  assert.match(viewportSliceMigration.sql, /useCanvasViewportLifecycle\.ts/);
  assert.match(viewportSliceMigration.sql, /CanvasViewport\.architecture\.test\.ts/);
  assert.match(viewportSliceMigration.sql, /RenderCanvasContextualGraphSurface/);
  assert.match(viewportSliceMigration.sql, /GetCanvasLayout/);
  assert.match(viewportSliceMigration.sql, /CanvasViewportSurfaceView#CanvasViewportSurfaceView/);
  assert.match(viewportSliceMigration.sql, /canvasViewportStyle#resolveCanvasViewportStyle/);
  assert.match(viewportSliceMigration.sql, /useCanvasViewportLifecycle#useCanvasViewportLifecycle/);
  assert.match(viewportSliceMigration.sql, /componentGuides/);
  assert.match(viewportSliceMigration.sql, /allowedImplementationSurfaces/);
  assert.match(viewportSliceMigration.sql, /architectureGuards/);
  assert.match(viewportSliceMigration.sql, /completionGate/);
  assert.doesNotMatch(viewportSliceMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(viewportSliceMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node workbench strategy sections', () => {
  const migrations = readMigrationFiles();
  const nodeWorkbenchStrategyMigration = migrations.find(
    (migration) => migration.fileName === '298_canvas_node_workbench_strategy_sections.sql'
  );

  assert.ok(nodeWorkbenchStrategyMigration);
  assert.match(nodeWorkbenchStrategyMigration.sql, /E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1/);
  assert.match(
    nodeWorkbenchStrategyMigration.sql,
    /CANVAS-NODE-WORKBENCH-STRATEGY-SECTIONS-20260626/
  );
  assert.match(nodeWorkbenchStrategyMigration.sql, /web\.component\.canvas\.CanvasSurfaceStrategy/);
  assert.match(
    nodeWorkbenchStrategyMigration.sql,
    /web\.component\.canvas\.CanvasNodeWorkbenchPanel/
  );
  assert.match(nodeWorkbenchStrategyMigration.sql, /web\.component\.canvas\.NodeWorkbench/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /canvasNodeWorkbenchSectionStrategy\.ts/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /resolveNodeWorkbenchPrimarySectionIds/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /CanvasNodeWorkbenchOverlay\.tsx/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /NodePropertiesTabs\.tsx/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /ResolveCanvasSurfaceStrategy/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /strategy_pattern/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /componentGuides/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /allowedImplementationSurfaces/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /architectureGuards/);
  assert.match(nodeWorkbenchStrategyMigration.sql, /completionGate/);
  assert.doesNotMatch(nodeWorkbenchStrategyMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(nodeWorkbenchStrategyMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node workbench section authoring', () => {
  const migrations = readMigrationFiles();
  const nodeWorkbenchSectionAuthoringMigration = migrations.find(
    (migration) => migration.fileName === '334_canvas_node_workbench_section_authoring.sql'
  );

  assert.ok(nodeWorkbenchSectionAuthoringMigration);
  assert.match(
    nodeWorkbenchSectionAuthoringMigration.sql,
    /CANVAS-NODE-WORKBENCH-SECTION-AUTHORING-20260626/
  );
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /E-CANVAS-NODE-WORKBENCH-1/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /NodePropertiesTabs\.tsx/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /CanvasInspectorAuthoringSection\.tsx/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /DvtAuthoringFields\.tsx/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /DvtSqlTransformAuthoringSection\.tsx/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /useCanvasContextMenuPresenter\.ts/);
  assert.match(
    nodeWorkbenchSectionAuthoringMigration.sql,
    /CanvasViewport\.contextMenu\.test\.tsx/
  );
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /sectionChildren/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /feature_mechanization_local_rails/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /allowedImplementationSurfaces/);
  assert.match(nodeWorkbenchSectionAuthoringMigration.sql, /redGreenCycles/);
  assert.doesNotMatch(nodeWorkbenchSectionAuthoringMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas component registry drift guard', () => {
  const migrations = readMigrationFiles();
  const registryDriftMigration = migrations.find(
    (migration) => migration.fileName === '299_canvas_component_registry_drift_guard.sql'
  );

  assert.ok(registryDriftMigration);
  assert.match(registryDriftMigration.sql, /E-CANVAS-COMPONENT-REGISTRY-DRIFT-1/);
  assert.match(registryDriftMigration.sql, /CANVAS-COMPONENT-REGISTRY-DRIFT-GUARD-20260626/);
  assert.match(
    registryDriftMigration.sql,
    /create or replace view planning_query_store\.canvas_component_registry_drift_query/
  );
  assert.match(registryDriftMigration.sql, /frontend_component_file_query/);
  assert.match(registryDriftMigration.sql, /governance_file_query/);
  assert.match(registryDriftMigration.sql, /unmapped_canvas_component_file/);
  assert.match(registryDriftMigration.sql, /duplicate_canvas_component_file_owner/);
  assert.match(registryDriftMigration.sql, /legacy_canvas_palette_surface/);
  assert.match(registryDriftMigration.sql, /ListCanvasComponentRegistryDrift/);
  assert.match(registryDriftMigration.sql, /canvas-component-registry-drift-query\.cjs/);
  assert.match(registryDriftMigration.sql, /componentGuides/);
  assert.match(registryDriftMigration.sql, /allowedImplementationSurfaces/);
  assert.match(registryDriftMigration.sql, /architectureGuards/);
  assert.match(registryDriftMigration.sql, /completionGate/);
  assert.doesNotMatch(registryDriftMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(registryDriftMigration.sql, /truncate\s+/i);
});

test('tracked migrations focus Canvas component registry drift on UI surfaces', () => {
  const migrations = readMigrationFiles();
  const registryDriftFocusMigration = migrations.find(
    (migration) => migration.fileName === '300_canvas_component_registry_drift_focus.sql'
  );

  assert.ok(registryDriftFocusMigration);
  assert.match(registryDriftFocusMigration.sql, /E-CANVAS-COMPONENT-REGISTRY-DRIFT-1/);
  assert.match(
    registryDriftFocusMigration.sql,
    /create or replace view planning_query_store\.canvas_component_registry_drift_query/
  );
  assert.match(registryDriftFocusMigration.sql, /canvas_component_registry_ui_surface_paths/);
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasShellMainPanel\.tsx/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuLayer\.tsx/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuPrimitives\.tsx/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuView\.tsx/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/useCanvasContextMenuPresenter\.ts/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeContextMenuView\.tsx/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasAddNodePalette\.tsx/
  );
  assert.match(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasPalette\.ts/
  );
  assert.match(registryDriftFocusMigration.sql, /web\.component\.canvas\.CanvasShellChrome/);
  assert.match(registryDriftFocusMigration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(
    registryDriftFocusMigration.sql,
    /web\.component\.canvas\.CanvasContextMenuPresenter/
  );
  assert.match(registryDriftFocusMigration.sql, /web\.component\.canvas\.CanvasNodeContextMenu/);
  assert.match(registryDriftFocusMigration.sql, /web\.component\.canvas\.LegacyCanvasPalette/);
  assert.doesNotMatch(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasDraftRepository\.ts/
  );
  assert.doesNotMatch(
    registryDriftFocusMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasDraftSessionMachine\.ts/
  );
  assert.doesNotMatch(registryDriftFocusMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(registryDriftFocusMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Canvas component registry ownership backlog', () => {
  const migrations = readMigrationFiles();
  const registryOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '301_canvas_component_registry_ownership_reconcile.sql'
  );

  assert.ok(registryOwnershipMigration);
  assert.match(registryOwnershipMigration.sql, /E-CANVAS-COMPONENT-REGISTRY-DRIFT-1/);
  assert.match(registryOwnershipMigration.sql, /frontend_component_local_components/);
  assert.match(registryOwnershipMigration.sql, /frontend_component_local_files/);
  assert.match(registryOwnershipMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(registryOwnershipMigration.sql, /web\.component\.canvas\.DbtNodeCard/);
  assert.match(registryOwnershipMigration.sql, /web\.component\.canvas\.LegacyCanvasPalette/);
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeShell\.tsx/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/DbtNodeComponent\.tsx/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasPalette\.ts/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/ConnectionStep\.tsx/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasWorkspaceMenuControls\.tsx/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/DbtAuthoringFields\.tsx/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /web\.component\.canvas\.DvtSqlTransformAuthoringSection/
  );
  assert.match(
    registryOwnershipMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/DvtAuthoringFields\.tsx/
  );
  assert.doesNotMatch(registryOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port handle presentation boundary', () => {
  const migrations = readMigrationFiles();
  const portHandleMigration = migrations.find(
    (migration) => migration.fileName === '310_canvas_node_port_handle_presentation_boundary.sql'
  );

  assert.ok(portHandleMigration);
  assert.match(portHandleMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(portHandleMigration.sql, /CANVAS-NODE-PORT-HANDLE-PRESENTATION-BOUNDARY/);
  assert.match(portHandleMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(portHandleMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(
    portHandleMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodePortHandle\.tsx/
  );
  assert.match(
    portHandleMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeShell\.test\.tsx/
  );
  assert.match(portHandleMigration.sql, /EV-WEB-CANVAS-NODE-PORT-HANDLE-PRESENTATION/);
  assert.match(portHandleMigration.sql, /canvas-node-port-handle data slots/);
  assert.doesNotMatch(portHandleMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(portHandleMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Canvas node port handle feature symbols', () => {
  const migrations = readMigrationFiles();
  const portHandleSymbolsMigration = migrations.find(
    (migration) => migration.fileName === '311_canvas_node_port_handle_feature_symbols.sql'
  );

  assert.ok(portHandleSymbolsMigration);
  assert.match(portHandleSymbolsMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(portHandleSymbolsMigration.sql, /raw_manifest/);
  assert.match(portHandleSymbolsMigration.sql, /CanvasNodePortHandle/);
  assert.match(portHandleSymbolsMigration.sql, /CanvasNodePortHandleKind/);
  assert.match(portHandleSymbolsMigration.sql, /CanvasNodePortHandleProps/);
  assert.match(portHandleSymbolsMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(
    portHandleSymbolsMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodePortHandle\.tsx/
  );
  assert.doesNotMatch(portHandleSymbolsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(portHandleSymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations persist Canvas node port handle feature rail', () => {
  const migrations = readMigrationFiles();
  const portHandleFeatureRailMigration = migrations.find(
    (migration) => migration.fileName === '312_canvas_node_port_handle_feature_rail.sql'
  );

  assert.ok(portHandleFeatureRailMigration);
  assert.match(portHandleFeatureRailMigration.sql, /feature_mechanization_local_rails/);
  assert.match(portHandleFeatureRailMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(portHandleFeatureRailMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(portHandleFeatureRailMigration.sql, /CanvasNodePortHandle/);
  assert.match(portHandleFeatureRailMigration.sql, /CanvasNodePortHandleKind/);
  assert.match(portHandleFeatureRailMigration.sql, /CanvasNodePortHandleProps/);
  assert.match(portHandleFeatureRailMigration.sql, /allowedImplementationSurfaces/);
  assert.match(portHandleFeatureRailMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(portHandleFeatureRailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(portHandleFeatureRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port handle visual affordance rail', () => {
  const migrations = readMigrationFiles();
  const portHandleVisualAffordanceMigration = migrations.find(
    (migration) => migration.fileName === '380_canvas_node_port_handle_visual_affordance.sql'
  );

  assert.ok(portHandleVisualAffordanceMigration);
  assert.match(portHandleVisualAffordanceMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(portHandleVisualAffordanceMigration.sql, /CanvasNodePortTone/);
  assert.match(portHandleVisualAffordanceMigration.sql, /NODE_ROLE_PORT_TONES/);
  assert.match(portHandleVisualAffordanceMigration.sql, /CanvasNodeShell\.module\.css/);
  assert.match(portHandleVisualAffordanceMigration.sql, /EV-CANVAS-NODE-PORT-HANDLE-TONE-CONTRACT/);
  assert.match(portHandleVisualAffordanceMigration.sql, /source\/model data-tone values/);
  assert.match(
    portHandleVisualAffordanceMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.doesNotMatch(portHandleVisualAffordanceMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port handle stable id contract', () => {
  const migrations = readMigrationFiles();
  const portHandleStableIdsMigration = migrations.find(
    (migration) => migration.fileName === '393_canvas_node_port_handle_stable_ids.sql'
  );

  assert.ok(portHandleStableIdsMigration);
  assert.match(portHandleStableIdsMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(portHandleStableIdsMigration.sql, /stableHandleIdContract/);
  assert.match(portHandleStableIdsMigration.sql, /EV-CANVAS-NODE-PORT-HANDLE-STABLE-ID-CONTRACT/);
  assert.match(portHandleStableIdsMigration.sql, /target\/source data-handleid values/);
  assert.match(
    portHandleStableIdsMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeShell\.test\.tsx/
  );
  assert.doesNotMatch(portHandleStableIdsMigration.sql, /truncate\s+/i);
});

test('tracked migrations move Canvas node shell styles out of DBT component CSS', () => {
  const migrations = readMigrationFiles();
  const shellCssBoundaryMigration = migrations.find(
    (migration) => migration.fileName === '313_canvas_node_shell_css_boundary.sql'
  );

  assert.ok(shellCssBoundaryMigration);
  assert.match(shellCssBoundaryMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(
    shellCssBoundaryMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeShell\.module\.css/
  );
  assert.match(
    shellCssBoundaryMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/DbtNodeComponent\.module\.css/
  );
  assert.match(shellCssBoundaryMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(
    shellCssBoundaryMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.doesNotMatch(shellCssBoundaryMigration.sql, /truncate\s+/i);
});

test('tracked migrations align Canvas node shell files with registry drift guard', () => {
  const migrations = readMigrationFiles();
  const driftGuardAlignmentMigration = migrations.find(
    (migration) => migration.fileName === '314_canvas_node_shell_drift_guard_alignment.sql'
  );

  assert.ok(driftGuardAlignmentMigration);
  assert.match(
    driftGuardAlignmentMigration.sql,
    /create or replace view planning_query_store\.canvas_component_registry_drift_query/
  );
  assert.match(
    driftGuardAlignmentMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeShell\.module\.css/
  );
  assert.match(
    driftGuardAlignmentMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodePortHandle\.tsx/
  );
  assert.match(driftGuardAlignmentMigration.sql, /node-card-style/);
  assert.match(driftGuardAlignmentMigration.sql, /node-card-port/);
  assert.match(driftGuardAlignmentMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(driftGuardAlignmentMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(driftGuardAlignmentMigration.sql, /ListCanvasComponentRegistryDrift/);
  assert.match(driftGuardAlignmentMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(driftGuardAlignmentMigration.sql, /CanvasNodeShellDriftGuardAlignment/);
  assert.doesNotMatch(driftGuardAlignmentMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(driftGuardAlignmentMigration.sql, /truncate\s+/i);
});

test('tracked migrations align Canvas surface strategy launch policy manifest', () => {
  const migrations = readMigrationFiles();
  const launchPolicyMigration = migrations.find(
    (migration) => migration.fileName === '325_canvas_surface_strategy_launch_policy_manifest.sql'
  );

  assert.ok(launchPolicyMigration);
  assert.match(launchPolicyMigration.sql, /E-CANVAS-SURFACE-STRATEGY-DBT-DVT-1/);
  assert.match(launchPolicyMigration.sql, /ResolveCanvasSurfaceStrategy/);
  assert.match(
    launchPolicyMigration.sql,
    /apps\/web\/src\/app\/plugins\/canvasSurfaceStrategyContracts\.ts/
  );
  assert.match(
    launchPolicyMigration.sql,
    /apps\/web\/src\/app\/plugins\/dbt\/dbtCanvasSurfaceStrategy\.ts/
  );
  assert.match(
    launchPolicyMigration.sql,
    /apps\/web\/src\/app\/plugins\/dvt\/dvtCanvasSurfaceStrategy\.ts/
  );
  assert.match(
    launchPolicyMigration.sql,
    /apps\/web\/src\/app\/plugins\/graphStrategyRegistry\.test\.ts/
  );
  assert.match(launchPolicyMigration.sql, /allowedImplementationSurfaces/);
  assert.match(launchPolicyMigration.sql, /implementationRefs/);
  assert.match(launchPolicyMigration.sql, /architectureGuards/);
  assert.doesNotMatch(launchPolicyMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(launchPolicyMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DBT authoring fields as an effective Canvas component', () => {
  const migrations = readMigrationFiles();
  const dbtAuthoringMigration = migrations.find(
    (migration) => migration.fileName === '302_register_dbt_authoring_fields_component.sql'
  );

  assert.ok(dbtAuthoringMigration);
  assert.match(dbtAuthoringMigration.sql, /frontend_component_local_components/);
  assert.match(dbtAuthoringMigration.sql, /web\.component\.canvas\.DbtAuthoringFields/);
  assert.match(
    dbtAuthoringMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/DbtAuthoringFields\.tsx/
  );
  assert.match(dbtAuthoringMigration.sql, /ConfigureCanvasDbtNode/);
  assert.match(dbtAuthoringMigration.sql, /E-CANVAS-COMPONENT-REGISTRY-DRIFT-1/);
  assert.doesNotMatch(dbtAuthoringMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(dbtAuthoringMigration.sql, /truncate\s+/i);
});

test('tracked migrations classify visual Canvas palette tokens outside legacy add-node palette retirement', () => {
  const migrations = readMigrationFiles();
  const paletteVocabularyMigration = migrations.find(
    (migration) => migration.fileName === '303_reclassify_canvas_visual_palette_tokens.sql'
  );

  assert.ok(paletteVocabularyMigration);
  assert.match(paletteVocabularyMigration.sql, /canvas_component_registry_drift_query/);
  assert.match(
    paletteVocabularyMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/canvasPalette\.ts/
  );
  assert.match(paletteVocabularyMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(paletteVocabularyMigration.sql, /canvas-viewport-style/);
  assert.match(paletteVocabularyMigration.sql, /E-CANVAS-LEGACY-PALETTE-RETIRE-1/);
  assert.match(paletteVocabularyMigration.sql, /CanvasAddNodePalette\.tsx/);
  assert.doesNotMatch(paletteVocabularyMigration.sql, /truncate\s+/i);
});

test('tracked migrations backfill Canvas palette feature user stories after local rail import', () => {
  const migrations = readMigrationFiles();
  const paletteUserStoriesMigration = migrations.find(
    (migration) => migration.fileName === '304_backfill_canvas_palette_feature_user_stories.sql'
  );

  assert.ok(paletteUserStoriesMigration);
  assert.match(paletteUserStoriesMigration.sql, /E-CANVAS-LEGACY-PALETTE-RETIRE-1/);
  assert.match(paletteUserStoriesMigration.sql, /userStories/);
  assert.match(paletteUserStoriesMigration.sql, /feature_mechanization_local_rails/);
  assert.match(paletteUserStoriesMigration.sql, /CanvasAddNodePalette\.tsx/);
  assert.match(paletteUserStoriesMigration.sql, /canvasPalette\.ts/);
  assert.doesNotMatch(paletteUserStoriesMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node context menu primitives in feature mechanization', () => {
  const migrations = readMigrationFiles();
  const nodeContextMenuPrimitivesMigration = migrations.find(
    (migration) =>
      migration.fileName === '305_canvas_node_context_menu_primitives_feature_manifest.sql'
  );

  assert.ok(nodeContextMenuPrimitivesMigration);
  assert.match(
    nodeContextMenuPrimitivesMigration.sql,
    /apps\/web\/src\/app\/components\/canvas\/CanvasNodeContextMenuPrimitives\.tsx/
  );
  assert.match(
    nodeContextMenuPrimitivesMigration.sql,
    /web\.component\.canvas\.CanvasNodeContextMenu/
  );
  assert.match(nodeContextMenuPrimitivesMigration.sql, /feature_mechanization_local_rails/);
  assert.match(nodeContextMenuPrimitivesMigration.sql, /DVT-CANVAS-NODE-CONTEXT-MENU-VIEW/);
  assert.match(nodeContextMenuPrimitivesMigration.sql, /CanvasNodeContextMenuActionPrimitive/);
  assert.match(nodeContextMenuPrimitivesMigration.sql, /canvasNodeContextMenuClassNames/);
  assert.match(nodeContextMenuPrimitivesMigration.sql, /legacyViewSymbolsRetired/);
  assert.match(nodeContextMenuPrimitivesMigration.sql, /NODE_CONTEXT_MENU_CONTENT_CLASS_NAME/);
  assert.doesNotMatch(nodeContextMenuPrimitivesMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(nodeContextMenuPrimitivesMigration.sql, /truncate\s+/i);
});

test('tracked migrations normalize Canvas node context menu primitive manifest version', () => {
  const migrations = readMigrationFiles();
  const primitiveManifestVersionMigration = migrations.find(
    (migration) =>
      migration.fileName ===
      '306_canvas_node_context_menu_primitives_manifest_version_normalization.sql'
  );

  assert.ok(primitiveManifestVersionMigration);
  assert.match(primitiveManifestVersionMigration.sql, /feature_mechanization_local_rails/);
  assert.match(primitiveManifestVersionMigration.sql, /raw_manifest/);
  assert.match(primitiveManifestVersionMigration.sql, /'version', 1/);
  assert.match(primitiveManifestVersionMigration.sql, /DVT-CANVAS-NODE-CONTEXT-MENU-VIEW/);
  assert.match(
    primitiveManifestVersionMigration.sql,
    /306_canvas_node_context_menu_primitives_manifest_version_normalization\.sql/
  );
  assert.doesNotMatch(primitiveManifestVersionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(primitiveManifestVersionMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire the duplicate Node Workbench inspect-properties rail', () => {
  const migrations = readMigrationFiles();
  const duplicateRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '337_retire_node_workbench_inspect_properties_duplicate.sql'
  );

  assert.ok(duplicateRetirementMigration);
  assert.match(duplicateRetirementMigration.sql, /CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604/);
  assert.match(duplicateRetirementMigration.sql, /WEB-CANVAS-NODE-WORKBENCH-PANEL-20260619/);
  assert.match(duplicateRetirementMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(duplicateRetirementMigration.sql, /rail_status = 'retired'/);
  assert.match(duplicateRetirementMigration.sql, /duplicateRetirementReason/);
  assert.match(
    duplicateRetirementMigration.sql,
    /planning:db:integrity:check must report zero exact_duplicate rail_vocabulary errors/
  );
  assert.doesNotMatch(duplicateRetirementMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(duplicateRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations model Canvas context menu ownership as relational context actions', () => {
  const migrations = readMigrationFiles();
  const contextActionCatalogMigration = migrations.find(
    (migration) => migration.fileName === '350_canvas_context_menu_context_action_catalog.sql'
  );

  assert.ok(contextActionCatalogMigration);
  assert.match(contextActionCatalogMigration.sql, /frontend_component_context_action_query/);
  assert.match(contextActionCatalogMigration.sql, /frontend_component_plugin_scope_query/);
  assert.match(contextActionCatalogMigration.sql, /frontend_component_capability_gap_query/);
  assert.match(contextActionCatalogMigration.sql, /frontend_component_validation_evidence_query/);
  assert.match(contextActionCatalogMigration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(
    contextActionCatalogMigration.sql,
    /delete from planning_query_store\.frontend_component_local_components\s+where component_id = 'web\.component\.canvas\.CanvasContextMenuHost'/
  );
  assert.doesNotMatch(
    contextActionCatalogMigration.sql,
    /md5\('web\.component\.canvas\.CanvasContextMenuHost:350:child'\)/
  );
  assert.match(
    contextActionCatalogMigration.sql,
    /web\.component\.canvas\.CanvasBackgroundContextMenu/
  );
  assert.match(contextActionCatalogMigration.sql, /web\.component\.canvas\.CanvasEdgeContextMenu/);
  assert.match(contextActionCatalogMigration.sql, /web\.component\.canvas\.CanvasNodeContextMenu/);
  assert.match(
    contextActionCatalogMigration.sql,
    /web\.component\.canvas\.CanvasSelectionContextMenu/
  );
  assert.match(contextActionCatalogMigration.sql, /canvas-background/);
  assert.match(contextActionCatalogMigration.sql, /edge/);
  assert.match(contextActionCatalogMigration.sql, /node/);
  assert.match(contextActionCatalogMigration.sql, /selection/);
  assert.match(contextActionCatalogMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(contextActionCatalogMigration.sql, /RenderCanvasContextMenu/);
  assert.match(contextActionCatalogMigration.sql, /CreateCanvasAuthoringNode/);
  assert.match(contextActionCatalogMigration.sql, /RemoveCanvasEdgeFromContext/);
  assert.match(contextActionCatalogMigration.sql, /PreviewExecutionPlan/);
  assert.match(
    contextActionCatalogMigration.sql,
    /apps\/web\/src\/app\/views\/canvas\/CanvasContextMenuView\.tsx/
  );
  assert.match(
    contextActionCatalogMigration.sql,
    /apps\/web\/cypress\/e2e\/shell\/canvas-workbench-screen-composition\.cy\.ts/
  );
  assert.doesNotMatch(contextActionCatalogMigration.sql, /truncate\s+/i);
});

test('tracked migrations overlay the imported CanvasContextMenu aggregate summary as a host component', () => {
  const migrations = readMigrationFiles();
  const hostSummaryMigration = migrations.find(
    (migration) => migration.fileName === '351_canvas_context_menu_host_summary_overlay.sql'
  );

  assert.ok(hostSummaryMigration);
  assert.match(hostSummaryMigration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(hostSummaryMigration.sql, /CanvasContextMenuHost/);
  assert.match(hostSummaryMigration.sql, /context-specific child components/);
  assert.match(hostSummaryMigration.sql, /web\.component\.canvas\.CanvasBackgroundContextMenu/);
  assert.match(hostSummaryMigration.sql, /web\.component\.canvas\.CanvasEdgeContextMenu/);
  assert.match(hostSummaryMigration.sql, /web\.component\.canvas\.CanvasNodeContextMenu/);
  assert.match(hostSummaryMigration.sql, /web\.component\.canvas\.CanvasSelectionContextMenu/);
  assert.match(hostSummaryMigration.sql, /supersededSummaryListsRetired/);
  assert.match(hostSummaryMigration.sql, /plugin_scope = excluded\.plugin_scope/);
  assert.match(hostSummaryMigration.sql, /capability_gaps = excluded\.capability_gaps/);
  assert.match(hostSummaryMigration.sql, /evidence_refs = excluded\.evidence_refs/);
  assert.doesNotMatch(hostSummaryMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire superseded CanvasContextMenu aggregate ownership after context split', () => {
  const migrations = readMigrationFiles();
  const railRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '352_retire_canvas_context_menu_host_superseded_ownership.sql'
  );

  assert.ok(railRetirementMigration);
  assert.match(railRetirementMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(railRetirementMigration.sql, /frontend_component_local_files/);
  assert.match(railRetirementMigration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(railRetirementMigration.sql, /retiredForContextActionCatalog/);
  assert.match(railRetirementMigration.sql, /frontend_component_context_action_query/);
  assert.match(railRetirementMigration.sql, /CreateCanvasAuthoringNode/);
  assert.match(railRetirementMigration.sql, /ImportWarehouseSources/);
  assert.match(railRetirementMigration.sql, /RemoveCanvasEdgeFromContext/);
  assert.match(railRetirementMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(railRetirementMigration.sql, /PreviewExecutionPlan/);
  assert.match(railRetirementMigration.sql, /RenderCanvasContextMenu/);
  assert.match(railRetirementMigration.sql, /canvasInteractionCommandSurface\.ts/);
  assert.match(railRetirementMigration.sql, /canvasContextMenuViewModel\.ts/);
  assert.match(
    railRetirementMigration.sql,
    /create or replace view planning_query_store\.frontend_component_rail_query/
  );
  assert.match(
    railRetirementMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(
    railRetirementMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(railRetirementMigration.sql, /frontend_component_context_actions action/);
  assert.match(railRetirementMigration.sql, /action\.action_status <> 'retired'/);
  assert.match(
    railRetirementMigration.sql,
    /not coalesce\(\(rail\.raw_rail ->> 'retiredForContextActionCatalog'\)::boolean, false\)/
  );
  assert.match(
    railRetirementMigration.sql,
    /not coalesce\(\(file_ref\.raw_file ->> 'retiredForContextActionCatalog'\)::boolean, false\)/
  );
  assert.doesNotMatch(railRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Canvas context menu summary and canonical rails relationally', () => {
  const migrations = readMigrationFiles();
  const reconciliationMigration = migrations.find(
    (migration) => migration.fileName === '353_canvas_context_menu_relational_summary_and_rails.sql'
  );

  assert.ok(reconciliationMigration);
  assert.match(
    reconciliationMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(reconciliationMigration.sql, /frontend_component_capability_gaps gap/);
  assert.match(reconciliationMigration.sql, /frontend_component_validation_evidence evidence/);
  assert.match(
    reconciliationMigration.sql,
    /coalesce\(gap_counts\.capability_gap_count, 0\) as capability_gap_count/
  );
  assert.match(
    reconciliationMigration.sql,
    /coalesce\(validation_evidence_counts\.evidence_ref_count, 0\) as evidence_ref_count/
  );
  assert.doesNotMatch(
    reconciliationMigration.sql,
    /jsonb_array_length\(component\.capability_gaps\) as capability_gap_count/
  );
  assert.doesNotMatch(
    reconciliationMigration.sql,
    /jsonb_array_length\(component\.evidence_refs\) as evidence_ref_count/
  );
  assert.match(
    reconciliationMigration.sql,
    /create or replace view planning_query_store\.frontend_component_context_action_query/
  );
  assert.match(reconciliationMigration.sql, /canonical_rails as/);
  assert.match(reconciliationMigration.sql, /planning_query_store\.command_query_rail_query/);
  assert.match(
    reconciliationMigration.sql,
    /coalesce\(rail\.rail_kind, canonical_rail\.rail_type\) as frontend_rail_kind/
  );
  assert.match(
    reconciliationMigration.sql,
    /coalesce\(rail\.rail_status, canonical_rail\.rail_status\) as frontend_rail_status/
  );
  assert.match(reconciliationMigration.sql, /web\.component\.canvas\.CanvasEdgeContextMenu/);
  assert.match(reconciliationMigration.sql, /semantic-context-no-owned-files/);
  assert.match(reconciliationMigration.sql, /fileCountZeroIsValid/);
  assert.match(reconciliationMigration.sql, /RenderCanvasContextMenu/);
  assert.match(reconciliationMigration.sql, /CanvasContextMenuLayer/);
  assert.match(reconciliationMigration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(reconciliationMigration.sql, /truncate\s+/i);
});

test('tracked migrations constrain Canvas background context menu to root spatial actions', () => {
  const migrations = readMigrationFiles();
  const backgroundContractMigration = migrations.find(
    (migration) => migration.fileName === '354_canvas_background_context_menu_contract.sql'
  );

  assert.ok(backgroundContractMigration);
  assert.match(
    backgroundContractMigration.sql,
    /web\.component\.canvas\.CanvasBackgroundContextMenu/
  );
  assert.match(backgroundContractMigration.sql, /canvas-background/);
  assert.match(backgroundContractMigration.sql, /OpenCanvasAddNodeCatalog/);
  assert.match(backgroundContractMigration.sql, /CanvasAddNodeCatalog/);
  assert.match(backgroundContractMigration.sql, /OpenCanvasSettings/);
  assert.match(backgroundContractMigration.sql, /CanvasSettings/);
  assert.match(backgroundContractMigration.sql, /Add source/);
  assert.match(backgroundContractMigration.sql, /moved-to-add-node-catalog/);
  assert.match(backgroundContractMigration.sql, /Validate graph/);
  assert.match(backgroundContractMigration.sql, /moved-to-run-preview/);
  assert.match(backgroundContractMigration.sql, /Preview execution plan/);
  assert.match(backgroundContractMigration.sql, /backgroundRootActions/);
  assert.match(backgroundContractMigration.sql, /componentFamily/);
  assert.doesNotMatch(backgroundContractMigration.sql, /truncate\s+/i);
});

test('tracked migrations align Canvas background summary with spatial root contract', () => {
  const migrations = readMigrationFiles();
  const summaryAlignmentMigration = migrations.find(
    (migration) => migration.fileName === '355_canvas_background_context_menu_summary_alignment.sql'
  );

  assert.ok(summaryAlignmentMigration);
  assert.match(
    summaryAlignmentMigration.sql,
    /web\.component\.canvas\.CanvasBackgroundContextMenu/
  );
  assert.match(summaryAlignmentMigration.sql, /right-clicking Canvas background space/);
  assert.match(summaryAlignmentMigration.sql, /emptyCanvasOnly/);
  assert.match(summaryAlignmentMigration.sql, /backgroundRootActions/);
  assert.match(summaryAlignmentMigration.sql, /OpenCanvasAddNodeCatalog/);
  assert.match(summaryAlignmentMigration.sql, /OpenCanvasSettings/);
  assert.doesNotMatch(summaryAlignmentMigration.sql, /empty Canvas background space/);
  assert.doesNotMatch(summaryAlignmentMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas context menu presentation test ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) => migration.fileName === '356_canvas_context_menu_presentation_test_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /frontend_component_local_files/);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasContextMenu/);
  assert.match(ownershipMigration.sql, /CanvasContextMenuView\.test\.tsx/);
  assert.match(ownershipMigration.sql, /presentation-test/);
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Canvas background context menu gaps and evidence relationally', () => {
  const migrations = readMigrationFiles();
  const gapEvidenceReconcileMigration = migrations.find(
    (migration) =>
      migration.fileName === '357_canvas_background_context_menu_gap_evidence_reconcile.sql'
  );

  assert.ok(gapEvidenceReconcileMigration);
  assert.match(gapEvidenceReconcileMigration.sql, /frontend_component_capability_gaps/);
  assert.match(gapEvidenceReconcileMigration.sql, /frontend_component_validation_evidence/);
  assert.match(gapEvidenceReconcileMigration.sql, /presentation-test/);
  assert.match(gapEvidenceReconcileMigration.sql, /CanvasAddNodeCatalog/);
  assert.match(gapEvidenceReconcileMigration.sql, /CanvasSettings/);
  assert.match(gapEvidenceReconcileMigration.sql, /CANVAS-ADD-NODE-CATALOG-CATEGORIZED-SEARCH/);
  assert.match(gapEvidenceReconcileMigration.sql, /CANVAS-SETTINGS-OWNED-COMPONENT-FILES/);
  assert.match(gapEvidenceReconcileMigration.sql, /CANVAS-PREVIEW-ACTION-BELONGS-TO-RUN-PREVIEW/);
  assert.match(gapEvidenceReconcileMigration.sql, /gap_status = 'closed'/);
  assert.match(gapEvidenceReconcileMigration.sql, /CanvasContextMenuView\.test\.tsx/);
  assert.match(gapEvidenceReconcileMigration.sql, /CanvasViewport\.contextMenu\.test\.tsx/);
  assert.match(gapEvidenceReconcileMigration.sql, /gapSourceOfTruth/);
  assert.match(gapEvidenceReconcileMigration.sql, /evidenceSourceOfTruth/);
  assert.doesNotMatch(gapEvidenceReconcileMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas context menu presenter SRP split ownership', () => {
  const migrations = readMigrationFiles();
  const presenterSplitMigration = migrations.find(
    (migration) => migration.fileName === '358_canvas_context_menu_presenter_srp_split.sql'
  );

  assert.ok(presenterSplitMigration);
  assert.match(presenterSplitMigration.sql, /web\.component\.canvas\.CanvasContextMenuPresenter/);
  assert.match(presenterSplitMigration.sql, /frontend_component_local_files/);
  assert.match(presenterSplitMigration.sql, /frontend_component_validation_evidence/);
  assert.match(presenterSplitMigration.sql, /useCanvasContextMenuPresenter\.ts/);
  assert.match(presenterSplitMigration.sql, /canvasContextMenuPresenter\.types\.ts/);
  assert.match(presenterSplitMigration.sql, /useCanvasContextMenuLifecycle\.ts/);
  assert.match(presenterSplitMigration.sql, /canvasContextMenuTargetPolicy\.ts/);
  assert.match(presenterSplitMigration.sql, /responsibility_overload/);
  assert.match(presenterSplitMigration.sql, /EV-CANVAS-CONTEXT-MENU-PRESENTER-SRP-ARCHITECTURE/);
  assert.match(presenterSplitMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(presenterSplitMigration.sql, /CreateCanvasAuthoringNode/);
  assert.match(presenterSplitMigration.sql, /RemoveCanvasEdgeFromContext/);
  assert.doesNotMatch(presenterSplitMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas context menu presenter SRP feature mechanization', () => {
  const migrations = readMigrationFiles();
  const presenterManifestMigration = migrations.find(
    (migration) =>
      migration.fileName === '359_canvas_context_menu_presenter_srp_feature_manifest.sql'
  );

  assert.ok(presenterManifestMigration);
  assert.match(presenterManifestMigration.sql, /feature_mechanization_local_rails/);
  assert.match(presenterManifestMigration.sql, /CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628/);
  assert.match(presenterManifestMigration.sql, /clickPreviewExecutionPlanFromOperationalDrawer/);
  assert.match(presenterManifestMigration.sql, /buildCanvasAddNodeCatalogMenuModel/);
  assert.match(presenterManifestMigration.sql, /resolveCanvasViewportContextMenuRequest/);
  assert.match(presenterManifestMigration.sql, /userStories/);
  assert.match(presenterManifestMigration.sql, /domainObjects/);
  assert.match(presenterManifestMigration.sql, /redGreenCycles/);
  assert.match(presenterManifestMigration.sql, /unitTests/);
  assert.match(presenterManifestMigration.sql, /fowlerSignals/);
  assert.match(presenterManifestMigration.sql, /architectureGuard/);
  assert.match(presenterManifestMigration.sql, /allowedImplementationSurfaces/);
  assert.doesNotMatch(presenterManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep Canvas context menu presenter SRP manifest out of active rail vocabulary', () => {
  const migrations = readMigrationFiles();
  const presenterManifestVocabularyMigration = migrations.find(
    (migration) =>
      migration.fileName === '360_canvas_context_menu_presenter_srp_manifest_vocabulary_state.sql'
  );

  assert.ok(presenterManifestVocabularyMigration);
  assert.match(
    presenterManifestVocabularyMigration.sql,
    /CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628/
  );
  assert.match(presenterManifestVocabularyMigration.sql, /rail_status = 'retired'/);
  assert.match(presenterManifestVocabularyMigration.sql, /manifest-only-reuses-existing-rail/);
  assert.match(presenterManifestVocabularyMigration.sql, /canonicalRail/);
  assert.doesNotMatch(presenterManifestVocabularyMigration.sql, /truncate\s+/i);
});

test('tracked migrations allow Canvas context menu presenter report as governed evidence', () => {
  const migrations = readMigrationFiles();
  const presenterReportSurfaceMigration = migrations.find(
    (migration) => migration.fileName === '361_canvas_context_menu_presenter_report_surface.sql'
  );

  assert.ok(presenterReportSurfaceMigration);
  assert.match(
    presenterReportSurfaceMigration.sql,
    /CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628/
  );
  assert.match(
    presenterReportSurfaceMigration.sql,
    /2026-06-28-canvas-context-menu-presenter-informe\.md/
  );
  assert.match(presenterReportSurfaceMigration.sql, /allowedImplementationSurfaces/);
  assert.match(presenterReportSurfaceMigration.sql, /componentGuides/);
  assert.doesNotMatch(presenterReportSurfaceMigration.sql, /truncate\s+/i);
});

test('tracked migrations promote Canvas add-node catalog to owned searchable component', () => {
  const migrations = readMigrationFiles();
  const addNodeCatalogMigration = migrations.find(
    (migration) => migration.fileName === '362_canvas_add_node_catalog_component.sql'
  );

  assert.ok(addNodeCatalogMigration);
  assert.match(addNodeCatalogMigration.sql, /web\.component\.canvas\.CanvasAddNodeCatalog/);
  assert.match(addNodeCatalogMigration.sql, /component_status = 'current'/);
  assert.match(addNodeCatalogMigration.sql, /add-node-catalog/);
  assert.match(addNodeCatalogMigration.sql, /ResolveCanvasAddNodeCatalog/);
  assert.match(addNodeCatalogMigration.sql, /CreateCanvasAuthoringNode/);
  assert.match(addNodeCatalogMigration.sql, /canvasAddNodeCatalogModel\.ts/);
  assert.match(addNodeCatalogMigration.sql, /CanvasAddNodeCatalogView\.tsx/);
  assert.match(addNodeCatalogMigration.sql, /canvasAddNodeCatalogModel\.test\.ts/);
  assert.match(addNodeCatalogMigration.sql, /CanvasAddNodeCatalogView\.test\.tsx/);
  assert.match(addNodeCatalogMigration.sql, /CANVAS-ADD-NODE-CATALOG-CATEGORIZED-SEARCH/);
  assert.match(addNodeCatalogMigration.sql, /gap_status = 'closed'/);
  assert.match(addNodeCatalogMigration.sql, /EV-CANVAS-ADD-NODE-CATALOG-MODEL-INVARIANTS/);
  assert.match(addNodeCatalogMigration.sql, /EV-CANVAS-ADD-NODE-CATALOG-VIEW-PRESENTATION/);
  assert.match(addNodeCatalogMigration.sql, /filter-subset/);
  assert.match(addNodeCatalogMigration.sql, /filter-idempotence/);
  assert.match(addNodeCatalogMigration.sql, /ResolveCanvasAddNodeCatalog/);
  assert.doesNotMatch(addNodeCatalogMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas add-node catalog feature mechanization', () => {
  const migrations = readMigrationFiles();
  const addNodeCatalogManifestMigration = migrations.find(
    (migration) => migration.fileName === '363_canvas_add_node_catalog_feature_manifest.sql'
  );

  assert.ok(addNodeCatalogManifestMigration);
  assert.match(addNodeCatalogManifestMigration.sql, /feature_mechanization_local_rails/);
  assert.match(addNodeCatalogManifestMigration.sql, /CANVAS-ADD-NODE-CATALOG-20260628/);
  assert.match(addNodeCatalogManifestMigration.sql, /ResolveCanvasAddNodeCatalog/);
  assert.match(addNodeCatalogManifestMigration.sql, /allowedImplementationSurfaces/);
  assert.match(addNodeCatalogManifestMigration.sql, /CanvasAddNodeCatalogView\.tsx/);
  assert.match(addNodeCatalogManifestMigration.sql, /CanvasAddNodeCatalogView/);
  assert.match(addNodeCatalogManifestMigration.sql, /canvasAddNodeCatalogModel\.ts/);
  assert.match(addNodeCatalogManifestMigration.sql, /buildCanvasAddNodeCatalogItems/);
  assert.doesNotMatch(addNodeCatalogManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Canvas add-node catalog feature red green evidence', () => {
  const migrations = readMigrationFiles();
  const redGreenMigration = migrations.find(
    (migration) => migration.fileName === '364_canvas_add_node_catalog_red_green_cycles.sql'
  );

  assert.ok(redGreenMigration);
  assert.match(redGreenMigration.sql, /CANVAS-ADD-NODE-CATALOG-20260628/);
  assert.match(redGreenMigration.sql, /redGreenCycles/);
  assert.match(redGreenMigration.sql, /canvasAddNodeCatalogModel\.test\.ts/);
  assert.match(redGreenMigration.sql, /CanvasAddNodeCatalogView\.test\.tsx/);
  assert.match(redGreenMigration.sql, /expectedFailure/);
  assert.doesNotMatch(redGreenMigration.sql, /truncate\s+/i);
});

test('tracked migrations extend Canvas add-node catalog with i18n Cypress evidence', () => {
  const migrations = readMigrationFiles();
  const i18nCypressMigration = migrations.find(
    (migration) => migration.fileName === '365_canvas_add_node_catalog_i18n_cypress_manifest.sql'
  );

  assert.ok(i18nCypressMigration);
  assert.match(i18nCypressMigration.sql, /CANVAS-ADD-NODE-CATALOG-20260628/);
  assert.match(i18nCypressMigration.sql, /canvasExecutionSelection\.ts/);
  assert.match(i18nCypressMigration.sql, /CanvasMenuLabel/);
  assert.match(i18nCypressMigration.sql, /clickCanvasContextMenuItem/);
  assert.match(i18nCypressMigration.sql, /canvas-preview-run-authoring\.cy\.ts/);
  assert.match(i18nCypressMigration.sql, /i18n_safe_user_flow/);
  assert.doesNotMatch(i18nCypressMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card operational surface ownership', () => {
  const migrations = readMigrationFiles();
  const operationalSurfaceMigration = migrations.find(
    (migration) => migration.fileName === '377_canvas_graph_node_card_operational_surface.sql'
  );

  assert.ok(operationalSurfaceMigration);
  assert.match(operationalSurfaceMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(operationalSurfaceMigration.sql, /GraphNodeStatusChip/);
  assert.match(operationalSurfaceMigration.sql, /GraphNodeOperationalRail/);
  assert.match(operationalSurfaceMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(operationalSurfaceMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(operationalSurfaceMigration.sql, /graphNodeCardStrategyContracts\.ts/);
  assert.match(operationalSurfaceMigration.sql, /GraphNodeCardView\.tsx/);
  assert.match(operationalSurfaceMigration.sql, /dbtGraphNodeCardStrategy\.ts/);
  assert.match(operationalSurfaceMigration.sql, /dvtGraphNodeCardStrategy\.ts/);
  assert.match(operationalSurfaceMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(operationalSurfaceMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(operationalSurfaceMigration.sql, /presentationOnlyTemplate/);
  assert.match(operationalSurfaceMigration.sql, /noInventedMetrics/);
  assert.doesNotMatch(operationalSurfaceMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card presentation leaf components', () => {
  const migrations = readMigrationFiles();
  const leafComponentsMigration = migrations.find(
    (migration) =>
      migration.fileName === '378_canvas_graph_node_card_presentation_leaf_components.sql'
  );

  assert.ok(leafComponentsMigration);
  assert.match(leafComponentsMigration.sql, /GraphNodeStatusChip\.tsx/);
  assert.match(leafComponentsMigration.sql, /GraphNodeMetricRow\.tsx/);
  assert.match(leafComponentsMigration.sql, /GraphNodeTagList\.tsx/);
  assert.match(leafComponentsMigration.sql, /GraphNodeOperationalRail\.tsx/);
  assert.match(leafComponentsMigration.sql, /owned-leaf-component-files/);
  assert.match(leafComponentsMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(leafComponentsMigration.sql, /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-CLICK/);
  assert.match(leafComponentsMigration.sql, /graphNodeCardPresentationLeaves/);
  assert.doesNotMatch(leafComponentsMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node health popover ownership', () => {
  const migrations = readMigrationFiles();
  const healthPopoverMigration = migrations.find(
    (migration) => migration.fileName === '379_canvas_graph_node_health_popover.sql'
  );

  assert.ok(healthPopoverMigration);
  assert.match(healthPopoverMigration.sql, /web\.component\.canvas\.GraphNodeHealthPopover/);
  assert.match(healthPopoverMigration.sql, /GraphNodeHealthPopoverView\.tsx/);
  assert.match(healthPopoverMigration.sql, /CanvasViewport\.nodeOperationalRail\.test\.tsx/);
  assert.match(healthPopoverMigration.sql, /OpenCanvasNodeHealthPopover/);
  assert.match(healthPopoverMigration.sql, /CloseCanvasNodeHealthPopover/);
  assert.match(healthPopoverMigration.sql, /RenderCanvasNodeHealthPopover/);
  assert.match(healthPopoverMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(healthPopoverMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(healthPopoverMigration.sql, /GraphNodeOperationalDetail/);
  assert.match(healthPopoverMigration.sql, /buildGraphNodeOperationalDetail/);
  assert.match(healthPopoverMigration.sql, /noDataLookup/);
  assert.doesNotMatch(healthPopoverMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node card warning status review fix', () => {
  const migrations = readMigrationFiles();
  const warningStatusMigration = migrations.find(
    (migration) => migration.fileName === '381_graph_node_card_warning_status_review_fix.sql'
  );

  assert.ok(warningStatusMigration);
  assert.match(warningStatusMigration.sql, /EV-GRAPH-NODE-CARD-WARNING-STATUS-PRESERVED/);
  assert.match(warningStatusMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(warningStatusMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(warningStatusMigration.sql, /dab27cf21a/);
  assert.match(warningStatusMigration.sql, /warning card chip/);
  assert.doesNotMatch(warningStatusMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(warningStatusMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node card interaction hardening evidence', () => {
  const migrations = readMigrationFiles();
  const interactionHardeningMigration = migrations.find(
    (migration) => migration.fileName === '382_graph_node_card_interaction_hardening.sql'
  );

  assert.ok(interactionHardeningMigration);
  assert.match(
    interactionHardeningMigration.sql,
    /EV-CANVAS-NODE-FLOATING-TOOLBAR-HEALTH-POPOVER-EXCLUSION/
  );
  assert.match(
    interactionHardeningMigration.sql,
    /EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-NODE-REMOVAL/
  );
  assert.match(interactionHardeningMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(interactionHardeningMigration.sql, /OpenCanvasNodeHealthPopover/);
  assert.match(interactionHardeningMigration.sql, /CloseCanvasNodeHealthPopover/);
  assert.match(interactionHardeningMigration.sql, /CanvasViewport\.nodeFloatingToolbar\.test\.tsx/);
  assert.match(interactionHardeningMigration.sql, /noOrphanedNodeSurfaces/);
  assert.doesNotMatch(interactionHardeningMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(interactionHardeningMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node floating toolbar visual token ownership', () => {
  const migrations = readMigrationFiles();
  const toolbarTokenMigration = migrations.find(
    (migration) => migration.fileName === '394_canvas_node_floating_toolbar_visual_tokens.sql'
  );

  assert.ok(toolbarTokenMigration);
  assert.match(toolbarTokenMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(toolbarTokenMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(toolbarTokenMigration.sql, /canvasNodeFloatingToolbarTokens\.ts/);
  assert.match(toolbarTokenMigration.sql, /canvasNodeFloatingToolbarClasses/);
  assert.match(toolbarTokenMigration.sql, /resolveCanvasNodeFloatingToolbarActionClassName/);
  assert.match(toolbarTokenMigration.sql, /EV-CANVAS-NODE-FLOATING-TOOLBAR-TOKENIZED-VIEW/);
  assert.match(toolbarTokenMigration.sql, /data-token-scope and data-action-state/);
  assert.match(toolbarTokenMigration.sql, /CanvasNodeFloatingToolbarView\.tsx#getActionClassName/);
  assert.doesNotMatch(toolbarTokenMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node operational rail aria model ownership', () => {
  const migrations = readMigrationFiles();
  const railAriaMigration = migrations.find(
    (migration) => migration.fileName === '395_graph_node_operational_rail_aria_model.sql'
  );

  assert.ok(railAriaMigration);
  assert.match(railAriaMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(railAriaMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(railAriaMigration.sql, /GraphNodeOperationalDetail\.ariaLabel/);
  assert.match(railAriaMigration.sql, /buildGraphNodeOperationalDetail/);
  assert.match(railAriaMigration.sql, /GraphNodeOperationalRail\.tsx/);
  assert.match(railAriaMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(railAriaMigration.sql, /noHardcodedPresentationCopy/);
  assert.match(railAriaMigration.sql, /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-ARIA-MODEL/);
  assert.doesNotMatch(railAriaMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node operational rail component test evidence', () => {
  const migrations = readMigrationFiles();
  const railTestMigration = migrations.find(
    (migration) => migration.fileName === '429_graph_node_operational_rail_component_test.sql'
  );

  assert.ok(railTestMigration);
  assert.match(railTestMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(railTestMigration.sql, /GraphNodeOperationalRail\.test\.tsx/);
  assert.match(railTestMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(railTestMigration.sql, /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-COMPONENT-TEST/);
  assert.match(railTestMigration.sql, /GraphNodeOperationalRailInteractiveProps/);
  assert.match(railTestMigration.sql, /GraphNodeOperationalRailStaticProps/);
  assert.match(railTestMigration.sql, /Open source health metrics/);
  assert.match(railTestMigration.sql, /suppliedAccessibleLabel/);
  assert.match(railTestMigration.sql, /requiresSuppliedAriaLabel/);
  assert.match(railTestMigration.sql, /keyboardOpen/);
  assert.match(railTestMigration.sql, /stopPropagation/);
  assert.match(railTestMigration.sql, /frontend_component_local_files/);
  assert.match(railTestMigration.sql, /frontend_component_validation_evidence/);
  assert.doesNotMatch(railTestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(railTestMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Graph node operational rail base prop symbol', () => {
  const migrations = readMigrationFiles();
  const railBasePropsMigration = migrations.find(
    (migration) => migration.fileName === '430_graph_node_operational_rail_base_props_symbol.sql'
  );

  assert.ok(railBasePropsMigration);
  assert.match(railBasePropsMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(railBasePropsMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(railBasePropsMigration.sql, /GraphNodeOperationalRailBaseProps/);
  assert.match(
    railBasePropsMigration.sql,
    /GraphNodeOperationalRail\.tsx#GraphNodeOperationalRailBaseProps/
  );
  assert.match(railBasePropsMigration.sql, /component-test:430/);
  assert.doesNotMatch(railBasePropsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(railBasePropsMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Graph node operational rail contract prop symbols in manifest', () => {
  const migrations = readMigrationFiles();
  const railContractSymbolsMigration = migrations.find(
    (migration) =>
      migration.fileName === '431_graph_node_operational_rail_contract_manifest_symbols.sql'
  );

  assert.ok(railContractSymbolsMigration);
  assert.match(railContractSymbolsMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(railContractSymbolsMigration.sql, /raw_manifest/);
  assert.match(railContractSymbolsMigration.sql, /symbols/);
  assert.match(railContractSymbolsMigration.sql, /GraphNodeOperationalRailBaseProps/);
  assert.match(railContractSymbolsMigration.sql, /GraphNodeOperationalRailInteractiveProps/);
  assert.match(railContractSymbolsMigration.sql, /GraphNodeOperationalRailStaticProps/);
  assert.match(railContractSymbolsMigration.sql, /presentation_contract/);
  assert.match(railContractSymbolsMigration.sql, /requires_supplied_aria_label/);
  assert.doesNotMatch(railContractSymbolsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(railContractSymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Canvas graph visual surface single-grid evidence', () => {
  const migrations = readMigrationFiles();
  const singleGridMigration = migrations.find(
    (migration) => migration.fileName === '383_canvas_graph_visual_surface_grid_evidence.sql'
  );

  assert.ok(singleGridMigration);
  assert.match(singleGridMigration.sql, /EV-CANVAS-VIEWPORT-SINGLE-CSS-GRID-LAYER/);
  assert.match(singleGridMigration.sql, /RenderCanvasContextualGraphSurface/);
  assert.match(singleGridMigration.sql, /CanvasViewport\.test\.tsx/);
  assert.match(singleGridMigration.sql, /noReactFlowBackgroundLayer/);
  assert.match(singleGridMigration.sql, /--canvas-grid/);
  assert.match(singleGridMigration.sql, /GraphNodeHealthPopoverView\.test\.tsx/);
  assert.match(singleGridMigration.sql, /EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-VIEW/);
  assert.doesNotMatch(singleGridMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(singleGridMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Graph node metric row component registration', () => {
  const migrations = readMigrationFiles();
  const metricRowMigration = migrations.find(
    (migration) => migration.fileName === '384_graph_node_metric_row_component_registration.sql'
  );

  assert.ok(metricRowMigration);
  assert.match(metricRowMigration.sql, /web\.component\.canvas\.GraphNodeMetricRow/);
  assert.match(metricRowMigration.sql, /frontend_component_local_components/);
  assert.match(metricRowMigration.sql, /GraphNodeMetricRow\.tsx/);
  assert.match(metricRowMigration.sql, /EV-CANVAS-GRAPH-NODE-METRIC-ROW-PROJECTION/);
  assert.match(metricRowMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(metricRowMigration.sql, /doesNotInventMetrics/);
  assert.doesNotMatch(metricRowMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(metricRowMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node leaf component rails', () => {
  const migrations = readMigrationFiles();
  const leafRailsMigration = migrations.find(
    (migration) => migration.fileName === '428_graph_node_leaf_component_rails.sql'
  );

  assert.ok(leafRailsMigration);
  assert.match(leafRailsMigration.sql, /web\.component\.canvas\.GraphNodeStatusChip/);
  assert.match(leafRailsMigration.sql, /web\.component\.canvas\.GraphNodeTagList/);
  assert.match(leafRailsMigration.sql, /web\.component\.canvas\.GraphNodeMetricRow/);
  assert.match(leafRailsMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(leafRailsMigration.sql, /frontend_component_validation_evidence/);
  assert.match(leafRailsMigration.sql, /RenderCanvasGraphNodeStatusChip/);
  assert.match(leafRailsMigration.sql, /RenderCanvasGraphNodeTagList/);
  assert.match(leafRailsMigration.sql, /RenderCanvasGraphNodeMetricRow/);
  assert.match(leafRailsMigration.sql, /EV-CANVAS-GRAPH-NODE-STATUS-CHIP-LEAF-RAIL/);
  assert.match(leafRailsMigration.sql, /EV-CANVAS-GRAPH-NODE-TAG-LIST-LEAF-RAIL/);
  assert.match(leafRailsMigration.sql, /EV-CANVAS-GRAPH-NODE-METRIC-ROW-LEAF-RAIL/);
  assert.match(leafRailsMigration.sql, /presentationOnly/);
  assert.match(leafRailsMigration.sql, /doesNotProjectData/);
  assert.match(leafRailsMigration.sql, /doesNotHandleNodeActions/);
  assert.match(
    leafRailsMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/GraphNodeCardView\.test\.tsx/
  );
  assert.doesNotMatch(leafRailsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(leafRailsMigration.sql, /truncate\s+/i);
});

test('tracked migrations register direct Graph node leaf component tests', () => {
  const migrations = readMigrationFiles();
  const leafDirectTestsMigration = migrations.find(
    (migration) => migration.fileName === '432_graph_node_leaf_component_direct_tests.sql'
  );

  assert.ok(leafDirectTestsMigration);
  assert.match(leafDirectTestsMigration.sql, /web\.component\.canvas\.GraphNodeStatusChip/);
  assert.match(leafDirectTestsMigration.sql, /web\.component\.canvas\.GraphNodeTagList/);
  assert.match(leafDirectTestsMigration.sql, /web\.component\.canvas\.GraphNodeMetricRow/);
  assert.match(leafDirectTestsMigration.sql, /GraphNodeStatusChip\.test\.tsx/);
  assert.match(leafDirectTestsMigration.sql, /GraphNodeTagList\.test\.tsx/);
  assert.match(leafDirectTestsMigration.sql, /GraphNodeMetricRow\.test\.tsx/);
  assert.match(leafDirectTestsMigration.sql, /RenderCanvasGraphNodeStatusChip/);
  assert.match(leafDirectTestsMigration.sql, /RenderCanvasGraphNodeTagList/);
  assert.match(leafDirectTestsMigration.sql, /RenderCanvasGraphNodeMetricRow/);
  assert.match(leafDirectTestsMigration.sql, /EV-CANVAS-GRAPH-NODE-STATUS-CHIP-DIRECT-TEST/);
  assert.match(leafDirectTestsMigration.sql, /EV-CANVAS-GRAPH-NODE-TAG-LIST-DIRECT-TEST/);
  assert.match(leafDirectTestsMigration.sql, /EV-CANVAS-GRAPH-NODE-METRIC-ROW-DIRECT-TEST/);
  assert.match(leafDirectTestsMigration.sql, /doesNotDeriveCardState/);
  assert.match(leafDirectTestsMigration.sql, /doesNotChooseTagsFromMetadata/);
  assert.match(leafDirectTestsMigration.sql, /doesNotInventMetrics/);
  assert.match(leafDirectTestsMigration.sql, /frontend_component_local_files/);
  assert.match(leafDirectTestsMigration.sql, /frontend_component_validation_evidence/);
  assert.doesNotMatch(leafDirectTestsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(leafDirectTestsMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node card single status token contract', () => {
  const migrations = readMigrationFiles();
  const statusTokenMigration = migrations.find(
    (migration) => migration.fileName === '385_graph_node_card_status_token_contract.sql'
  );

  assert.ok(statusTokenMigration);
  assert.match(statusTokenMigration.sql, /EV-CANVAS-GRAPH-NODE-CARD-SINGLE-STATUS-INDICATOR/);
  assert.match(statusTokenMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(statusTokenMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(statusTokenMigration.sql, /anonymousStatusDotRemoved/);
  assert.match(statusTokenMigration.sql, /nodeCardSelected/);
  assert.match(statusTokenMigration.sql, /nodeCardHovered/);
  assert.match(statusTokenMigration.sql, /nodeCardDimmed/);
  assert.match(statusTokenMigration.sql, /tokenizedTemplateChrome/);
  assert.match(statusTokenMigration.sql, /nodeCardHeaderActions/);
  assert.match(statusTokenMigration.sql, /columnsList/);
  assert.match(statusTokenMigration.sql, /graphVisualTokens\.ts/);
  assert.doesNotMatch(statusTokenMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(statusTokenMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node running status tone contract', () => {
  const migrations = readMigrationFiles();
  const runningStatusToneMigration = migrations.find(
    (migration) => migration.fileName === '434_graph_node_running_status_tone.sql'
  );

  assert.ok(runningStatusToneMigration);
  assert.match(runningStatusToneMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(runningStatusToneMigration.sql, /web\.component\.canvas\.GraphNodeStatusChip/);
  assert.match(runningStatusToneMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(runningStatusToneMigration.sql, /GraphNodeStatusChip\.test\.tsx/);
  assert.match(runningStatusToneMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(runningStatusToneMigration.sql, /RenderCanvasGraphNodeStatusChip/);
  assert.match(runningStatusToneMigration.sql, /EV-CANVAS-GRAPH-NODE-RUNNING-STATUS-TONE/);
  assert.match(runningStatusToneMigration.sql, /EV-CANVAS-GRAPH-NODE-STATUS-CHIP-RUNNING-TONE/);
  assert.match(runningStatusToneMigration.sql, /doesNotDowngradeRunningToInfo/);
  assert.match(runningStatusToneMigration.sql, /doesNotUseGenericInfoForRunning/);
  assert.match(runningStatusToneMigration.sql, /frontend_component_validation_evidence/);
  assert.doesNotMatch(runningStatusToneMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(runningStatusToneMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Graph node health popover host ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '386_graph_node_health_popover_host_ownership_reconcile.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.GraphNodeHealthPopover/);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(ownershipMigration.sql, /CanvasViewport\.tsx/);
  assert.match(ownershipMigration.sql, /CanvasViewportSurfaceView\.tsx/);
  assert.match(ownershipMigration.sql, /file_role in \('host-state', 'host-render'\)/);
  assert.match(
    ownershipMigration.sql,
    /EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-HOST-OWNERSHIP-RECONCILED/
  );
  assert.match(ownershipMigration.sql, /canvas-component-registry-drift/);
  assert.match(ownershipMigration.sql, /duplicateFileOwnershipRemoved/);
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node health popover outside dismiss evidence', () => {
  const migrations = readMigrationFiles();
  const outsideDismissMigration = migrations.find(
    (migration) => migration.fileName === '425_graph_node_health_popover_outside_dismiss.sql'
  );

  assert.ok(outsideDismissMigration);
  assert.match(outsideDismissMigration.sql, /web\.component\.canvas\.GraphNodeHealthPopover/);
  assert.match(outsideDismissMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(outsideDismissMigration.sql, /CloseCanvasNodeHealthPopover/);
  assert.match(outsideDismissMigration.sql, /EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-OUTSIDE-DISMISS/);
  assert.match(outsideDismissMigration.sql, /outsidePointerDismissal/);
  assert.match(outsideDismissMigration.sql, /CanvasViewport\.nodeOperationalRail\.test\.tsx/);
  assert.match(outsideDismissMigration.sql, /leafPresentationOwnershipUnchanged/);
  assert.doesNotMatch(outsideDismissMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(outsideDismissMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port handle component ownership', () => {
  const migrations = readMigrationFiles();
  const portHandleOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '426_canvas_node_port_handle_component_ownership.sql'
  );

  assert.ok(portHandleOwnershipMigration);
  assert.match(portHandleOwnershipMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(portHandleOwnershipMigration.sql, /frontend_component_local_components/);
  assert.match(portHandleOwnershipMigration.sql, /frontend_component_local_files/);
  assert.match(portHandleOwnershipMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(portHandleOwnershipMigration.sql, /frontend_component_validation_evidence/);
  assert.match(portHandleOwnershipMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(portHandleOwnershipMigration.sql, /CanvasNodePortHandle\.tsx/);
  assert.match(portHandleOwnershipMigration.sql, /CanvasNodeShell\.module\.css/);
  assert.match(portHandleOwnershipMigration.sql, /CanvasNodeShell\.test\.tsx/);
  assert.match(portHandleOwnershipMigration.sql, /CanvasNodeShell consumes CanvasNodePortHandle/);
  assert.match(portHandleOwnershipMigration.sql, /EV-CANVAS-NODE-PORT-HANDLE-COMPONENT-OWNERSHIP/);
  assert.match(portHandleOwnershipMigration.sql, /presentationOnly/);
  assert.match(portHandleOwnershipMigration.sql, /doesNotOwnEdgeAdmission/);
  assert.match(portHandleOwnershipMigration.sql, /AuthorCanvasGraphEdge/);
  assert.doesNotMatch(portHandleOwnershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(portHandleOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port handle direct test evidence', () => {
  const migrations = readMigrationFiles();
  const portHandleDirectTestMigration = migrations.find(
    (migration) => migration.fileName === '433_canvas_node_port_handle_direct_test.sql'
  );

  assert.ok(portHandleDirectTestMigration);
  assert.match(portHandleDirectTestMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(portHandleDirectTestMigration.sql, /CanvasNodePortHandle\.test\.tsx/);
  assert.match(portHandleDirectTestMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(portHandleDirectTestMigration.sql, /EV-CANVAS-NODE-PORT-HANDLE-DIRECT-TEST/);
  assert.match(portHandleDirectTestMigration.sql, /stableHandleId/);
  assert.match(portHandleDirectTestMigration.sql, /callerOwnedAccessibleCopy/);
  assert.match(portHandleDirectTestMigration.sql, /passiveCompatibilityHint/);
  assert.match(portHandleDirectTestMigration.sql, /doesNotAuthorEdges/);
  assert.match(portHandleDirectTestMigration.sql, /AuthorCanvasGraphEdge/);
  assert.match(portHandleDirectTestMigration.sql, /frontend_component_local_files/);
  assert.match(portHandleDirectTestMigration.sql, /frontend_component_validation_evidence/);
  assert.doesNotMatch(portHandleDirectTestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(portHandleDirectTestMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Canvas node port control tone selector', () => {
  const migrations = readMigrationFiles();
  const controlToneMigration = migrations.find(
    (migration) => migration.fileName === '441_canvas_node_port_control_tone_selector.sql'
  );

  assert.ok(controlToneMigration);
  assert.match(controlToneMigration.sql, /web\.component\.canvas\.CanvasNodeShell/);
  assert.match(controlToneMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(controlToneMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(controlToneMigration.sql, /CanvasNodeShell\.module\.css/);
  assert.match(controlToneMigration.sql, /CanvasNodeShell\.test\.tsx/);
  assert.match(controlToneMigration.sql, /EV-CANVAS-NODE-PORT-CONTROL-TONE-SELECTOR/);
  assert.match(controlToneMigration.sql, /data-tone=''control''/);
  assert.match(controlToneMigration.sql, /--canvas-node-port-control-ring/);
  assert.match(controlToneMigration.sql, /--canvas-node-port-control-fill/);
  assert.match(controlToneMigration.sql, /pnpm --filter @dvt\/web exec vitest run/);
  assert.doesNotMatch(controlToneMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(controlToneMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port compatibility visual hint', () => {
  const migrations = readMigrationFiles();
  const compatibilityHintMigration = migrations.find(
    (migration) => migration.fileName === '451_canvas_node_port_compatibility_hint.sql'
  );

  assert.ok(compatibilityHintMigration);
  assert.match(compatibilityHintMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(compatibilityHintMigration.sql, /web\.component\.canvas\.CanvasNodeShell/);
  assert.match(compatibilityHintMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(compatibilityHintMigration.sql, /CanvasNodePortHandle\.tsx/);
  assert.match(compatibilityHintMigration.sql, /CanvasNodePortHandle\.test\.tsx/);
  assert.match(compatibilityHintMigration.sql, /CanvasNodeShell\.module\.css/);
  assert.match(compatibilityHintMigration.sql, /canvas-node-port-compatibility-hint/);
  assert.match(compatibilityHintMigration.sql, /resolveCompatibilityHintText/);
  assert.match(compatibilityHintMigration.sql, /EV-CANVAS-NODE-PORT-COMPATIBILITY-HINT/);
  assert.match(compatibilityHintMigration.sql, /Orders Model/);
  assert.match(compatibilityHintMigration.sql, /Snapshot 1/);
  assert.match(compatibilityHintMigration.sql, /ariaDescribedBy/);
  assert.match(compatibilityHintMigration.sql, /doesNotOwnEdgeAdmission/);
  assert.match(compatibilityHintMigration.sql, /AuthorCanvasGraphEdge/);
  assert.doesNotMatch(compatibilityHintMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(compatibilityHintMigration.sql, /truncate\s+/i);
});

test('tracked migrations normalize Canvas node port hint symbol coverage', () => {
  const migrations = readMigrationFiles();
  const coverageMigration = migrations.find(
    (migration) => migration.fileName === '452_canvas_node_port_hint_symbol_coverage.sql'
  );

  assert.ok(coverageMigration);
  assert.match(coverageMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(coverageMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(coverageMigration.sql, /CanvasNodePortHandle\.tsx/);
  assert.match(coverageMigration.sql, /cypressCoverage/);
  assert.match(coverageMigration.sql, /not_applicable:component_test_modularization/);
  assert.match(coverageMigration.sql, /452_canvas_node_port_hint_symbol_coverage\.sql/);
  assert.doesNotMatch(coverageMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(coverageMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node port handle keyboard focus hint', () => {
  const migrations = readMigrationFiles();
  const keyboardFocusMigration = migrations.find(
    (migration) => migration.fileName === '455_canvas_node_port_handle_keyboard_focus.sql'
  );

  assert.ok(keyboardFocusMigration);
  assert.match(keyboardFocusMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(keyboardFocusMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(keyboardFocusMigration.sql, /CanvasNodePortHandle\.tsx/);
  assert.match(keyboardFocusMigration.sql, /CanvasNodePortHandle\.test\.tsx/);
  assert.match(keyboardFocusMigration.sql, /tabIndex/);
  assert.match(keyboardFocusMigration.sql, /aria-describedby/);
  assert.match(keyboardFocusMigration.sql, /doesNotOwnEdgeAdmission/);
  assert.match(keyboardFocusMigration.sql, /EV-CANVAS-NODE-PORT-HANDLE-KEYBOARD-FOCUS-HINT/);
  assert.doesNotMatch(keyboardFocusMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(keyboardFocusMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Canvas registry guard with extracted shell and port components', () => {
  const migrations = readMigrationFiles();
  const registryReconcileMigration = migrations.find(
    (migration) => migration.fileName === '442_canvas_registry_shell_port_owner_reconcile.sql'
  );

  assert.ok(registryReconcileMigration);
  assert.match(
    registryReconcileMigration.sql,
    /create or replace view planning_query_store\.canvas_component_registry_drift_query/
  );
  assert.match(registryReconcileMigration.sql, /web\.component\.canvas\.CanvasNodeShell/);
  assert.match(registryReconcileMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(registryReconcileMigration.sql, /RenderCanvasNodeShell/);
  assert.match(registryReconcileMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(registryReconcileMigration.sql, /EV-CANVAS-REGISTRY-SHELL-PORT-OWNER-RECONCILED/);
  assert.match(
    registryReconcileMigration.sql,
    /pnpm planning:db:query canvas-component-registry-drift/
  );
  assert.doesNotMatch(
    registryReconcileMigration.sql,
    /CanvasNodeShell\.module\.css',\s*'node-card-style',\s*'web\.component\.canvas\.GraphNodeCard'/
  );
  assert.doesNotMatch(
    registryReconcileMigration.sql,
    /CanvasNodePortHandle\.tsx',\s*'node-card-port',\s*'web\.component\.canvas\.GraphNodeCard'/
  );
  assert.doesNotMatch(registryReconcileMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(registryReconcileMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Canvas node shell component ownership', () => {
  const migrations = readMigrationFiles();
  const shellOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '427_canvas_node_shell_component_ownership.sql'
  );

  assert.ok(shellOwnershipMigration);
  assert.match(shellOwnershipMigration.sql, /web\.component\.canvas\.CanvasNodeShell/);
  assert.match(shellOwnershipMigration.sql, /frontend_component_local_components/);
  assert.match(shellOwnershipMigration.sql, /frontend_component_local_files/);
  assert.match(shellOwnershipMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(shellOwnershipMigration.sql, /frontend_component_validation_evidence/);
  assert.match(shellOwnershipMigration.sql, /RenderCanvasNodeShell/);
  assert.match(shellOwnershipMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(shellOwnershipMigration.sql, /ShowCanvasNodeContextMenu/);
  assert.match(shellOwnershipMigration.sql, /CanvasNodeShell\.tsx/);
  assert.match(shellOwnershipMigration.sql, /CanvasNodeShell\.module\.css/);
  assert.match(shellOwnershipMigration.sql, /CanvasNodeShell\.test\.tsx/);
  assert.match(shellOwnershipMigration.sql, /CanvasNodeShell composes CanvasNodePortHandle/);
  assert.match(shellOwnershipMigration.sql, /CanvasNodeShell delegates node menu presentation/);
  assert.match(shellOwnershipMigration.sql, /EV-CANVAS-NODE-SHELL-COMPONENT-OWNERSHIP/);
  assert.match(shellOwnershipMigration.sql, /hostTemplate/);
  assert.match(shellOwnershipMigration.sql, /doesNotOwnPortRendering/);
  assert.match(shellOwnershipMigration.sql, /doesNotOwnNodeMenuTemplate/);
  assert.match(shellOwnershipMigration.sql, /doesNotOwnEdgeAdmission/);
  assert.match(shellOwnershipMigration.sql, /AuthorCanvasGraphEdge/);
  assert.doesNotMatch(shellOwnershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(shellOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations normalize Graph node card view file roles', () => {
  const migrations = readMigrationFiles();
  const roleMigration = migrations.find(
    (migration) => migration.fileName === '387_graph_node_card_view_file_role_normalization.sql'
  );

  assert.ok(roleMigration);
  assert.match(roleMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(roleMigration.sql, /GraphNodeCardView\.tsx/);
  assert.match(roleMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(roleMigration.sql, /file_role = 'component'/);
  assert.match(roleMigration.sql, /file_role = 'test'/);
  assert.match(roleMigration.sql, /presentation-test/);
  assert.match(roleMigration.sql, /EV-CANVAS-GRAPH-NODE-CARD-VIEW-FILE-ROLES-NORMALIZED/);
  assert.doesNotMatch(roleMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Graph node card view presentation ownership', () => {
  const migrations = readMigrationFiles();
  const viewOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '420_graph_node_card_view_presentation_ownership.sql'
  );

  assert.ok(viewOwnershipMigration);
  assert.match(viewOwnershipMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(viewOwnershipMigration.sql, /frontend_component_local_components/);
  assert.match(viewOwnershipMigration.sql, /frontend_component_local_files/);
  assert.match(viewOwnershipMigration.sql, /frontend_component_validation_evidence/);
  assert.match(viewOwnershipMigration.sql, /GraphNodeCardView\.tsx/);
  assert.match(viewOwnershipMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(viewOwnershipMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(viewOwnershipMigration.sql, /GraphNodeStatusChip/);
  assert.match(viewOwnershipMigration.sql, /GraphNodeMetricRow/);
  assert.match(viewOwnershipMigration.sql, /GraphNodeTagList/);
  assert.match(viewOwnershipMigration.sql, /GraphNodeOperationalRail/);
  assert.match(viewOwnershipMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(viewOwnershipMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(
    viewOwnershipMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.doesNotMatch(viewOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep Graph node card view ownership import resistant', () => {
  const migrations = readMigrationFiles();
  const importOverlayMigration = migrations.find(
    (migration) => migration.fileName === '421_graph_node_card_view_import_overlay.sql'
  );

  assert.ok(importOverlayMigration);
  assert.match(importOverlayMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(importOverlayMigration.sql, /GraphNodeCardView\.tsx/);
  assert.match(importOverlayMigration.sql, /retiredForPresentationOwnership/);
  assert.match(
    importOverlayMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(importOverlayMigration.sql, /frontend_component_local_files local_file/);
  assert.match(importOverlayMigration.sql, /frontend_component_files imported/);
  assert.match(importOverlayMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(importOverlayMigration.sql, /GraphNodeCardView/);
  assert.doesNotMatch(importOverlayMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card play affordance posture', () => {
  const migrations = readMigrationFiles();
  const playAffordanceMigration = migrations.find(
    (migration) => migration.fileName === '445_graph_node_card_play_affordance.sql'
  );

  assert.ok(playAffordanceMigration);
  assert.match(playAffordanceMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(playAffordanceMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(playAffordanceMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(playAffordanceMigration.sql, /graph-node-card-play/);
  assert.match(playAffordanceMigration.sql, /secondary-until-hover-or-focus/);
  assert.match(playAffordanceMigration.sql, /doesNotCreateRunCommand/);
  assert.match(playAffordanceMigration.sql, /EV-CANVAS-GRAPH-NODE-CARD-PLAY-AFFORDANCE/);
  assert.match(playAffordanceMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(playAffordanceMigration.sql, /graphVisualTokens\.ts/);
  assert.doesNotMatch(playAffordanceMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(playAffordanceMigration.sql, /truncate\s+/i);
});

test('tracked migrations expose Graph node card view child composition as relations', () => {
  const migrations = readMigrationFiles();
  const compositionMigration = migrations.find(
    (migration) => migration.fileName === '472_graph_node_card_view_composition_relations.sql'
  );

  assert.ok(compositionMigration);
  assert.match(compositionMigration.sql, /architecture\.component_relation/);
  assert.match(compositionMigration.sql, /REL-GRAPH-NODE-CARD-VIEW-COMPOSES-STATUS-CHIP/);
  assert.match(compositionMigration.sql, /REL-GRAPH-NODE-CARD-VIEW-COMPOSES-METRIC-ROW/);
  assert.match(compositionMigration.sql, /REL-GRAPH-NODE-CARD-VIEW-COMPOSES-TAG-LIST/);
  assert.match(compositionMigration.sql, /REL-GRAPH-NODE-CARD-VIEW-COMPOSES-OPERATIONAL-RAIL/);
  assert.match(compositionMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(compositionMigration.sql, /web\.component\.canvas\.GraphNodeStatusChip/);
  assert.match(compositionMigration.sql, /web\.component\.canvas\.GraphNodeMetricRow/);
  assert.match(compositionMigration.sql, /web\.component\.canvas\.GraphNodeTagList/);
  assert.match(compositionMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(compositionMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(compositionMigration.sql, /architecture-relations/);
  assert.doesNotMatch(compositionMigration.sql, /maturity_score\s*=/i);
  assert.doesNotMatch(compositionMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Graph node card view component maturity evidence', () => {
  const migrations = readMigrationFiles();
  const maturityMigration = migrations.find(
    (migration) =>
      migration.fileName === '473_graph_node_card_view_composition_maturity_evidence.sql'
  );

  assert.ok(maturityMigration);
  assert.match(maturityMigration.sql, /architecture\.component_responsibility/);
  assert.match(maturityMigration.sql, /architecture\.component_test/);
  assert.match(maturityMigration.sql, /architecture\.component_observability/);
  assert.match(maturityMigration.sql, /maturity_score = null/);
  assert.match(maturityMigration.sql, /RESP-GRAPH-NODE-CARD-VIEW/);
  assert.match(maturityMigration.sql, /RESP-GRAPH-NODE-STATUS-CHIP/);
  assert.match(maturityMigration.sql, /RESP-GRAPH-NODE-METRIC-ROW/);
  assert.match(maturityMigration.sql, /RESP-GRAPH-NODE-TAG-LIST/);
  assert.match(maturityMigration.sql, /RESP-GRAPH-NODE-OPERATIONAL-RAIL/);
  assert.match(maturityMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(maturityMigration.sql, /GraphNodeStatusChip\.test\.tsx/);
  assert.match(maturityMigration.sql, /GraphNodeMetricRow\.test\.tsx/);
  assert.match(maturityMigration.sql, /GraphNodeTagList\.test\.tsx/);
  assert.match(maturityMigration.sql, /GraphNodeOperationalRail\.test\.tsx/);
  assert.match(maturityMigration.sql, /architecture-maturity/);
  assert.match(maturityMigration.sql, /component-integrity/);
  assert.match(maturityMigration.sql, /component-profile/);
  assert.doesNotMatch(maturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card node-actions launcher delegation', () => {
  const migrations = readMigrationFiles();
  const nodeActionsMigration = migrations.find(
    (migration) => migration.fileName === '474_graph_node_card_node_actions_launcher.sql'
  );

  assert.ok(nodeActionsMigration);
  assert.match(nodeActionsMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(nodeActionsMigration.sql, /graph-node-card-actions/);
  assert.match(nodeActionsMigration.sql, /MoreHorizontal/);
  assert.match(nodeActionsMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(nodeActionsMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(nodeActionsMigration.sql, /ShowCanvasNodeContextMenu/);
  assert.match(nodeActionsMigration.sql, /web\.component\.canvas\.CanvasNodeContextMenu/);
  assert.match(nodeActionsMigration.sql, /doesNotRenderParallelNodeActionMenu/);
  assert.match(nodeActionsMigration.sql, /openGovernedNodeActions/);
  assert.match(nodeActionsMigration.sql, /allowedImplementationSurfaces/);
  assert.match(nodeActionsMigration.sql, /\{symbols\}/);
  assert.match(nodeActionsMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(nodeActionsMigration.sql, /graphVisualTokens\.ts/);
  assert.doesNotMatch(
    nodeActionsMigration.sql,
    /insert into planning_query_store\.command_query_rails/i
  );
  assert.doesNotMatch(nodeActionsMigration.sql, /truncate\s+/i);
});

test('tracked migrations move Graph node card node-actions copy into the read model', () => {
  const migrations = readMigrationFiles();
  const nodeActionsCopyMigration = migrations.find(
    (migration) => migration.fileName === '498_graph_node_card_node_actions_label_read_model.sql'
  );

  assert.ok(nodeActionsCopyMigration);
  assert.match(nodeActionsCopyMigration.sql, /GraphNodeCardReadModel\.nodeActionsLabel/);
  assert.match(nodeActionsCopyMigration.sql, /graphNodeCardStrategyContracts\.ts/);
  assert.match(nodeActionsCopyMigration.sql, /defaultGraphNodeCardStrategy\.ts/);
  assert.match(nodeActionsCopyMigration.sql, /dbtGraphNodeCardStrategy\.ts/);
  assert.match(nodeActionsCopyMigration.sql, /dvtGraphNodeCardStrategy\.ts/);
  assert.match(nodeActionsCopyMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(nodeActionsCopyMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(nodeActionsCopyMigration.sql, /suppliedCopyContract/);
  assert.match(nodeActionsCopyMigration.sql, /cypressCoverage/);
  assert.match(nodeActionsCopyMigration.sql, /\{symbols\}/);
  assert.doesNotMatch(
    nodeActionsCopyMigration.sql,
    /insert into planning_query_store\.command_query_rails/i
  );
  assert.doesNotMatch(nodeActionsCopyMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card copy tokens under the render rail', () => {
  const migrations = readMigrationFiles();
  const copyTokensMigration = migrations.find(
    (migration) => migration.fileName === '499_graph_node_card_copy_tokens.sql'
  );

  assert.ok(copyTokensMigration);
  assert.match(copyTokensMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(copyTokensMigration.sql, /graphNodeCardCopyTokens\.ts/);
  assert.match(copyTokensMigration.sql, /graphNodeCardCopyTokens\.nodeActionsLabel/);
  assert.match(copyTokensMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(copyTokensMigration.sql, /sharedCopyToken/);
  assert.match(copyTokensMigration.sql, /graphNodeCardReadModel\.architecture\.test\.ts/);
  assert.match(copyTokensMigration.sql, /cypressCoverage/);
  assert.doesNotMatch(
    copyTokensMigration.sql,
    /insert into planning_query_store\.command_query_rails/i
  );
  assert.doesNotMatch(copyTokensMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(copyTokensMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node floating toolbar unavailable freeze posture', () => {
  const migrations = readMigrationFiles();
  const freezePostureMigration = migrations.find(
    (migration) => migration.fileName === '446_node_floating_toolbar_freeze_posture.sql'
  );

  assert.ok(freezePostureMigration);
  assert.match(freezePostureMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(freezePostureMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(freezePostureMigration.sql, /visibleUnavailableActions/);
  assert.match(freezePostureMigration.sql, /freeze/);
  assert.match(freezePostureMigration.sql, /Congelar/);
  assert.match(freezePostureMigration.sql, /noFreezeCommandAdded/);
  assert.match(
    freezePostureMigration.sql,
    /EV-CANVAS-NODE-FLOATING-TOOLBAR-FREEZE-UNAVAILABLE-POSTURE/
  );
  assert.match(freezePostureMigration.sql, /canvasNodeFloatingToolbarModel\.test\.ts/);
  assert.match(freezePostureMigration.sql, /CanvasViewport\.nodeFloatingToolbar\.test\.tsx/);
  assert.doesNotMatch(freezePostureMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node floating toolbar More as node context-menu launcher', () => {
  const migrations = readMigrationFiles();
  const moreLauncherMigration = migrations.find(
    (migration) => migration.fileName === '447_node_floating_toolbar_more_context_menu_launcher.sql'
  );

  assert.ok(moreLauncherMigration);
  assert.match(moreLauncherMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(moreLauncherMigration.sql, /web\.component\.canvas\.CanvasNodeContextMenu/);
  assert.match(moreLauncherMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(moreLauncherMigration.sql, /ResolveCanvasContextMenu/);
  assert.match(moreLauncherMigration.sql, /Más acciones/);
  assert.match(moreLauncherMigration.sql, /MoreHorizontal/);
  assert.match(moreLauncherMigration.sql, /doesNotOwnNodeMenuActions/);
  assert.match(
    moreLauncherMigration.sql,
    /EV-CANVAS-NODE-FLOATING-TOOLBAR-MORE-CONTEXT-MENU-LAUNCHER/
  );
  assert.match(moreLauncherMigration.sql, /canvasNodeFloatingToolbarModel\.test\.ts/);
  assert.match(moreLauncherMigration.sql, /CanvasViewport\.nodeFloatingToolbar\.test\.tsx/);
  assert.doesNotMatch(moreLauncherMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(moreLauncherMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card icon tone token dependency', () => {
  const migrations = readMigrationFiles();
  const iconToneMigration = migrations.find(
    (migration) => migration.fileName === '448_graph_node_card_icon_tone_token_dependency.sql'
  );

  assert.ok(iconToneMigration);
  assert.match(iconToneMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(iconToneMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(iconToneMigration.sql, /GraphNodeCardReadModel\.accentTone/);
  assert.match(iconToneMigration.sql, /graphNodeCardLayoutClasses\.iconTone/);
  assert.match(iconToneMigration.sql, /graph-node-card-icon/);
  assert.match(iconToneMigration.sql, /noInlineIconColor/);
  assert.match(iconToneMigration.sql, /EV-CANVAS-GRAPH-NODE-CARD-ICON-TONE-TOKEN-OWNERSHIP/);
  assert.match(iconToneMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(iconToneMigration.sql, /GraphNodeRenderer\.tsx/);
  assert.match(iconToneMigration.sql, /DbtNodeRenderer\.tsx/);
  assert.match(iconToneMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(iconToneMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(iconToneMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node card port compatibility human labels', () => {
  const migrations = readMigrationFiles();
  const compatibilityLabelMigration = migrations.find(
    (migration) => migration.fileName === '449_graph_node_card_port_compatibility_human_labels.sql'
  );

  assert.ok(compatibilityLabelMigration);
  assert.match(compatibilityLabelMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(compatibilityLabelMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(compatibilityLabelMigration.sql, /buildCanvasConnectionCompatibilityByNodeId/);
  assert.match(compatibilityLabelMigration.sql, /buildGraphNodeTitlePresentation/);
  assert.match(compatibilityLabelMigration.sql, /Orders Model/);
  assert.match(compatibilityLabelMigration.sql, /Postgres · public/);
  assert.match(compatibilityLabelMigration.sql, /AuthorCanvasGraphEdge/);
  assert.match(compatibilityLabelMigration.sql, /doesNotOwnEdgeAdmission/);
  assert.match(
    compatibilityLabelMigration.sql,
    /EV-CANVAS-GRAPH-NODE-CARD-PORT-COMPATIBILITY-HUMAN-LABELS/
  );
  assert.match(compatibilityLabelMigration.sql, /canvasConnectionCompatibilityPresenter\.test\.ts/);
  assert.doesNotMatch(compatibilityLabelMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(compatibilityLabelMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Graph node card port compatibility label helper symbol', () => {
  const migrations = readMigrationFiles();
  const compatibilityLabelSymbolMigration = migrations.find(
    (migration) => migration.fileName === '450_graph_node_card_port_compatibility_label_symbol.sql'
  );

  assert.ok(compatibilityLabelSymbolMigration);
  assert.match(compatibilityLabelSymbolMigration.sql, /resolveCompatibleNodeLabel/);
  assert.match(compatibilityLabelSymbolMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(compatibilityLabelSymbolMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(compatibilityLabelSymbolMigration.sql, /canvasConnectionCompatibilityPresenter\.ts/);
  assert.match(
    compatibilityLabelSymbolMigration.sql,
    /canvasConnectionCompatibilityPresenter\.test\.ts/
  );
  assert.match(compatibilityLabelSymbolMigration.sql, /delegates_to_graph_node_title_presenter/);
  assert.match(compatibilityLabelSymbolMigration.sql, /does_not_own_edge_admission/);
  assert.doesNotMatch(compatibilityLabelSymbolMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(compatibilityLabelSymbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations move Canvas connection compatibility ownership to edge authoring', () => {
  const migrations = readMigrationFiles();
  const compatibilityOwnershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '456_canvas_connection_compatibility_edge_authoring_ownership.sql'
  );

  assert.ok(compatibilityOwnershipMigration);
  assert.match(compatibilityOwnershipMigration.sql, /SYS-WEB-CANVAS-NODE-EDGE-AUTHORING/);
  assert.match(compatibilityOwnershipMigration.sql, /canvasConnectionCompatibilityPresenter\.ts/);
  assert.match(
    compatibilityOwnershipMigration.sql,
    /canvasConnectionCompatibilityPresenter\.test\.ts/
  );
  assert.match(compatibilityOwnershipMigration.sql, /buildCanvasConnectionCompatibilityByNodeId/);
  assert.match(compatibilityOwnershipMigration.sql, /AuthorCanvasGraphEdge/);
  assert.match(compatibilityOwnershipMigration.sql, /RenderCanvasNodePortHandle/);
  assert.match(compatibilityOwnershipMigration.sql, /retiredForEdgeAuthoringOwnership/);
  assert.match(compatibilityOwnershipMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(
    compatibilityOwnershipMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(
    compatibilityOwnershipMigration.sql,
    /not coalesce\(\(file_ref\.raw_file ->> 'retiredForEdgeAuthoringOwnership'\)::boolean, false\)/
  );
  assert.match(
    compatibilityOwnershipMigration.sql,
    /EV-CANVAS-CONNECTION-COMPATIBILITY-EDGE-AUTHORING-OWNERSHIP/
  );
  assert.doesNotMatch(compatibilityOwnershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(compatibilityOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep frontend component summaries aligned with edge authoring retirement', () => {
  const migrations = readMigrationFiles();
  const summaryRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '457_frontend_component_summary_edge_authoring_retirement.sql'
  );

  assert.ok(summaryRetirementMigration);
  assert.match(
    summaryRetirementMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(summaryRetirementMigration.sql, /file_counts as \(/);
  assert.match(
    summaryRetirementMigration.sql,
    /not coalesce\(\(file_ref\.raw_file ->> 'retiredForContextActionCatalog'\)::boolean, false\)/
  );
  assert.match(
    summaryRetirementMigration.sql,
    /not coalesce\(\(file_ref\.raw_file ->> 'retiredForPresentationOwnership'\)::boolean, false\)/
  );
  assert.match(
    summaryRetirementMigration.sql,
    /not coalesce\(\(file_ref\.raw_file ->> 'retiredForEdgeAuthoringOwnership'\)::boolean, false\)/
  );
  assert.doesNotMatch(summaryRetirementMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(summaryRetirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations split Canvas copy catalog and viewport projection out of GraphNodeCard ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '458_canvas_copy_catalog_and_viewport_projection_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasCopyCatalog/);
  assert.match(ownershipMigration.sql, /ResolveCanvasViewCopy/);
  assert.match(ownershipMigration.sql, /canvasCopyCatalog\.toolbar\.ts/);
  assert.match(ownershipMigration.sql, /canvasCopyCatalog\.execution\.es\.ts/);
  assert.match(ownershipMigration.sql, /canvasCopyFormatting\.ts/);
  assert.match(ownershipMigration.sql, /EV-CANVAS-COPY-CATALOG-OWNERSHIP/);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(ownershipMigration.sql, /canvasNodeMapper\.ts/);
  assert.match(ownershipMigration.sql, /useCanvasViewportGraphModel\.ts/);
  assert.match(ownershipMigration.sql, /RenderCanvasContextualGraphSurface/);
  assert.match(ownershipMigration.sql, /retiredForPresentationOwnership/);
  assert.match(
    ownershipMigration.sql,
    /Canvas copy is shared locale infrastructure and is not GraphNodeCard presentation ownership/
  );
  assert.match(
    ownershipMigration.sql,
    /React Flow node projection belongs to the viewport graph model, not GraphNodeCard presentation/
  );
  assert.doesNotMatch(ownershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations split shared graph visual tokens out of GraphNodeCard ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) => migration.fileName === '459_graph_visual_tokens_component_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.GraphVisualTokens/);
  assert.match(ownershipMigration.sql, /RenderCanvasGraphVisualTokens/);
  assert.match(ownershipMigration.sql, /graphVisualTokens\.ts/);
  assert.match(ownershipMigration.sql, /graphNodeCardSurfaceClasses/);
  assert.match(ownershipMigration.sql, /graphFlowPalette/);
  assert.match(ownershipMigration.sql, /EV-CANVAS-GRAPH-VISUAL-TOKENS-OWNERSHIP/);
  assert.match(ownershipMigration.sql, /retiredForPresentationOwnership/);
  assert.match(
    ownershipMigration.sql,
    /Graph visual tokens are a shared presentation token module, not GraphNodeCard behavior/
  );
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasNodePortHandle/);
  assert.match(ownershipMigration.sql, /apps\/web\/src\/styles\/theme\.css/);
  assert.match(
    ownershipMigration.sql,
    /Port design tokens belong to the port handle rendering rail, not GraphNodeCard ownership/
  );
  assert.doesNotMatch(ownershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations move DBT node architecture evidence out of GraphNodeCard ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) => migration.fileName === '460_dbt_node_card_architecture_test_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.DbtNodeCard/);
  assert.match(ownershipMigration.sql, /DbtNodeComponent\.architecture\.test\.ts/);
  assert.match(ownershipMigration.sql, /RenderDbtCanvasNodeCard/);
  assert.match(ownershipMigration.sql, /EV-CANVAS-DBT-NODE-CARD-ARCHITECTURE-OWNERSHIP/);
  assert.match(ownershipMigration.sql, /retiredForPresentationOwnership/);
  assert.match(ownershipMigration.sql, /it is not GraphNodeCard read-model ownership/);
  assert.match(
    ownershipMigration.sql,
    /counting the same file as adapter and component double-counts ownership/
  );
  assert.doesNotMatch(ownershipMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node card professional width token contract', () => {
  const migrations = readMigrationFiles();
  const widthMigration = migrations.find(
    (migration) => migration.fileName === '461_graph_node_card_professional_width_contract.sql'
  );

  assert.ok(widthMigration);
  assert.match(widthMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(widthMigration.sql, /web\.component\.canvas\.GraphVisualTokens/);
  assert.match(widthMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(widthMigration.sql, /EV-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-WIDTH/);
  assert.match(widthMigration.sql, /graphNodeCardSurfaceClasses\.root/);
  assert.match(widthMigration.sql, /w-\[24rem\]/);
  assert.match(widthMigration.sql, /min-w-\[24rem\]/);
  assert.match(widthMigration.sql, /min-w-\[220px\]/);
  assert.match(widthMigration.sql, /presentationOnly/);
  assert.doesNotMatch(widthMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(widthMigration.sql, /truncate\s+/i);
});

test('tracked migrations record CanvasViewport recorded column visibility projection', () => {
  const migrations = readMigrationFiles();
  const columnVisibilityMigration = migrations.find(
    (migration) => migration.fileName === '462_canvas_viewport_recorded_columns_visibility.sql'
  );

  assert.ok(columnVisibilityMigration);
  assert.match(columnVisibilityMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(columnVisibilityMigration.sql, /canvasNodeMapper\.ts/);
  assert.match(columnVisibilityMigration.sql, /canvasImpactOverlay\.ts/);
  assert.match(columnVisibilityMigration.sql, /useCanvasControllerReadModel\.test\.tsx/);
  assert.match(columnVisibilityMigration.sql, /useCanvasViewportGraphModel\.nodeData\.test\.tsx/);
  assert.match(columnVisibilityMigration.sql, /RenderCanvasContextualGraphSurface/);
  assert.match(
    columnVisibilityMigration.sql,
    /EV-CANVAS-VIEWPORT-RECORDED-COLUMNS-VISIBLE-WITHOUT-LINEAGE/
  );
  assert.match(columnVisibilityMigration.sql, /recordedColumnsVisibleWithoutLineageOverlay/);
  assert.match(columnVisibilityMigration.sql, /preservesRecordedColumnVisibility/);
  assert.match(columnVisibilityMigration.sql, /shouldShowColumns/);
  assert.match(columnVisibilityMigration.sql, /lineageOverlayDoesNotHideRecordedColumns/);
  assert.match(columnVisibilityMigration.sql, /E-CANVAS-UXDB-COMPONENT-SLICES-1/);
  assert.doesNotMatch(columnVisibilityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(columnVisibilityMigration.sql, /truncate\s+/i);
});

test('tracked migrations register CanvasViewport node surface lifecycle test ownership', () => {
  const migrations = readMigrationFiles();
  const lifecycleMigration = migrations.find(
    (migration) => migration.fileName === '463_canvas_viewport_node_surface_lifecycle_tests.sql'
  );

  assert.ok(lifecycleMigration);
  assert.match(lifecycleMigration.sql, /web\.component\.canvas\.CanvasViewport/);
  assert.match(
    lifecycleMigration.sql,
    /insert into planning_query_store\.frontend_component_local_components/
  );
  assert.match(lifecycleMigration.sql, /on conflict \(component_id\) do update set/);
  assert.match(lifecycleMigration.sql, /Render the graph as the permanent base surface/);
  assert.match(lifecycleMigration.sql, /CanvasViewport\.nodeFloatingToolbar\.test\.tsx/);
  assert.match(lifecycleMigration.sql, /CanvasViewport\.nodeOperationalRail\.test\.tsx/);
  assert.match(lifecycleMigration.sql, /RenderCanvasContextualGraphSurface/);
  assert.match(lifecycleMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(lifecycleMigration.sql, /web\.component\.canvas\.GraphNodeHealthPopover/);
  assert.match(lifecycleMigration.sql, /EV-CANVAS-VIEWPORT-NODE-FLOATING-TOOLBAR-LIFECYCLE/);
  assert.match(lifecycleMigration.sql, /EV-CANVAS-VIEWPORT-NODE-HEALTH-POPOVER-LIFECYCLE/);
  assert.match(lifecycleMigration.sql, /nodeSurfaceLifecycleTests/);
  assert.match(lifecycleMigration.sql, /noOrphanedNodeSurfaces/);
  assert.match(lifecycleMigration.sql, /hostOwnsLifecycle/);
  assert.match(lifecycleMigration.sql, /leafComponentsOwnPresentation/);
  assert.ok(
    lifecycleMigration.sql.indexOf(
      'insert into planning_query_store.frontend_component_local_components'
    ) <
      lifecycleMigration.sql.indexOf(
        'update planning_query_store.frontend_component_local_components'
      )
  );
  assert.doesNotMatch(lifecycleMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(lifecycleMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node source last-refresh health metric', () => {
  const migrations = readMigrationFiles();
  const sourceRefreshMigration = migrations.find(
    (migration) => migration.fileName === '422_graph_node_source_last_refresh_metric.sql'
  );

  assert.ok(sourceRefreshMigration);
  assert.match(sourceRefreshMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(sourceRefreshMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(sourceRefreshMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(sourceRefreshMigration.sql, /lastRefreshAt or lastRefresh/);
  assert.match(sourceRefreshMigration.sql, /last-refresh/);
  assert.match(sourceRefreshMigration.sql, /EV-GRAPH-NODE-OPERATIONAL-SUMMARY-SOURCE-LAST-REFRESH/);
  assert.match(sourceRefreshMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(sourceRefreshMigration.sql, /graphNodeOperationalSummary\.test\.ts/);
  assert.doesNotMatch(sourceRefreshMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node floating toolbar operable action policy', () => {
  const migrations = readMigrationFiles();
  const toolbarActionsMigration = migrations.find(
    (migration) => migration.fileName === '423_node_floating_toolbar_operable_actions.sql'
  );

  assert.ok(toolbarActionsMigration);
  assert.match(toolbarActionsMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(toolbarActionsMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(toolbarActionsMigration.sql, /onlyOperableActions/);
  assert.match(toolbarActionsMigration.sql, /omittedUntilRailExists/);
  assert.match(
    toolbarActionsMigration.sql,
    /EV-CANVAS-NODE-FLOATING-TOOLBAR-OPERABLE-ACTIONS-ONLY/
  );
  assert.match(toolbarActionsMigration.sql, /canvasNodeFloatingToolbarModel\.test\.ts/);
  assert.match(toolbarActionsMigration.sql, /CanvasViewport\.nodeFloatingToolbar\.test\.tsx/);
  assert.doesNotMatch(toolbarActionsMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node floating toolbar action id manifest', () => {
  const migrations = readMigrationFiles();
  const actionIdMigration = migrations.find(
    (migration) => migration.fileName === '424_node_floating_toolbar_action_id_manifest.sql'
  );

  assert.ok(actionIdMigration);
  assert.match(actionIdMigration.sql, /CanvasNodeFloatingToolbarActionId/);
  assert.match(actionIdMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(actionIdMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(actionIdMigration.sql, /closed_operable_action_set/);
  assert.match(actionIdMigration.sql, /canvasNodeFloatingToolbarModel\.test\.ts/);
  assert.doesNotMatch(actionIdMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node floating toolbar freeze command', () => {
  const migrations = readMigrationFiles();
  const freezeCommandMigration = migrations.find(
    (migration) => migration.fileName === '483_node_floating_toolbar_freeze_command.sql'
  );

  assert.ok(freezeCommandMigration);
  assert.match(freezeCommandMigration.sql, /web\.component\.canvas\.NodeFloatingToolbar/);
  assert.match(freezeCommandMigration.sql, /ToggleCanvasNodeFreeze/);
  assert.match(freezeCommandMigration.sql, /RenderCanvasNodeFloatingToolbar/);
  assert.match(freezeCommandMigration.sql, /freeze-node/);
  assert.match(freezeCommandMigration.sql, /implemented-local/);
  assert.match(freezeCommandMigration.sql, /workspace-local-canvas-interaction/);
  assert.match(freezeCommandMigration.sql, /frozenNodeIds/);
  assert.match(freezeCommandMigration.sql, /draggable=false/);
  assert.match(freezeCommandMigration.sql, /EV-CANVAS-NODE-FLOATING-TOOLBAR-FREEZE-COMMAND/);
  assert.match(freezeCommandMigration.sql, /canvasInteractionStore\.test\.ts/);
  assert.match(freezeCommandMigration.sql, /canvasNodeFloatingToolbarModel\.test\.ts/);
  assert.match(freezeCommandMigration.sql, /CanvasViewport\.nodeFloatingToolbar\.test\.tsx/);
  assert.match(freezeCommandMigration.sql, /useCanvasViewportGraphModel\.layout\.test\.tsx/);
  assert.doesNotMatch(freezeCommandMigration.sql, /noFreezeCommandAdded/);
  assert.doesNotMatch(freezeCommandMigration.sql, /visibleUnavailableActions/);
  assert.doesNotMatch(freezeCommandMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Node floating toolbar freeze feature symbols', () => {
  const migrations = readMigrationFiles();
  const freezeSymbolMigration = migrations.find(
    (migration) => migration.fileName === '484_node_floating_toolbar_freeze_feature_symbols.sql'
  );

  assert.ok(freezeSymbolMigration);
  assert.match(freezeSymbolMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(freezeSymbolMigration.sql, /ToggleCanvasNodeFreeze/);
  assert.match(freezeSymbolMigration.sql, /buildWorkspaceCanvasLayout/);
  assert.match(freezeSymbolMigration.sql, /toggleFrozenNodeId/);
  assert.match(freezeSymbolMigration.sql, /EMPTY_FROZEN_NODE_IDS/);
  assert.match(freezeSymbolMigration.sql, /canvasInteractionStore\.ts/);
  assert.match(freezeSymbolMigration.sql, /useCanvasStoreFacade\.ts/);
  assert.doesNotMatch(freezeSymbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations expose Node floating toolbar freeze symbols at manifest top level', () => {
  const migrations = readMigrationFiles();
  const freezeTopLevelSymbolsMigration = migrations.find(
    (migration) => migration.fileName === '485_node_floating_toolbar_freeze_top_level_symbols.sql'
  );

  assert.ok(freezeTopLevelSymbolsMigration);
  assert.match(freezeTopLevelSymbolsMigration.sql, /raw_manifest->'symbols'/);
  assert.match(freezeTopLevelSymbolsMigration.sql, /buildWorkspaceCanvasLayout/);
  assert.match(freezeTopLevelSymbolsMigration.sql, /toggleFrozenNodeId/);
  assert.match(freezeTopLevelSymbolsMigration.sql, /EMPTY_FROZEN_NODE_IDS/);
  assert.match(freezeTopLevelSymbolsMigration.sql, /ToggleCanvasNodeFreeze/);
  assert.doesNotMatch(freezeTopLevelSymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Node workbench duplicate file ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '388_node_workbench_duplicate_file_ownership_reconcile.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.NodeWorkbench/);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasNodeWorkbenchPanel/);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.CanvasSurfaceStrategy/);
  assert.match(ownershipMigration.sql, /CanvasNodeWorkbenchPanel\.tsx/);
  assert.match(ownershipMigration.sql, /canvasNodeWorkbenchSectionStrategy\.ts/);
  assert.match(ownershipMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(ownershipMigration.sql, /EV-CANVAS-NODE-WORKBENCH-DUPLICATE-OWNERSHIP-RECONCILED/);
  assert.match(ownershipMigration.sql, /canvas-component-registry-drift/);
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Node properties tabs as an owned presentation component', () => {
  const migrations = readMigrationFiles();
  const tabsMigration = migrations.find(
    (migration) => migration.fileName === '526_node_properties_tabs_component_ownership.sql'
  );

  assert.ok(tabsMigration);
  assert.match(tabsMigration.sql, /web\.component\.canvas\.NodePropertiesTabs/);
  assert.match(tabsMigration.sql, /web\.component\.canvas\.NodeWorkbench/);
  assert.match(tabsMigration.sql, /RenderNodePropertiesTabs/);
  assert.match(tabsMigration.sql, /NodePropertiesTabs\.tsx/);
  assert.match(tabsMigration.sql, /NodePropertySectionView\.tsx/);
  assert.match(tabsMigration.sql, /NodePropertiesTabs\.architecture\.test\.ts/);
  assert.match(tabsMigration.sql, /EV-CANVAS-NODE-PROPERTIES-TABS-PRESENTATION-SRP/);
  assert.match(tabsMigration.sql, /presentationOnly/);
  assert.doesNotMatch(tabsMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile imported Node properties tabs ownership', () => {
  const migrations = readMigrationFiles();
  const reconcileMigration = migrations.find(
    (migration) =>
      migration.fileName === '527_node_properties_tabs_imported_ownership_reconcile.sql'
  );

  assert.ok(reconcileMigration);
  assert.match(
    reconcileMigration.sql,
    /delete from planning_query_store\.frontend_component_files/i
  );
  assert.match(reconcileMigration.sql, /web\.component\.canvas\.NodeWorkbench/);
  assert.match(reconcileMigration.sql, /NodePropertiesTabs\.tsx/);
  assert.match(reconcileMigration.sql, /NodePropertySectionView\.tsx/);
  assert.match(
    reconcileMigration.sql,
    /EV-CANVAS-NODE-WORKBENCH-NODE-PROPERTIES-TABS-IMPORTED-OWNERSHIP-RECONCILED/
  );
  assert.doesNotMatch(reconcileMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep Node properties tabs ownership import resistant', () => {
  const migrations = readMigrationFiles();
  const importResistantMigration = migrations.find(
    (migration) => migration.fileName === '528_node_properties_tabs_import_resistant_tombstone.sql'
  );

  assert.ok(importResistantMigration);
  assert.match(
    importResistantMigration.sql,
    /insert into planning_query_store\.frontend_component_local_files/i
  );
  assert.match(importResistantMigration.sql, /web\.component\.canvas\.NodeWorkbench/);
  assert.match(importResistantMigration.sql, /NodePropertiesTabs\.tsx/);
  assert.match(importResistantMigration.sql, /NodePropertySectionView\.tsx/);
  assert.match(importResistantMigration.sql, /retiredForPresentationOwnership/);
  assert.match(
    importResistantMigration.sql,
    /EV-CANVAS-NODE-WORKBENCH-NODE-PROPERTIES-TABS-IMPORT-RESISTANT/
  );
  assert.doesNotMatch(importResistantMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire fixed inspector files after contextual NodeWorkbench ownership', () => {
  const migrations = readMigrationFiles();
  const retirementMigration = migrations.find(
    (migration) => migration.fileName === '529_node_workbench_fixed_inspector_retirement.sql'
  );

  assert.ok(retirementMigration);
  assert.match(retirementMigration.sql, /retiredForPresentationOwnership/);
  assert.match(retirementMigration.sql, /CanvasInspectorPanel\.tsx/);
  assert.match(retirementMigration.sql, /InspectorPanel\.tsx/);
  assert.match(retirementMigration.sql, /EV-CANVAS-NODE-WORKBENCH-FIXED-INSPECTOR-FILES-RETIRED/);
  assert.doesNotMatch(retirementMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile generic fixed inspector test retirement', () => {
  const migrations = readMigrationFiles();
  const reconciliationMigration = migrations.find(
    (migration) => migration.fileName === '530_node_workbench_generic_inspector_test_retirement.sql'
  );

  assert.ok(reconciliationMigration);
  assert.match(reconciliationMigration.sql, /CanvasInspectorPanel\.test\.tsx/);
  assert.match(reconciliationMigration.sql, /CanvasNodeWorkbenchPanel\.test\.tsx/);
  assert.match(reconciliationMigration.sql, /retiredForPresentationOwnership/);
  assert.match(
    reconciliationMigration.sql,
    /EV-CANVAS-NODE-WORKBENCH-GENERIC-INSPECTOR-TEST-RETIRED/
  );
  assert.doesNotMatch(reconciliationMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire fixed inspector architecture paths', () => {
  const migrations = readMigrationFiles();
  const architecturePathMigration = migrations.find(
    (migration) => migration.fileName === '531_node_workbench_architecture_path_retirement.sql'
  );

  assert.ok(architecturePathMigration);
  assert.match(architecturePathMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH/);
  assert.match(architecturePathMigration.sql, /SYS-WEB-CANVAS-INSPECTOR-PANEL/);
  assert.match(architecturePathMigration.sql, /apps\/web\/src\/app\/views\/canvas/);
  assert.match(architecturePathMigration.sql, /status = 'deprecated'/);
  assert.match(architecturePathMigration.sql, /status = 'drift'/);
  assert.match(architecturePathMigration.sql, /CanvasNodeWorkbenchPanel\.test\.tsx/);
  assert.doesNotMatch(architecturePathMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep NodeWorkbench aggregate on a unique repo path', () => {
  const migrations = readMigrationFiles();
  const aggregatePathMigration = migrations.find(
    (migration) => migration.fileName === '532_node_workbench_aggregate_repo_path.sql'
  );

  assert.ok(aggregatePathMigration);
  assert.match(aggregatePathMigration.sql, /SYS-WEB-CANVAS-NODE-WORKBENCH/);
  assert.match(
    aggregatePathMigration.sql,
    /docs\/architecture\/components\/web\/graph\/canvas-inspector-authoring-component\.md/
  );
  assert.match(aggregatePathMigration.sql, /avoid duplicate_repo_path drift/);
  assert.doesNotMatch(
    aggregatePathMigration.sql,
    /repo_path = 'apps\/web\/src\/app\/views\/canvas'/
  );
  assert.doesNotMatch(aggregatePathMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Inspector visual token ownership', () => {
  const migrations = readMigrationFiles();
  const tokenMigration = migrations.find(
    (migration) => migration.fileName === '389_inspector_visual_tokens_component_boundary.sql'
  );

  assert.ok(tokenMigration);
  assert.match(tokenMigration.sql, /web\.component\.canvas\.InspectorVisualTokens/);
  assert.match(tokenMigration.sql, /inspectorVisualTokens\.ts/);
  assert.match(tokenMigration.sql, /inspectorVisualClasses; inspectorStatusDotClasses/);
  assert.match(tokenMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(tokenMigration.sql, /EV-CANVAS-INSPECTOR-VISUAL-TOKENS-BOUNDARY/);
  assert.match(tokenMigration.sql, /graphVisualTokenConvergence\.architecture\.test\.ts/);
  assert.match(tokenMigration.sql, /doesNotCreateNewBehavior/);
  assert.doesNotMatch(tokenMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Inspector visual token feature mechanization symbols', () => {
  const migrations = readMigrationFiles();
  const symbolMigration = migrations.find(
    (migration) =>
      migration.fileName === '390_inspector_visual_tokens_feature_mechanization_symbols.sql'
  );

  assert.ok(symbolMigration);
  assert.match(symbolMigration.sql, /feature_mechanization_local_rails/);
  assert.match(symbolMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(symbolMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(symbolMigration.sql, /InspectorVisualTokens/);
  assert.match(symbolMigration.sql, /inspectorVisualClasses/);
  assert.match(symbolMigration.sql, /inspectorStatusDotClasses/);
  assert.match(
    symbolMigration.sql,
    /apps\/web\/src\/app\/components\/inspector\/inspectorVisualTokens\.ts/
  );
  assert.match(symbolMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(symbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node title presentation ownership', () => {
  const migrations = readMigrationFiles();
  const titleMigration = migrations.find(
    (migration) => migration.fileName === '391_graph_node_title_presentation.sql'
  );

  assert.ok(titleMigration);
  assert.match(titleMigration.sql, /web\.component\.canvas\.GraphNodeTitlePresentation/);
  assert.match(titleMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(titleMigration.sql, /graphNodeTitlePresentation\.ts/);
  assert.match(titleMigration.sql, /graphNodeTitlePresentation\.test\.ts/);
  assert.match(titleMigration.sql, /GraphNodeCardView\.test\.tsx/);
  assert.match(titleMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(titleMigration.sql, /GraphNodeTitlePresentationInput/);
  assert.match(titleMigration.sql, /buildGraphNodeTitlePresentation/);
  assert.match(titleMigration.sql, /titleCaseIdentifier/);
  assert.match(titleMigration.sql, /'\{symbols\}'/);
  assert.match(
    titleMigration.sql,
    /not_applicable:read_model_projection_unit_and_presentation_covered/
  );
  assert.match(titleMigration.sql, /technicalName/);
  assert.match(titleMigration.sql, /EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION/);
  assert.match(titleMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(titleMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node title presentation rail and acronym hints', () => {
  const migrations = readMigrationFiles();
  const titleRailMigration = migrations.find(
    (migration) => migration.fileName === '435_graph_node_title_presentation_rail_and_acronym.sql'
  );

  assert.ok(titleRailMigration);
  assert.match(titleRailMigration.sql, /web\.component\.canvas\.GraphNodeTitlePresentation/);
  assert.match(titleRailMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(titleRailMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(titleRailMigration.sql, /frontend_component_local_cq_rails/);
  assert.match(titleRailMigration.sql, /acronymHintPrecedence/);
  assert.match(titleRailMigration.sql, /displayIdentifier/);
  assert.match(titleRailMigration.sql, /EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-ACRONYM-HINT/);
  assert.match(titleRailMigration.sql, /graphNodeTitlePresentation\.test\.ts/);
  assert.match(titleRailMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(titleRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Graph node title presentation acronym helper symbol', () => {
  const migrations = readMigrationFiles();
  const titleSymbolMigration = migrations.find(
    (migration) =>
      migration.fileName === '436_graph_node_title_presentation_acronym_symbol_manifest.sql'
  );

  assert.ok(titleSymbolMigration);
  assert.match(titleSymbolMigration.sql, /feature_mechanization_local_rails/);
  assert.match(titleSymbolMigration.sql, /GraphNodeTitlePresentation/);
  assert.match(titleSymbolMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(titleSymbolMigration.sql, /displayIdentifier/);
  assert.match(titleSymbolMigration.sql, /acronym_hint_projection/);
  assert.match(titleSymbolMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(titleSymbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node title warehouse source identity', () => {
  const migrations = readMigrationFiles();
  const titleWarehouseSourceMigration = migrations.find(
    (migration) => migration.fileName === '453_graph_node_title_warehouse_source_identity.sql'
  );

  assert.ok(titleWarehouseSourceMigration);
  assert.match(
    titleWarehouseSourceMigration.sql,
    /web\.component\.canvas\.GraphNodeTitlePresentation/
  );
  assert.match(titleWarehouseSourceMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(titleWarehouseSourceMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(titleWarehouseSourceMigration.sql, /dvt\.warehouse-source/);
  assert.match(titleWarehouseSourceMigration.sql, /GraphNodeTitlePresentationInput\.pluginId/);
  assert.match(titleWarehouseSourceMigration.sql, /warehouseSourceRelationPrecedence/);
  assert.match(
    titleWarehouseSourceMigration.sql,
    /EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-WAREHOUSE-SOURCE-IDENTITY/
  );
  assert.match(titleWarehouseSourceMigration.sql, /dvtGraphNodeCardStrategy\.ts/);
  assert.match(titleWarehouseSourceMigration.sql, /dbtGraphNodeCardStrategy\.ts/);
  assert.match(titleWarehouseSourceMigration.sql, /defaultGraphNodeCardStrategy\.ts/);
  assert.match(titleWarehouseSourceMigration.sql, /canvasConnectionCompatibilityPresenter\.ts/);
  assert.match(titleWarehouseSourceMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(titleWarehouseSourceMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node title warehouse source connection identity', () => {
  const migrations = readMigrationFiles();
  const titleConnectionIdentityMigration = migrations.find(
    (migration) =>
      migration.fileName === '486_warehouse_source_connection_identity_title_projection.sql'
  );

  assert.ok(titleConnectionIdentityMigration);
  assert.match(
    titleConnectionIdentityMigration.sql,
    /SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES/
  );
  assert.match(
    titleConnectionIdentityMigration.sql,
    /web\.component\.canvas\.GraphNodeTitlePresentation/
  );
  assert.match(titleConnectionIdentityMigration.sql, /ImportWarehouseSources/);
  assert.match(titleConnectionIdentityMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(titleConnectionIdentityMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(titleConnectionIdentityMigration.sql, /connectionTypePrecedence/);
  assert.match(titleConnectionIdentityMigration.sql, /WarehouseConnection/);
  assert.match(titleConnectionIdentityMigration.sql, /ImportWarehouseSourcesUseCase\.execute/);
  assert.match(titleConnectionIdentityMigration.sql, /toSourceNode/);
  assert.match(titleConnectionIdentityMigration.sql, /buildGraphNodeTitlePresentation/);
  assert.match(
    titleConnectionIdentityMigration.sql,
    /apps\/api\/src\/application\/services\/importWarehouseSourcesUseCase\.ts/
  );
  assert.match(
    titleConnectionIdentityMigration.sql,
    /apps\/api\/test\/application\/services\/importWarehouseSourcesUseCase\.test\.ts/
  );
  assert.match(
    titleConnectionIdentityMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/graphNodeTitlePresentation\.ts/
  );
  assert.match(
    titleConnectionIdentityMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/graphNodeTitlePresentation\.test\.ts/
  );
  assert.match(
    titleConnectionIdentityMigration.sql,
    /pnpm docs:feature-mechanization:implementation/
  );
  assert.doesNotMatch(titleConnectionIdentityMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import byte-size metadata flow', () => {
  const migrations = readMigrationFiles();
  const byteSizeMigration = migrations.find(
    (migration) => migration.fileName === '487_source_import_byte_size_metadata_flow.sql'
  );

  assert.ok(byteSizeMigration);
  assert.match(byteSizeMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(byteSizeMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(byteSizeMigration.sql, /ImportWarehouseSources/);
  assert.match(byteSizeMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(byteSizeMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(byteSizeMigration.sql, /WarehouseTable\.byteSize/);
  assert.match(byteSizeMigration.sql, /PostgresTableDiscoveryRow\.byte_size/);
  assert.match(byteSizeMigration.sql, /parseOptionalByteSize/);
  assert.match(byteSizeMigration.sql, /formatSourceImportByteSize/);
  assert.match(byteSizeMigration.sql, /SourceImportCatalogPrimitives\.tsx/);
  assert.match(byteSizeMigration.sql, /workspacePortDoubles\.ts/);
  assert.match(byteSizeMigration.sql, /EV-SOURCE-IMPORT-CATALOG-BYTE-SIZE-LABEL/);
  assert.doesNotMatch(byteSizeMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(byteSizeMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import byte-size command payload mapper', () => {
  const migrations = readMigrationFiles();
  const payloadMapperMigration = migrations.find(
    (migration) => migration.fileName === '500_source_import_byte_size_payload_mapper.sql'
  );

  assert.ok(payloadMapperMigration);
  assert.match(payloadMapperMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(payloadMapperMigration.sql, /ImportWarehouseSources/);
  assert.match(payloadMapperMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(payloadMapperMigration.sql, /useSourceImportWizard/);
  assert.match(payloadMapperMigration.sql, /SourceImportWizard\.metadata\.test\.tsx/);
  assert.match(payloadMapperMigration.sql, /SOURCE-IMPORT-BYTE-SIZE-WEB-PAYLOAD-001/);
  assert.match(payloadMapperMigration.sql, /EV-SOURCE-IMPORT-BYTE-SIZE-PAYLOAD-MAPPER/);
  assert.doesNotMatch(payloadMapperMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(payloadMapperMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node title plugin identity render path', () => {
  const migrations = readMigrationFiles();
  const pluginIdentityRenderPathMigration = migrations.find(
    (migration) => migration.fileName === '454_graph_node_title_plugin_identity_render_path.sql'
  );

  assert.ok(pluginIdentityRenderPathMigration);
  assert.match(
    pluginIdentityRenderPathMigration.sql,
    /web\.component\.canvas\.GraphNodeTitlePresentation/
  );
  assert.match(pluginIdentityRenderPathMigration.sql, /web\.component\.canvas\.GraphNodeCard/);
  assert.match(pluginIdentityRenderPathMigration.sql, /web\.component\.canvas\.DbtNodeCard/);
  assert.match(pluginIdentityRenderPathMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(pluginIdentityRenderPathMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(pluginIdentityRenderPathMigration.sql, /dvt\.warehouse-source/);
  assert.match(pluginIdentityRenderPathMigration.sql, /DbtNodeData\.pluginId/);
  assert.match(pluginIdentityRenderPathMigration.sql, /canvasNodeMapper\.ts/);
  assert.match(pluginIdentityRenderPathMigration.sql, /canvasNodeMapper\.test\.ts/);
  assert.match(pluginIdentityRenderPathMigration.sql, /DbtNodeComponent\.tsx/);
  assert.match(
    pluginIdentityRenderPathMigration.sql,
    /useCanvasViewportGraphModel\.nodeData\.test\.tsx/
  );
  assert.match(
    pluginIdentityRenderPathMigration.sql,
    /EV-CANVAS-GRAPH-NODE-PLUGIN-IDENTITY-MAPPER-PROJECTION/
  );
  assert.match(
    pluginIdentityRenderPathMigration.sql,
    /EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-PLUGIN-ID-RENDER-PATH/
  );
  assert.doesNotMatch(pluginIdentityRenderPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node health schema drift tone contract', () => {
  const migrations = readMigrationFiles();
  const driftToneMigration = migrations.find(
    (migration) => migration.fileName === '437_graph_node_health_schema_drift_tone.sql'
  );

  assert.ok(driftToneMigration);
  assert.match(driftToneMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(driftToneMigration.sql, /web\.component\.canvas\.GraphNodeHealthPopover/);
  assert.match(driftToneMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(driftToneMigration.sql, /RenderCanvasNodeHealthPopover/);
  assert.match(driftToneMigration.sql, /SchemaDriftProjection/);
  assert.match(driftToneMigration.sql, /resolveSchemaDriftProjection/);
  assert.match(driftToneMigration.sql, /EV-CANVAS-GRAPH-NODE-SCHEMA-DRIFT-TONE-PROJECTION/);
  assert.match(driftToneMigration.sql, /EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-SCHEMA-DRIFT-TONE/);
  assert.match(driftToneMigration.sql, /graphNodeOperationalSummary\.test\.ts/);
  assert.match(driftToneMigration.sql, /GraphNodeHealthPopoverView\.test\.tsx/);
  assert.match(driftToneMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(driftToneMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node operational metric icon contract', () => {
  const migrations = readMigrationFiles();
  const metricIconMigration = migrations.find(
    (migration) => migration.fileName === '438_graph_node_operational_metric_icons.sql'
  );

  assert.ok(metricIconMigration);
  assert.match(metricIconMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(metricIconMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(metricIconMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(metricIconMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(metricIconMigration.sql, /GraphNodeCardMetricIcon/);
  assert.match(metricIconMigration.sql, /PushMetricOptions/);
  assert.match(metricIconMigration.sql, /metricIconByName/);
  assert.match(metricIconMigration.sql, /EV-CANVAS-GRAPH-NODE-OPERATIONAL-METRIC-ICON-PROJECTION/);
  assert.match(metricIconMigration.sql, /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-METRIC-ICON-RENDER/);
  assert.match(metricIconMigration.sql, /GraphNodeOperationalRail\.test\.tsx/);
  assert.match(metricIconMigration.sql, /graphNodeOperationalSummary\.test\.ts/);
  assert.match(metricIconMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(metricIconMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node read model metric icon evidence', () => {
  const migrations = readMigrationFiles();
  const readModelMetricIconMigration = migrations.find(
    (migration) =>
      migration.fileName === '439_graph_node_operational_metric_icon_read_model_evidence.sql'
  );

  assert.ok(readModelMetricIconMigration);
  assert.match(readModelMetricIconMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(readModelMetricIconMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(
    readModelMetricIconMigration.sql,
    /EV-CANVAS-GRAPH-NODE-READ-MODEL-METRIC-ICON-PROPAGATION/
  );
  assert.match(readModelMetricIconMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(
    readModelMetricIconMigration.sql,
    /pnpm --filter @dvt\/web exec vitest run --config vitest\.unit\.config\.ts src\/app\/plugins\/graph\/graphNodeCardReadModel\.test\.ts/
  );
  assert.doesNotMatch(readModelMetricIconMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node operational metric tone rendering', () => {
  const migrations = readMigrationFiles();
  const metricToneMigration = migrations.find(
    (migration) => migration.fileName === '443_graph_node_operational_metric_tone.sql'
  );

  assert.ok(metricToneMigration);
  assert.match(metricToneMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(metricToneMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(metricToneMigration.sql, /GraphNodeCardMetric\.tone/);
  assert.match(metricToneMigration.sql, /graphNodeOperationalRailClasses\.valueTone/);
  assert.match(metricToneMigration.sql, /data-tone/);
  assert.match(metricToneMigration.sql, /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-METRIC-TONE-RENDER/);
  assert.match(metricToneMigration.sql, /GraphNodeOperationalRail\.test\.tsx/);
  assert.match(
    metricToneMigration.sql,
    /pnpm --filter @dvt\/web exec vitest run --config vitest\.presentation\.config\.ts src\/app\/plugins\/graph\/GraphNodeOperationalRail\.test\.tsx/
  );
  assert.match(metricToneMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(metricToneMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node operational rail tone token dependency', () => {
  const migrations = readMigrationFiles();
  const metricToneTokenMigration = migrations.find(
    (migration) =>
      migration.fileName === '444_graph_node_operational_rail_tone_token_dependency.sql'
  );

  assert.ok(metricToneTokenMigration);
  assert.match(metricToneTokenMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(metricToneTokenMigration.sql, /graphVisualTokens\.ts/);
  assert.match(metricToneTokenMigration.sql, /style-token/);
  assert.match(metricToneTokenMigration.sql, /graphNodeOperationalRailClasses\.valueTone/);
  assert.match(
    metricToneTokenMigration.sql,
    /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-TONE-TOKEN-OWNERSHIP/
  );
  assert.match(
    metricToneTokenMigration.sql,
    /frontend-component-files --component web\.component\.canvas\.GraphNodeOperationalRail/
  );
  assert.doesNotMatch(metricToneTokenMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node operational rail native keyboard activation', () => {
  const migrations = readMigrationFiles();
  const activationMigration = migrations.find(
    (migration) =>
      migration.fileName === '464_graph_node_operational_rail_native_keyboard_activation.sql'
  );

  assert.ok(activationMigration);
  assert.match(activationMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(activationMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(activationMigration.sql, /GraphNodeOperationalRail\.tsx/);
  assert.match(activationMigration.sql, /GraphNodeOperationalRail\.test\.tsx/);
  assert.match(
    activationMigration.sql,
    /EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-NATIVE-KEYBOARD-ACTIVATION/
  );
  assert.match(activationMigration.sql, /buttonOwnsKeyboardActivation/);
  assert.match(activationMigration.sql, /preventsDuplicateOpen/);
  assert.match(activationMigration.sql, /customKeydownOpener', false/);
  assert.doesNotMatch(activationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(activationMigration.sql, /truncate\s+/i);
});

test('tracked migrations promote Graph node operational summary to query component ownership', () => {
  const migrations = readMigrationFiles();
  const operationalSummaryOwnershipMigration = migrations.find(
    (migration) =>
      migration.fileName === '475_graph_node_operational_summary_component_ownership.sql'
  );

  assert.ok(operationalSummaryOwnershipMigration);
  assert.match(
    operationalSummaryOwnershipMigration.sql,
    /web\.component\.canvas\.GraphNodeOperationalSummary/
  );
  assert.match(operationalSummaryOwnershipMigration.sql, /query-view/);
  assert.match(operationalSummaryOwnershipMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(operationalSummaryOwnershipMigration.sql, /graphNodeOperationalSummary\.ts/);
  assert.match(operationalSummaryOwnershipMigration.sql, /graphNodeOperationalSummary\.test\.ts/);
  assert.match(
    operationalSummaryOwnershipMigration.sql,
    /EV-CANVAS-GRAPH-NODE-OPERATIONAL-SUMMARY-COMPONENT/
  );
  assert.match(
    operationalSummaryOwnershipMigration.sql,
    /REL-GRAPH-NODE-OPERATIONAL-RAIL-READS-OPERATIONAL-SUMMARY/
  );
  assert.match(operationalSummaryOwnershipMigration.sql, /consumedBy/);
  assert.match(operationalSummaryOwnershipMigration.sql, /doesNotInventMetrics/);
  assert.doesNotMatch(operationalSummaryOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Graph node operational summary maturity evidence', () => {
  const migrations = readMigrationFiles();
  const operationalSummaryMaturityMigration = migrations.find(
    (migration) => migration.fileName === '476_graph_node_operational_summary_maturity_evidence.sql'
  );

  assert.ok(operationalSummaryMaturityMigration);
  assert.match(operationalSummaryMaturityMigration.sql, /RESP-GRAPH-NODE-OPERATIONAL-SUMMARY/);
  assert.match(operationalSummaryMaturityMigration.sql, /TEST-GRAPH-NODE-OPERATIONAL-SUMMARY/);
  assert.match(
    operationalSummaryMaturityMigration.sql,
    /OBS-GRAPH-NODE-OPERATIONAL-SUMMARY-COMPONENT-PROFILE/
  );
  assert.match(operationalSummaryMaturityMigration.sql, /graphNodeOperationalSummary\.test\.ts/);
  assert.doesNotMatch(operationalSummaryMaturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Graph node card visual token ownership', () => {
  const migrations = readMigrationFiles();
  const visualTokenOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '477_graph_node_card_visual_token_ownership_reconcile.sql'
  );

  assert.ok(visualTokenOwnershipMigration);
  assert.match(visualTokenOwnershipMigration.sql, /web\.component\.canvas\.GraphVisualTokens/);
  assert.match(visualTokenOwnershipMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(visualTokenOwnershipMigration.sql, /graphVisualTokens\.ts/);
  assert.match(
    visualTokenOwnershipMigration.sql,
    /REL-GRAPH-NODE-CARD-VIEW-USES-GRAPH-VISUAL-TOKENS/
  );
  assert.match(visualTokenOwnershipMigration.sql, /RenderCanvasGraphVisualTokens/);
  assert.match(visualTokenOwnershipMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(
    visualTokenOwnershipMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.match(
    visualTokenOwnershipMigration.sql,
    /GraphNodeCardView no longer owns graphVisualTokens\.ts/
  );
  assert.doesNotMatch(visualTokenOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Graph visual token consumer maturity evidence', () => {
  const migrations = readMigrationFiles();
  const visualTokenMaturityMigration = migrations.find(
    (migration) => migration.fileName === '478_graph_visual_tokens_consumer_maturity.sql'
  );

  assert.ok(visualTokenMaturityMigration);
  assert.match(visualTokenMaturityMigration.sql, /web\.component\.canvas\.GraphVisualTokens/);
  assert.match(
    visualTokenMaturityMigration.sql,
    /web\.component\.canvas\.GraphNodeOperationalRail/
  );
  assert.match(visualTokenMaturityMigration.sql, /graphVisualTokens\.ts/);
  assert.match(
    visualTokenMaturityMigration.sql,
    /REL-GRAPH-NODE-OPERATIONAL-RAIL-USES-GRAPH-VISUAL-TOKENS/
  );
  assert.match(visualTokenMaturityMigration.sql, /RESP-GRAPH-VISUAL-TOKENS/);
  assert.match(visualTokenMaturityMigration.sql, /TEST-GRAPH-VISUAL-TOKENS/);
  assert.match(visualTokenMaturityMigration.sql, /OBS-GRAPH-VISUAL-TOKENS-COMPONENT-PROFILE/);
  assert.match(
    visualTokenMaturityMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.match(
    visualTokenMaturityMigration.sql,
    /GraphNodeOperationalRail no longer owns graphVisualTokens\.ts/
  );
  assert.doesNotMatch(visualTokenMaturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node column section ownership', () => {
  const migrations = readMigrationFiles();
  const columnSectionMigration = migrations.find(
    (migration) => migration.fileName === '479_graph_node_column_section_component.sql'
  );

  assert.ok(columnSectionMigration);
  assert.match(columnSectionMigration.sql, /web\.component\.canvas\.GraphNodeColumnSection/);
  assert.match(columnSectionMigration.sql, /web\.component\.canvas\.GraphNodeCardView/);
  assert.match(columnSectionMigration.sql, /GraphNodeColumnSection\.tsx/);
  assert.match(columnSectionMigration.sql, /GraphNodeColumnSection\.test\.tsx/);
  assert.match(columnSectionMigration.sql, /'table'/);
  assert.match(columnSectionMigration.sql, /'ui-view'/);
  assert.match(columnSectionMigration.sql, /RenderCanvasGraphNodeColumnSection/);
  assert.match(columnSectionMigration.sql, /REL-GRAPH-NODE-CARD-VIEW-COMPOSES-COLUMN-SECTION/);
  assert.match(columnSectionMigration.sql, /RESP-GRAPH-NODE-COLUMN-SECTION/);
  assert.match(columnSectionMigration.sql, /TEST-GRAPH-NODE-COLUMN-SECTION/);
  assert.match(columnSectionMigration.sql, /OBS-GRAPH-NODE-COLUMN-SECTION-COMPONENT-PROFILE/);
  assert.doesNotMatch(columnSectionMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node column section feature mechanization', () => {
  const migrations = readMigrationFiles();
  const columnSectionMechanizationMigration = migrations.find(
    (migration) => migration.fileName === '480_graph_node_column_section_feature_mechanization.sql'
  );

  assert.ok(columnSectionMechanizationMigration);
  assert.match(columnSectionMechanizationMigration.sql, /RenderCanvasGraphNodeColumnSection/);
  assert.match(columnSectionMechanizationMigration.sql, /GraphNodeCardColumn/);
  assert.match(columnSectionMechanizationMigration.sql, /GraphNodeColumn'/);
  assert.match(columnSectionMechanizationMigration.sql, /GraphNodeColumnSection'/);
  assert.match(columnSectionMechanizationMigration.sql, /GraphNodeColumnSectionProps/);
  assert.match(
    columnSectionMechanizationMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/GraphNodeColumnSection\.tsx/
  );
  assert.match(
    columnSectionMechanizationMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/GraphNodeColumnSection\.test\.tsx/
  );
  assert.match(
    columnSectionMechanizationMigration.sql,
    /pnpm docs:feature-mechanization:implementation/
  );
  assert.doesNotMatch(columnSectionMechanizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Graph node component ownership drift', () => {
  const migrations = readMigrationFiles();
  const driftMigration = migrations.find(
    (migration) => migration.fileName === '481_graph_node_component_ownership_drift_reconcile.sql'
  );

  assert.ok(driftMigration);
  assert.match(driftMigration.sql, /web\.component\.canvas\.GraphNodeOperationalRail/);
  assert.match(driftMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(driftMigration.sql, /web\.component\.canvas\.GraphNodeOperationalSummary/);
  assert.match(driftMigration.sql, /insert into architecture\.component/);
  assert.match(driftMigration.sql, /ProjectGraphNodeCardReadModel/);
  assert.match(driftMigration.sql, /graphNodeCardStrategyContracts\.ts/);
  assert.match(driftMigration.sql, /graphNodeCardStrategyUtils\.ts/);
  assert.match(driftMigration.sql, /graphNodeOperationalSummary\.ts/);
  assert.match(driftMigration.sql, /graphNodeOperationalSummary\.test\.ts/);
  assert.match(driftMigration.sql, /REL-GRAPH-NODE-OPERATIONAL-RAIL-CONSUMES-CARD-CONTRACTS/);
  assert.match(driftMigration.sql, /REL-GRAPH-NODE-CARD-STRATEGY-USES-OPERATIONAL-SUMMARY/);
  assert.match(driftMigration.sql, /EV-CANVAS-GRAPH-NODE-COMPONENT-OWNERSHIP-DRIFT-RECONCILE/);
  assert.match(
    driftMigration.sql,
    /component-profile --component web\.component\.canvas\.GraphNodeOperationalRail/
  );
  assert.match(
    driftMigration.sql,
    /component-profile --component web\.component\.canvas\.GraphNodeCardStrategy/
  );
  assert.doesNotMatch(driftMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Graph node health popover contract ownership drift', () => {
  const migrations = readMigrationFiles();
  const healthPopoverDriftMigration = migrations.find(
    (migration) =>
      migration.fileName === '496_graph_node_health_popover_contract_ownership_reconcile.sql'
  );

  assert.ok(healthPopoverDriftMigration);
  assert.match(healthPopoverDriftMigration.sql, /web\.component\.canvas\.GraphNodeHealthPopover/);
  assert.match(healthPopoverDriftMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(healthPopoverDriftMigration.sql, /graphNodeCardStrategyContracts\.ts/);
  assert.match(
    healthPopoverDriftMigration.sql,
    /delete from planning_query_store\.frontend_component_local_files/
  );
  assert.match(
    healthPopoverDriftMigration.sql,
    /delete from planning_query_store\.frontend_component_files/
  );
  assert.match(
    healthPopoverDriftMigration.sql,
    /REL-GRAPH-NODE-HEALTH-POPOVER-CONSUMES-CARD-CONTRACTS/
  );
  assert.match(
    healthPopoverDriftMigration.sql,
    /GraphNodeHealthPopover consumes GraphNodeOperationalDetail/
  );
  assert.match(
    healthPopoverDriftMigration.sql,
    /component-profile --component web\.component\.canvas\.GraphNodeHealthPopover/
  );
  assert.doesNotMatch(healthPopoverDriftMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Graph node health popover architecture maturity evidence', () => {
  const migrations = readMigrationFiles();
  const healthPopoverMaturityMigration = migrations.find(
    (migration) => migration.fileName === '497_graph_node_health_popover_maturity_evidence.sql'
  );

  assert.ok(healthPopoverMaturityMigration);
  assert.match(healthPopoverMaturityMigration.sql, /RESP-GRAPH-NODE-HEALTH-POPOVER/);
  assert.match(healthPopoverMaturityMigration.sql, /TEST-GRAPH-NODE-HEALTH-POPOVER/);
  assert.match(
    healthPopoverMaturityMigration.sql,
    /OBS-GRAPH-NODE-HEALTH-POPOVER-COMPONENT-PROFILE/
  );
  assert.match(healthPopoverMaturityMigration.sql, /GraphNodeHealthPopoverView\.test\.tsx/);
  assert.match(
    healthPopoverMaturityMigration.sql,
    /component-profile --component web\.component\.canvas\.GraphNodeHealthPopover/
  );
  assert.doesNotMatch(healthPopoverMaturityMigration.sql, /graphNodeCardStrategyContracts\.ts/);
  assert.doesNotMatch(healthPopoverMaturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete Graph node card strategy maturity evidence', () => {
  const migrations = readMigrationFiles();
  const maturityMigration = migrations.find(
    (migration) => migration.fileName === '482_graph_node_card_strategy_maturity.sql'
  );

  assert.ok(maturityMigration);
  assert.match(maturityMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(maturityMigration.sql, /RESP-GRAPH-NODE-CARD-STRATEGY/);
  assert.match(maturityMigration.sql, /TEST-GRAPH-NODE-CARD-STRATEGY-READ-MODEL/);
  assert.match(maturityMigration.sql, /OBS-GRAPH-NODE-CARD-STRATEGY-COMPONENT-PROFILE/);
  assert.match(maturityMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(
    maturityMigration.sql,
    /component-integrity --component web\.component\.canvas\.GraphNodeCardStrategy/
  );
  assert.doesNotMatch(maturityMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node card relation projection convergence', () => {
  const migrations = readMigrationFiles();
  const relationProjectionMigration = migrations.find(
    (migration) => migration.fileName === '465_graph_node_card_relation_projection_convergence.sql'
  );

  assert.ok(relationProjectionMigration);
  assert.match(relationProjectionMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(
    relationProjectionMigration.sql,
    /web\.component\.canvas\.GraphNodeTitlePresentation/
  );
  assert.match(relationProjectionMigration.sql, /ProjectGraphNodeCardReadModel/);
  assert.match(relationProjectionMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(relationProjectionMigration.sql, /graphNodeCardStrategyUtils\.ts/);
  assert.match(relationProjectionMigration.sql, /resolveGraphNodeRelationParts/);
  assert.match(relationProjectionMigration.sql, /resolveGraphNodeRelationPath/);
  assert.match(relationProjectionMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(relationProjectionMigration.sql, /graphNodeTitlePresentation\.test\.ts/);
  assert.match(
    relationProjectionMigration.sql,
    /EV-CANVAS-GRAPH-NODE-CARD-RELATION-PROJECTION-CONVERGENCE/
  );
  assert.match(relationProjectionMigration.sql, /expected RAW\.ERP\.ORDERS but received RAW\.ERP/);
  assert.doesNotMatch(relationProjectionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(relationProjectionMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Graph node card relation projection symbol manifest', () => {
  const migrations = readMigrationFiles();
  const symbolManifestMigration = migrations.find(
    (migration) =>
      migration.fileName === '470_graph_node_card_relation_projection_symbol_manifest.sql'
  );

  assert.ok(symbolManifestMigration);
  assert.match(symbolManifestMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(symbolManifestMigration.sql, /raw_manifest/);
  assert.match(symbolManifestMigration.sql, /\{symbols\}/);
  assert.match(symbolManifestMigration.sql, /symbol_refs/);
  assert.match(symbolManifestMigration.sql, /GraphNodeRelationParts/);
  assert.match(symbolManifestMigration.sql, /recordValue/);
  assert.match(symbolManifestMigration.sql, /resolveGraphNodeRelationParts/);
  assert.match(symbolManifestMigration.sql, /resolveGraphNodeRelationPath/);
  assert.match(symbolManifestMigration.sql, /ProjectGraphNodeCardReadModel/);
  assert.match(symbolManifestMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(symbolManifestMigration.sql, /RenderCanvasGraphNodeTitlePresentation/);
  assert.match(symbolManifestMigration.sql, /architectureGuard/);
  assert.match(symbolManifestMigration.sql, /cypressCoverage/);
  assert.match(symbolManifestMigration.sql, /graphNodeCardReadModel\.architecture\.test\.ts/);
  assert.match(symbolManifestMigration.sql, /canvas-ready-node-authoring\.cy\.ts/);
  assert.match(symbolManifestMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(symbolManifestMigration.sql, /graphNodeTitlePresentation\.test\.ts/);
  assert.doesNotMatch(symbolManifestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(symbolManifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations deduplicate Graph node card relation projection symbols', () => {
  const migrations = readMigrationFiles();
  const symbolDedupeMigration = migrations.find(
    (migration) =>
      migration.fileName === '471_graph_node_card_relation_projection_symbol_dedupe.sql'
  );

  assert.ok(symbolDedupeMigration);
  assert.match(symbolDedupeMigration.sql, /E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1/);
  assert.match(symbolDedupeMigration.sql, /jsonb_array_elements/);
  assert.match(symbolDedupeMigration.sql, /distinct on/);
  assert.match(symbolDedupeMigration.sql, /symbol_refs/);
  assert.match(symbolDedupeMigration.sql, /GraphNodeRelationParts/);
  assert.match(symbolDedupeMigration.sql, /recordValue/);
  assert.match(symbolDedupeMigration.sql, /resolveGraphNodeRelationParts/);
  assert.match(symbolDedupeMigration.sql, /resolveGraphNodeRelationPath/);
  assert.match(symbolDedupeMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.doesNotMatch(symbolDedupeMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(symbolDedupeMigration.sql, /truncate\s+/i);
});

test('tracked migrations register Graph node tag accent tone contract', () => {
  const migrations = readMigrationFiles();
  const tagAccentMigration = migrations.find(
    (migration) => migration.fileName === '440_graph_node_tag_accent_tone_contract.sql'
  );

  assert.ok(tagAccentMigration);
  assert.match(tagAccentMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(tagAccentMigration.sql, /web\.component\.canvas\.GraphNodeTagList/);
  assert.match(tagAccentMigration.sql, /GraphNodeCardAccentTone/);
  assert.match(tagAccentMigration.sql, /resolveNodeCardAccentTone/);
  assert.match(tagAccentMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(tagAccentMigration.sql, /RenderCanvasGraphNodeTagList/);
  assert.match(tagAccentMigration.sql, /EV-CANVAS-GRAPH-NODE-TAG-ACCENT-TONE-PROJECTION/);
  assert.match(tagAccentMigration.sql, /EV-CANVAS-GRAPH-NODE-TAG-LIST-ACCENT-TONE-RENDER/);
  assert.match(tagAccentMigration.sql, /GraphNodeTagList\.test\.tsx/);
  assert.match(tagAccentMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(tagAccentMigration.sql, /pnpm docs:feature-mechanization:implementation/);
  assert.doesNotMatch(tagAccentMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile Inspector visual token rail duplicate', () => {
  const migrations = readMigrationFiles();
  const duplicateMigration = migrations.find(
    (migration) => migration.fileName === '392_inspector_visual_tokens_rail_duplicate_reconcile.sql'
  );

  assert.ok(duplicateMigration);
  assert.match(duplicateMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(duplicateMigration.sql, /inspectorVisualTokens/);
  assert.match(duplicateMigration.sql, /inspectcanvasnodeproperties-inspector-visual-tokens/);
  assert.match(
    duplicateMigration.sql,
    /local#CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604#query#inspectcanvasnodeproperties/
  );
  assert.match(
    duplicateMigration.sql,
    /delete from planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(duplicateMigration.sql, /rail_vocabulary_exact_duplicate_reconciled/);
  assert.doesNotMatch(duplicateMigration.sql, /truncate\s+/i);
});

test('tracked migrations register DBT transform cross-plugin port bridge', () => {
  const migrations = readMigrationFiles();
  const bridgeMigration = migrations.find(
    (migration) => migration.fileName === '396_dbt_transform_cross_plugin_port_bridge.sql'
  );

  assert.ok(bridgeMigration);
  assert.match(bridgeMigration.sql, /AuthorCanvasGraphEdge/);
  assert.match(bridgeMigration.sql, /imported_target_rail/);
  assert.match(bridgeMigration.sql, /existing_local_target_rail/);
  assert.match(bridgeMigration.sql, /feature_mechanization_local_rails/);
  assert.match(bridgeMigration.sql, /dbtContributions\.transformPortBridge/);
  assert.match(bridgeMigration.sql, /apps\/web\/src\/app\/plugins\/dbt\/dbtContributions\.ts/);
  assert.match(
    bridgeMigration.sql,
    /apps\/web\/src\/app\/plugins\/contracts\/ConnectionRules\.test\.ts/
  );
  assert.match(bridgeMigration.sql, /on conflict \(rail_id\) do update/);
  assert.doesNotMatch(bridgeMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import create connection flow', () => {
  const migrations = readMigrationFiles();
  const createConnectionMigration = migrations.find(
    (migration) => migration.fileName === '501_source_import_create_connection_flow.sql'
  );

  assert.ok(createConnectionMigration);
  assert.match(createConnectionMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(createConnectionMigration.sql, /CreateWarehouseConnection/);
  assert.match(createConnectionMigration.sql, /WarehouseConnectionCreateForm\.tsx/);
  assert.match(
    createConnectionMigration.sql,
    /IWarehouseSourceImportPort\.createWarehouseConnection/
  );
  assert.match(createConnectionMigration.sql, /POST \/workspace\/warehouse\/connections/);
  assert.match(
    createConnectionMigration.sql,
    /missing required command fields do not invoke the port/
  );
  assert.match(createConnectionMigration.sql, /EV-SOURCE-IMPORT-CREATE-CONNECTION-PRESENTATION/);
  assert.doesNotMatch(createConnectionMigration.sql, /raw_secret_capture.*false/i);
  assert.doesNotMatch(createConnectionMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete source import create connection manifest', () => {
  const migrations = readMigrationFiles();
  const manifestMigration = migrations.find(
    (migration) =>
      migration.fileName === '502_source_import_create_connection_manifest_completion.sql'
  );

  assert.ok(manifestMigration);
  assert.match(manifestMigration.sql, /WarehouseConnectionCreateFormProps/);
  assert.match(manifestMigration.sql, /warehouseConnectionTypes/);
  assert.match(manifestMigration.sql, /normalizeCreateConnectionInput/);
  assert.match(manifestMigration.sql, /isCreateConnectionInputComplete/);
  assert.match(manifestMigration.sql, /upsertWarehouseConnection/);
  assert.match(manifestMigration.sql, /cypressCoverage/);
  assert.match(manifestMigration.sql, /completionGate/);
  assert.doesNotMatch(manifestMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep source import create connection governance canonical', () => {
  const migrations = readMigrationFiles();
  const governanceMigration = migrations.find(
    (migration) =>
      migration.fileName === '503_source_import_create_connection_canonical_governance.sql'
  );

  assert.ok(governanceMigration);
  assert.match(governanceMigration.sql, /governance-document-rule-inventory\.md/);
  assert.match(governanceMigration.sql, /command-query-rail-governance\.md/);
  assert.match(governanceMigration.sql, /fowler-opportunity-planning-governance\.md/);
  assert.doesNotMatch(governanceMigration.sql, /buzon\//);
  assert.doesNotMatch(governanceMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import destination posture copy evidence', () => {
  const migrations = readMigrationFiles();
  const destinationPostureMigration = migrations.find(
    (migration) => migration.fileName === '504_source_import_destination_posture_copy.sql'
  );

  assert.ok(destinationPostureMigration);
  assert.match(destinationPostureMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(destinationPostureMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(
    destinationPostureMigration.sql,
    /sourceImportWizardCopy\.selection\.destinationPosture/
  );
  assert.match(destinationPostureMigration.sql, /DVT Sink node/);
  assert.doesNotMatch(destinationPostureMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile source import catalog model ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) => migration.fileName === '505_source_import_catalog_model_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /sourceImportCatalogModel\.ts/);
  assert.match(ownershipMigration.sql, /sourceImportCatalogModel\.test\.ts/);
  assert.match(ownershipMigration.sql, /retiredForSourceImportCatalogOwnership/);
  assert.match(ownershipMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(ownershipMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/);
  assert.match(
    ownershipMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(
    ownershipMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare source import catalog model feature symbols', () => {
  const migrations = readMigrationFiles();
  const symbolMigration = migrations.find(
    (migration) => migration.fileName === '506_source_import_catalog_model_feature_symbols.sql'
  );

  assert.ok(symbolMigration);
  assert.match(symbolMigration.sql, /sourceImportCatalogModel\.ts#SourceImportCatalogViewModel/);
  assert.match(
    symbolMigration.sql,
    /sourceImportCatalogModel\.ts#buildSourceImportCatalogViewModel/
  );
  assert.match(symbolMigration.sql, /sourceImportCatalogModel\.ts#tableMatchesSourceImportSearch/);
  assert.match(symbolMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1/);
  assert.match(symbolMigration.sql, /E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1/);
  assert.match(symbolMigration.sql, /RenderSourceImportCatalogView/);
  assert.doesNotMatch(symbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations attach source import catalog model symbols to Cypress coverage', () => {
  const migrations = readMigrationFiles();
  const coverageMigration = migrations.find(
    (migration) =>
      migration.fileName === '507_source_import_catalog_model_symbol_cypress_coverage.sql'
  );

  assert.ok(coverageMigration);
  assert.match(coverageMigration.sql, /cypressCoverage/);
  assert.match(coverageMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(coverageMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1/);
  assert.match(coverageMigration.sql, /E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1/);
  assert.doesNotMatch(coverageMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile source import catalog model symbols across feature rails', () => {
  const migrations = readMigrationFiles();
  const reconcileMigration = migrations.find(
    (migration) =>
      migration.fileName === '508_source_import_catalog_model_feature_symbol_reconcile.sql'
  );

  assert.ok(reconcileMigration);
  assert.match(reconcileMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1/);
  assert.match(reconcileMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(reconcileMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1/);
  assert.match(reconcileMigration.sql, /E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1/);
  assert.match(reconcileMigration.sql, /sourceImportCatalogModel\.ts/);
  assert.match(reconcileMigration.sql, /buildSourceImportCatalogViewModel/);
  assert.match(reconcileMigration.sql, /normalizeCatalogSearchValue/);
  assert.match(reconcileMigration.sql, /tableMatchesSourceImportSearch/);
  assert.match(reconcileMigration.sql, /formatSourceImportByteSize/);
  assert.match(reconcileMigration.sql, /sourceImportCatalogModel\.test\.ts/);
  assert.match(reconcileMigration.sql, /SourceImportCatalogView\.architecture\.test\.ts/);
  assert.match(reconcileMigration.sql, /cypressCoverage/);
  assert.doesNotMatch(reconcileMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import catalog copy token contract', () => {
  const migrations = readMigrationFiles();
  const copyTokenMigration = migrations.find(
    (migration) => migration.fileName === '509_source_import_catalog_copy_token_contract.sql'
  );

  assert.ok(copyTokenMigration);
  assert.match(copyTokenMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/);
  assert.match(copyTokenMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(copyTokenMigration.sql, /SourceImportCatalogCopy/);
  assert.match(copyTokenMigration.sql, /sourceImportCatalogNumberFormatter/);
  assert.match(copyTokenMigration.sql, /sourceImportWizardCopy\.catalog/);
  assert.match(copyTokenMigration.sql, /sourceImportCatalogModel\.test\.ts/);
  assert.match(copyTokenMigration.sql, /SourceImportCatalogView\.test\.tsx/);
  assert.match(copyTokenMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1/);
  assert.match(copyTokenMigration.sql, /E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1/);
  assert.doesNotMatch(copyTokenMigration.sql, /truncate\s+/i);
});

test('tracked migrations expose source import catalog copy symbols to feature mechanization', () => {
  const migrations = readMigrationFiles();
  const copySymbolMigration = migrations.find(
    (migration) => migration.fileName === '510_source_import_catalog_copy_feature_symbols.sql'
  );

  assert.ok(copySymbolMigration);
  assert.match(copySymbolMigration.sql, /sourceImportWizardCopy\.catalog/);
  assert.match(copySymbolMigration.sql, /sourceImportCatalogNumberFormatter/);
  assert.match(copySymbolMigration.sql, /SourceImportCatalogCopy/);
  assert.match(copySymbolMigration.sql, /raw_manifest\s*=\s*jsonb_set/);
  assert.match(copySymbolMigration.sql, /feature_mechanization_local_rails/);
  assert.match(copySymbolMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(copySymbolMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1/);
  assert.match(copySymbolMigration.sql, /E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1/);
  assert.doesNotMatch(copySymbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations backfill source import catalog copy symbol Cypress coverage', () => {
  const migrations = readMigrationFiles();
  const coverageMigration = migrations.find(
    (migration) =>
      migration.fileName === '511_source_import_catalog_copy_symbol_cypress_coverage.sql'
  );

  assert.ok(coverageMigration);
  assert.match(coverageMigration.sql, /sourceImportWizardCopy\.catalog/);
  assert.match(coverageMigration.sql, /sourceImportCatalogNumberFormatter/);
  assert.match(coverageMigration.sql, /SourceImportCatalogCopy/);
  assert.match(coverageMigration.sql, /cypressCoverage/);
  assert.match(coverageMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(coverageMigration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(coverageMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import active metadata stable selectors', () => {
  const migrations = readMigrationFiles();
  const metadataMigration = migrations.find(
    (migration) => migration.fileName === '538_source_import_active_metadata_stable_selectors.sql'
  );

  assert.ok(metadataMigration);
  assert.match(metadataMigration.sql, /SourceImportActiveTableMetadata\.tsx/);
  assert.match(metadataMigration.sql, /SourceImportActiveTableMetadata\.test\.tsx/);
  assert.match(metadataMigration.sql, /sourceImportActiveMetadataClassNames/);
  assert.match(metadataMigration.sql, /data-source-import-active-table/);
  assert.match(metadataMigration.sql, /data-source-import-metadata-column/);
  assert.match(metadataMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(metadataMigration.sql, /E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1/);
  assert.doesNotMatch(metadataMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import selection basket column review', () => {
  const migrations = readMigrationFiles();
  const basketMigration = migrations.find(
    (migration) => migration.fileName === '541_source_import_selection_basket_column_review.sql'
  );

  assert.ok(basketMigration);
  assert.match(basketMigration.sql, /SourceImportSelectionBasket\.tsx/);
  assert.match(basketMigration.sql, /SourceImportSelectionBasket\.test\.tsx/);
  assert.match(basketMigration.sql, /selectedSourceColumnPreviewLimit/);
  assert.match(basketMigration.sql, /SourceImportSelectedColumnPreview/);
  assert.match(basketMigration.sql, /sourceImportWizardCopy\.selectionBasket/);
  assert.match(basketMigration.sql, /data-source-import-selected-column/);
  assert.match(basketMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(basketMigration.sql, /E-CANVAS-ADD-SOURCE-BASKET-REMOVE-1/);
  assert.match(basketMigration.sql, /canvas-source-import-contextual\.cy\.ts/);
  assert.doesNotMatch(basketMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import review registry path', () => {
  const migrations = readMigrationFiles();
  const registryPathMigration = migrations.find(
    (migration) => migration.fileName === '542_source_import_review_registry_path.sql'
  );

  assert.ok(registryPathMigration);
  assert.match(registryPathMigration.sql, /SourceImportReviewView\.tsx/);
  assert.match(registryPathMigration.sql, /SourceImportReviewView\.test\.tsx/);
  assert.match(registryPathMigration.sql, /sourceImportWizardModel\.ts/);
  assert.match(registryPathMigration.sql, /buildSourceImportRegistryPath/);
  assert.match(registryPathMigration.sql, /sourceImportWizardCopy\.review\.registryFileLabel/);
  assert.match(registryPathMigration.sql, /data-source-import-registry-path/);
  assert.match(registryPathMigration.sql, /models\/sources\/src_erp\.yml/);
  assert.match(registryPathMigration.sql, /E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1/);
  assert.match(
    registryPathMigration.sql,
    /api\.component\.warehouseSourceImport\.ImportWarehouseSourcesUseCase/
  );
  assert.match(registryPathMigration.sql, /canvas-source-import-contextual\.cy\.ts/);
  assert.doesNotMatch(registryPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import schema identity selection', () => {
  const migrations = readMigrationFiles();
  const identityMigration = migrations.find(
    (migration) => migration.fileName === '512_source_import_schema_identity_selection.sql'
  );

  assert.ok(identityMigration);
  assert.match(identityMigration.sql, /SourceImportSchemaIdentity/);
  assert.match(identityMigration.sql, /buildSourceImportSchemaKey/);
  assert.match(identityMigration.sql, /toggleSourceImportSchemaSelection/);
  assert.match(identityMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(identityMigration.sql, /database\/schema identity/);
  assert.match(identityMigration.sql, /EV-SOURCE-IMPORT-SCHEMA-IDENTITY-MODEL/);
  assert.match(identityMigration.sql, /EV-SOURCE-IMPORT-SCHEMA-IDENTITY-PRESENTATION/);
  assert.match(identityMigration.sql, /feature_mechanization_local_rails/);
  assert.match(identityMigration.sql, /frontend_component_local_files/);
  assert.doesNotMatch(identityMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import database category selection', () => {
  const migrations = readMigrationFiles();
  const identityMigration = migrations.find(
    (migration) => migration.fileName === '517_source_import_database_category_selection.sql'
  );

  assert.ok(identityMigration);
  assert.match(identityMigration.sql, /SourceImportDatabaseIdentity/);
  assert.match(identityMigration.sql, /toggleSourceImportDatabaseSelection/);
  assert.match(identityMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(identityMigration.sql, /database value object/);
  assert.match(identityMigration.sql, /EV-SOURCE-IMPORT-DATABASE-CATEGORY-MODEL/);
  assert.match(identityMigration.sql, /EV-SOURCE-IMPORT-DATABASE-CATEGORY-PRESENTATION/);
  assert.match(identityMigration.sql, /EV-SOURCE-IMPORT-DATABASE-CATEGORY-WIZARD/);
  assert.match(identityMigration.sql, /architectureGuard/);
  assert.match(identityMigration.sql, /cypressCoverage/);
  assert.match(identityMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(identityMigration.sql, /not \(value \? 'cypressCoverage'\)/);
  assert.match(identityMigration.sql, /feature_mechanization_local_rails/);
  assert.match(identityMigration.sql, /frontend_component_local_files/);
  assert.doesNotMatch(identityMigration.sql, /truncate\s+/i);
});

test('tracked migrations complete source import schema identity symbol evidence', () => {
  const migrations = readMigrationFiles();
  const evidenceMigration = migrations.find(
    (migration) =>
      migration.fileName === '513_source_import_schema_identity_evidence_completion.sql'
  );

  assert.ok(evidenceMigration);
  assert.match(evidenceMigration.sql, /SourceImportSchemaIdentity/);
  assert.match(evidenceMigration.sql, /buildSourceImportSchemaKey/);
  assert.match(evidenceMigration.sql, /toggleSourceImportSchemaSelection/);
  assert.match(evidenceMigration.sql, /architectureGuard/);
  assert.match(evidenceMigration.sql, /cypressCoverage/);
  assert.match(evidenceMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(evidenceMigration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(evidenceMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import live proof byte-size seed alignment', () => {
  const migrations = readMigrationFiles();
  const liveProofSeedMigration = migrations.find(
    (migration) =>
      migration.fileName === '545_source_import_live_proof_byte_size_seed_alignment.sql'
  );

  assert.ok(liveProofSeedMigration);
  assert.match(liveProofSeedMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(liveProofSeedMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(liveProofSeedMigration.sql, /buildLocalWarehouseConnectionCatalog/);
  assert.match(liveProofSeedMigration.sql, /byteSize:\s*4096000/);
  assert.match(liveProofSeedMigration.sql, /3\.9 MB/);
  assert.match(liveProofSeedMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(liveProofSeedMigration.sql, /run-dev-stack\.test\.cjs/);
  assert.match(liveProofSeedMigration.sql, /EV-SOURCE-IMPORT-LIVE-PROOF-BYTE-SIZE-SEED/);
  assert.match(liveProofSeedMigration.sql, /frontend_component_validation_evidence/);
  assert.match(liveProofSeedMigration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(liveProofSeedMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(liveProofSeedMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import graph card strategy sharing', () => {
  const migrations = readMigrationFiles();
  const cardStrategyMigration = migrations.find(
    (migration) => migration.fileName === '546_source_import_graph_card_strategy_sharing.sql'
  );

  assert.ok(cardStrategyMigration);
  assert.match(cardStrategyMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(cardStrategyMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(cardStrategyMigration.sql, /SYS-WEB-PLUGINS-CORE/);
  assert.match(cardStrategyMigration.sql, /SYS-WEB-PLUGINS-DVT/);
  assert.match(cardStrategyMigration.sql, /web\.component\.canvas\.GraphNodeCardStrategy/);
  assert.match(cardStrategyMigration.sql, /graphStrategyRegistry\.ts/);
  assert.match(cardStrategyMigration.sql, /dvtContributions\.ts/);
  assert.match(cardStrategyMigration.sql, /dvt\.warehouse-source/);
  assert.match(cardStrategyMigration.sql, /graphNodeCardStrategies/);
  assert.match(cardStrategyMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(cardStrategyMigration.sql, /EV-SOURCE-IMPORT-GRAPH-CARD-STRATEGY-SHARING/);
  assert.doesNotMatch(cardStrategyMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(cardStrategyMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import graph card artifact path projection', () => {
  const migrations = readMigrationFiles();
  const artifactPathMigration = migrations.find(
    (migration) =>
      migration.fileName === '547_source_import_graph_card_artifact_path_projection.sql'
  );

  assert.ok(artifactPathMigration);
  assert.match(artifactPathMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(artifactPathMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(artifactPathMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(artifactPathMigration.sql, /ResolveGraphNodeCardReadModel/);
  assert.match(artifactPathMigration.sql, /dvtGraphNodeCardStrategy\.ts/);
  assert.match(artifactPathMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(artifactPathMigration.sql, /models\/sources\/src_public\.yml/);
  assert.match(artifactPathMigration.sql, /EV-SOURCE-IMPORT-GRAPH-CARD-ARTIFACT-PATH/);
  assert.doesNotMatch(artifactPathMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(artifactPathMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile source import graph card feature mechanization surfaces', () => {
  const migrations = readMigrationFiles();
  const mechanizationMigration = migrations.find(
    (migration) =>
      migration.fileName === '548_source_import_graph_card_feature_mechanization_reconcile.sql'
  );

  assert.ok(mechanizationMigration);
  assert.match(mechanizationMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(mechanizationMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(mechanizationMigration.sql, /allowedImplementationSurfaces/);
  assert.match(
    mechanizationMigration.sql,
    /apps\/web\/src\/app\/plugins\/graphStrategyRegistry\.ts/
  );
  assert.match(mechanizationMigration.sql, /buildDvtArtifactPath/);
  assert.match(mechanizationMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(mechanizationMigration.sql, /ResolveGraphNodeCardReadModel/);
  assert.match(mechanizationMigration.sql, /graphNodeCardReadModel\.test\.ts/);
  assert.match(mechanizationMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.doesNotMatch(mechanizationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(mechanizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations prove source import creates a live warehouse connection', () => {
  const migrations = readMigrationFiles();
  const liveConnectionMigration = migrations.find(
    (migration) => migration.fileName === '549_source_import_create_connection_live_proof.sql'
  );

  assert.ok(liveConnectionMigration);
  assert.match(liveConnectionMigration.sql, /E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1/);
  assert.match(liveConnectionMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(liveConnectionMigration.sql, /CreateWarehouseConnection/);
  assert.match(liveConnectionMigration.sql, /TestWarehouseConnection/);
  assert.match(liveConnectionMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(liveConnectionMigration.sql, /ImportWarehouseSources/);
  assert.match(liveConnectionMigration.sql, /RenderCanvasGraphNodeCard/);
  assert.match(liveConnectionMigration.sql, /source-import-create-connection-name/);
  assert.match(liveConnectionMigration.sql, /source-import-create-connection-type/);
  assert.match(liveConnectionMigration.sql, /source-import-create-connection-database/);
  assert.match(liveConnectionMigration.sql, /source-import-create-connection-credential-ref/);
  assert.match(liveConnectionMigration.sql, /env:DVT_LOCAL_POSTGRES_WAREHOUSE_URL/);
  assert.match(liveConnectionMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(liveConnectionMigration.sql, /SourceImportWizard\.test\.tsx/);
  assert.match(liveConnectionMigration.sql, /EV-SOURCE-IMPORT-CREATE-CONNECTION-LIVE-PROOF/);
  assert.doesNotMatch(
    liveConnectionMigration.sql,
    /preselecting Local Postgres proof as the only browser evidence.*false/i
  );
  assert.doesNotMatch(liveConnectionMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(liveConnectionMigration.sql, /truncate\s+/i);
});

test('tracked migrations keep created source import connection visible', () => {
  const migrations = readMigrationFiles();
  const visibilityMigration = migrations.find(
    (migration) => migration.fileName === '550_source_import_selected_connection_visibility.sql'
  );

  assert.ok(visibilityMigration);
  assert.match(visibilityMigration.sql, /E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1/);
  assert.match(visibilityMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(visibilityMigration.sql, /ConnectionStep\.tsx/);
  assert.match(visibilityMigration.sql, /CreateWarehouseConnection/);
  assert.match(visibilityMigration.sql, /TestWarehouseConnection/);
  assert.match(visibilityMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(visibilityMigration.sql, /source-import-connection-option/);
  assert.match(visibilityMigration.sql, /scrollIntoView with block center/);
  assert.match(visibilityMigration.sql, /EV-SOURCE-IMPORT-CREATED-CONNECTION-VISIBLE/);
  assert.match(visibilityMigration.sql, /SourceImportWizard\.test\.tsx/);
  assert.match(visibilityMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.doesNotMatch(visibilityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(visibilityMigration.sql, /truncate\s+/i);
});

test('tracked migrations preserve live Postgres source import row metrics', () => {
  const migrations = readMigrationFiles();
  const liveTupleMigration = migrations.find(
    (migration) => migration.fileName === '551_source_import_postgres_live_tuple_fallback.sql'
  );

  assert.ok(liveTupleMigration);
  assert.match(liveTupleMigration.sql, /E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1/);
  assert.match(liveTupleMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(liveTupleMigration.sql, /WorkspaceWarehouseConnectionProbe/);
  assert.match(liveTupleMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(liveTupleMigration.sql, /pg_stat_get_live_tuples/);
  assert.match(liveTupleMigration.sql, /reltuples remains -1/);
  assert.match(liveTupleMigration.sql, /Rows unknown/);
  assert.match(liveTupleMigration.sql, /WorkspaceWarehouseConnectionProbe\.test\.ts/);
  assert.match(liveTupleMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.doesNotMatch(liveTupleMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(liveTupleMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare source import live Cypress helper symbols', () => {
  const migrations = readMigrationFiles();
  const helperSymbolsMigration = migrations.find(
    (migration) => migration.fileName === '552_source_import_live_cypress_helper_symbols.sql'
  );

  assert.ok(helperSymbolsMigration);
  assert.match(helperSymbolsMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(helperSymbolsMigration.sql, /toStableYamlIdentifierPart/);
  assert.match(helperSymbolsMigration.sql, /expectedLivePostgresSourceName/);
  assert.match(helperSymbolsMigration.sql, /createLivePostgresConnection/);
  assert.match(helperSymbolsMigration.sql, /AttachWarehouseSourceFromCanvasContext/);
  assert.match(helperSymbolsMigration.sql, /CreateWarehouseConnection/);
  assert.match(helperSymbolsMigration.sql, /TestWarehouseConnection/);
  assert.match(helperSymbolsMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(helperSymbolsMigration.sql, /ImportWarehouseSources/);
  assert.match(
    helperSymbolsMigration.sql,
    /apps\/web\/cypress\/e2e\/canvas\/canvas-source-import-live-clean\.cy\.ts/
  );
  assert.match(
    helperSymbolsMigration.sql,
    /apps\/web\/src\/app\/components\/SourceImportWizard\.test\.tsx/
  );
  assert.doesNotMatch(helperSymbolsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(helperSymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import review preview metrics', () => {
  const migrations = readMigrationFiles();
  const reviewMetricsMigration = migrations.find(
    (migration) => migration.fileName === '553_source_import_review_preview_metrics.sql'
  );

  assert.ok(reviewMetricsMigration);
  assert.match(reviewMetricsMigration.sql, /E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1/);
  assert.match(reviewMetricsMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(reviewMetricsMigration.sql, /ImportWarehouseSources/);
  assert.match(reviewMetricsMigration.sql, /sourceImportReviewModel\.ts/);
  assert.match(reviewMetricsMigration.sql, /buildSourceImportReviewPreviewGroups/);
  assert.match(reviewMetricsMigration.sql, /SourceImportReviewView\.tsx/);
  assert.match(reviewMetricsMigration.sql, /data-source-import-review-table/);
  assert.match(reviewMetricsMigration.sql, /rowCountLabel/);
  assert.match(reviewMetricsMigration.sql, /byteSizeLabel/);
  assert.match(reviewMetricsMigration.sql, /columnCountLabel/);
  assert.match(reviewMetricsMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(reviewMetricsMigration.sql, /EV-SOURCE-IMPORT-REVIEW-METRICS-LIVE-E2E/);
  assert.doesNotMatch(reviewMetricsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(reviewMetricsMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare source import review preview group type symbol', () => {
  const migrations = readMigrationFiles();
  const reviewTypeSymbolMigration = migrations.find(
    (migration) => migration.fileName === '554_source_import_review_preview_group_type_symbol.sql'
  );

  assert.ok(reviewTypeSymbolMigration);
  assert.match(reviewTypeSymbolMigration.sql, /E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1/);
  assert.match(reviewTypeSymbolMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.match(reviewTypeSymbolMigration.sql, /SourceImportReviewPreviewGroupViewModel/);
  assert.match(reviewTypeSymbolMigration.sql, /sourceImportReviewModel\.ts/);
  assert.match(reviewTypeSymbolMigration.sql, /ImportWarehouseSources/);
  assert.match(reviewTypeSymbolMigration.sql, /review_read_model_contract/);
  assert.doesNotMatch(reviewTypeSymbolMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(reviewTypeSymbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations expose source import wizard steps as a frontend component', () => {
  const migrations = readMigrationFiles();
  const wizardStepsComponentMigration = migrations.find(
    (migration) => migration.fileName === '555_source_import_wizard_steps_frontend_component.sql'
  );

  assert.ok(wizardStepsComponentMigration);
  assert.match(wizardStepsComponentMigration.sql, /frontend_component_local_components/);
  assert.match(wizardStepsComponentMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS/);
  assert.match(wizardStepsComponentMigration.sql, /SourceImportWizardSteps/);
  assert.match(wizardStepsComponentMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(wizardStepsComponentMigration.sql, /SourceImportReviewView\.tsx/);
  assert.match(wizardStepsComponentMigration.sql, /sourceImportReviewModel\.ts/);
  assert.match(wizardStepsComponentMigration.sql, /ImportWarehouseSources/);
  assert.match(
    wizardStepsComponentMigration.sql,
    /where feature_id = 'E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1'/
  );
  assert.match(wizardStepsComponentMigration.sql, /and rail_name = 'ImportWarehouseSources'/);
  assert.match(wizardStepsComponentMigration.sql, /EV-SOURCE-IMPORT-WIZARD-STEPS-COMPONENT-QUERY/);
  assert.match(
    wizardStepsComponentMigration.sql,
    /frontend-component-files --component SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS/
  );
  assert.doesNotMatch(wizardStepsComponentMigration.sql, /E-CANVAS-ADD-SOURCE-LIVE-FLOW-1/);
  assert.doesNotMatch(wizardStepsComponentMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(wizardStepsComponentMigration.sql, /truncate\s+/i);
});

test('tracked migrations deduplicate source import wizard step file ownership', () => {
  const migrations = readMigrationFiles();
  const ownershipDedupMigration = migrations.find(
    (migration) => migration.fileName === '557_source_import_wizard_step_file_ownership_dedup.sql'
  );

  assert.ok(ownershipDedupMigration);
  assert.match(ownershipDedupMigration.sql, /retiredForSourceImportStepOwnership/);
  assert.match(ownershipDedupMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(ownershipDedupMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS/);
  assert.match(ownershipDedupMigration.sql, /WarehouseConnectionCreateForm\.tsx/);
  assert.match(ownershipDedupMigration.sql, /and file_role = 'presentation'/);
  assert.match(
    ownershipDedupMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(
    ownershipDedupMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.match(ownershipDedupMigration.sql, /EV-SOURCE-IMPORT-WIZARD-STEP-FILE-OWNERSHIP-DEDUP/);
  assert.doesNotMatch(ownershipDedupMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile source import shared wizard ownership drift', () => {
  const migrations = readMigrationFiles();
  const sharedOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '558_source_import_shared_wizard_ownership_drift.sql'
  );

  assert.ok(sharedOwnershipMigration);
  assert.match(sharedOwnershipMigration.sql, /retiredForSourceImportSharedOwnership/);
  assert.match(
    sharedOwnershipMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/copy\.ts/
  );
  assert.match(
    sharedOwnershipMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/ReviewStep\.tsx/
  );
  assert.match(
    sharedOwnershipMigration.sql,
    /apps\/web\/src\/app\/components\/sourceImportWizard\/useSourceImportWizard\.ts/
  );
  assert.match(sharedOwnershipMigration.sql, /EV-SOURCE-IMPORT-SHARED-WIZARD-OWNERSHIP-DEDUP/);
  assert.match(
    sharedOwnershipMigration.sql,
    /create or replace view planning_query_store\.frontend_component_file_query/
  );
  assert.match(
    sharedOwnershipMigration.sql,
    /create or replace view planning_query_store\.frontend_component_summary_query/
  );
  assert.doesNotMatch(sharedOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations expose source import live proof files through DB ownership', () => {
  const migrations = readMigrationFiles();
  const liveProofOwnershipMigration = migrations.find(
    (migration) => migration.fileName === '559_source_import_live_proof_db_first_ownership.sql'
  );

  assert.ok(liveProofOwnershipMigration);
  assert.match(liveProofOwnershipMigration.sql, /frontend_component_local_files/);
  assert.match(liveProofOwnershipMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(liveProofOwnershipMigration.sql, /run-canvas-source-import-live-proof\.cjs/);
  assert.match(
    liveProofOwnershipMigration.sql,
    /CanvasSourceImportLiveProof\.architecture\.test\.ts/
  );
  assert.match(liveProofOwnershipMigration.sql, /EV-SOURCE-IMPORT-LIVE-PROOF-DB-FIRST-OWNERSHIP/);
  assert.match(liveProofOwnershipMigration.sql, /AttachWarehouseSourceFromCanvasContext/);
  assert.match(liveProofOwnershipMigration.sql, /pnpm planning:db:query frontend-component-files/);
  assert.match(
    liveProofOwnershipMigration.sql,
    /component-integrity --component web\.component\.canvas\.SourceImportDialog/
  );
  assert.doesNotMatch(liveProofOwnershipMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(liveProofOwnershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile source import supported provider catalog', () => {
  const migrations = readMigrationFiles();
  const providerCatalogMigration = migrations.find(
    (migration) => migration.fileName === '560_source_import_supported_provider_catalog.sql'
  );
  const providerTypeSymbolMigration = migrations.find(
    (migration) => migration.fileName === '561_source_import_provider_type_symbol_refs.sql'
  );
  const providerManifestSymbolMigration = migrations.find(
    (migration) => migration.fileName === '562_source_import_provider_catalog_manifest_symbols.sql'
  );

  assert.ok(providerCatalogMigration);
  assert.ok(providerTypeSymbolMigration);
  assert.ok(providerManifestSymbolMigration);
  assert.match(providerCatalogMigration.sql, /SUPPORTED_WAREHOUSE_CONNECTION_TYPES/);
  assert.match(
    providerCatalogMigration.sql,
    /WorkspaceWarehouseConnectionCatalog\.ts#WarehouseConnectionCatalogSchema/
  );
  assert.match(providerCatalogMigration.sql, /CreateWarehouseConnection/);
  assert.match(providerCatalogMigration.sql, /E-SOURCE-IMPORT-PROVIDER-CATALOG-1/);
  assert.match(providerCatalogMigration.sql, /EV-SOURCE-IMPORT-SUPPORTED-PROVIDER-CATALOG/);
  assert.match(providerCatalogMigration.sql, /closedUnsupportedVendorUnionRetired/);
  assert.match(
    providerTypeSymbolMigration.sql,
    /apps\/api\/src\/application\/ports\/warehouseSourceImport\.ts#WarehouseConnectionType/
  );
  assert.match(
    providerTypeSymbolMigration.sql,
    /apps\/web\/src\/app\/ports\/workspace\.ts#WarehouseConnectionType/
  );
  assert.match(
    providerManifestSymbolMigration.sql,
    /'name', 'SUPPORTED_WAREHOUSE_CONNECTION_TYPES'/
  );
  assert.match(providerManifestSymbolMigration.sql, /'name', 'WarehouseConnectionType'/);
  assert.match(
    providerManifestSymbolMigration.sql,
    /'path', 'apps\/api\/src\/application\/ports\/warehouseSourceImport\.ts'/
  );
  assert.match(
    providerManifestSymbolMigration.sql,
    /'path', 'apps\/web\/src\/app\/ports\/workspace\.ts'/
  );
  assert.doesNotMatch(providerCatalogMigration.sql, /reservedContractTypes/);
  assert.doesNotMatch(providerCatalogMigration.sql, /supportedWarehouseConnectionTypes/);
  assert.doesNotMatch(providerCatalogMigration.sql, /truncate\s+/i);
});

test('tracked migrations retire obsolete generic SourceImport rail aliases', () => {
  const migrations = readMigrationFiles();
  const aliasRetirementMigration = migrations.find(
    (migration) => migration.fileName === '563_retire_source_import_generic_alias_rails.sql'
  );
  const importedAliasRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '564_retire_imported_source_import_generic_alias_rails.sql'
  );
  const documentedAliasRetirementMigration = migrations.find(
    (migration) =>
      migration.fileName === '565_retire_documented_source_import_generic_alias_rails.sql'
  );
  const documentedAliasLocalOverrideMigration = migrations.find(
    (migration) =>
      migration.fileName === '566_retire_documented_source_import_alias_local_overrides.sql'
  );
  const providerDebtAliasLocalOverrideMigration = migrations.find(
    (migration) =>
      migration.fileName === '567_retire_provider_debt_source_import_alias_local_overrides.sql'
  );
  const aliasLocalOverrideManifestCleanupMigration = migrations.find(
    (migration) => migration.fileName === '568_clean_source_import_alias_override_raw_manifests.sql'
  );

  assert.ok(aliasRetirementMigration);
  assert.ok(importedAliasRetirementMigration);
  assert.ok(documentedAliasRetirementMigration);
  assert.ok(documentedAliasLocalOverrideMigration);
  assert.ok(providerDebtAliasLocalOverrideMigration);
  assert.ok(aliasLocalOverrideManifestCleanupMigration);
  assert.match(aliasRetirementMigration.sql, /SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT/);
  assert.match(aliasRetirementMigration.sql, /ListSourceImportConnections/);
  assert.match(aliasRetirementMigration.sql, /ListSourceImportObjects/);
  assert.match(aliasRetirementMigration.sql, /ImportSourceObjects/);
  assert.match(aliasRetirementMigration.sql, /CheckSourceImportProviderExtensibility/);
  assert.match(aliasRetirementMigration.sql, /ListWarehouseConnections/);
  assert.match(aliasRetirementMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(aliasRetirementMigration.sql, /ImportWarehouseSources/);
  assert.match(aliasRetirementMigration.sql, /CreateWarehouseConnection/);
  assert.match(aliasRetirementMigration.sql, /rail_status = 'retired'/);
  assert.match(aliasRetirementMigration.sql, /Generic SourceImport rail alias superseded/);
  assert.match(
    aliasRetirementMigration.sql,
    /retiredBy', '563_retire_source_import_generic_alias_rails'/
  );
  assert.match(importedAliasRetirementMigration.sql, /planning_query_store\.command_query_rails/);
  assert.match(importedAliasRetirementMigration.sql, /ListSourceImportConnections/);
  assert.match(importedAliasRetirementMigration.sql, /ListSourceImportObjects/);
  assert.match(importedAliasRetirementMigration.sql, /ImportSourceObjects/);
  assert.match(importedAliasRetirementMigration.sql, /CheckSourceImportProviderExtensibility/);
  assert.match(importedAliasRetirementMigration.sql, /ListWarehouseConnections/);
  assert.match(importedAliasRetirementMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(importedAliasRetirementMigration.sql, /ImportWarehouseSources/);
  assert.match(importedAliasRetirementMigration.sql, /CreateWarehouseConnection/);
  assert.match(importedAliasRetirementMigration.sql, /rail_status = 'retired'/);
  assert.match(
    importedAliasRetirementMigration.sql,
    /Imported generic SourceImport rail alias superseded/
  );
  assert.match(
    importedAliasRetirementMigration.sql,
    /retiredBy', '564_retire_imported_source_import_generic_alias_rails'/
  );
  assert.match(documentedAliasRetirementMigration.sql, /planning_query_store\.command_query_rails/);
  assert.match(
    documentedAliasRetirementMigration.sql,
    /source-import-provider-extensibility-debt-plan-20260503\.md/
  );
  assert.match(documentedAliasRetirementMigration.sql, /ListSourceImportConnections/);
  assert.match(documentedAliasRetirementMigration.sql, /ListSourceImportObjects/);
  assert.match(documentedAliasRetirementMigration.sql, /ImportSourceObjects/);
  assert.match(documentedAliasRetirementMigration.sql, /CheckSourceImportProviderExtensibility/);
  assert.match(documentedAliasRetirementMigration.sql, /ListWarehouseConnections/);
  assert.match(documentedAliasRetirementMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(documentedAliasRetirementMigration.sql, /ImportWarehouseSources/);
  assert.match(documentedAliasRetirementMigration.sql, /CreateWarehouseConnection/);
  assert.match(documentedAliasRetirementMigration.sql, /rail_status = 'retired'/);
  assert.match(
    documentedAliasRetirementMigration.sql,
    /Documented generic SourceImport alias superseded/
  );
  assert.match(
    documentedAliasRetirementMigration.sql,
    /retiredBy', '565_retire_documented_source_import_generic_alias_rails'/
  );
  assert.match(
    documentedAliasLocalOverrideMigration.sql,
    /planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(documentedAliasLocalOverrideMigration.sql, /DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /ListSourceImportConnections/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /ListSourceImportObjects/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /ImportSourceObjects/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /CheckSourceImportProviderExtensibility/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /ListWarehouseConnections/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /ImportWarehouseSources/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /CreateWarehouseConnection/);
  assert.match(documentedAliasLocalOverrideMigration.sql, /'retired'/);
  assert.match(
    documentedAliasLocalOverrideMigration.sql,
    /Documented generic SourceImport alias local override/
  );
  assert.match(
    documentedAliasLocalOverrideMigration.sql,
    /retiredBy', '566_retire_documented_source_import_alias_local_overrides'/
  );
  assert.match(
    providerDebtAliasLocalOverrideMigration.sql,
    /planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    providerDebtAliasLocalOverrideMigration.sql,
    /SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT/
  );
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /ListSourceImportConnections/);
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /ListSourceImportObjects/);
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /ImportSourceObjects/);
  assert.match(
    providerDebtAliasLocalOverrideMigration.sql,
    /CheckSourceImportProviderExtensibility/
  );
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /ListWarehouseConnections/);
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /ImportWarehouseSources/);
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /CreateWarehouseConnection/);
  assert.match(providerDebtAliasLocalOverrideMigration.sql, /'retired'/);
  assert.match(
    providerDebtAliasLocalOverrideMigration.sql,
    /Provider debt generic SourceImport alias local override/
  );
  assert.match(
    providerDebtAliasLocalOverrideMigration.sql,
    /retiredBy', '567_retire_provider_debt_source_import_alias_local_overrides'/
  );
  assert.match(
    aliasLocalOverrideManifestCleanupMigration.sql,
    /planning_query_store\.feature_mechanization_local_rails/
  );
  assert.match(
    aliasLocalOverrideManifestCleanupMigration.sql,
    /raw_manifest = raw_manifest - 'featureId'/
  );
  assert.match(
    aliasLocalOverrideManifestCleanupMigration.sql,
    /566_retire_documented_source_import_alias_local_overrides/
  );
  assert.match(
    aliasLocalOverrideManifestCleanupMigration.sql,
    /567_retire_provider_debt_source_import_alias_local_overrides/
  );
  assert.doesNotMatch(aliasRetirementMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(aliasRetirementMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(importedAliasRetirementMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(importedAliasRetirementMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(documentedAliasRetirementMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(documentedAliasRetirementMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(documentedAliasLocalOverrideMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(documentedAliasLocalOverrideMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(providerDebtAliasLocalOverrideMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(providerDebtAliasLocalOverrideMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(aliasLocalOverrideManifestCleanupMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(aliasLocalOverrideManifestCleanupMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import atomic draft-file evidence', () => {
  const migrations = readMigrationFiles();
  const atomicityMigration = migrations.find(
    (migration) => migration.fileName === '572_source_import_atomic_draft_files.sql'
  );
  const userStoryMigration = migrations.find(
    (migration) => migration.fileName === '573_source_import_atomic_draft_files_user_story.sql'
  );

  assert.ok(atomicityMigration);
  assert.ok(userStoryMigration);
  assert.match(atomicityMigration.sql, /ImportWarehouseSourcesUseCase\.execute/);
  assert.match(atomicityMigration.sql, /SOURCE-IMPORT-ATOMICITY-001/);
  assert.match(
    atomicityMigration.sql,
    /source_yaml_persistence_must_succeed_before_graph_draft_acceptance/
  );
  assert.match(
    atomicityMigration.sql,
    /does not accept the draft mutation when source YAML persistence fails/
  );
  assert.match(
    atomicityMigration.sql,
    /api\.component\.warehouseSourceImport\.ImportWarehouseSourcesUseCase/
  );
  assert.match(
    atomicityMigration.sql,
    /apps\/api\/test\/application\/services\/importWarehouseSourcesUseCase\.test\.ts/
  );
  assert.match(userStoryMigration.sql, /userStories/);
  assert.match(
    userStoryMigration.sql,
    /Source import graph commits are atomic with source YAML persistence/
  );
  assert.match(
    userStoryMigration.sql,
    /local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources/
  );
  assert.doesNotMatch(atomicityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(atomicityMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(userStoryMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(userStoryMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import draft-conflict YAML rollback evidence', () => {
  const migrations = readMigrationFiles();
  const rollbackMigration = migrations.find(
    (migration) => migration.fileName === '584_source_import_draft_conflict_yaml_rollback.sql'
  );
  const conditionalRollbackMigration = migrations.find(
    (migration) => migration.fileName === '585_source_import_conditional_yaml_rollback.sql'
  );

  assert.ok(rollbackMigration);
  assert.ok(conditionalRollbackMigration);
  assert.match(rollbackMigration.sql, /SOURCE-IMPORT-ATOMICITY-002/);
  assert.match(rollbackMigration.sql, /ImportWarehouseSourcesUseCase\.rollbackSourceYamlUpdates/);
  assert.match(rollbackMigration.sql, /IWorkspaceFileRepository\.deleteFileContent/);
  assert.match(conditionalRollbackMigration.sql, /SOURCE-IMPORT-ATOMICITY-003/);
  assert.match(
    conditionalRollbackMigration.sql,
    /ImportWarehouseSourcesUseCase\.readCurrentSourceYamlContent/
  );
  assert.match(
    conditionalRollbackMigration.sql,
    /source_yaml_writes_are_compensated_only_when_current_content_matches_failed_write/
  );
  assert.match(rollbackMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(conditionalRollbackMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(
    rollbackMigration.sql,
    /does not persist source YAML when the authoritative draft changed before save/
  );
  assert.match(
    conditionalRollbackMigration.sql,
    /does not roll back source YAML replaced by a concurrent winning import/
  );
  assert.match(rollbackMigration.sql, /apps\/api\/src\/application\/ports\/workspaceFiles\.ts/);
  assert.match(
    rollbackMigration.sql,
    /apps\/api\/src\/infrastructure\/workspaceFiles\/LocalWorkspaceFileRepository\.ts/
  );
  assert.match(
    rollbackMigration.sql,
    /apps\/api\/test\/infrastructure\/warehouseSourceImport\/WorkspaceWarehouseConnectionCatalog\.test\.ts/
  );
  assert.match(
    rollbackMigration.sql,
    /local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources/
  );
  assert.doesNotMatch(rollbackMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(rollbackMigration.sql, /truncate\s+/i);
});

test('tracked migrations harden source import catalog schema-scope accessibility', () => {
  const migrations = readMigrationFiles();
  const schemaScopeMigration = migrations.find(
    (migration) => migration.fileName === '574_source_import_catalog_accessible_schema_scope.sql'
  );
  const schemaIdentityMigration = migrations.find(
    (migration) => migration.fileName === '575_source_import_catalog_schema_identity_keys.sql'
  );
  const schemaDatabaseContextMigration = migrations.find(
    (migration) =>
      migration.fileName === '576_source_import_catalog_schema_database_context_label.sql'
  );
  const tableIdentityMigration = migrations.find(
    (migration) => migration.fileName === '577_source_import_catalog_table_identity_keys.sql'
  );
  const tableIdentityManifestMigration = migrations.find(
    (migration) =>
      migration.fileName === '578_source_import_catalog_table_identity_manifest_symbols.sql'
  );
  const reviewTableIdentityMigration = migrations.find(
    (migration) => migration.fileName === '579_source_import_review_table_identity_selector.sql'
  );
  const groupingStrategyContractMigration = migrations.find(
    (migration) => migration.fileName === '580_source_import_grouping_strategy_contract.sql'
  );
  const groupingStrategySymbolsMigration = migrations.find(
    (migration) => migration.fileName === '581_source_import_grouping_strategy_manifest_symbols.sql'
  );

  assert.ok(schemaScopeMigration);
  assert.ok(schemaIdentityMigration);
  assert.ok(schemaDatabaseContextMigration);
  assert.ok(tableIdentityMigration);
  assert.ok(tableIdentityManifestMigration);
  assert.ok(reviewTableIdentityMigration);
  assert.ok(groupingStrategyContractMigration);
  assert.ok(groupingStrategySymbolsMigration);
  assert.match(schemaScopeMigration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/);
  assert.match(schemaScopeMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(schemaScopeMigration.sql, /schemaScopeInvariant/);
  assert.match(schemaScopeMigration.sql, /schemaGroupKeyInvariant/);
  assert.match(schemaScopeMigration.sql, /structured database and schema identity/);
  assert.match(schemaScopeMigration.sql, /collision-free nested map/);
  assert.match(schemaScopeMigration.sql, /must not use a dot-joined database\.schema string/);
  assert.match(schemaScopeMigration.sql, /SourceImportSchemaHeader/);
  assert.match(schemaScopeMigration.sql, /SourceImportCatalogCopy\.selectSourceSchema/);
  assert.match(schemaScopeMigration.sql, /groupTablesBySchema/);
  assert.match(schemaScopeMigration.sql, /buildPreviewGroups/);
  assert.match(schemaScopeMigration.sql, /EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-SCOPE-A11Y/);
  assert.match(schemaScopeMigration.sql, /E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1/);
  assert.doesNotMatch(schemaScopeMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(schemaScopeMigration.sql, /truncate\s+/i);
  assert.match(schemaIdentityMigration.sql, /schemaDomIdentityInvariant/);
  assert.match(schemaIdentityMigration.sql, /structured \[database, schema\] token/);
  assert.match(schemaIdentityMigration.sql, /schemaAccessibilityInvariant/);
  assert.match(schemaIdentityMigration.sql, /buildSourceImportSchemaKey/);
  assert.match(schemaIdentityMigration.sql, /EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-IDENTITY-KEYS/);
  assert.match(schemaIdentityMigration.sql, /RAW\.PROD\/PUBLIC and RAW\/PROD\.PUBLIC/);
  assert.doesNotMatch(schemaIdentityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(schemaIdentityMigration.sql, /truncate\s+/i);
  assert.match(schemaDatabaseContextMigration.sql, /schemaDatabaseContextInvariant/);
  assert.match(schemaDatabaseContextMigration.sql, /schema action with database context/);
  assert.match(schemaDatabaseContextMigration.sql, /database as non-action context/);
  assert.match(
    schemaDatabaseContextMigration.sql,
    /SOURCE_IMPORT_WIZARD_COPY\.catalog\.inSourceDatabase/
  );
  assert.match(
    schemaDatabaseContextMigration.sql,
    /EV-WEB-SOURCE-IMPORT-CATALOG-SCHEMA-DATABASE-CONTEXT-LABEL/
  );
  assert.doesNotMatch(schemaDatabaseContextMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(schemaDatabaseContextMigration.sql, /truncate\s+/i);
  assert.match(tableIdentityMigration.sql, /tableIdentityInvariant/);
  assert.match(tableIdentityMigration.sql, /structured \[database, schema, table\]/);
  assert.match(tableIdentityMigration.sql, /buildWarehouseTableIdentityKey/);
  assert.match(tableIdentityMigration.sql, /SourceImportTableViewModel\.identityKey/);
  assert.match(tableIdentityMigration.sql, /EV-WEB-SOURCE-IMPORT-CATALOG-TABLE-IDENTITY-KEYS/);
  assert.match(
    tableIdentityMigration.sql,
    /RAW\.PROD\/PUBLIC\/ORDERS and RAW\/PROD\.PUBLIC\/ORDERS/
  );
  assert.doesNotMatch(tableIdentityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(tableIdentityMigration.sql, /truncate\s+/i);
  assert.match(tableIdentityManifestMigration.sql, /raw_manifest -> 'symbols'/);
  assert.match(tableIdentityManifestMigration.sql, /buildWarehouseTableIdentityKey/);
  assert.match(tableIdentityManifestMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(tableIdentityManifestMigration.sql, /display text is not selection authority/);
  assert.doesNotMatch(tableIdentityManifestMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(tableIdentityManifestMigration.sql, /truncate\s+/i);
  assert.match(reviewTableIdentityMigration.sql, /reviewTableIdentityInvariant/);
  assert.match(reviewTableIdentityMigration.sql, /data-source-import-review-table-identity/);
  assert.match(reviewTableIdentityMigration.sql, /SourceImportTableViewModel\.identityKey/);
  assert.match(reviewTableIdentityMigration.sql, /EV-SOURCE-IMPORT-REVIEW-TABLE-IDENTITY-SELECTOR/);
  assert.match(reviewTableIdentityMigration.sql, /E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1/);
  assert.match(reviewTableIdentityMigration.sql, /ImportWarehouseSources/);
  assert.doesNotMatch(reviewTableIdentityMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(reviewTableIdentityMigration.sql, /truncate\s+/i);
  assert.match(groupingStrategyContractMigration.sql, /groupingStrategyContract/);
  assert.match(
    groupingStrategyContractMigration.sql,
    /supported', jsonb_build_array\('schema', 'database'\)/
  );
  assert.match(
    groupingStrategyContractMigration.sql,
    /unsupported', jsonb_build_array\('custom'\)/
  );
  assert.match(groupingStrategyContractMigration.sql, /GroupingStep\.test\.tsx/);
  assert.match(groupingStrategyContractMigration.sql, /warehouseSourceImportRoutes\.test\.ts/);
  assert.match(
    groupingStrategyContractMigration.sql,
    /EV-SOURCE-IMPORT-GROUPING-STRATEGY-PRESENTATION/
  );
  assert.match(groupingStrategyContractMigration.sql, /EV-SOURCE-IMPORT-GROUPING-STRATEGY-MODEL/);
  assert.match(groupingStrategyContractMigration.sql, /EV-SOURCE-IMPORT-GROUPING-STRATEGY-HTTP/);
  assert.match(groupingStrategyContractMigration.sql, /'presentation-test'/);
  assert.match(groupingStrategyContractMigration.sql, /'unit-test'/);
  assert.match(groupingStrategyContractMigration.sql, /'integration-test'/);
  assert.match(groupingStrategyContractMigration.sql, /ImportWarehouseSources/);
  assert.doesNotMatch(
    groupingStrategyContractMigration.sql,
    /EV-SOURCE-IMPORT-GROUPING-STRATEGY-CONTRACT/
  );
  assert.doesNotMatch(groupingStrategyContractMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(groupingStrategyContractMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(groupingStrategyContractMigration.sql, /truncate\s+/i);
  assert.match(groupingStrategySymbolsMigration.sql, /raw_manifest/);
  assert.match(groupingStrategySymbolsMigration.sql, /symbols/);
  assert.match(groupingStrategySymbolsMigration.sql, /SUPPORTED_SOURCE_IMPORT_GROUPINGS/);
  assert.match(groupingStrategySymbolsMigration.sql, /SourceImportGroupingStrategy/);
  assert.match(groupingStrategySymbolsMigration.sql, /isSourceImportGroupingStrategy/);
  assert.match(groupingStrategySymbolsMigration.sql, /sourceImportGroupingValue/);
  assert.match(groupingStrategySymbolsMigration.sql, /ImportWarehouseSources/);
  assert.match(
    groupingStrategySymbolsMigration.sql,
    /scripts\/run-canvas-source-import-live-proof\.cjs/
  );
  assert.match(
    groupingStrategySymbolsMigration.sql,
    /\(symbol ->> 'path'\) \|\| '#' \|\| \(symbol ->> 'name'\)/
  );
  assert.doesNotMatch(groupingStrategySymbolsMigration.sql, /frontend-component-inventory\.md/);
  assert.doesNotMatch(groupingStrategySymbolsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(groupingStrategySymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations register source import list connections DB-first rail', () => {
  const migrations = readMigrationFiles();
  const httpMetadataValidationMigration = migrations.find(
    (migration) => migration.fileName === '582_source_import_http_metadata_validation.sql'
  );
  const listConnectionsRailMigration = migrations.find(
    (migration) => migration.fileName === '583_source_import_list_connections_dbfirst_rail.sql'
  );

  assert.ok(httpMetadataValidationMigration);
  assert.ok(listConnectionsRailMigration);
  assert.match(httpMetadataValidationMigration.sql, /isNonNegativeFiniteNumber/);
  assert.match(httpMetadataValidationMigration.sql, /ImportWarehouseSources/);
  assert.match(httpMetadataValidationMigration.sql, /warehouseSourceImportRoutes\.test\.ts/);
  assert.match(listConnectionsRailMigration.sql, /ListWarehouseConnections/);
  assert.match(listConnectionsRailMigration.sql, /web\.component\.canvas\.SourceImportDialog/);
  assert.match(
    listConnectionsRailMigration.sql,
    /IWarehouseSourceImportPort\.listWarehouseConnections/
  );
  assert.match(listConnectionsRailMigration.sql, /GET \/workspace\/warehouse\/connections/);
  assert.match(listConnectionsRailMigration.sql, /useConnectionsLoader/);
  assert.match(listConnectionsRailMigration.sql, /canvas-source-import-live-clean\.cy\.ts/);
  assert.match(listConnectionsRailMigration.sql, /pnpm test:web:e2e:source-import:live/);
  assert.match(
    listConnectionsRailMigration.sql,
    /supersedesSourcePath', 'docs\/architecture\/components\/web\/frontend-component-inventory\.md'/
  );
  assert.doesNotMatch(listConnectionsRailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(listConnectionsRailMigration.sql, /truncate\s+/i);
});

test('tracked migrations register draggable ordered canvas node workbench evidence', () => {
  const migrations = readMigrationFiles();
  const workbenchMigration = migrations.find(
    (migration) => migration.fileName === '587_canvas_node_workbench_draggable_ordered_manifest.sql'
  );

  assert.ok(workbenchMigration);
  assert.match(workbenchMigration.sql, /web\.component\.canvas\.CanvasNodeWorkbenchPanel/);
  assert.match(workbenchMigration.sql, /draggableOverlay/);
  assert.match(workbenchMigration.sql, /presentationOrderInvariant/);
  assert.match(workbenchMigration.sql, /duplicateRowPolicy/);
  assert.match(workbenchMigration.sql, /NodePropertiesTabs\.tsx/);
  assert.match(workbenchMigration.sql, /NodePropertySectionView\.tsx/);
  assert.match(workbenchMigration.sql, /CanvasNodeWorkbenchOverlay\.test\.tsx/);
  assert.match(workbenchMigration.sql, /EV-WEB-CANVAS-NODE-WORKBENCH-DRAGGABLE-OVERLAY/);
  assert.match(workbenchMigration.sql, /EV-WEB-CANVAS-NODE-WORKBENCH-SHARED-PRESENTATION/);
  assert.doesNotMatch(workbenchMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(workbenchMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare draggable ordered canvas node workbench feature symbols', () => {
  const migrations = readMigrationFiles();
  const workbenchSymbolsMigration = migrations.find(
    (migration) =>
      migration.fileName === '588_canvas_node_workbench_draggable_ordered_feature_symbols.sql'
  );

  assert.ok(workbenchSymbolsMigration);
  assert.match(workbenchSymbolsMigration.sql, /CANVAS-NODE-CONTEXT-PROPERTIES-PANEL-20260604/);
  assert.match(workbenchSymbolsMigration.sql, /InspectCanvasNodeProperties/);
  assert.match(workbenchSymbolsMigration.sql, /CanvasNodeWorkbenchDragState/);
  assert.match(workbenchSymbolsMigration.sql, /CanvasNodeWorkbenchDragHandleProps/);
  assert.match(workbenchSymbolsMigration.sql, /buildNodeWorkbenchReadModel/);
  assert.match(workbenchSymbolsMigration.sql, /resolveNodeWorkbenchHiddenGeneralRowLabels/);
  assert.match(workbenchSymbolsMigration.sql, /allowedImplementationSurfaces/);
  assert.match(workbenchSymbolsMigration.sql, /redGreenCycles/);
  assert.match(workbenchSymbolsMigration.sql, /pnpm verify:prepush/);
  assert.doesNotMatch(workbenchSymbolsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(workbenchSymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations record Graph node operational summary no duplicate detail policy', () => {
  const migrations = readMigrationFiles();
  const noDuplicateDetailMigration = migrations.find(
    (migration) =>
      migration.fileName === '589_graph_node_operational_summary_no_duplicate_detail.sql'
  );

  assert.ok(noDuplicateDetailMigration);
  assert.match(noDuplicateDetailMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(noDuplicateDetailMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(noDuplicateDetailMigration.sql, /noDuplicateDetailPolicy/);
  assert.match(noDuplicateDetailMigration.sql, /buildAdditionalOperationalDetail/);
  assert.match(
    noDuplicateDetailMigration.sql,
    /EV-GRAPH-NODE-OPERATIONAL-SUMMARY-NO-DUPLICATE-DETAIL/
  );
  assert.match(
    noDuplicateDetailMigration.sql,
    /static row column and size metrics do not open a duplicate health popover/
  );
  assert.match(noDuplicateDetailMigration.sql, /schema-drift-only detail to be null/);
  assert.match(
    noDuplicateDetailMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/graphNodeOperationalSummary\.test\.ts/
  );
  assert.doesNotMatch(noDuplicateDetailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(noDuplicateDetailMigration.sql, /truncate\s+/i);
});

test('tracked migrations preserve Graph node byte-level health detail policy', () => {
  const migrations = readMigrationFiles();
  const byteDetailMigration = migrations.find(
    (migration) => migration.fileName === '590_graph_node_operational_summary_byte_detail.sql'
  );

  assert.ok(byteDetailMigration);
  assert.match(byteDetailMigration.sql, /RenderGraphNodeCardMetrics/);
  assert.match(byteDetailMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(byteDetailMigration.sql, /byteLevelDetailPolicy/);
  assert.match(byteDetailMigration.sql, /pushByteLevelDetailRows/);
  assert.match(byteDetailMigration.sql, /formatExactBytes/);
  assert.match(byteDetailMigration.sql, /formatAverageBytes/);
  assert.match(byteDetailMigration.sql, /EV-GRAPH-NODE-OPERATIONAL-SUMMARY-BYTE-DETAIL/);
  assert.match(byteDetailMigration.sql, /rowColumnOnlyStaysNonInteractive/);
  assert.match(byteDetailMigration.sql, /byteSizeCreatesComplementaryDetail/);
  assert.match(
    byteDetailMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/graphNodeCardReadModel\.test\.ts/
  );
  assert.doesNotMatch(byteDetailMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(byteDetailMigration.sql, /truncate\s+/i);
});

test('tracked migrations declare Graph node byte formatter feature symbols', () => {
  const migrations = readMigrationFiles();
  const byteFormatterSymbolsMigration = migrations.find(
    (migration) =>
      migration.fileName === '591_graph_node_operational_summary_byte_formatter_symbols.sql'
  );

  assert.ok(byteFormatterSymbolsMigration);
  assert.match(byteFormatterSymbolsMigration.sql, /raw_manifest/);
  assert.match(byteFormatterSymbolsMigration.sql, /formatExactBytes/);
  assert.match(byteFormatterSymbolsMigration.sql, /formatAverageBytes/);
  assert.match(byteFormatterSymbolsMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(byteFormatterSymbolsMigration.sql, /symbol_refs/);
  assert.match(
    byteFormatterSymbolsMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/graphNodeOperationalSummary\.test\.ts/
  );
  assert.doesNotMatch(byteFormatterSymbolsMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(byteFormatterSymbolsMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile source-object metric evidence and component ownership', () => {
  const migrations = readMigrationFiles();
  const sourceObjectMetricBaseline = migrations.find(
    (migration) => migration.fileName === '592_source_import_source_object_metric_evidence.sql'
  );
  const sourceObjectMetricMigration = migrations.find(
    (migration) => migration.fileName === '593_source_import_source_object_metric_architecture.sql'
  );
  const sourceObjectMetricIntegrityMigration = migrations.find(
    (migration) => migration.fileName === '594_source_object_metric_component_integrity.sql'
  );

  assert.ok(sourceObjectMetricBaseline);
  assert.ok(sourceObjectMetricMigration);
  assert.ok(sourceObjectMetricIntegrityMigration);
  assert.match(sourceObjectMetricBaseline.sql, /mandatory-transition/);
  assert.match(sourceObjectMetricMigration.sql, /ImportWarehouseSources/);
  assert.match(sourceObjectMetricMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(sourceObjectMetricMigration.sql, /WarehouseTable/);
  assert.match(sourceObjectMetricMigration.sql, /WarehouseSourceObject\/DataSourceObject/);
  assert.match(sourceObjectMetricMigration.sql, /mandatory-transition/);
  assert.match(sourceObjectMetricMigration.sql, /parquet, JSON, service resources/);
  assert.match(sourceObjectMetricMigration.sql, /SourceObjectMetricEvidence/);
  assert.match(sourceObjectMetricMigration.sql, /sourceMetricEvidence/);
  assert.match(sourceObjectMetricMigration.sql, /measuredTone', 'success/);
  assert.match(sourceObjectMetricMigration.sql, /estimatedTone', 'warning/);
  assert.match(sourceObjectMetricMigration.sql, /buildPostgresSourceObjectMetricEvidence/);
  assert.match(sourceObjectMetricMigration.sql, /loadPostgresPlanRowCount/);
  assert.match(sourceObjectMetricMigration.sql, /loadPostgresColumnsFromDataPlane/);
  assert.match(sourceObjectMetricMigration.sql, /GraphNodeVolumeMetricProjection/);
  assert.match(sourceObjectMetricMigration.sql, /GraphNodeMetricHotspot/);
  assert.match(sourceObjectMetricMigration.sql, /CONTRACT-SOURCE-OBJECT-METRIC-EVIDENCE/);
  assert.match(sourceObjectMetricMigration.sql, /REL-GRAPH-METRIC-ROW-USES-HOTSPOT/);
  assert.match(sourceObjectMetricMigration.sql, /frontend_component_local_files/);
  assert.match(sourceObjectMetricMigration.sql, /EV-GRAPH-NODE-SOURCE-OBJECT-ESTIMATED-SIZE/);
  assert.match(
    sourceObjectMetricMigration.sql,
    /apps\/web\/src\/app\/plugins\/graph\/graphNodeOperationalSummary\.test\.ts/
  );
  assert.match(
    sourceObjectMetricMigration.sql,
    /apps\/api\/test\/infrastructure\/warehouseSourceImport\/WorkspaceWarehouseConnectionProbe\.test\.ts/
  );
  assert.doesNotMatch(sourceObjectMetricMigration.sql, /normalizeWarehouseTableSizeEvidence/);
  assert.match(
    sourceObjectMetricMigration.sql,
    /- 'apps\/web\/src\/app\/plugins\/graph\/graphNodeSourceMetricProjection\.ts#projectGraphNodeSourceMetricEvidence'/
  );
  assert.match(sourceObjectMetricIntegrityMigration.sql, /SYS-API-INFRA-WAREHOUSE-SOURCES/);
  assert.match(
    sourceObjectMetricIntegrityMigration.sql,
    /SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES/
  );
  assert.match(
    sourceObjectMetricIntegrityMigration.sql,
    /governance_component_local_ownership_patterns/
  );
  assert.match(sourceObjectMetricIntegrityMigration.sql, /architecture\.component_port/);
  assert.match(sourceObjectMetricIntegrityMigration.sql, /architecture\.component_test/);
  assert.match(sourceObjectMetricIntegrityMigration.sql, /architecture\.component_observability/);
  assert.match(
    sourceObjectMetricIntegrityMigration.sql,
    /delete from architecture\.component[\s\S]*api\.component\.warehouseSourceImport\.WorkspaceWarehouseConnectionProbe/
  );
  assert.doesNotMatch(sourceObjectMetricMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(sourceObjectMetricMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(sourceObjectMetricIntegrityMigration.sql, /truncate\s+/i);
});

test('tracked migrations canonicalize source-object metric manifests per feature', () => {
  const migrations = readMigrationFiles();
  const canonicalizationMigration = migrations.find(
    (migration) =>
      migration.fileName === '601_source_object_metric_feature_mechanization_canonicalization.sql'
  );

  assert.ok(canonicalizationMigration);
  assert.match(canonicalizationMigration.sql, /canonical_manifests/);
  assert.match(canonicalizationMigration.sql, /deduplicated_symbols/);
  assert.match(canonicalizationMigration.sql, /E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1/);
  assert.match(canonicalizationMigration.sql, /E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1/);
  assert.match(canonicalizationMigration.sql, /cypressCoverage/);
  assert.doesNotMatch(canonicalizationMigration.sql, /delete\s+from/i);
  assert.doesNotMatch(canonicalizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile embedded Canvas control component integrity', () => {
  const migrations = readMigrationFiles();
  const integrityMigration = migrations.find(
    (migration) => migration.fileName === '602_canvas_embedded_control_component_integrity.sql'
  );

  assert.ok(integrityMigration);
  assert.match(integrityMigration.sql, /SYS-WEB-CANVAS-GRAPH-VIEWPORT/);
  assert.match(integrityMigration.sql, /RESP-CANVAS-NODE-PORT-HANDLE/);
  assert.match(integrityMigration.sql, /RESP-CANVAS-NODE-INTERACTION-BOUNDARY/);
  assert.match(integrityMigration.sql, /TEST-CANVAS-NODE-PORT-HANDLE/);
  assert.match(integrityMigration.sql, /component_engineering_component_tree_projection/);
  assert.match(
    integrityMigration.sql,
    /delete from architecture\.component\s+where component_id = 'web\.component\.canvas\.CanvasViewport'/
  );
  assert.doesNotMatch(integrityMigration.sql, /truncate\s+/i);
});

test('tracked migrations assign source-object metric symbols to semantic owners', () => {
  const migrations = readMigrationFiles();
  const ownershipMigration = migrations.find(
    (migration) => migration.fileName === '603_source_object_metric_semantic_ownership.sql'
  );

  assert.ok(ownershipMigration);
  assert.match(ownershipMigration.sql, /feature_symbol_assignment/);
  assert.match(ownershipMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(ownershipMigration.sql, /E-CANVAS-UXDB-COMPONENT-SLICES-1/);
  assert.match(ownershipMigration.sql, /E-CANVAS-ADD-SOURCE-REVIEW-TEMPLATE-1/);
  assert.match(ownershipMigration.sql, /formatter-consumer-only/);
  assert.match(ownershipMigration.sql, /relationalSymbolRefsAligned/);
  assert.match(
    ownershipMigration.sql,
    /where version = '592_source_import_source_object_metric_evidence'/
  );
  assert.doesNotMatch(ownershipMigration.sql, /truncate\s+/i);
});

test('tracked migrations distinguish metadata fallback and browser evidence', () => {
  const migrations = readMigrationFiles();
  const evidenceMigration = migrations.find(
    (migration) => migration.fileName === '604_source_metadata_fallback_evidence_scope.sql'
  );

  assert.ok(evidenceMigration);
  assert.match(evidenceMigration.sql, /metadataPermissionFallbackEvidence/);
  assert.match(evidenceMigration.sql, /provider-adapter-negative-branch/);
  assert.match(evidenceMigration.sql, /browserFlowDoesNotClaim/);
  assert.match(evidenceMigration.sql, /WorkspaceWarehouseConnectionProbe\.test\.ts/);
  assert.doesNotMatch(evidenceMigration.sql, /truncate\s+/i);
});

test('tracked migrations hard cut source discovery to the provider-neutral SourceObject contract', () => {
  const migrations = readMigrationFiles();
  const sourceObjectContractMigration = migrations.find(
    (migration) => migration.fileName === '605_source_object_catalog_contract_hard_cut.sql'
  );

  assert.ok(sourceObjectContractMigration);
  assert.match(sourceObjectContractMigration.sql, /E-SOURCE-OBJECT-METRICS-PROD-1/);
  assert.match(sourceObjectContractMigration.sql, /SYS-CONTRACTS-SOURCE-OBJECT-CATALOG/);
  assert.match(sourceObjectContractMigration.sql, /SourceObjectCatalog\.v1\.ts/);
  assert.match(sourceObjectContractMigration.sql, /ListWarehouseConnectionSourceObjects/);
  assert.match(sourceObjectContractMigration.sql, /ListWarehouseConnectionTables/);
  assert.match(sourceObjectContractMigration.sql, /SourceObjectSchema/);
  assert.match(sourceObjectContractMigration.sql, /SourceObjectSelectionSchema/);
  assert.match(sourceObjectContractMigration.sql, /relation, file, endpoint, and stream/);
  assert.match(sourceObjectContractMigration.sql, /ImportWarehouseSources/);
  assert.match(sourceObjectContractMigration.sql, /unsupported non-relational object/);
  assert.doesNotMatch(sourceObjectContractMigration.sql, /parallel rail/i);
  assert.doesNotMatch(sourceObjectContractMigration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile SourceObject ownership and active feature manifests', () => {
  const migrations = readMigrationFiles();
  const reconciliationMigration = migrations.find(
    (migration) => migration.fileName === '606_source_object_catalog_component_reconciliation.sql'
  );

  assert.ok(reconciliationMigration);
  assert.match(reconciliationMigration.sql, /SYS-CONTRACTS-SOURCE-OBJECT-CATALOG/);
  assert.match(reconciliationMigration.sql, /CONTRACT-SOURCE-OBJECT-CATALOG-V1/);
  assert.match(reconciliationMigration.sql, /listWarehouseConnectionSourceObjectsUseCase\.ts/);
  assert.match(reconciliationMigration.sql, /TEST-SOURCE-OBJECT-CATALOG-CONTRACT/);
  assert.match(reconciliationMigration.sql, /PORT-WEB-SOURCE-OBJECT-CATALOG-READ/);
  assert.match(reconciliationMigration.sql, /REL-SOURCE-OBJECT-CATALOG-CONTRACT-TO-INFRA/);
  assert.match(reconciliationMigration.sql, /source_object_manifest_reconciliation/);
  assert.match(reconciliationMigration.sql, /deduplicated_symbols/);
  assert.match(reconciliationMigration.sql, /localMetricComponentsRetired/);
  assert.match(
    reconciliationMigration.sql,
    /delete from architecture\.component[\s\S]*api\.component\.sourceImport\.SourceObjectMetricEvidence/
  );
  assert.match(
    reconciliationMigration.sql,
    /web\.component\.workspace\.SourceObjectMetricEvidenceModel/
  );
  assert.doesNotMatch(reconciliationMigration.sql, /truncate\s+/i);
});

test('tracked migrations version the SourceObject catalog response and reject duplicate selections', () => {
  const migrations = readMigrationFiles();
  const versionedResponseMigration = migrations.find(
    (migration) => migration.fileName === '607_source_object_catalog_versioned_response.sql'
  );

  assert.ok(versionedResponseMigration);
  assert.match(versionedResponseMigration.sql, /SourceObjectCatalogResponseSchema/);
  assert.match(versionedResponseMigration.sql, /SourceObjectSelectionListSchema/);
  assert.match(versionedResponseMigration.sql, /contractVersion', 1/);
  assert.match(versionedResponseMigration.sql, /unversionedResponseAccepted', false/);
  assert.match(versionedResponseMigration.sql, /duplicateSelectionAccepted', false/);
  assert.match(versionedResponseMigration.sql, /SourceObjectRowCountMetric/);
  assert.match(versionedResponseMigration.sql, /SourceObjectMetricValue/);
  assert.doesNotMatch(versionedResponseMigration.sql, /truncate\s+/i);
});

test('tracked migrations model source import operations and metric evidence presentation', () => {
  const migrations = readMigrationFiles();
  const architectureMigration = migrations.find(
    (migration) => migration.fileName === '608_source_import_operations_and_metric_presentation.sql'
  );

  assert.ok(architectureMigration);
  assert.match(architectureMigration.sql, /SYS-CONTRACTS-SOURCE-IMPORT-OPERATIONS/);
  assert.match(architectureMigration.sql, /CONTRACT-SOURCE-IMPORT-OPERATIONS-V1/);
  assert.match(architectureMigration.sql, /SourceObjectMetricEvidencePresenter/);
  assert.match(architectureMigration.sql, /MetricEvidenceHotspot/);
  assert.match(architectureMigration.sql, /RenderCanvasGraphNodeOperationalSummary/);
  assert.match(architectureMigration.sql, /RenderSourceImportCatalogView/);
  assert.match(architectureMigration.sql, /canonicalRail', 'ListWarehouseConnectionSourceObjects'/);
  assert.match(
    architectureMigration.sql,
    /ddd_owner = 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES'/
  );
});

test('tracked migrations require authorized workspace scope at the storage boundary', () => {
  const migrations = readMigrationFiles();
  const scopeBoundaryMigration = migrations.find(
    (migration) => migration.fileName === '609_workspace_scope_storage_boundary.sql'
  );

  assert.ok(scopeBoundaryMigration);
  assert.match(scopeBoundaryMigration.sql, /SYS-API-INFRA-WORKSPACE-FILES/);
  assert.match(scopeBoundaryMigration.sql, /CONTRACT-WORKSPACE-FILE-SCOPE-PORT-V1/);
  assert.match(scopeBoundaryMigration.sql, /authorized_scope_equals_storage_scope/);
  assert.match(scopeBoundaryMigration.sql, /tenantId', 'projectId', 'environmentId/);
  assert.match(scopeBoundaryMigration.sql, /REL-WAREHOUSE-CATALOG-USES-SCOPED-WORKSPACE-FILES/);
  assert.match(scopeBoundaryMigration.sql, /TEST-SCOPED-WORKSPACE-FILE-STORAGE/);
  assert.match(scopeBoundaryMigration.sql, /ADR-0058-WORKSPACE-SCOPE-STORAGE-BOUNDARY/);
  assert.doesNotMatch(scopeBoundaryMigration.sql, /truncate\s+/i);
});

test('tracked migrations close scoped workspace storage with cross-scope evidence', () => {
  const migrations = readMigrationFiles();
  const implementationMigration = migrations.find(
    (migration) => migration.fileName === '610_workspace_scope_storage_implementation.sql'
  );

  assert.ok(implementationMigration);
  assert.match(implementationMigration.sql, /storageBoundaryStatus', 'implemented'/);
  assert.match(implementationMigration.sql, /REL-DBT-RUN-BINDING-USES-SCOPED-WORKSPACE-ROOT/);
  assert.match(implementationMigration.sql, /LocalWorkspaceFileRepository\.test\.ts/);
  assert.match(implementationMigration.sql, /WorkspaceWarehouseConnectionCatalog\.test\.ts/);
  assert.match(implementationMigration.sql, /EV-SCOPED-WORKSPACE-FILE-STORAGE-IMPLEMENTED/);
  assert.match(
    implementationMigration.sql,
    /source_path = 'tools\/planning-db\/migrations\/608_source_import_operations_and_metric_presentation\.sql'/
  );
  assert.doesNotMatch(implementationMigration.sql, /truncate\s+/i);
});

test('tracked migrations make live SourceObject discovery and exact identity canonical', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '611_source_object_live_discovery_and_identity_authority.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-API-APPLICATION-SOURCE-OBJECT-READER/);
  assert.match(migration.sql, /ListWarehouseConnectionSourceObjects;ImportWarehouseSources/);
  assert.match(migration.sql, /live-provider-discovery/);
  assert.match(migration.sql, /exact-case-sensitive/);
  assert.match(migration.sql, /source-object-constraints/);
  assert.match(migration.sql, /WarehouseConnectionSourceObjectReader\.test\.ts/);
});

test('tracked migrations hard cut the source import catalog to SourceObject semantics', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '612_source_import_catalog_source_object_semantic_hardcut.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW/);
  assert.match(migration.sql, /RenderSourceImportCatalogView/);
  assert.match(migration.sql, /ListWarehouseConnectionSourceObjects/);
  assert.match(migration.sql, /never silently filtered/);
  assert.match(migration.sql, /relation', 'file', 'endpoint', 'stream/);
  assert.match(migration.sql, /capability-aware/);
  assert.match(migration.sql, /CONTRACT-SOURCE-OBJECT-CATALOG-V1/);
});

test('tracked migrations approve the Code working-tree strict live vertical before implementation', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '637_code_working_tree_live_vertical_design.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /CODE-WORKING-TREE-LIVE-VERTICAL-20260713/);
  assert.match(migration.sql, /GetWorkspaceFileContent;SaveWorkspaceFileContent/);
  assert.match(migration.sql, /RunDbtAuthorCodeRunLiveProof/);
  assert.match(migration.sql, /EV-CODE-WORKING-TREE-LIVE-VERTICAL/);
  assert.match(migration.sql, /'planned'/);
  assert.match(migration.sql, /canvas-dbt-author-code-run-live\.cy\.ts/);
  assert.match(migration.sql, /run-selected-closure-live-proof\.test\.cjs/);
  assert.doesNotMatch(migration.sql, /'passing'/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations register the Code working-tree live proof command as a canonical planned rail', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '638_code_working_tree_live_vertical_command_rail.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /RunDbtAuthorCodeRunLiveProof/);
  assert.match(migration.sql, /CodeWorkingTreeLiveProofRun/);
  assert.match(migration.sql, /run-selected-closure-live-proof CLI --spec/);
  assert.match(migration.sql, /GetWorkspaceFileContent/);
  assert.match(migration.sql, /SaveWorkspaceFileContent/);
  assert.match(migration.sql, /createsProductPersistencePath', false/);
  assert.match(migration.sql, /\n\s*'planned',/);
  assert.doesNotMatch(migration.sql, /cy\.intercept/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations close the Code working-tree vertical with relational live evidence', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '639_code_working_tree_live_vertical_closeout.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /CODE-WORKING-TREE-LIVE-VERTICAL-20260713/);
  assert.match(migration.sql, /RunDbtAuthorCodeRunLiveProof/);
  assert.match(migration.sql, /SaveWorkspaceFileContent/);
  assert.match(migration.sql, /GetWorkspaceFileContent/);
  assert.match(migration.sql, /EV-CODE-WORKING-TREE-LIVE-VERTICAL/);
  assert.match(migration.sql, /canvas-dbt-author-code-run-live\.cy\.ts/);
  assert.match(migration.sql, /browser reopen/);
  assert.match(migration.sql, /evidence_status = 'passing'/);
  assert.match(migration.sql, /'current'/);
  assert.doesNotMatch(migration.sql, /cy\.intercept/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations map both Code working-tree read and mutation rails', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '640_code_working_tree_read_rail_component_mapping.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /web\.component\.code\.CodeWorkingTreeSync/);
  assert.match(migration.sql, /GetWorkspaceFileContent/);
  assert.match(migration.sql, /SaveWorkspaceFileContent/);
  assert.match(migration.sql, /WorkspaceFileContentReadModel/);
  assert.match(migration.sql, /IWorkspaceFilesQueryPort\.getFileContent/);
  assert.match(migration.sql, /unauthorized workspace scope fails closed/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile the complete Code working-tree live feature manifest', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '641_code_working_tree_live_vertical_manifest_reconciliation.sql'
  );

  assert.ok(migration);
  for (const requiredField of [
    'componentGuides',
    'userStories',
    'allowedImplementationSurfaces',
    'forbiddenImplementationSurfaces',
    'commandQueryRails',
    'domainObjects',
    'fowlerSignals',
    'architectureGuards',
    'cypressFlows',
    'completionGate',
    'redGreenCycles',
    'symbols',
  ]) {
    assert.match(migration.sql, new RegExp(`'${requiredField}'`));
  }
  assert.match(migration.sql, /docs\/architecture\/fowler-opportunity-planning-governance\.md/);
  assert.match(migration.sql, /DEFAULT_SPEC_RELATIVE_PATH/);
  assert.match(migration.sql, /openNodeWorkbench/);
  assert.match(migration.sql, /openLiveProjectCodeFile/);
  assert.match(migration.sql, /waitForLiveWorkspaceFileContent/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations reject live proof spec lists and globs before runtime startup', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '642_code_working_tree_live_proof_single_spec_guard.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /RunDbtAuthorCodeRunLiveProof/);
  assert.match(migration.sql, /comma-separated Cypress spec lists/);
  assert.match(migration.sql, /Cypress glob expressions/);
  assert.match(migration.sql, /before runtime startup/);
  assert.match(migration.sql, /code-working-tree-live-single-spec-review-hardening/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations keep live proof review hardening inside allowed surfaces', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '643_code_working_tree_live_proof_guard_surface_reconciliation.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /allowed_implementation_surfaces/);
  assert.match(migration.sql, /allowedImplementationSurfaces/);
  assert.match(migration.sql, /642_code_working_tree_live_proof_single_spec_guard\.sql/);
  assert.match(migration.sql, /643_code_working_tree_live_proof_guard_surface_reconciliation\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations govern dbt project file projection phase two before implementation', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '644_dbt_project_file_projection_phase2_design.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /ProjectDbtGraphFromFiles/);
  assert.match(migration.sql, /CanvasAuthoringAuthorityBinding/);
  assert.match(migration.sql, /DbtProjectGraphProjection/);
  assert.match(migration.sql, /IDbtProjectAnalyzerPort/);
  assert.match(migration.sql, /workspace:graph-draft:view/);
  assert.match(migration.sql, /dbt_project_invalid/);
  assert.match(migration.sql, /dbt_project_analysis_failed/);
  assert.match(migration.sql, /browser-owned dbt or Jinja parsing/);
  assert.match(migration.sql, /WorkspaceGraphAuthoringDraft\.v1 remains unchanged/);
  assert.match(migration.sql, /feature_mechanization_local_rails/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations close dbt project projection API integrity without phantom Web evidence', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '646_dbt_project_file_projection_phase2_integrity.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /architecture\.component_observability/);
  assert.match(migration.sql, /OBS-CANVAS-AUTHORITY-BINDING-CONTRACT-VALIDATION/);
  assert.match(migration.sql, /OBS-DBT-PROJECT-GRAPH-PROJECTION-RESULT/);
  assert.match(migration.sql, /OBS-DBT-PROJECT-ANALYZER-RESULT/);
  assert.match(migration.sql, /delete from architecture\.component_test/);
  assert.match(migration.sql, /delete from architecture\.component_relation/);
  assert.match(migration.sql, /delete from architecture\.component_responsibility/);
  assert.match(migration.sql, /delete from architecture\.component/);
  assert.match(migration.sql, /and status = 'proposed'/);
  assert.match(
    migration.sql,
    /delete from planning_query_store\.governance_component_local_ownership_patterns/
  );
  assert.match(
    migration.sql,
    /delete from planning_query_store\.governance_component_local_definitions/
  );
  assert.match(migration.sql, /647_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /648_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile dbt project projection production symbols', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '647_dbt_project_file_projection_phase2_symbol_reconciliation.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /with declared_symbol\(path, name\)/);
  assert.match(migration.sql, /CanvasAuthoringAuthorityBindingSchema/);
  assert.match(migration.sql, /ProjectDbtGraphFromFilesUseCase/);
  assert.match(migration.sql, /DbtCliProjectAnalyzer/);
  assert.match(migration.sql, /projectDbtManifest/);
  assert.match(migration.sql, /raw_manifest/);
  assert.match(migration.sql, /'\{symbols\}'/);
  assert.match(migration.sql, /symbol_refs = symbol_manifest\.symbol_refs/);
  assert.match(migration.sql, /648_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /649_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations harden dbt analyzer diagnostics and project input budgets', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '648_dbt_project_file_projection_phase2_review_hardening.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /INVALID_PROJECT_DIAGNOSTIC_MESSAGE/);
  assert.match(migration.sql, /normalizeProcessDiagnostic/);
  assert.match(migration.sql, /EXCLUDED_DIRECTORY_NAMES/);
  assert.match(migration.sql, /Arbitrary/);
  assert.match(migration.sql, /resource paths are configurable/);
  assert.match(migration.sql, /649_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /650_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations expose dbt projection coverage and directory limits', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '649_dbt_project_file_projection_phase2_coverage_limits.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /dbt_resource_not_projected/);
  assert.match(migration.sql, /directory-count overflow/);
  assert.match(migration.sql, /directory-depth overflow/);
  assert.match(migration.sql, /650_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /651_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations map focused dbt analyzer test ownership', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '650_dbt_project_file_projection_phase2_test_ownership.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /TEST-DBT-ANALYZER-PROCESS-BOUNDARY/);
  assert.match(migration.sql, /TEST-DBT-MANIFEST-PROJECTION/);
  assert.match(migration.sql, /TEST-DBT-PROJECT-CONTENT-REVISION/);
  assert.match(migration.sql, /governance_component_local_ownership_patterns/);
  assert.match(migration.sql, /'\{unitTests\}'/);
  assert.match(migration.sql, /651_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /652_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations bind dbt projection revisions to stable project snapshots', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '651_dbt_project_file_projection_phase2_stable_snapshot.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /same bounded ephemeral project snapshot/);
  assert.match(migration.sql, /snapshotProjectContent/);
  assert.match(migration.sql, /collectProjectContent/);
  assert.match(migration.sql, /writeAll/);
  assert.match(migration.sql, /revision\/manifest consistency/);
  assert.match(migration.sql, /652_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /653_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile all dbt projection implementation surfaces', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '652_dbt_project_file_projection_phase2_surface_reconciliation.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /protectedRuntimeRailVocabulary\.ts/);
  assert.match(migration.sql, /runtimeRoutes\.constants\.ts/);
  assert.match(migration.sql, /protectedRuntimeRouteGroup\.architecture\.test\.ts/);
  assert.match(migration.sql, /docs\/\.manifest\.json/);
  assert.match(migration.sql, /646_dbt_project_file_projection_phase2_integrity\.sql/);
  assert.match(migration.sql, /653_dbt_project_file_projection_phase2_web_closeout\.sql/);
  assert.match(migration.sql, /654_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations model the Web dbt file projection family before implementation', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '655_dbt_project_file_projection_phase2_web_design.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-WEB-SERVICES-DBT-PROJECT-GRAPH/);
  assert.match(migration.sql, /SYS-WEB-CANVAS-DBT-FILE-PROJECTION-MODEL/);
  assert.match(migration.sql, /SYS-WEB-CANVAS-DBT-FILE-PROJECTION/);
  assert.match(migration.sql, /ProjectDbtGraphFromFiles/);
  assert.match(migration.sql, /PersistCanvasLayout/);
  assert.match(migration.sql, /InspectCanvasNodeProperties/);
  assert.match(migration.sql, /ReadWorkspaceFiles/);
  assert.match(migration.sql, /SaveWorkspaceFileContent/);
  assert.match(migration.sql, /Inspectability and layout movement are independent/);
  assert.match(
    migration.sql,
    /no source import, graph mutation, Preview, Run, or graph-draft request/
  );
  assert.match(migration.sql, /component_status[\s\S]*'needed'/);
  assert.doesNotMatch(migration.sql, /evidence_status[\s\S]*'current'/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations authorize only the shared Web composition seams for file projection', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '656_dbt_project_file_projection_phase2_web_composition_design.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /services\/composition\/appServices\.ts/);
  assert.match(migration.sql, /views\/Canvas\.tsx/);
  assert.match(migration.sql, /views\/CodeView\.tsx/);
  assert.match(migration.sql, /canvasSurfaceStrategyContracts\.ts/);
  assert.match(migration.sql, /CanvasViewportSurfaceView\.tsx/);
  assert.match(migration.sql, /hooks from both authorities never run in one render branch/);
  assert.match(migration.sql, /without querying WorkspaceGraphAuthoringDraft\.v1/);
  assert.match(migration.sql, /Transfer ownership/);
  assert.match(migration.sql, /657_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations admit dbt seed files through the existing scoped workspace rails', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '657_dbt_project_file_projection_phase2_seed_file_support.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-API-INFRA-WORKSPACE-FILES/);
  assert.match(migration.sql, /SaveWorkspaceFileContent/);
  assert.match(migration.sql, /ListWorkspaceFiles/);
  assert.match(migration.sql, /LocalWorkspaceFileRepository\.ts/);
  assert.match(migration.sql, /LocalWorkspaceFileHistoryRepository\.ts/);
  assert.match(migration.sql, /dbt seed CSV/);
  assert.match(migration.sql, /658_dbt_project_file_projection_phase2_live_closeout\.sql/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations close the live Web dbt file projection without closing later phases', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '658_dbt_project_file_projection_phase2_live_closeout.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /status = 'implemented'/);
  assert.match(migration.sql, /frontend_component_local_files/);
  assert.match(migration.sql, /frontend_component_validation_evidence/);
  assert.match(migration.sql, /ProjectDbtGraphFromFiles/);
  assert.match(migration.sql, /dbtProjectFileLayout\.test\.ts/);
  assert.match(migration.sql, /dbt-project-file-projection-live\.cy\.ts/);
  assert.match(migration.sql, /noGraphDraftFallback/);
  assert.match(migration.sql, /factualReadOnlyWorkbench/);
  assert.match(migration.sql, /contextualCodeGraphHeight/);
  assert.doesNotMatch(migration.sql, /E-DBT-PROJECT-ROUNDTRIP-1[^\n]*done/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations reconcile the complete Web dbt projection symbol manifest', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '659_dbt_project_file_projection_phase2_web_symbols.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /declared_symbol/);
  assert.match(migration.sql, /IDbtProjectGraphQueryPort/);
  assert.match(migration.sql, /projectDbtProjectGraphToCanonicalCanvas/);
  assert.match(migration.sql, /useDbtProjectFileCanvasController/);
  assert.match(migration.sql, /DbtProjectFileCanvasView/);
  assert.match(migration.sql, /expectProjectedCardsNotToOverlap/);
  assert.match(migration.sql, /allowed_implementation_surfaces/);
  assert.match(migration.sql, /DbtNodeComponent\.tsx/);
  assert.match(migration.sql, /CodeView\.test\.tsx/);
  assert.doesNotMatch(migration.sql, /SourceImportWizard\.architecture\.test\.tsx/);
  assert.doesNotMatch(migration.sql, /routeWorkbenchFrame\.architecture\.test\.ts/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations promote the dbt file projection family to architecture authority', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '660_dbt_project_file_projection_component_authority.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-WEB-CANVAS-DBT-FILE-PROJECTION-SURFACE/);
  assert.match(migration.sql, /insert into architecture\.component/);
  assert.match(migration.sql, /insert into architecture\.component_responsibility/);
  assert.match(migration.sql, /insert into architecture\.component_relation/);
  assert.match(migration.sql, /insert into architecture\.component_test/);
  assert.match(migration.sql, /children_required = true/);
  assert.match(migration.sql, /frontend_component_local_files/);
  assert.match(migration.sql, /frontend_component_validation_evidence/);
  assert.match(migration.sql, /componentFamily/);
  assert.match(migration.sql, /insert into architecture\.component_port/);
  assert.match(migration.sql, /component_engineering_component_tree_projection/);
  assert.match(migration.sql, /component_engineering_file_ownership_projection/);
  assert.match(migration.sql, /component_engineering_rule_evaluation_projection/);
  assert.doesNotMatch(migration.sql, /legacy/i);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migrations seed the graph-draft command before governance import', () => {
  const migrations = readMigrationFiles();
  const authorityMigration = migrations.find(
    (candidate) =>
      candidate.fileName === '676_canvas_authoring_authority_transactional_exclusion.sql'
  );
  const rateLimitMigration = migrations.find(
    (candidate) => candidate.fileName === '679_workspace_graph_draft_http_rate_limit.sql'
  );
  const canonicalRailId =
    'docs/architecture/components/web/graph/canvas-authoring-draft-boundary-component.md#DOCUMENTED-COMMAND-QUERY-RAIL-CATALOG#command#00121#saveworkspacegraphdraft';

  assert.ok(authorityMigration);
  assert.ok(rateLimitMigration);
  assert.match(authorityMigration.sql, /with canonical_rail_identity as/);
  assert.match(authorityMigration.sql, /where not exists/);
  assert.ok(authorityMigration.sql.includes(canonicalRailId));
  assert.match(
    authorityMigration.sql,
    /insert into planning_query_store\.feature_mechanization_local_rails/
  );
  assert.ok(rateLimitMigration.sql.includes(canonicalRailId));
  assert.match(rateLimitMigration.sql, /updated_rail_count <> 1/);
  assert.doesNotMatch(authorityMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(rateLimitMigration.sql, /truncate\s+/i);
});

test('tracked migrations govern one shared dbt runtime-artifact source policy', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '682_dbt_project_runtime_artifact_source_policy.sql'
  );
  const maturityMigration = migrations.find(
    (candidate) => candidate.fileName === '683_dbt_project_source_path_policy_maturity.sql'
  );
  const mechanizationMigration = migrations.find(
    (candidate) =>
      candidate.fileName === '684_dbt_project_source_path_policy_feature_mechanization.sql'
  );

  assert.ok(migration);
  assert.ok(maturityMigration);
  assert.ok(mechanizationMigration);
  assert.match(migration.sql, /SYS-API-INFRA-DBT-PROJECT-SOURCE-PATH-POLICY/);
  assert.match(migration.sql, /RESP-DBT-PROJECT-SOURCE-PATH-POLICY/);
  assert.match(migration.sql, /REL-DBT-ANALYZER-DEPENDS-ON-SOURCE-PATH-POLICY/);
  assert.match(migration.sql, /REL-DBT-IMPORT-INSPECTOR-DEPENDS-ON-SOURCE-PATH-POLICY/);
  assert.match(migration.sql, /runtimeArtifactSourcePolicy/);
  assert.match(migration.sql, /ProjectDbtGraphFromFiles/);
  assert.match(migration.sql, /ValidateDbtProjectImport/);
  assert.match(maturityMigration.sql, /architecture\.component_observability/);
  assert.match(maturityMigration.sql, /architecture\.evidence/);
  assert.match(mechanizationMigration.sql, /E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713/);
  assert.match(mechanizationMigration.sql, /evaluateDbtProjectPathPolicy/);
  assert.match(mechanizationMigration.sql, /normalizeContainedRelativePath/);
  assert.match(mechanizationMigration.sql, /parseDbtProjectDocument/);
  assert.match(mechanizationMigration.sql, /ValidateDbtProjectImport/);
  assert.match(mechanizationMigration.sql, /ProjectDbtGraphFromFiles/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
  assert.doesNotMatch(maturityMigration.sql, /truncate\s+/i);
  assert.doesNotMatch(mechanizationMigration.sql, /truncate\s+/i);
});

test('tracked migrations require persisted postconditions for source-import replays', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '685_graph_draft_source_import_replay_postcondition.sql'
  );
  const symbolMigration = migrations.find(
    (candidate) => candidate.fileName === '686_graph_draft_source_import_replay_feature_symbol.sql'
  );

  assert.ok(migration);
  assert.ok(symbolMigration);
  assert.match(migration.sql, /SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT/);
  assert.match(migration.sql, /deduplicated draft save/);
  assert.match(migration.sql, /persisted authoritative draft/);
  assert.match(migration.sql, /fails closed without compensating/);
  assert.match(migration.sql, /RESP-GRAPH-DRAFT-WAREHOUSE-SOURCE-IMPORT/);
  assert.match(migration.sql, /OBS-GRAPH-DRAFT-SOURCE-IMPORT/);
  assert.match(symbolMigration.sql, /readPersistedImportedNodeIds/);
  assert.match(symbolMigration.sql, /ImportWarehouseSources/);
  assert.match(symbolMigration.sql, /Postcondition Verification/);
  assert.match(symbolMigration.sql, /reconciled_rail_count <> 2/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
  assert.doesNotMatch(symbolMigration.sql, /truncate\s+/i);
});

test('tracked migrations separate generated dbt artifacts from installed dependencies', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '687_dbt_project_dependency_path_partition.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /generated_artifact_installed_dependency_partition/);
  assert.match(migration.sql, /resolveDbtProjectDirectoryPartition/);
  assert.match(migration.sql, /installed parse dependencies/);
  assert.match(migration.sql, /separate inspected-file budget/);
  assert.match(migration.sql, /ProjectDbtGraphFromFiles/);
  assert.match(migration.sql, /ValidateDbtProjectImport/);
  assert.match(migration.sql, /resolveDbtRuntimeArtifactDirectoryPaths/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration rejects overlapping dbt generated and dependency paths', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '688_dbt_project_non_source_path_overlap_guard.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /mutually non-overlapping/);
  assert.match(migration.sql, /nonSourcePathsOverlap/);
  assert.match(migration.sql, /projectdbtgraphfromfiles/i);
  assert.match(migration.sql, /validatedbtprojectimport/i);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration reconciles dbt path partition source symbols and surfaces', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) =>
      candidate.fileName === '689_dbt_project_path_partition_manifest_reconciliation.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /DirectoryRole/);
  assert.match(migration.sql, /excludedDirectoryReason/);
  assert.match(migration.sql, /resolveDirectoryRole/);
  assert.match(migration.sql, /RUNTIME_DIRECTORIES/);
  assert.match(migration.sql, /688_dbt_project_non_source_path_overlap_guard/);
  assert.match(migration.sql, /689_dbt_project_path_partition_manifest_reconciliation/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration distinguishes explicit empty dbt selection from workspace fallback', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '713_dbt_selection_explicit_empty_intent.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /AD-DBT-SELECTION-INTENT-INTEGRITY-20260716/);
  assert.match(migration.sql, /CollectCanvasExecutionSelection/);
  assert.match(migration.sql, /explicit empty intent fails closed/i);
  assert.match(migration.sql, /complete requested-id set/i);
  assert.match(migration.sql, /applyDbtExecutionSelectionToggle/);
  assert.match(migration.sql, /CanvasExecutionSelectionIntentMode/);
  assert.match(migration.sql, /frontend_component_local_files/);
  assert.match(migration.sql, /frontend_component_validation_evidence/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration maps the complete dbt selection slice without duplicate file roles', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '714_dbt_selection_component_file_ownership.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-WEB-CANVAS-EXECUTION-SELECTION/);
  assert.match(migration.sql, /canvasAuthoringRuntime\.types\.ts/);
  assert.match(migration.sql, /useCanvasExecutionActions\.test\.support\.tsx/);
  assert.match(migration.sql, /mapped_slice_file_count <> 33/);
  assert.match(migration.sql, /duplicate_file_role_count <> 0/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration governs one atomic dbt selection-intent authority', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '715_dbt_selection_atomic_intent_authority.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /CanvasExecutionSelectionIntent/);
  assert.match(migration.sql, /createCanvasExecutionSelectionIntent/);
  assert.match(migration.sql, /applyDbtExecutionSelectionToggle/);
  assert.match(migration.sql, /singleStoreAuthority/);
  assert.match(migration.sql, /canvasExecutionSelection\.architecture\.test\.ts/);
  assert.match(migration.sql, /must declare twenty implementation symbols/i);
  assert.doesNotMatch(migration.sql, /insert into architecture\.component_port/i);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration maps atomic selection controller evidence without duplicate roles', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '716_dbt_selection_controller_test_ownership.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /useCanvasController\.inspector\.test\.tsx/);
  assert.match(migration.sql, /useCanvasController\.reloadHydrationGuards\.test\.tsx/);
  assert.match(migration.sql, /mapped_test_count <> 2/);
  assert.match(migration.sql, /duplicate_file_role_count <> 0/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration governs atomic dbt selection commands and execution boundaries', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '717_dbt_selection_atomic_boundary_contract.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /setExecutionSelectionIntent/);
  assert.match(migration.sql, /CanvasExecutionSelectionIntent atomically/);
  assert.match(migration.sql, /useCanvasController\.permissions\.test\.tsx/);
  assert.match(migration.sql, /useCanvasExecutionActions\.dbtDraftFlush\.test\.tsx/);
  assert.match(migration.sql, /useCanvasExecutionActions\.dbtPreviewRun\.test\.tsx/);
  assert.match(migration.sql, /mapped_test_count <> 3/);
  assert.match(migration.sql, /atomic_boundary_evidence_count <> 2/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration relates the dbt projector guard to the canonical selection policy', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '718_dbt_selection_projector_policy_guard.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /canvasDbtAuthoringRun\.architecture\.test\.ts/);
  assert.match(migration.sql, /singleClassificationAuthority/);
  assert.match(migration.sql, /mapped_guard_count <> 1/);
  assert.match(migration.sql, /policy_evidence_count <> 1/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration maps the atomic controller test contract without duplicate roles', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '719_dbt_selection_controller_test_contract_ownership.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /useCanvasController\.test\.types\.ts/);
  assert.match(migration.sql, /CanvasControllerStateOverrides/);
  assert.match(migration.sql, /mapped_contract_count <> 1/);
  assert.match(migration.sql, /duplicate_file_role_count <> 0/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration preserves hidden dbt selection through graph lifecycle updates', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '720_dbt_selection_lifecycle_hidden_intent.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /SYS-WEB-CANVAS-EXECUTION-SELECTION/);
  assert.match(migration.sql, /CollectCanvasExecutionSelection/);
  assert.match(migration.sql, /graph lifecycle updates operate on the complete requested-id set/i);
  assert.match(migration.sql, /reconcileDbtExecutionSelectionVisibleSubset/);
  assert.match(migration.sql, /useCanvasController\.draftLifecycle\.scopeAndProjection\.test\.tsx/);
  assert.match(migration.sql, /VAL-WEB-DBT-SELECTION-LIFECYCLE-HIDDEN-IDS/);
  assert.match(migration.sql, /duplicate_file_role_count <> 0/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});

test('tracked migration mechanizes the dbt selection lifecycle policy symbol', () => {
  const migrations = readMigrationFiles();
  const migration = migrations.find(
    (candidate) => candidate.fileName === '721_dbt_selection_lifecycle_feature_symbol.sql'
  );

  assert.ok(migration);
  assert.match(migration.sql, /reconcileDbtExecutionSelectionVisibleSubset/);
  assert.match(migration.sql, /CollectCanvasExecutionSelection/);
  assert.match(migration.sql, /dbtExecutionScopePolicy\.test\.ts/);
  assert.match(migration.sql, /useCanvasController\.draftLifecycle\.scopeAndProjection\.test\.tsx/);
  assert.match(migration.sql, /relational_symbol_count <> 1/);
  assert.match(migration.sql, /manifest_symbol_count <> 1/);
  assert.doesNotMatch(migration.sql, /truncate\s+/i);
});
