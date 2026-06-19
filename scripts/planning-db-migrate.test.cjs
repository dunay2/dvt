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
  assert.match(archiveDocsLeafMigration.sql, /status,\n\s+children_required/);
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
  assert.match(latestRailProjectionMigration.sql, /count\(\*\) filter \(/);
  assert.match(latestRailProjectionMigration.sql, /where authority_priority <= 2/);
  assert.match(
    latestRailProjectionMigration.sql,
    /lower\(coalesce\(rail_status, ''\)\) not in \('deprecated', 'retired'\)/
  );
  assert.match(latestRailProjectionMigration.sql, /as canonical_candidate_count/);
});

test('latest command/query rail projection prefers implemented refs over imported gaps', () => {
  const migrations = readMigrationFiles();
  const latestRailProjectionMigration = migrations
    .filter((migration) =>
      /create or replace view planning_query_store\.command_query_rail_query/.test(migration.sql)
    )
    .at(-1);

  assert.ok(latestRailProjectionMigration);
  assert.equal(
    latestRailProjectionMigration.fileName,
    '154_persist_post_import_rail_reconciliation.sql'
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /when rail\.source_path like 'docs\/archive\/%' then 'retired'/
  );
  assert.match(
    latestRailProjectionMigration.sql,
    /case when rail\.rail_source = 'local' then 0 else 1 end,\s+rail\.is_gap,\s+rail\.authority_priority/
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
