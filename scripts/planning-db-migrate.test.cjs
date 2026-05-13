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
    (migration) => migration.fileName === '032_planning_knowledge_document_relations.sql'
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
