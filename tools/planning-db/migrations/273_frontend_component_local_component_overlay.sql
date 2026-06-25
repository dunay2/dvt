-- DB-first frontend component declarations for local Canvas implementation
-- slices. Imported markdown may still provide baseline snapshots, but local
-- component identity, surface placement, files, rails, and evidence can now be
-- declared directly in Planning DB without reintroducing markdown as the write
-- surface.

create table if not exists planning_query_store.frontend_component_local_components (
  component_id text primary key,
  component_name text not null,
  component_kind text not null,
  component_status text not null,
  reuse_decision text not null,
  frontend_owner text not null,
  responsibility text not null,
  package_name text not null default '@dvt/web',
  route_scope text,
  plugin_scope text,
  capability_gaps jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  raw_component jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table planning_query_store.frontend_component_local_components
  drop constraint if exists frontend_component_local_components_kind_check;

alter table planning_query_store.frontend_component_local_components
  add constraint frontend_component_local_components_kind_check
  check (component_kind in (
    'shell-frame',
    'shell-bar',
    'navigation',
    'health-banner',
    'console-drawer',
    'route-workbench',
    'route-toolbar',
    'state-view',
    'canvas-viewport',
    'canvas-explorer',
    'canvas-inspector',
    'modal',
    'form',
    'query-view',
    'table',
    'tab-strip',
    'primary-surface',
    'context-panel',
    'icon-wrapper'
  ));

alter table planning_query_store.frontend_component_local_components
  drop constraint if exists frontend_component_local_components_status_check;

alter table planning_query_store.frontend_component_local_components
  add constraint frontend_component_local_components_status_check
  check (component_status in ('current', 'needed', 'planned', 'partial', 'experimental', 'retire'));

alter table planning_query_store.frontend_component_local_components
  drop constraint if exists frontend_component_local_components_reuse_decision_check;

alter table planning_query_store.frontend_component_local_components
  add constraint frontend_component_local_components_reuse_decision_check
  check (reuse_decision in ('reuse', 'extract', 'create', 'harden', 'standardize', 'retire'));

create table if not exists planning_query_store.frontend_component_local_surface_links (
  component_id text not null,
  surface_id text not null,
  route_path text,
  placement_kind text not null,
  placement_order integer,
  raw_link jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, surface_id, placement_kind)
);

create index if not exists frontend_component_local_components_kind_idx
  on planning_query_store.frontend_component_local_components (component_kind);

create index if not exists frontend_component_local_components_status_idx
  on planning_query_store.frontend_component_local_components (component_status);

create index if not exists frontend_component_local_components_owner_idx
  on planning_query_store.frontend_component_local_components (frontend_owner);

create index if not exists frontend_component_local_components_source_idx
  on planning_query_store.frontend_component_local_components (source_path, component_id);

create index if not exists frontend_component_local_surface_links_surface_idx
  on planning_query_store.frontend_component_local_surface_links (surface_id, component_id);

create index if not exists frontend_component_files_component_idx
  on planning_query_store.frontend_component_files (component_id, file_path, file_role);

create index if not exists frontend_component_cq_rails_component_idx
  on planning_query_store.frontend_component_cq_rails (component_id, rail_name);

create or replace view planning_query_store.frontend_component_effective_component_query as
select
  imported.component_id,
  imported.component_name,
  imported.component_kind,
  imported.component_status,
  imported.reuse_decision,
  imported.frontend_owner,
  imported.responsibility,
  imported.package_name,
  imported.route_scope,
  imported.plugin_scope,
  imported.capability_gaps,
  imported.evidence_refs,
  imported.source_path,
  imported.source_content_sha256,
  imported.raw_component,
  imported.imported_at
from planning_query_store.frontend_components imported
where not exists (
  select 1
  from planning_query_store.frontend_component_local_components local_component
  where local_component.component_id = imported.component_id
)
union all
select
  local_component.component_id,
  local_component.component_name,
  local_component.component_kind,
  local_component.component_status,
  local_component.reuse_decision,
  local_component.frontend_owner,
  local_component.responsibility,
  local_component.package_name,
  local_component.route_scope,
  local_component.plugin_scope,
  local_component.capability_gaps,
  local_component.evidence_refs,
  local_component.source_path,
  local_component.source_content_sha256,
  local_component.raw_component,
  local_component.created_at as imported_at
from planning_query_store.frontend_component_local_components local_component;

create or replace view planning_query_store.frontend_component_surface_link_query as
with effective_links as (
  select
    imported.component_id,
    imported.surface_id,
    imported.route_path,
    imported.placement_kind,
    imported.placement_order,
    imported.raw_link,
    null::text as source_path,
    null::text as source_content_sha256
  from planning_query_store.frontend_surface_component_links imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_surface_links local_link
    where local_link.component_id = imported.component_id
      and local_link.surface_id = imported.surface_id
      and local_link.placement_kind = imported.placement_kind
  )
  union all
  select
    local_link.component_id,
    local_link.surface_id,
    local_link.route_path,
    local_link.placement_kind,
    local_link.placement_order,
    local_link.raw_link,
    local_link.source_path,
    local_link.source_content_sha256
  from planning_query_store.frontend_component_local_surface_links local_link
)
select
  link.component_id,
  component.component_name,
  link.surface_id,
  link.route_path,
  link.placement_kind,
  link.placement_order,
  component.component_status,
  coalesce(link.source_path, component.source_path) as source_path,
  coalesce(link.source_content_sha256, component.source_content_sha256) as source_content_sha256
from effective_links link
join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = link.component_id;

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
join planning_query_store.frontend_component_effective_component_query component
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
join planning_query_store.frontend_component_effective_component_query component
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
),
surface_rollups as (
  select
    link.component_id,
    jsonb_agg(link.surface_id order by link.surface_id) as surface_ids,
    count(*)::int as surface_count
  from planning_query_store.frontend_component_surface_link_query link
  group by link.component_id
),
file_counts as (
  select file_ref.component_id, count(*)::int as file_count
  from effective_files file_ref
  group by file_ref.component_id
),
rail_counts as (
  select rail.component_id, count(*)::int as rail_count
  from effective_rails rail
  group by rail.component_id
),
evidence_counts as (
  select evidence.component_id, count(*)::int as evidence_count
  from effective_evidence evidence
  group by evidence.component_id
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
  coalesce(surface_rollups.surface_ids, '[]'::jsonb) as surface_ids,
  coalesce(surface_rollups.surface_count, 0) as surface_count,
  coalesce(file_counts.file_count, 0) as file_count,
  coalesce(rail_counts.rail_count, 0) as rail_count,
  coalesce(evidence_counts.evidence_count, 0) as evidence_count,
  jsonb_array_length(component.capability_gaps) as capability_gap_count,
  jsonb_array_length(component.evidence_refs) as evidence_ref_count,
  component.source_path,
  component.source_content_sha256,
  component.imported_at
from planning_query_store.frontend_component_effective_component_query component
left join surface_rollups
  on surface_rollups.component_id = component.component_id
left join file_counts
  on file_counts.component_id = component.component_id
left join rail_counts
  on rail_counts.component_id = component.component_id
left join evidence_counts
  on evidence_counts.component_id = component.component_id;

insert into planning_query_store.frontend_component_local_components (
  component_id,
  component_name,
  component_kind,
  component_status,
  reuse_decision,
  frontend_owner,
  responsibility,
  package_name,
  route_scope,
  plugin_scope,
  capability_gaps,
  evidence_refs,
  source_path,
  source_content_sha256,
  raw_component
)
values
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'CanvasContextMenuPresenter',
    'context-panel',
    'current',
    'harden',
    'Frontend / Canvas',
    'Owns browser gesture lifecycle, close/open timing, and command dispatch for the spatial CanvasContextMenu.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array(
      'Browser-level right-click behavior still requires strict E2E proof before product P0 closeout.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-CONTEXT-MENU-PRESENTER-UNIT',
      'EV-WEB-CANVAS-CONTEXT-MENU-PRESENTER-VIEWPORT'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('web.component.canvas.CanvasContextMenuPresenter:273'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'feature_envy_between_viewport_and_context_menu_lifecycle',
      'governingRail', 'ResolveCanvasContextMenu'
    )
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'CanvasNodeContextMenu',
    'context-panel',
    'current',
    'harden',
    'Frontend / Canvas',
    'Owns node-specific contextual actions without duplicating node property tabs or global canvas actions.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array(
      'Menu vocabulary must stay aligned with the contextual node workbench so properties, inputs, tests, and outputs are not duplicated as disconnected actions.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL',
      'EV-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('web.component.canvas.CanvasNodeContextMenu:273'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'duplicated_contextual_action_vocabulary',
      'governingRail', 'ResolveCanvasContextMenu'
    )
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'CanvasNodeWorkbenchPanel',
    'context-panel',
    'partial',
    'harden',
    'Frontend / Canvas',
    'Owns the contextual node workbench shell for properties, columns, metadata, tests, preview, and runs without requiring a fixed inspector rail.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    jsonb_build_array(
      'Source/model/test metadata remains incomplete for demanding-user authoring.',
      'Columns and test target semantics need product-complete read models before P0 closeout.'
    ),
    jsonb_build_array(
      'EV-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNIT'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('web.component.canvas.CanvasNodeWorkbenchPanel:273'),
    jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'inspector_panel_responsibility_overload',
      'governingRail', 'InspectCanvasNodeProperties'
    )
  )
on conflict (component_id) do update set
  component_name = excluded.component_name,
  component_kind = excluded.component_kind,
  component_status = excluded.component_status,
  reuse_decision = excluded.reuse_decision,
  frontend_owner = excluded.frontend_owner,
  responsibility = excluded.responsibility,
  package_name = excluded.package_name,
  route_scope = excluded.route_scope,
  plugin_scope = excluded.plugin_scope,
  capability_gaps = excluded.capability_gaps,
  evidence_refs = excluded.evidence_refs,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_component = excluded.raw_component,
  updated_at = now();

insert into planning_query_store.frontend_component_local_surface_links (
  component_id,
  surface_id,
  route_path,
  placement_kind,
  placement_order,
  raw_link,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'web.canvas.graph',
    '/canvas',
    'context-menu-presenter',
    47,
    jsonb_build_object('surfaceRole', 'spatial canvas gesture presenter'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('web.component.canvas.CanvasContextMenuPresenter:web.canvas.graph:273')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'web.canvas.graph',
    '/canvas',
    'node-context-menu',
    48,
    jsonb_build_object('surfaceRole', 'node contextual command surface'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('web.component.canvas.CanvasNodeContextMenu:web.canvas.graph:273')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'web.canvas.graph',
    '/canvas',
    'node-workbench-context-panel',
    49,
    jsonb_build_object('surfaceRole', 'contextual node detail workbench'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('web.component.canvas.CanvasNodeWorkbenchPanel:web.canvas.graph:273')
  )
on conflict (component_id, surface_id, placement_kind) do update set
  route_path = excluded.route_path,
  placement_order = excluded.placement_order,
  raw_link = excluded.raw_link,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.ts',
    'hook',
    'useCanvasContextMenuPresenter',
    jsonb_build_object('role', 'context menu lifecycle presenter', 'rail', 'ResolveCanvasContextMenu'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('useCanvasContextMenuPresenter.ts:273')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'open/close lifecycle and echo suppression'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('useCanvasContextMenuPresenter.lifecycle.test.tsx:273')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'canvas action dispatch'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('useCanvasContextMenuPresenter.canvasActions.test.tsx:273')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'node creation and edge command dispatch'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('useCanvasContextMenuPresenter.graphActions.test.tsx:273')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'apps/web/src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'viewport-level context menu integration'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasViewport.contextMenu.test.tsx:273')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.ts',
    'model',
    'buildCanvasNodeContextMenuModel',
    jsonb_build_object('role', 'node context menu read model', 'rail', 'ResolveCanvasContextMenu'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('canvasNodeContextMenuModel.ts:273')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.tsx',
    'component',
    'CanvasNodeContextMenuView',
    jsonb_build_object('role', 'node context menu presentation template'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasNodeContextMenuView.tsx:273')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'apps/web/src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'test',
    null,
    jsonb_build_object('coverage', 'node context menu model vocabulary'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('canvasNodeContextMenuModel.test.ts:273')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'apps/web/src/app/components/canvas/CanvasNodeContextMenuView.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'node context menu presentation semantics'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasNodeContextMenuView.test.tsx:273')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.tsx',
    'component',
    'CanvasNodeWorkbenchPanel',
    jsonb_build_object('role', 'contextual node workbench panel', 'rail', 'InspectCanvasNodeProperties'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasNodeWorkbenchPanel.tsx:273')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'apps/web/src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'test',
    null,
    jsonb_build_object('coverage', 'contextual node workbench rendering'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasNodeWorkbenchPanel.test.tsx:273')
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
values
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'ResolveCanvasContextMenu',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Resolve the spatial context menu model for pane and edge gestures before dispatch.',
      'owner', 'CanvasContextMenuPresenter'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasContextMenuPresenter:ResolveCanvasContextMenu:273')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'CreateCanvasAuthoringNode',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Dispatch authoring node creation from a canvas context-menu position.',
      'owner', 'CanvasContextMenuPresenter'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasContextMenuPresenter:CreateCanvasAuthoringNode:273')
  ),
  (
    'web.component.canvas.CanvasContextMenuPresenter',
    'RemoveCanvasEdgeFromContext',
    'local-command',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Dispatch edge removal selected from an edge context-menu target.',
      'owner', 'CanvasContextMenuPresenter'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasContextMenuPresenter:RemoveCanvasEdgeFromContext:273')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'ResolveCanvasContextMenu',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Resolve node-specific context menu action groups without global canvas actions.',
      'owner', 'CanvasNodeContextMenu'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasNodeContextMenu:ResolveCanvasContextMenu:273')
  ),
  (
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'InspectCanvasNodeProperties',
    'local-query',
    'partial-ui',
    jsonb_build_object(
      'purpose', 'Read contextual node properties, columns, metadata, tests, preview, and runs for the node workbench.',
      'owner', 'CanvasNodeWorkbenchPanel',
      'knownGap', 'Columns/test metadata remain incomplete for demanding-user P0 closeout.'
    ),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('CanvasNodeWorkbenchPanel:InspectCanvasNodeProperties:273')
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
    'EV-WEB-CANVAS-CONTEXT-MENU-PRESENTER-UNIT',
    'web.component.canvas.CanvasContextMenuPresenter',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/useCanvasContextMenuPresenter.lifecycle.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.canvasActions.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx',
    'passing',
    jsonb_build_object('scope', 'context menu presenter lifecycle and action dispatch'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('EV-WEB-CANVAS-CONTEXT-MENU-PRESENTER-UNIT:273')
  ),
  (
    'EV-WEB-CANVAS-CONTEXT-MENU-PRESENTER-VIEWPORT',
    'web.component.canvas.CanvasContextMenuPresenter',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasViewport.contextMenu.test.tsx',
    'passing',
    jsonb_build_object('scope', 'viewport context menu integration'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('EV-WEB-CANVAS-CONTEXT-MENU-PRESENTER-VIEWPORT:273')
  ),
  (
    'EV-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL',
    'web.component.canvas.CanvasNodeContextMenu',
    'test',
    'pnpm --filter @dvt/web test:canvas-unit:run -- src/app/components/canvas/canvasNodeContextMenuModel.test.ts',
    'passing',
    jsonb_build_object('scope', 'node context menu model'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('EV-WEB-CANVAS-NODE-CONTEXT-MENU-MODEL:273')
  ),
  (
    'EV-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW',
    'web.component.canvas.CanvasNodeContextMenu',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/components/canvas/CanvasNodeContextMenuView.test.tsx',
    'passing',
    jsonb_build_object('scope', 'node context menu view'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('EV-WEB-CANVAS-NODE-CONTEXT-MENU-VIEW:273')
  ),
  (
    'EV-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNIT',
    'web.component.canvas.CanvasNodeWorkbenchPanel',
    'test',
    'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/CanvasNodeWorkbenchPanel.test.tsx',
    'passing',
    jsonb_build_object('scope', 'contextual node workbench panel'),
    'tools/planning-db/migrations/273_frontend_component_local_component_overlay.sql',
    md5('EV-WEB-CANVAS-NODE-WORKBENCH-PANEL-UNIT:273')
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
