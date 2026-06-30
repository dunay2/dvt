-- Persist DB-local frontend component additions across governance imports.
-- Imported markdown snapshots own the baseline frontend inventory; local DB
-- overlays own implementation slices that must not be written back to markdown.

create table if not exists planning_query_store.frontend_component_local_files (
  component_id text not null,
  file_path text not null,
  file_role text not null,
  exported_symbol text,
  raw_file jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, file_path, file_role)
);

create table if not exists planning_query_store.frontend_component_local_cq_rails (
  component_id text not null,
  rail_name text not null,
  rail_kind text not null,
  rail_status text not null,
  raw_rail jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, rail_name)
);

create table if not exists planning_query_store.frontend_component_local_evidence (
  evidence_id text primary key,
  component_id text not null,
  evidence_kind text not null,
  evidence_ref text not null,
  evidence_status text not null,
  raw_evidence jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists frontend_component_local_files_component_idx
  on planning_query_store.frontend_component_local_files (component_id, file_path);

create index if not exists frontend_component_local_cq_rails_component_idx
  on planning_query_store.frontend_component_local_cq_rails (component_id, rail_name);

create index if not exists frontend_component_local_evidence_component_idx
  on planning_query_store.frontend_component_local_evidence (component_id, evidence_id);

create or replace view planning_query_store.frontend_component_file_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.exported_symbol,
    imported.raw_file,
    null::text as source_path,
    null::text as source_content_sha256
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select
    local_file.component_id,
    local_file.file_path,
    local_file.file_role,
    local_file.exported_symbol,
    local_file.raw_file,
    local_file.source_path,
    local_file.source_content_sha256
  from planning_query_store.frontend_component_local_files local_file
)
select
  file_ref.component_id,
  component.component_name,
  file_ref.file_path,
  file_ref.file_role,
  file_ref.exported_symbol,
  component.component_status,
  coalesce(file_ref.source_path, component.source_path) as source_path,
  coalesce(file_ref.source_content_sha256, component.source_content_sha256) as source_content_sha256
from effective_files file_ref
join planning_query_store.frontend_components component
  on component.component_id = file_ref.component_id;

create or replace view planning_query_store.frontend_component_rail_query as
with effective_rails as (
  select
    imported.component_id,
    imported.rail_name,
    imported.rail_kind,
    imported.rail_status,
    imported.raw_rail,
    null::text as source_path,
    null::text as source_content_sha256
  from planning_query_store.frontend_component_cq_rails imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails local_rail
    where local_rail.component_id = imported.component_id
      and local_rail.rail_name = imported.rail_name
  )
  union all
  select
    local_rail.component_id,
    local_rail.rail_name,
    local_rail.rail_kind,
    local_rail.rail_status,
    local_rail.raw_rail,
    local_rail.source_path,
    local_rail.source_content_sha256
  from planning_query_store.frontend_component_local_cq_rails local_rail
)
select
  rail.component_id,
  component.component_name,
  rail.rail_name,
  rail.rail_kind,
  rail.rail_status,
  component.component_status,
  coalesce(rail.source_path, component.source_path) as source_path,
  coalesce(rail.source_content_sha256, component.source_content_sha256) as source_content_sha256
from effective_rails rail
join planning_query_store.frontend_components component
  on component.component_id = rail.component_id;

create or replace view planning_query_store.frontend_component_summary_query as
with effective_files as (
  select imported.component_id, imported.file_path, imported.file_role
  from planning_query_store.frontend_component_files imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_files local_file
    where local_file.component_id = imported.component_id
      and local_file.file_path = imported.file_path
      and local_file.file_role = imported.file_role
  )
  union all
  select local_file.component_id, local_file.file_path, local_file.file_role
  from planning_query_store.frontend_component_local_files local_file
),
effective_rails as (
  select imported.component_id, imported.rail_name
  from planning_query_store.frontend_component_cq_rails imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails local_rail
    where local_rail.component_id = imported.component_id
      and local_rail.rail_name = imported.rail_name
  )
  union all
  select local_rail.component_id, local_rail.rail_name
  from planning_query_store.frontend_component_local_cq_rails local_rail
),
effective_evidence as (
  select imported.component_id, imported.evidence_id
  from planning_query_store.frontend_component_evidence imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_evidence local_evidence
    where local_evidence.evidence_id = imported.evidence_id
  )
  union all
  select local_evidence.component_id, local_evidence.evidence_id
  from planning_query_store.frontend_component_local_evidence local_evidence
)
select
  component.component_id,
  component.component_name,
  component.component_kind,
  component.component_status,
  component.reuse_decision,
  component.frontend_owner,
  component.responsibility,
  component.package_name,
  component.route_scope,
  component.plugin_scope,
  component.capability_gaps,
  component.evidence_refs,
  coalesce(
    (
      select jsonb_agg(link.surface_id order by link.surface_id)
      from planning_query_store.frontend_surface_component_links link
      where link.component_id = component.component_id
    ),
    '[]'::jsonb
  ) as surface_ids,
  (
    select count(*)::int
    from planning_query_store.frontend_surface_component_links link
    where link.component_id = component.component_id
  ) as surface_count,
  (
    select count(*)::int
    from effective_files file_ref
    where file_ref.component_id = component.component_id
  ) as file_count,
  (
    select count(*)::int
    from effective_rails rail
    where rail.component_id = component.component_id
  ) as rail_count,
  (
    select count(*)::int
    from effective_evidence evidence
    where evidence.component_id = component.component_id
  ) as evidence_count,
  jsonb_array_length(component.capability_gaps) as capability_gap_count,
  jsonb_array_length(component.evidence_refs) as evidence_ref_count,
  component.source_path,
  component.source_content_sha256,
  component.imported_at
from planning_query_store.frontend_components component;

insert into planning_query_store.frontend_component_local_files (
  component_id,
  file_path,
  file_role,
  exported_symbol,
  raw_file,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'component',
    'CanvasSourceImportDialogHost',
    jsonb_build_object(
      'role', 'contextual route host',
      'rail', 'OpenCanvasSourceImportDialog',
      'delegatesTo', 'apps/web/src/app/components/SourceImportWizard.tsx#SourceImportWizard'
    ),
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    md5('CanvasSourceImportDialogHost:255')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'hook',
    'useCanvasSourceImportDialogState',
    jsonb_build_object(
      'role', 'contextual dialog state',
      'rail', 'OpenCanvasSourceImportDialog',
      'invariant', 'Closes and clears selection when SourceImportDialog is no longer permitted.'
    ),
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    md5('useCanvasSourceImportDialogState:255')
  ),
  (
    'web.component.canvas.SourceImportDialog',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasShell delegates contextual SourceImportDialog state and host presentation.'
    ),
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    md5('CanvasShell.architecture.test.tsx:source-import-dialog-host:255')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.SourceImportDialog',
  'OpenCanvasSourceImportDialog',
  'local-command',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Open the contextual SourceImportDialog from Canvas context surfaces with optional table preselection and canvas placement.',
    'owner', 'SourceImportDialog',
    'canonicalImportRail', 'ImportWarehouseSources'
  ),
  'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
  md5('OpenCanvasSourceImportDialog:255')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_evidence (
  evidence_id,
  component_id,
  evidence_kind,
  evidence_ref,
  evidence_status,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-ARCHITECTURE',
    'web.component.canvas.SourceImportDialog',
    'test',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'passing',
    jsonb_build_object('scope', 'contextual source import host boundary'),
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    md5('EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-ARCHITECTURE:255')
  ),
  (
    'EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PRESENTATION',
    'web.component.canvas.SourceImportDialog',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'passing',
    jsonb_build_object('scope', 'source import lifecycle and availability'),
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    md5('EV-WEB-CANVAS-SOURCE-IMPORT-DIALOG-HOST-PRESENTATION:255')
  )
on conflict (evidence_id) do update set
  component_id = excluded.component_id,
  evidence_kind = excluded.evidence_kind,
  evidence_ref = excluded.evidence_ref,
  evidence_status = excluded.evidence_status,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by
)
values (
  'local#DVT-CANVAS-UXDB-SOURCE-DIALOG-1#command#opencanvassourceimportdialog',
  'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
  'implemented',
  'OpenCanvasSourceImportDialog',
  'opencanvassourceimportdialog',
  'command',
  'SourceImportDialog',
  'implemented',
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHostProps',
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx#CanvasSourceImportDialogHost',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#CanvasSourceImportDialogState',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts#useCanvasSourceImportDialogState'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx'
  ),
  jsonb_build_array(
    'docs/architecture/components/web/frontend-component-inventory.md',
    'docs/architecture/components/web/frontend-command-query-rail-inventory.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'AGENTS.md',
    'docs/planning/status/governance-document-rule-inventory.md',
    'docs/guides/ai-work-protocol.md',
    'docs/architecture/command-query-rail-governance.md',
    'docs/architecture/fowler-opportunity-planning-governance.md',
    'docs/planning/state/planning-control-tower.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
    'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'tools/planning-db/migrations/254_web_canvas_source_import_dialog_host.sql',
    'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql'
  ),
  jsonb_build_array(
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'pnpm docs:feature-mechanization:implementation'
  ),
  jsonb_build_array(
    'pnpm planning:db:migrate',
    'node --test scripts/planning-db-query.test.cjs',
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
    'pnpm --filter @dvt/web typecheck',
    'pnpm --filter @dvt/web lint',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
  md5('DVT-CANVAS-UXDB-SOURCE-DIALOG-1:OpenCanvasSourceImportDialog:255')
    || md5('web.component.canvas.SourceImportDialog'),
  jsonb_build_object(
    'componentId', 'web.component.canvas.SourceImportDialog',
    'railName', 'OpenCanvasSourceImportDialog',
    'railType', 'command',
    'status', 'implemented'
  ),
  jsonb_build_object(
    'featureId', 'DVT-CANVAS-UXDB-SOURCE-DIALOG-1',
    'mechanizationStatus', 'implemented',
    'implementationPlan', 'tools/planning-db/migrations/255_web_canvas_source_import_dialog_post_import_persistence.sql',
    'componentGuides', jsonb_build_array('web.component.canvas.SourceImportDialog'),
    'symbols', jsonb_build_array(
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHostProps',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog')
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogHost',
        'path', 'apps/web/src/app/views/canvas/CanvasSourceImportDialogHost.tsx',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog', 'ImportWarehouseSources')
      ),
      jsonb_build_object(
        'name', 'CanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog')
      ),
      jsonb_build_object(
        'name', 'useCanvasSourceImportDialogState',
        'path', 'apps/web/src/app/views/canvas/useCanvasSourceImportDialogState.ts',
        'dddOwner', 'SourceImportDialog',
        'cqRails', jsonb_build_array('OpenCanvasSourceImportDialog')
      )
    ),
    'architectureGuards', jsonb_build_array(
      'pnpm --filter @dvt/web test:canvas-architecture:run -- src/app/views/canvas/CanvasShell.architecture.test.tsx',
      'pnpm docs:feature-mechanization:implementation'
    ),
    'cypressFlows', jsonb_build_array(),
    'completionGate', jsonb_build_array(
      'pnpm planning:db:migrate',
      'node --test scripts/planning-db-query.test.cjs',
      'node --test scripts/planning-db-migrate.test.cjs',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasShell.sourceImportLifecycle.test.tsx src/app/views/canvas/CanvasShell.sourceImportAvailability.test.tsx',
      'pnpm --filter @dvt/web typecheck',
      'pnpm --filter @dvt/web lint',
      'pnpm verify:prepush'
    ),
    'redGreenCycles', jsonb_build_array(
      jsonb_build_object(
        'redTest', 'CanvasShell.architecture.test.tsx rejects direct SourceImportWizard state in CanvasShell',
        'greenTest', 'CanvasShell delegates SourceImportDialog host and state hook'
      )
    )
  ),
  0,
  'codex'
)
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1;
