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
