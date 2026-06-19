-- Split the flat Planning DB migration catalog into semantic migration-era leaves.
-- The parent remains the aggregate; concrete migration files resolve to
-- foundation, rail/integrity, API/Web hardening, component authority cleanup,
-- or component leaf-mapping migration leaves.

drop table if exists pg_temp.planning_db_migration_catalog_leaf_map;

create temporary table planning_db_migration_catalog_leaf_map (
  component_id text primary key,
  name text not null,
  repo_path text not null,
  ddd_owner text not null,
  rail_name text not null,
  owned_concern text not null,
  reason_to_change text not null,
  public_contract text not null,
  fowler_signal text not null,
  owns text[] not null,
  test_path text not null,
  validation_command text not null,
  maturity_score numeric not null,
  criticality text not null
);

insert into planning_db_migration_catalog_leaf_map (
  component_id,
  name,
  repo_path,
  ddd_owner,
  rail_name,
  owned_concern,
  reason_to_change,
  public_contract,
  fowler_signal,
  owns,
  test_path,
  validation_command,
  maturity_score,
  criticality
)
values
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-FOUNDATION',
    'Planning DB foundation migrations',
    'tools/planning-db/migrations/001_content_read_model.sql',
    'PlanningDbFoundationMigrationReadModel',
    'ReadPlanningDbFoundationMigrations',
    'Planning DB content, governance, task, source, command, PR, work intake, component engineering, architecture authority, and normalized local component foundation migrations from 001 through 049',
    'Planning DB foundation schema, initial query-store projection, operation store, source document, command catalog, architecture authority, or normalized component definition migration changes.',
    'Planning DB foundation migration catalog boundary.',
    'migration_foundation',
    array[
      'tools/planning-db/migrations/00*.sql',
      'tools/planning-db/migrations/01*.sql',
      'tools/planning-db/migrations/02*.sql',
      'tools/planning-db/migrations/03*.sql',
      'tools/planning-db/migrations/04*.sql'
    ]::text[],
    'scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs && pnpm planning:db:migrate',
    86,
    'critical'
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-RAIL-INTEGRITY',
    'Planning DB rail and integrity migrations',
    'tools/planning-db/migrations/050_component_definition_normalized_invariants.sql',
    'PlanningDbRailIntegrityMigrationReadModel',
    'ReadPlanningDbRailIntegrityMigrations',
    'Planning DB normalized component invariants, command/query rail projection, documentation lifecycle, Fowler analysis, component roadmap, documentation panel, and component integrity migrations from 050 through 089',
    'Planning DB command/query rail, rail vocabulary, component integrity, documentation lifecycle, Fowler analysis, roadmap, or architecture evidence migration changes.',
    'Planning DB rail and integrity migration catalog boundary.',
    'rail_integrity',
    array[
      'tools/planning-db/migrations/05*.sql',
      'tools/planning-db/migrations/06*.sql',
      'tools/planning-db/migrations/07*.sql',
      'tools/planning-db/migrations/08*.sql'
    ]::text[],
    'scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs && pnpm planning:db:migrate',
    86,
    'critical'
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-API-WEB-HARDENING',
    'Planning DB API and Web hardening migrations',
    'tools/planning-db/migrations/090_component_roadmap_file_ref_filter.sql',
    'PlanningDbApiWebHardeningMigrationReadModel',
    'ReadPlanningDbApiWebHardeningMigrations',
    'Planning DB Canvas, Web, API, code-symbol, query-helper, test-support, root filesystem, and source import hardening migrations from 090 through 129',
    'Planning DB Web Canvas, API, code-symbol, query helper, test-support, source import, or root filesystem hardening migration changes.',
    'Planning DB API and Web hardening migration catalog boundary.',
    'api_web_hardening',
    array[
      'tools/planning-db/migrations/09*.sql',
      'tools/planning-db/migrations/10*.sql',
      'tools/planning-db/migrations/11*.sql',
      'tools/planning-db/migrations/12*.sql'
    ]::text[],
    'scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs && pnpm planning:db:migrate',
    82,
    'high'
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-COMPONENT-AUTHORITY',
    'Planning DB component authority cleanup migrations',
    'tools/planning-db/migrations/130_web_canvas_component_path_extension_fix.sql',
    'PlanningDbComponentAuthorityMigrationReadModel',
    'ReadPlanningDbComponentAuthorityMigrations',
    'Planning DB component authority, CI governance, root component, package root, worker, planner, PlanStore, imported authority, rail reconciliation, and Canvas retirement migrations from 130 through 179',
    'Planning DB component authority, imported local authority, rail reconciliation, CI governance, root component, worker, planner, PlanStore, or Canvas retirement migration changes.',
    'Planning DB component authority cleanup migration catalog boundary.',
    'component_authority_cleanup',
    array[
      'tools/planning-db/migrations/13*.sql',
      'tools/planning-db/migrations/14*.sql',
      'tools/planning-db/migrations/15*.sql',
      'tools/planning-db/migrations/16*.sql',
      'tools/planning-db/migrations/17*.sql'
    ]::text[],
    'scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs && pnpm planning:db:migrate',
    84,
    'critical'
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-LEAF-MAPPING',
    'Planning DB component leaf-mapping migrations',
    'tools/planning-db/migrations/180_ci_docs_generation_leaf_components.sql',
    'PlanningDbLeafMappingMigrationReadModel',
    'ReadPlanningDbLeafMappingMigrations',
    'Planning DB component leaf-mapping, docs catalog, API HTTP, test evidence, runtime state-store, archive, evidence, risk register, engine architecture, and migration catalog split migrations from 180 onward',
    'Planning DB component leaf mapping, docs catalog split, runtime/API/test split, archive/evidence/risk docs split, or migration catalog split changes.',
    'Planning DB component leaf-mapping migration catalog boundary.',
    'component_leaf_mapping',
    array[
      'tools/planning-db/migrations/18*.sql',
      'tools/planning-db/migrations/19*.sql'
    ]::text[],
    'scripts/planning-db-migrate.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs && pnpm planning:db:migrate',
    86,
    'critical'
  );

update architecture.component
set
  repo_path = 'tools/planning-db/migrations',
  public_contract = 'Planning DB migration aggregate catalog. Concrete migration files resolve to semantic migration-era leaf components.',
  updated_at = now()
where
  component_id = 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS';

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
  'PLANNING-DB-MIGRATION-CATALOG-LEAF-MAPPING-20260619',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'Planning DB migration catalog leaf component mapping',
  'Architecture / Planning DB / CI',
  'review',
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS directly owned every tracked Planning DB migration file and pointed at 001_content_read_model.sql as its repo path. This split keeps the aggregate at tools/planning-db/migrations and creates semantic migration-era child components so component-profile can answer files, tests, contracts, ports, relations, and Fowler/DDD basis without a side inventory. No migration files are deprecated in this slice; old or non-functional migrations require explicit retirement evidence because applied migrations remain executable history.',
  'responsibility_overload',
  'ReadComponentProfile;ValidateComponentIntegrity;ReadPlanningDbFoundationMigrations;ReadPlanningDbRailIntegrityMigrations;ReadPlanningDbApiWebHardeningMigrations;ReadPlanningDbComponentAuthorityMigrations;ReadPlanningDbLeafMappingMigrations',
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
  'PLANNING-DB-MIGRATION-CATALOG-LEAF-MAPPING-20260619',
  scope.subject_kind,
  scope.subject_id,
  scope.scope_kind,
  true
from (
  select 'component'::text, 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS'::text, 'may_update'::text
  union all
  select 'path', 'tools/planning-db/migrations/**', 'may_update'
  union all
  select 'component', component_id, 'may_create' from planning_db_migration_catalog_leaf_map
  union all
  select 'path', pattern, 'may_update'
  from planning_db_migration_catalog_leaf_map
  cross join lateral unnest(owns) as owned(pattern)
) scope(subject_kind, subject_id, scope_kind)
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
select
  component_id,
  'tools/planning-db/migrations/197_planning_db_migration_catalog_leaf_components.sql',
  md5(component_id || ':197') || md5(repo_path || rail_name || ':planning-db-migration-catalog-leaf'),
  0,
  name,
  'component',
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  owned_concern,
  ddd_owner,
  rail_name,
  'codex'
from planning_db_migration_catalog_leaf_map
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
from planning_db_migration_catalog_leaf_map
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
  select component_id, 'responsibility' as item_kind, 'Own ' || owned_concern || '.' as item_value, 0 as item_order
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'reason_to_change', reason_to_change, 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'invariant', 'Tracked Planning DB migration files matching this leaf must resolve here rather than to SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS.', 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'non_goal', 'No Planning DB migration files are deprecated in this slice; applied migrations remain executable history until explicit retirement evidence exists.', 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'transition', 'review -> implemented once component-quality shows SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS owns no direct migration files.', 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'consumer', 'Planning DB component-profile, component-integrity, source-drift, filesystem-coverage, and migration checksum readers.', 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/status/governance-document-rule-inventory.md', 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/command-query-rail-governance.md', 1
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/architecture/fowler-opportunity-planning-governance.md', 2
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'governance_ref', 'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md', 3
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'fowler_signal', fowler_signal, 0
  from planning_db_migration_catalog_leaf_map
  union all
  select component_id, 'public_api', rail_name, 0
  from planning_db_migration_catalog_leaf_map
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
  maturity_score,
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
  'none',
  criticality,
  'review',
  maturity_score,
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS'
from planning_db_migration_catalog_leaf_map
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
  maturity_score = excluded.maturity_score,
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
  'Own ' || owned_concern || '.',
  reason_to_change,
  ddd_owner,
  'implemented'
from planning_db_migration_catalog_leaf_map
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
select
  'CONTRACT-' || component_id || '-DOCS',
  'type',
  component_id,
  public_contract,
  'internal',
  'implemented',
  validation_command
from planning_db_migration_catalog_leaf_map
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

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
  'REL-PLANNING-DB-MIGRATIONS-CONTAINS-' || replace(component_id, 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-', ''),
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  component_id,
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if this migration catalog leaf is removed or remapped without a governed Planning DB component update.',
  'repo-local CI governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    repo_path
  ),
  'implemented'
from planning_db_migration_catalog_leaf_map
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
  'PORT-' || component_id || '-' || upper(regexp_replace(rail_name, '[^A-Za-z0-9]+', '-', 'g')),
  component_id,
  rail_name,
  'query',
  'inbound',
  'CONTRACT-' || component_id || '-DOCS',
  'CONTRACT-' || component_id || '-DOCS',
  array[
    'missing Planning DB migration ownership',
    'migration file retired without explicit executable-history decision',
    'component-profile migration catalog gap'
  ]::text[],
  'implemented'
from planning_db_migration_catalog_leaf_map
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

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
  'TEST-' || component_id || '-DOCS',
  component_id,
  test_path,
  'architecture',
  'boundary',
  true,
  validation_command
from planning_db_migration_catalog_leaf_map
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
select
  'OBS-' || component_id || '-DOCS',
  component_id,
  'Planning DB migration catalog component is observable through migration checksum and planning:db:migrate output.',
  'log',
  true,
  'implemented'
from planning_db_migration_catalog_leaf_map
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

drop table if exists pg_temp.planning_db_migration_catalog_leaf_map;
