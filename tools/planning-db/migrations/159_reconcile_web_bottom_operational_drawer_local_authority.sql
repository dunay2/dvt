-- Reconcile DB-local BottomOperationalDrawer authority with the tracked Web
-- implementation. The prior local operation pointed at a non-existent
-- migration file and used a non-existent component file as the Console
-- architecture path. Keep the implemented rails, but repoint them to real
-- source files and record the old path as deprecated evidence.

create temporary table web_bottom_operational_drawer_rail_source_repoint (
  rail_name text primary key,
  source_path text not null,
  implementation_ref text not null,
  source_repoint_reason text not null
) on commit drop;

insert into web_bottom_operational_drawer_rail_source_repoint (
  rail_name,
  source_path,
  implementation_ref,
  source_repoint_reason
)
values
  (
    'RevealStartedRunOperations',
    'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
    'apps/web/src/app/views/canvas/CanvasOperationalDrawerContributionRegistrar.tsx',
    'Canvas route operational drawer contribution registration is the tracked implementation for revealing run operations.'
  ),
  (
    'BuildBottomOperationalDrawerLogModel',
    'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
    'apps/web/src/app/components/shell/bottomConsoleDrawerModel.ts',
    'The current log model implementation still uses legacy BottomConsoleDrawer file and symbol vocabulary; the BottomOperationalDrawer rail is canonical and the legacy source is tracked as current implementation evidence.'
  ),
  (
    'RenderBottomOperationalDrawer',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
    'apps/web/src/app/components/shell/OperationalDrawerPanels.tsx',
    'OperationalDrawerPanels.tsx exports the tracked BottomOperationalDrawer tabs, body, problems, runs, and preview panels.'
  );

update planning_query_store.feature_mechanization_local_rails rail
set
  source_path = repoint.source_path,
  source_content_sha256 = coalesce(
    (
      select file_ref.content_hash
      from planning_query_store.governance_files file_ref
      where file_ref.path = repoint.source_path
    ),
    rail.source_content_sha256
  ),
  implementation_refs = (
    select coalesce(jsonb_agg(distinct implementation_ref.value order by implementation_ref.value), '[]'::jsonb)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb)) existing_ref(value)
      union all
      select repoint.implementation_ref
    ) implementation_ref
  ),
  documentation_refs = (
    select coalesce(jsonb_agg(distinct documentation_ref.value order by documentation_ref.value), '[]'::jsonb)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.documentation_refs, '[]'::jsonb)) existing_ref(value)
      union all
      select 'docs/architecture/components/web/appshell/app-shell.md'
      union all
      select 'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md'
    ) documentation_ref
  ),
  governing_sources = (
    select coalesce(jsonb_agg(distinct governing_source.value order by governing_source.value), '[]'::jsonb)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.governing_sources, '[]'::jsonb)) existing_ref(value)
      union all
      select 'docs/architecture/command-query-rail-governance.md'
      union all
      select 'docs/architecture/components/web/appshell/app-shell.md'
      union all
      select 'docs/architecture/components/web/workbench-ui-contract-and-component-inventory.md'
    ) governing_source
  ),
  raw_rail = coalesce(rail.raw_rail, '{}'::jsonb) || jsonb_build_object(
    'deprecatedSourcePath',
    'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql',
    'sourcePath',
    repoint.source_path,
    'sourceRepointReason',
    repoint.source_repoint_reason,
    'sourcePathReconciledBy',
    '159_reconcile_web_bottom_operational_drawer_local_authority'
  ),
  raw_manifest = coalesce(rail.raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'deprecatedSourcePath',
    'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql',
    'sourcePath',
    repoint.source_path,
    'sourceRepointReason',
    repoint.source_repoint_reason,
    'reconciledBy',
    '159_reconcile_web_bottom_operational_drawer_local_authority'
  ),
  revision = rail.revision + 1,
  updated_at = now()
from web_bottom_operational_drawer_rail_source_repoint repoint
where rail.source_path = 'tools/planning-db/migrations/156_web_bottom_operational_drawer_component.sql'
  and rail.rail_name = repoint.rail_name;

update architecture.component
set
  name = 'Web console components',
  repo_path = 'apps/web/src/app/components/console',
  public_contract = 'Console view, xterm console, log formatting, and stream hook',
  status = 'review',
  updated_at = now()
where component_id = 'SYS-WEB-APP-COMPONENTS-CONSOLE';

update architecture.component_test
set
  component_id = 'SYS-WEB-APP-COMPONENTS-SHELL'
where test_id = 'TEST-SYS-WEB-APP-COMPONENTS-OPERATIONAL-DRAWER'
  and test_path = 'apps/web/src/app/components/shell/OperationalDrawerPanels.architecture.test.ts';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-WEB-APP-COMPONENTS-CONSOLE',
    'invariant',
    'apps/web/src/app/components/shell/BottomOperationalDrawer.tsx was a DB-local architecture path, not a tracked implementation file; Console ownership resolves to apps/web/src/app/components/Console.tsx and apps/web/src/app/components/console/**.',
    0
  ),
  (
    'SYS-WEB-APP-COMPONENTS-SHELL',
    'invariant',
    'BottomOperationalDrawer is implemented through OperationalDrawerPanels.tsx exports; bottomConsoleDrawerModel.ts remains tracked legacy vocabulary for the current log model until the UXDB rename slice completes.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
