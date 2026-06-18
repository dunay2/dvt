-- Move Planning DB migration files and the root Vitest config out of the CI
-- composite root. These are active governance assets, so they receive explicit
-- ownership instead of deprecation.

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
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'planning_query_store.governance_component_local_definitions',
  'e1583fd06a9e17324636e5d1326044c0c79187ab73cf98f7ad260b6efcc78744',
  0,
  'Planning DB migration catalog',
  'component',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Owns Planning DB schema and data migrations that define governed query-store, architecture, component, rail, and validation facts.',
  'PlanningDbMigrationCatalog',
  'ApplyPlanningDbMigrations;ValidatePlanningDbMigrations;CheckPlanningDbComponentIntegrity',
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'owns',
    'tools/planning-db/migrations/**',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'owns',
    'vitest.config.ts',
    2
  )
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'responsibility',
    'Own Planning DB migrations as executable architecture and governance facts rather than loose CI root files.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'reason_to_change',
    'Planning DB schema, data migration, component-map, rail vocabulary, or integrity baseline changes.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'public_api',
    'tools/planning-db/migrations/**',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'invariant',
    'Every Planning DB migration must be owned by the migration catalog component and validated by planning-db-migrate tests before apply.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'transition',
    'review -> implemented after component-quality shows no migration files owned by SYS-CI-GOVERNANCE-ROOT and planning-db migration tests pass.',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'consumer',
    'planning:db:migrate, planning:db:query, planning:db:integrity:check, and CI docs gates',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'governance_ref',
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'fowler_signal',
    'hidden_authority',
    0
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'public_api',
    'vitest.config.ts',
    2
  ),
  (
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'invariant',
    'The root Vitest config is part of CI tooling ownership and must not remain on the CI composite root.',
    1
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

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
  'PLANNING-DB-CI-GOVERNANCE-MIGRATION-CATALOG-MAPPING-20260618',
  'PLANNING-DB-COMPONENT-INTEGRITY-VOCABULARY-RAIL-20260612',
  'CI governance Planning DB migration catalog mapping',
  'Architecture / Planning DB / CI',
  'review',
  'Planning DB migrations are executable governance facts and should not remain as direct files under SYS-CI-GOVERNANCE-ROOT. This design maps the migration directory to its own component and assigns vitest.config.ts to CI tooling.',
  'hidden_authority',
  'ApplyPlanningDbMigrations;ValidatePlanningDbMigrations;ValidateComponentIntegrity',
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
values
  (
    'PLANNING-DB-CI-GOVERNANCE-MIGRATION-CATALOG-MAPPING-20260618',
    'component',
    'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'may_create',
    true
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-MIGRATION-CATALOG-MAPPING-20260618',
    'component',
    'SYS-CI-GOVERNANCE-TOOLS-CI',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-MIGRATION-CATALOG-MAPPING-20260618',
    'path',
    'tools/planning-db/migrations/**',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-MIGRATION-CATALOG-MAPPING-20260618',
    'path',
    'vitest.config.ts',
    'may_update',
    true
  ),
  (
    'PLANNING-DB-CI-GOVERNANCE-MIGRATION-CATALOG-MAPPING-20260618',
    'test',
    'TEST-SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
    'may_create',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

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
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'Planning DB migration catalog',
  'module',
  'infra',
  'PlanningDbMigrationCatalog',
  'tools/planning-db/migrations/001_schema.sql',
  'Planning DB migration catalog boundary',
  'node',
  'high',
  'review',
  'SYS-CI-GOVERNANCE-ROOT'
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

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'Own Planning DB migrations as executable architecture and governance facts.',
  'Planning DB schema, data migration, component-map, rail vocabulary, or integrity baseline changes.',
  'PlanningDbMigrationCatalog',
  'implemented'
)
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
values (
  'REL-CI-GOVERNANCE-ROOT-CONTAINS-PLANNING-DB-MIGRATIONS',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'contains',
  'outbound',
  'build_time',
  null,
  'Component profile becomes incomplete if Planning DB migrations are remapped without a governed component update.',
  'repo-local CI governance',
  jsonb_build_array(
    'docs/planning/proposals/mandatory/governance-and-docs/planning-db-component-integrity-vocabulary-rail-plan-20260612.md',
    'tools/planning-db/migrations/**'
  ),
  'implemented'
)
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

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'scripts/planning-db-migrate.test.cjs',
  'architecture',
  'boundary',
  true,
  'node --test scripts/planning-db-migrate.test.cjs && pnpm planning:db:migrate'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
