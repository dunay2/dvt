create table if not exists planning_query_store.db_governance_surfaces (
  surface_name text primary key,
  canonical_source text not null,
  write_rail text not null,
  write_rail_kind text not null check (
    write_rail_kind in ('db_command', 'import', 'git_edit', 'generated', 'none', 'bootstrap_export')
  ),
  read_query_rail text not null,
  projection text not null,
  validation text not null,
  migration_state text not null check (
    migration_state in (
      'Bootstrap/export',
      'DB-first',
      'Generated-only',
      'Git-first indexed',
      'Hybrid indexed'
    )
  ),
  source_ref text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  revision integer not null default 0 check (revision >= 0),
  updated_by text not null,
  updated_at timestamptz not null default now(),
  raw_surface jsonb not null default '{}'::jsonb,
  check (migration_state <> 'DB-first' or write_rail_kind = 'db_command')
);

create table if not exists planning_query_store.db_governance_surface_operations (
  operation_id text primary key,
  idempotency_key text not null unique,
  operation_type text not null check (operation_type = 'db_surface_upsert'),
  actor text not null,
  surface_name text not null references planning_query_store.db_governance_surfaces(surface_name),
  source_ref text not null,
  source_content_sha256 text not null check (source_content_sha256 ~ '^[a-f0-9]{64}$'),
  previous_revision integer not null check (previous_revision >= 0),
  resulting_revision integer not null check (resulting_revision >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists db_governance_surfaces_state_idx
  on planning_query_store.db_governance_surfaces (migration_state, surface_name);

create index if not exists db_governance_surfaces_write_rail_kind_idx
  on planning_query_store.db_governance_surfaces (write_rail_kind, surface_name);

create index if not exists db_governance_surface_operations_surface_idx
  on planning_query_store.db_governance_surface_operations (surface_name, created_at);

insert into planning_query_store.db_governance_surfaces (
  surface_name,
  canonical_source,
  write_rail,
  write_rail_kind,
  read_query_rail,
  projection,
  validation,
  migration_state,
  source_ref,
  source_content_sha256,
  revision,
  updated_by,
  raw_surface
)
values
  (
    'Governance file inventory',
    'Git tracked docs and source files imported into governance DB tables',
    'Git edit followed by pnpm governance:refresh or pnpm governance:db:import',
    'import',
    'pnpm governance:db:query files|components|drift',
    'docs/.manifest.json and generated governance indexes',
    'pnpm governance:db:check; pnpm governance:db:export:check',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"import"}'::jsonb
  ),
  (
    'Architecture design authority',
    'architecture.design and related architecture schema tables',
    'pnpm planning:db:operate architecture-design create',
    'db_command',
    'pnpm planning:db:query architecture-designs|architecture-components|architecture-relations',
    'DB authority rows and generated architecture evidence reports',
    'pnpm test:planning:db; pnpm planning:db:migrate',
    'DB-first',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"db"}'::jsonb
  ),
  (
    'Governance unit tree',
    'planning_query_store.governance_unit_query from imported unitReferences plus DB-authored components',
    'pnpm planning:db:operate component create plus governance refresh for imported units',
    'import',
    'pnpm planning:db:query units --unit <unit_id>',
    'Queryable system/module/component/source parent tree',
    'pnpm test:planning:db; pnpm planning:db:query units --unit <unit_id>',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"hybrid"}'::jsonb
  ),
  (
    'Governance component definition',
    'DB-authored component local definitions plus imported governance_components projection',
    'pnpm planning:db:operate component create',
    'db_command',
    'pnpm planning:db:query component-tree|component-metadata',
    'Effective scalar component definition and file ownership rows',
    'pnpm test:planning:db; pnpm planning:db:migrate',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"hybrid"}'::jsonb
  ),
  (
    'Governance remediation queue',
    'Governance DB coverage and fingerprint reports after refresh',
    'Fix owning docs, config, code, or scripts; then pnpm governance:refresh',
    'generated',
    'pnpm governance:db:query remediation|coverage',
    'Governance coverage and remediation generated reports',
    'pnpm docs:governance:coverage-report:check; pnpm docs:governance:remediation-queue:check',
    'Generated-only',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"generated"}'::jsonb
  ),
  (
    'Code state inventory',
    'Git tracked workspace source and test files under apps and packages',
    'Git edit to source files then pnpm docs:status:generate',
    'git_edit',
    'Local render at .generated-docs/planning/status/generated-code-state.md',
    'Tracked pointer docs/planning/status/generated-code-state.md',
    'pnpm docs:status:check',
    'Git-first indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"git"}'::jsonb
  ),
  (
    'Component engineering records',
    'component_engineering schema read views plus imported governance manifest bootstrap rows',
    'Git edit for imported manifests or pnpm planning:db:operate component create for DB-authored rows',
    'import',
    'pnpm planning:db:query cer|component-tree|component-quality|component-drift',
    'Component engineering record and quality/drift read models',
    'pnpm test:planning:db; pnpm planning:db:query cer --component <component_id>',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"hybrid"}'::jsonb
  ),
  (
    'ADR and contract decisions',
    'docs/adr and specs/contracts source documents',
    'Git edit through ADR or contract review',
    'git_edit',
    'pnpm governance:db:query files --prefix docs/adr',
    'Docs indexes and governance file inventory',
    'pnpm docs:sync:check; pnpm contracts:index:check; pnpm docs:arc:evidence:check',
    'Git-first indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"git"}'::jsonb
  ),
  (
    'Risk and evidence records',
    'docs/evidence and docs/risk-register source documents',
    'Git edit through ARC evidence and risk register rules',
    'git_edit',
    'pnpm governance:db:query files --prefix docs/evidence',
    'docs/evidence/index.md and docs/risk-register/index.md',
    'pnpm docs:sync:check; pnpm docs:arc:evidence:check',
    'Git-first indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"git"}'::jsonb
  ),
  (
    'Repository command catalog',
    'tools/ci/repository-command-catalog.mjs imported into planning DB command rows',
    'Git edit to command catalog or workflow source',
    'git_edit',
    'pnpm planning:db:query commands; pnpm planning:db:query pr-readiness',
    'Repository command and PR-readiness query output',
    'pnpm test:ci-tools; pnpm docs:feature-mechanization:implementation',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"git"}'::jsonb
  ),
  (
    'Command/query rail catalog',
    'Feature mechanization manifests and explicit command/query rail documentation imported into DB rows',
    'Git edit to governed feature manifests followed by governance refresh',
    'import',
    'pnpm planning:db:query command-query-rails; pnpm planning:db:query creation-intent',
    'planning_query_store.command_query_rail_query rows',
    'pnpm test:planning:db; pnpm planning:db:inventory:check; pnpm docs:feature-mechanization:implementation',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"import"}'::jsonb
  ),
  (
    'Knowledge intake literature',
    'knowledge_documents, knowledge_document_links, action rows, and component ownership projections',
    'pnpm governance:refresh or pnpm docs:knowledge-intake:generate after DB import',
    'import',
    'pnpm planning:db:query knowledge-intake',
    '.generated-docs/planning/status/generated-knowledge-intake-literature.md',
    'pnpm docs:knowledge-intake:check; pnpm governance:refresh',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"import"}'::jsonb
  ),
  (
    'AI project context',
    'Aggregate read model over DB projections for summary, rails, components, real work, debt, and readiness',
    'No write rail; aggregate is read-only',
    'none',
    'pnpm planning:db:query ai-project-context --format json|markdown',
    'In-memory aggregate from planning DB query projections',
    'node --test scripts/planning-db-query.test.cjs; pnpm planning:db:inventory:check',
    'Hybrid indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"read_model"}'::jsonb
  ),
  (
    'Docs task disposition inventory',
    'docs/planning/status/docs-task-disposition-inventory-20260510.md and related planning status docs',
    'Git edit to disposition inventory followed by governance refresh',
    'git_edit',
    'pnpm planning:db:query docs-disposition|task-references|feature-work',
    'Disposition query rows and task-reference reports',
    'pnpm governance:db:check; pnpm docs:governance:changed-files:check',
    'Git-first indexed',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"git"}'::jsonb
  ),
  (
    'Docs resolution overlays',
    'planning_query_store.doc_resolution_overlays keyed to source hashes',
    'pnpm planning:db:operate docs-disposition resolve; pnpm planning:db:operate task-gap resolve',
    'db_command',
    'pnpm planning:db:query docs-disposition --resolution <state>; pnpm planning:db:query task-gaps --resolution <state>',
    'doc_disposition_action_query and planning_task_gap_query rows',
    'pnpm test:planning:db; pnpm planning:db:query task-gaps --resolution all',
    'DB-first',
    'tools/planning-db/migrations/059_db_surface_inventory.sql',
    repeat('0', 64),
    0,
    'migration',
    '{"authority":"db"}'::jsonb
  )
on conflict (surface_name) do nothing;

create or replace view planning_query_store.db_governance_surface_query as
select
  surface_name,
  canonical_source,
  write_rail,
  write_rail_kind,
  read_query_rail,
  projection,
  validation,
  migration_state,
  source_ref,
  source_content_sha256,
  revision,
  updated_by,
  updated_at,
  raw_surface,
  (migration_state = 'DB-first' and write_rail_kind = 'db_command') as db_first_eligible,
  case
    when migration_state <> 'DB-first' then null
    when write_rail_kind = 'db_command' then null
    else 'DB-first requires write_rail_kind=db_command'
  end as db_first_blocker
from planning_query_store.db_governance_surfaces;
