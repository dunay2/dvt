-- Split the Planning DB query aggregate into read-model leaf components.
-- The parent remains the planning:db:query surface; concrete query modules,
-- CLI entrypoint, and query tests get explicit leaf ownership.

drop table if exists pg_temp.planning_db_query_leaf_map;

create temporary table planning_db_query_leaf_map (
  component_id text primary key,
  name text not null,
  ddd_owner text not null,
  cq_rails text not null,
  owned_concern text not null,
  responsibility text not null,
  reason_to_change text not null,
  repo_path text not null,
  public_contract text not null,
  fowler_signal text not null,
  public_api text[] not null,
  query_ports text[] not null,
  storage_reads text[] not null,
  owns text[] not null,
  test_id text not null,
  test_path text not null,
  test_kind text not null,
  coverage_level text not null,
  validation_command text not null
);

insert into planning_db_query_leaf_map (
  component_id,
  name,
  ddd_owner,
  cq_rails,
  owned_concern,
  responsibility,
  reason_to_change,
  repo_path,
  public_contract,
  fowler_signal,
  public_api,
  query_ports,
  storage_reads,
  owns,
  test_id,
  test_path,
  test_kind,
  coverage_level,
  validation_command
)
values
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CLI',
    'Planning DB query CLI dispatcher',
    'PlanningDbQueryCliAdapter',
    'ReadComponentProfile;ValidateComponentIntegrity;ValidateRailVocabulary;InspectCodeSymbolInventory',
    'Owns the planning:db:query command-line adapter, argument parsing, dispatch, refresh gating, and tabular output assembly.',
    'Dispatch DB-first Planning DB query rails through the repository CLI without owning each read-model implementation.',
    'Planning DB query CLI parsing, dispatch, refresh policy, or output formatting changes.',
    'scripts/planning-db-query.cjs',
    'planning:db:query CLI adapter boundary',
    'hidden_authority',
    array['planning:db:query']::text[],
    array['planning:db:query']::text[],
    array['planning_query_store.* read views']::text[],
    array['scripts/planning-db-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CLI',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-TESTS',
    'Planning DB query test surface',
    'PlanningDbQueryTestSurface',
    'ValidatePlanningDbQueryReadModels',
    'Owns focused tests for planning:db:query parser, dispatcher, row builders, and query module exports.',
    'Validate Planning DB query behavior and prevent read-model regressions from being hidden in the CLI aggregate.',
    'Planning DB query test coverage, fixture, helper, or dispatch assertion changes.',
    'scripts/planning-db-query.test.cjs',
    'Planning DB query unit test surface',
    'hidden_authority',
    array['node --test scripts/planning-db-query.test.cjs']::text[],
    array['ValidatePlanningDbQueryReadModels']::text[],
    array['scripts/planning-db-query.cjs', 'scripts/planning-db/queries/*.cjs']::text[],
    array['scripts/planning-db-query.test.cjs', 'scripts/planning-db-query-tests/**']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-TESTS',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CODE-SYMBOLS',
    'Planning DB code-symbol read model',
    'CodeSymbolDuplicateReadModel',
    'InspectCodeSymbolInventory;DetectCodeSymbolDuplicates;DetectCodeSymbolSemanticCandidates',
    'Owns code-symbol inventory, exact duplicate, same-name duplicate, semantic duplicate, and problem projections.',
    'Expose effective component ownership for code symbols and repeated-function detection.',
    'Code symbol inventory, duplicate classification, component filter, or repeated-function query changes.',
    'scripts/planning-db/queries/code-symbol-query.cjs',
    'Code symbol inventory and duplicate query read model',
    'duplicated_function',
    array['code-symbols', 'code-symbol-duplicates', 'code-symbol-semantic-candidates', 'code-symbol-problems']::text[],
    array['InspectCodeSymbolInventory', 'DetectCodeSymbolDuplicates', 'DetectCodeSymbolSemanticCandidates']::text[],
    array[
      'planning_query_store.code_symbol_inventory_query',
      'planning_query_store.code_symbol_exact_duplicate_query',
      'planning_query_store.code_symbol_semantic_candidate_query'
    ]::text[],
    array['scripts/planning-db/queries/code-symbol-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CODE-SYMBOLS',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CQ-RAILS',
    'Planning DB command-query rail read model',
    'CommandQueryRailReadModel',
    'ListCommandQueryRails;ValidateRailVocabulary;DetectRailDuplicates',
    'Owns command/query rail catalog, vocabulary validation, and duplicate rail read models.',
    'Expose canonical command/query vocabulary, rail duplication, implementation, and source linkage facts.',
    'Command/query rail vocabulary, duplicate detection, implementation status, or canonical naming changes.',
    'scripts/planning-db/queries/command-query-rail-query.cjs',
    'Command/query rail catalog and vocabulary read model',
    'published_language',
    array['command-query-rails', 'rail-vocabulary', 'rail-duplicates']::text[],
    array['ListCommandQueryRails', 'ValidateRailVocabulary', 'DetectRailDuplicates']::text[],
    array[
      'planning_query_store.command_query_rail_query',
      'planning_query_store.rail_vocabulary_query',
      'planning_query_store.rail_duplicate_query'
    ]::text[],
    array[
      'scripts/planning-db/queries/command-query-rail-query.cjs',
      'scripts/planning-db/queries/rail-vocabulary-query.cjs'
    ]::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-CQ-RAILS',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-COMPONENT-INTEGRITY',
    'Planning DB component integrity read model',
    'ComponentIntegrityReadModel',
    'ValidateComponentIntegrity;ValidateComponentQuality;ValidateFilesystemCoverage;ValidateArchitectureDrift',
    'Owns component integrity, quality, filesystem coverage, source drift, and architecture drift query adapters.',
    'Expose component existence, filesystem ownership, relation integrity, and architecture drift findings.',
    'Component integrity rules, source drift, filesystem coverage, quality, or architecture drift query changes.',
    'scripts/planning-db/queries/component-integrity-query.cjs',
    'Component integrity and filesystem coverage read model',
    'evolutionary_architecture',
    array['component-integrity', 'component-quality', 'filesystem-coverage', 'source-drift', 'architecture-drift']::text[],
    array['ValidateComponentIntegrity', 'ValidateComponentQuality', 'ValidateFilesystemCoverage', 'ValidateArchitectureDrift']::text[],
    array[
      'planning_query_store.component_integrity_query',
      'planning_query_store.component_engineering_quality_query',
      'planning_query_store.source_drift_query'
    ]::text[],
    array['scripts/planning-db/queries/component-integrity-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-COMPONENT-INTEGRITY',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-ARCHITECTURE-FITNESS',
    'Planning DB architecture fitness read model',
    'ArchitectureFitnessReadModel',
    'AssessComponentArchitectureFitness;ListArchitectureFitnessGaps',
    'Owns architecture fitness scan and gap summary query adapters.',
    'Expose DB-first architecture dependency, import, and component fit facts.',
    'Architecture fitness scan, gap grouping, component filter, or source import projection changes.',
    'scripts/planning-db/queries/component-architecture-fitness-query.cjs',
    'Architecture fitness and gap summary read model',
    'boundary_drift',
    array['architecture-fitness', 'architecture-fitness-gaps']::text[],
    array['AssessComponentArchitectureFitness', 'ListArchitectureFitnessGaps']::text[],
    array[
      'planning_query_store.component_architecture_fitness_query',
      'planning_query_store.component_architecture_fitness_gap_query'
    ]::text[],
    array['scripts/planning-db/queries/component-architecture-fitness-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-ARCHITECTURE-FITNESS',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-COMPONENT-ROADMAP',
    'Planning DB component roadmap read model',
    'ComponentRoadmapReadModel',
    'ReadComponentRoadmap',
    'Owns component roadmap and related planning/doc source projection query adapters.',
    'Expose component roadmap state from component engineering, architecture, and feature mechanization projections.',
    'Component roadmap source selection, component filtering, or roadmap row formatting changes.',
    'scripts/planning-db/queries/component-roadmap-query.cjs',
    'Component roadmap read model',
    'evolutionary_architecture',
    array['component-roadmap']::text[],
    array['ReadComponentRoadmap']::text[],
    array['planning_query_store.component_roadmap_query']::text[],
    array['scripts/planning-db/queries/component-roadmap-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-COMPONENT-ROADMAP',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DOCUMENTATION-LIFECYCLE',
    'Planning DB documentation lifecycle read model',
    'DocumentationLifecycleReadModel',
    'ReadDocumentationLifecycle',
    'Owns documentation lifecycle and canonicality query adapters.',
    'Expose docs lifecycle, canonical support, and lifecycle gap facts from Planning DB.',
    'Documentation lifecycle query, canonicality, lifecycle gap, or support-doc policy changes.',
    'scripts/planning-db/queries/documentation-lifecycle-query.cjs',
    'Documentation lifecycle read model',
    'documentation_drift',
    array['documentation-lifecycle']::text[],
    array['ReadDocumentationLifecycle']::text[],
    array['planning_query_store.documentation_lifecycle_query']::text[],
    array['scripts/planning-db/queries/documentation-lifecycle-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DOCUMENTATION-LIFECYCLE',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DOCUMENTATION-PANELS',
    'Planning DB documentation panel read model',
    'DocumentationPanelReadModel',
    'ReadDocumentationPanels',
    'Owns documentation panel and documentation gap query adapters.',
    'Expose component documentation panel state without unbounded roadmap joins.',
    'Documentation panel section, required-source, or component documentation gap changes.',
    'scripts/planning-db/queries/documentation-panel-query.cjs',
    'Documentation panel read model',
    'documentation_drift',
    array['documentation-panels']::text[],
    array['ReadDocumentationPanels']::text[],
    array['planning_query_store.documentation_panel_query']::text[],
    array['scripts/planning-db/queries/documentation-panel-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-DOCUMENTATION-PANELS',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION',
    'Planning DB feature mechanization read model',
    'FeatureMechanizationReadModel',
    'ReadFeatureMechanizationComponents;ReadFeatureMechanizationRails;ReadFeatureMechanizationValidations',
    'Owns feature mechanization component, symbol, rail, and validation query adapters.',
    'Expose feature mechanization manifests and DB facts through Planning DB query rails.',
    'Feature mechanization component, symbol, rail, validation, or manifest projection changes.',
    'scripts/planning-db/queries/feature-mechanization-query.cjs',
    'Feature mechanization read model',
    'evolutionary_architecture',
    array['feature-mechanization', 'feature-mechanization-components', 'feature-mechanization-symbols', 'feature-mechanization-rails', 'feature-mechanization-validations']::text[],
    array['ReadFeatureMechanizationComponents', 'ReadFeatureMechanizationRails', 'ReadFeatureMechanizationValidations']::text[],
    array['planning_query_store.feature_mechanization_*_query']::text[],
    array['scripts/planning-db/queries/feature-mechanization-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FEATURE-MECHANIZATION',
    'scripts/planning-db-query-tests/feature-mechanization.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query-tests/feature-mechanization.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FOWLER-ANALYSIS',
    'Planning DB Fowler analysis read model',
    'FowlerAnalysisReadModel',
    'ReadFowlerAnalysis;ReadFowlerAnalysisReferences;ReadFowlerAnalysisRetirement;DetectFowlerDuplicateIntents',
    'Owns Fowler analysis work, references, retirement, canonical coverage, intended work, and duplicate intent query adapters.',
    'Expose Fowler analysis work queues and retirement decisions from DB-owned projections.',
    'Fowler analysis reference, retirement, canonical coverage, intent, or duplicate-intent query changes.',
    'scripts/planning-db/queries/fowler-analysis-query.cjs',
    'Fowler analysis read model',
    'evolutionary_architecture',
    array['fowler-analysis', 'fowler-analysis-references', 'fowler-analysis-retirement', 'fowler-analysis-coverage', 'fowler-analysis-intent', 'fowler-analysis-duplicates']::text[],
    array['ReadFowlerAnalysis', 'ReadFowlerAnalysisReferences', 'ReadFowlerAnalysisRetirement', 'DetectFowlerDuplicateIntents']::text[],
    array[
      'planning_query_store.fowler_analysis_work_query',
      'planning_query_store.fowler_analysis_reference_query',
      'planning_query_store.fowler_analysis_retirement_query',
      'planning_query_store.fowler_analysis_duplicate_intent_query'
    ]::text[],
    array['scripts/planning-db/queries/fowler-analysis-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-FOWLER-ANALYSIS',
    'scripts/planning-db-query-tests/fowler-analysis.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query-tests/fowler-analysis.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-GOVERNANCE-REFRESH',
    'Planning DB governance refresh run read model',
    'GovernanceRefreshRunReadModel',
    'ReadGovernanceRefreshRuns',
    'Owns governance refresh run ledger query adapters.',
    'Expose governance refresh run ledger state and filters.',
    'Governance refresh run ledger query, run-state filter, or ledger row formatting changes.',
    'scripts/planning-db/queries/governance-refresh-run-query.cjs',
    'Governance refresh run ledger read model',
    'hidden_authority',
    array['governance-refresh-runs']::text[],
    array['ReadGovernanceRefreshRuns']::text[],
    array['planning_query_store.governance_refresh_run_query']::text[],
    array['scripts/planning-db/queries/governance-refresh-run-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-GOVERNANCE-REFRESH',
    'scripts/planning-db-query-tests/governance-refresh.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query-tests/governance-refresh.test.cjs'
  ),
  (
    'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-KNOWLEDGE-INTAKE',
    'Planning DB knowledge intake retirement read model',
    'KnowledgeIntakeRetirementReadModel',
    'ReadKnowledgeIntakeRetirement;ReadKnowledgeIntakeReferences',
    'Owns knowledge intake retirement and repository reference query adapters.',
    'Expose DB-first knowledge intake retirement and repository back-reference facts.',
    'Knowledge intake retirement disposition, reference filter, or buzon retirement query changes.',
    'scripts/planning-db/queries/knowledge-intake-retirement-query.cjs',
    'Knowledge intake retirement read model',
    'documentation_drift',
    array['knowledge-intake', 'knowledge-intake-references']::text[],
    array['ReadKnowledgeIntakeRetirement', 'ReadKnowledgeIntakeReferences']::text[],
    array[
      'planning_query_store.knowledge_intake_retirement_query',
      'planning_query_store.knowledge_intake_repository_reference_query'
    ]::text[],
    array['scripts/planning-db/queries/knowledge-intake-retirement-query.cjs']::text[],
    'TEST-SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-KNOWLEDGE-INTAKE',
    'scripts/planning-db-query.test.cjs',
    'unit',
    'behavior',
    'node --test scripts/planning-db-query.test.cjs'
  );

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'PLANNING-DB-QUERY-READ-MODEL-LEAF-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB query read-model leaf component mapping',
  'Architecture / Planning DB / CI',
  'review',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY is an aggregate that still owns the CLI, tests, and many read-model modules directly. Splitting it into leaves lets component-profile answer files, rails, ports, tests, and duplicate-function ownership without creating a side inventory.',
  'responsibility_overload',
  'CreateGovernanceComponent;RecordArchitectureComponent;RecordArchitectureRelation;RecordArchitectureTestEvidence;ValidateComponentIntegrity;DetectCodeSymbolDuplicates',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
select
  'PLANNING-DB-QUERY-READ-MODEL-LEAF-MAPPING-20260618',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component' as subject_kind, 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY' as subject_id, 'may_update' as scope_kind
  union all
  select 'path', 'scripts/planning-db/queries/**', 'may_update'
  union all
  select 'path', 'scripts/planning-db-query.cjs', 'may_update'
  union all
  select 'path', 'scripts/planning-db-query.test.cjs', 'may_update'
  union all
  select 'path', 'scripts/planning-db-query-tests/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from planning_db_query_leaf_map
  union all
  select
    'relation',
    'REL-PLANNING-DB-QUERY-CONTAINS-' ||
      replace(component_id, 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-', ''),
    'may_create'
  from planning_db_query_leaf_map
  union all
  select 'test', test_id, 'may_create' from planning_db_query_leaf_map
) scope
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
  'planning_query_store.governance_component_local_definitions',
  'a5eeab76f37a5a1569aa3b756848d83c32d1f4cfbbf1e7246a59f4a32be2ce0b',
  0,
  'CI governance Planning DB query scripts',
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  true,
  'Owns the composite planning:db:query surface and delegates concrete CLI, test, and read-model files to query leaf components.',
  'PlanningDbQueryReadModelCatalog',
  'ReadComponentProfile;ValidateComponentIntegrity;ValidateRailVocabulary;DetectCodeSymbolDuplicates',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
select
  component_id,
  'planning_query_store.governance_component_local_definitions',
  'ec32f2c5f457e91ef4c94b3f34270f43c2b7d0c1540ae0cddf9c6185eac651b0',
  0,
  name,
  'component',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  cq_rails,
  'codex'
from planning_db_query_leaf_map
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
select
  component_id,
  'owns',
  own.pattern,
  own.pattern_order - 1
from planning_db_query_leaf_map
cross join lateral unnest(owns) with ordinality as own(pattern, pattern_order)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
select
  item.component_id,
  item.item_kind,
  item.item_value,
  item.item_order
from (
  select component_id, 'responsibility' as item_kind, responsibility as item_value, 0 as item_order
  from planning_db_query_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from planning_db_query_leaf_map
  union all
  select
    component_id,
    'invariant',
    'Concrete Planning DB query files must resolve to this leaf in component_engineering_file_ownership_query; the parent stays an aggregate only.',
    0
  from planning_db_query_leaf_map
  union all
  select
    component_id,
    'transition',
    'review -> implemented after component-profile, component-integrity, and code-symbol duplicate queries validate this leaf.',
    0
  from planning_db_query_leaf_map
  union all
  select
    component_id,
    'consumer',
    'planning:db:query CLI, component-profile, component-integrity, and code-symbol duplicate readers',
    0
  from planning_db_query_leaf_map
  union all
  select
    component_id,
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  from planning_db_query_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from planning_db_query_leaf_map
  union all
  select component_id, 'public_api', api.value, api.item_order - 1
  from planning_db_query_leaf_map
  cross join lateral unnest(public_api) with ordinality as api(value, item_order)
) item
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values (
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
  'CI governance Planning DB query scripts',
  'module',
  'infra',
  'PlanningDbQueryReadModelCatalog',
  'scripts/planning-db-query.cjs',
  'Composite planning:db:query boundary with leaf-owned CLI, tests, and read-model modules.',
  'node',
  'medium',
  'review',
  'SYS-CI-GOVERNANCE-SCRIPTS'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
select
  component_id,
  name,
  'module',
  'infra',
  ddd_owner,
  repo_path,
  public_contract,
  'node',
  'medium',
  'review',
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY'
from planning_db_query_leaf_map
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
select
  'RESP-' || component_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  'proposed'
from planning_db_query_leaf_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
select
  'REL-PLANNING-DB-QUERY-CONTAINS-' ||
    replace(component_id, 'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY-', ''),
  'SYS-CI-GOVERNANCE-SCRIPTS-PLANNING-DB-QUERY',
  component_id,
  'contains',
  'outbound',
  'sync',
  null,
  'not_applicable',
  'repo-local component ownership',
  '["docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md"]'::jsonb,
  'implemented'
from planning_db_query_leaf_map
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
select
  'PORT-' || component_id || '-' || replace(upper(port.value), ':', '-'),
  component_id,
  port.value,
  'query',
  'inbound',
  null,
  null,
  array[validation_command]::text[],
  'implemented'
from planning_db_query_leaf_map
cross join lateral unnest(query_ports) with ordinality as port(value, item_order)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_storage_io (
  storage_io_id,
  component_id,
  storage_object,
  direction,
  access_pattern,
  contract_id
)
select
  'STORAGE-' || component_id || '-' || storage.item_order,
  component_id,
  storage.value,
  'reads',
  'projection',
  null
from planning_db_query_leaf_map
cross join lateral unnest(storage_reads) with ordinality as storage(value, item_order)
on conflict (storage_io_id) do update set
  component_id = excluded.component_id,
  storage_object = excluded.storage_object,
  direction = excluded.direction,
  access_pattern = excluded.access_pattern,
  contract_id = excluded.contract_id;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
select
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  true,
  validation_command
from planning_db_query_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

drop table if exists pg_temp.planning_db_query_leaf_map;
