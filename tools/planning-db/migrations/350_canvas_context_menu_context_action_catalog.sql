-- DB-first relational catalog for Canvas context-menu ownership.
-- This slice keeps CanvasContextMenu as the host/layer component and moves
-- actionable responsibilities into explicit context-owned records.

create table if not exists planning_query_store.frontend_component_contexts (
  component_id text not null,
  context_id text not null,
  context_kind text not null,
  context_status text not null,
  responsibility text not null,
  raw_context jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, context_id)
);

alter table planning_query_store.frontend_component_contexts
  drop constraint if exists frontend_component_contexts_kind_check;

alter table planning_query_store.frontend_component_contexts
  add constraint frontend_component_contexts_kind_check
  check (context_kind in (
    'host',
    'canvas-background',
    'edge',
    'node',
    'selection',
    'run-preview'
  ));

alter table planning_query_store.frontend_component_contexts
  drop constraint if exists frontend_component_contexts_status_check;

alter table planning_query_store.frontend_component_contexts
  add constraint frontend_component_contexts_status_check
  check (context_status in ('current', 'planned', 'partial', 'retired', 'moved'));

create table if not exists planning_query_store.frontend_component_context_actions (
  component_id text not null,
  context_id text not null,
  action_id text not null,
  action_label text not null,
  action_kind text not null,
  action_status text not null,
  rail_name text,
  action_order integer not null default 0,
  raw_action jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, context_id, action_id)
);

alter table planning_query_store.frontend_component_context_actions
  drop constraint if exists frontend_component_context_actions_kind_check;

alter table planning_query_store.frontend_component_context_actions
  add constraint frontend_component_context_actions_kind_check
  check (action_kind in (
    'host-render',
    'authoring',
    'import',
    'validation',
    'settings',
    'edge-mutation',
    'node-workbench',
    'selection-operation',
    'run-preview'
  ));

alter table planning_query_store.frontend_component_context_actions
  drop constraint if exists frontend_component_context_actions_status_check;

alter table planning_query_store.frontend_component_context_actions
  add constraint frontend_component_context_actions_status_check
  check (action_status in (
    'valid',
    'planned',
    'gap',
    'moved-to-run-preview',
    'retired'
  ));

create table if not exists planning_query_store.frontend_component_plugin_scopes (
  component_id text not null,
  plugin_id text not null,
  scope_status text not null,
  raw_scope jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, plugin_id)
);

alter table planning_query_store.frontend_component_plugin_scopes
  drop constraint if exists frontend_component_plugin_scopes_status_check;

alter table planning_query_store.frontend_component_plugin_scopes
  add constraint frontend_component_plugin_scopes_status_check
  check (scope_status in ('current', 'planned', 'retired'));

create table if not exists planning_query_store.frontend_component_capability_gaps (
  component_id text not null,
  gap_id text not null,
  gap_kind text not null,
  gap_status text not null,
  description text not null,
  owning_task_id text,
  raw_gap jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, gap_id)
);

alter table planning_query_store.frontend_component_capability_gaps
  drop constraint if exists frontend_component_capability_gaps_status_check;

alter table planning_query_store.frontend_component_capability_gaps
  add constraint frontend_component_capability_gaps_status_check
  check (gap_status in ('open', 'planned', 'closed', 'moved'));

create table if not exists planning_query_store.frontend_component_validation_evidence (
  component_id text not null,
  evidence_id text not null,
  evidence_kind text not null,
  evidence_status text not null,
  evidence_ref text not null,
  rail_name text,
  context_id text,
  proves text not null,
  raw_evidence jsonb not null default '{}'::jsonb,
  source_path text not null,
  source_content_sha256 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (component_id, evidence_id)
);

alter table planning_query_store.frontend_component_validation_evidence
  drop constraint if exists frontend_component_validation_evidence_kind_check;

alter table planning_query_store.frontend_component_validation_evidence
  add constraint frontend_component_validation_evidence_kind_check
  check (evidence_kind in ('unit-test', 'architecture-test', 'integration-test', 'e2e-test'));

alter table planning_query_store.frontend_component_validation_evidence
  drop constraint if exists frontend_component_validation_evidence_status_check;

alter table planning_query_store.frontend_component_validation_evidence
  add constraint frontend_component_validation_evidence_status_check
  check (evidence_status in ('current', 'stale', 'gap'));

create index if not exists frontend_component_contexts_context_idx
  on planning_query_store.frontend_component_contexts (context_id, context_kind);

create index if not exists frontend_component_context_actions_rail_idx
  on planning_query_store.frontend_component_context_actions (rail_name, context_id);

create index if not exists frontend_component_context_actions_status_idx
  on planning_query_store.frontend_component_context_actions (action_status, context_id);

create index if not exists frontend_component_plugin_scopes_plugin_idx
  on planning_query_store.frontend_component_plugin_scopes (plugin_id, component_id);

create index if not exists frontend_component_capability_gaps_status_idx
  on planning_query_store.frontend_component_capability_gaps (gap_status, component_id);

create index if not exists frontend_component_validation_evidence_rail_idx
  on planning_query_store.frontend_component_validation_evidence (rail_name, context_id);

create or replace view planning_query_store.frontend_component_context_query as
select
  context.component_id,
  component.component_name,
  context.context_id,
  context.context_kind,
  context.context_status,
  context.responsibility,
  context.source_path,
  context.source_content_sha256
from planning_query_store.frontend_component_contexts context
left join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = context.component_id;

create or replace view planning_query_store.frontend_component_context_action_query as
select
  action.component_id,
  component.component_name,
  action.context_id,
  context.context_kind,
  action.action_id,
  action.action_label,
  action.action_kind,
  action.action_status,
  action.rail_name,
  rail.rail_kind as frontend_rail_kind,
  rail.rail_status as frontend_rail_status,
  action.action_order,
  action.source_path,
  action.source_content_sha256
from planning_query_store.frontend_component_context_actions action
left join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = action.component_id
left join planning_query_store.frontend_component_contexts context
  on context.component_id = action.component_id
 and context.context_id = action.context_id
left join planning_query_store.frontend_component_rail_query rail
  on rail.component_id = action.component_id
 and rail.rail_name = action.rail_name;

create or replace view planning_query_store.frontend_component_plugin_scope_query as
select
  scope.component_id,
  component.component_name,
  scope.plugin_id,
  scope.scope_status,
  scope.source_path,
  scope.source_content_sha256
from planning_query_store.frontend_component_plugin_scopes scope
left join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = scope.component_id;

create or replace view planning_query_store.frontend_component_capability_gap_query as
select
  gap.component_id,
  component.component_name,
  gap.gap_id,
  gap.gap_kind,
  gap.gap_status,
  gap.description,
  gap.owning_task_id,
  gap.source_path,
  gap.source_content_sha256
from planning_query_store.frontend_component_capability_gaps gap
left join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = gap.component_id;

create or replace view planning_query_store.frontend_component_validation_evidence_query as
select
  evidence.component_id,
  component.component_name,
  evidence.evidence_id,
  evidence.evidence_kind,
  evidence.evidence_status,
  evidence.evidence_ref,
  evidence.rail_name,
  evidence.context_id,
  evidence.proves,
  evidence.source_path,
  evidence.source_content_sha256
from planning_query_store.frontend_component_validation_evidence evidence
left join planning_query_store.frontend_component_effective_component_query component
  on component.component_id = evidence.component_id;

delete from planning_query_store.frontend_component_validation_evidence
where component_id = 'web.component.canvas.CanvasContextMenuHost';

delete from planning_query_store.frontend_component_context_actions
where component_id = 'web.component.canvas.CanvasContextMenuHost';

delete from planning_query_store.frontend_component_contexts
where component_id = 'web.component.canvas.CanvasContextMenuHost';

delete from planning_query_store.frontend_component_local_files
where component_id = 'web.component.canvas.CanvasContextMenuHost';

delete from planning_query_store.frontend_component_local_components
where component_id = 'web.component.canvas.CanvasContextMenuHost';

update planning_query_store.frontend_component_local_components
set
  component_name = 'CanvasContextMenuHost',
  component_kind = 'context-panel',
  component_status = 'current',
  reuse_decision = 'extract',
  frontend_owner = 'Canvas workbench',
  responsibility = 'Hosts the positioned Canvas context-menu template and delegates valid action ownership to context-specific child components.',
  package_name = '@dvt/web',
  route_scope = '/canvas',
  plugin_scope = null,
  capability_gaps = '[]'::jsonb,
  evidence_refs = '[]'::jsonb,
  source_path = 'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
  source_content_sha256 = md5('web.component.canvas.CanvasContextMenu:350:host'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'dbFirst', true,
      'fowlerSignal', 'responsibility_overload',
      'architecturalRole', 'host',
      'supersededSummaryListsRetired', jsonb_build_array(
        'plugin_scope',
        'capability_gaps',
        'evidence_refs'
      )
    ),
  updated_at = now()
where component_id = 'web.component.canvas.CanvasContextMenu';

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
  raw_component,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'CanvasBackgroundContextMenu',
    'context-panel',
    'current',
    'extract',
    'Canvas workbench',
    'Owns valid actions for right-clicking empty Canvas background space.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object('parentComponentId', 'web.component.canvas.CanvasContextMenu', 'contextId', 'canvas-background'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('web.component.canvas.CanvasBackgroundContextMenu:350')
  ),
  (
    'web.component.canvas.CanvasEdgeContextMenu',
    'CanvasEdgeContextMenu',
    'context-panel',
    'current',
    'extract',
    'Canvas workbench',
    'Owns valid actions for right-clicking a Canvas edge.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object('parentComponentId', 'web.component.canvas.CanvasContextMenu', 'contextId', 'edge'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('web.component.canvas.CanvasEdgeContextMenu:350')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'CanvasNodeContextMenu',
    'context-panel',
    'current',
    'reuse',
    'Canvas workbench',
    'Owns valid actions for right-clicking a Canvas node through the existing node context-menu primitives.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object('parentComponentId', 'web.component.canvas.CanvasContextMenu', 'contextId', 'node'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('web.component.canvas.CanvasNodeContextMenu:350')
  ),
  (
    'web.component.canvas.CanvasSelectionContextMenu',
    'CanvasSelectionContextMenu',
    'context-panel',
    'planned',
    'create',
    'Canvas workbench',
    'Will own valid actions for multi-selection Canvas context operations.',
    '@dvt/web',
    '/canvas',
    null,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object('parentComponentId', 'web.component.canvas.CanvasContextMenu', 'contextId', 'selection'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('web.component.canvas.CanvasSelectionContextMenu:350')
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
  raw_component = excluded.raw_component,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_contexts (
  component_id,
  context_id,
  context_kind,
  context_status,
  responsibility,
  raw_context,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasContextMenu',
    'host',
    'host',
    'current',
    'Mount the context menu template and preserve positioning/focus behavior.',
    jsonb_build_object('renderRail', 'RenderCanvasContextMenu', 'resolveRail', 'ResolveCanvasContextMenu'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('context:host:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'canvas-background',
    'canvas-background',
    'current',
    'Resolve valid actions for empty Canvas background right-clicks.',
    jsonb_build_object('validActionSource', 'canvasInteractionCommandSurface.ts'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('context:canvas-background:350')
  ),
  (
    'web.component.canvas.CanvasEdgeContextMenu',
    'edge',
    'edge',
    'current',
    'Resolve valid actions for edge right-clicks without leaking background actions.',
    jsonb_build_object('validActionSource', 'canvasInteractionCommandSurface.ts'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('context:edge:350')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'node',
    'node',
    'current',
    'Resolve valid actions for node right-clicks through node context-menu primitives.',
    jsonb_build_object('validActionSource', 'CanvasNodeContextMenuPrimitives.tsx'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('context:node:350')
  ),
  (
    'web.component.canvas.CanvasSelectionContextMenu',
    'selection',
    'selection',
    'planned',
    'Track the not-yet-implemented multi-selection context actions separately from background and edge actions.',
    jsonb_build_object('validActionSource', 'planned'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('context:selection:350')
  )
on conflict (component_id, context_id) do update set
  context_kind = excluded.context_kind,
  context_status = excluded.context_status,
  responsibility = excluded.responsibility,
  raw_context = excluded.raw_context,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_context_actions (
  component_id,
  context_id,
  action_id,
  action_label,
  action_kind,
  action_status,
  rail_name,
  action_order,
  raw_action,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasContextMenu',
    'host',
    'render-context-menu',
    'Render context menu',
    'host-render',
    'valid',
    'RenderCanvasContextMenu',
    10,
    jsonb_build_object('template', 'ContextMenuTemplate', 'sourceFile', 'CanvasContextMenuView.tsx'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:host:render-context-menu:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'canvas-background',
    'add-source',
    'Add source',
    'import',
    'valid',
    'ImportWarehouseSources',
    10,
    jsonb_build_object('uiAction', 'open-source-import', 'sourceFile', 'canvasInteractionCommandSurface.ts'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:canvas-background:add-source:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'canvas-background',
    'create-authoring-node',
    'Add...',
    'authoring',
    'valid',
    'CreateCanvasAuthoringNode',
    20,
    jsonb_build_object('uiAction', 'create-node', 'sourceFile', 'canvasInteractionCommandSurface.ts'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:canvas-background:create-authoring-node:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'canvas-background',
    'validate-graph',
    'Validate graph',
    'validation',
    'valid',
    'ResolveCanvasContextMenu',
    30,
    jsonb_build_object('uiAction', 'validate-graph', 'railNote', 'local action resolves to existing graph validation callback'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:canvas-background:validate-graph:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'canvas-background',
    'canvas-settings',
    'Canvas settings',
    'settings',
    'valid',
    'ResolveCanvasContextMenu',
    40,
    jsonb_build_object('uiAction', 'open-canvas-settings'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:canvas-background:canvas-settings:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'canvas-background',
    'preview-execution-plan',
    'Preview execution plan',
    'run-preview',
    'moved-to-run-preview',
    'PreviewExecutionPlan',
    90,
    jsonb_build_object('decision', 'Run and Preview belong together; Canvas background must not own this action long-term.'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:canvas-background:preview-execution-plan:350')
  ),
  (
    'web.component.canvas.CanvasEdgeContextMenu',
    'edge',
    'remove-edge',
    'Remove edge',
    'edge-mutation',
    'valid',
    'RemoveCanvasEdgeFromContext',
    10,
    jsonb_build_object('uiAction', 'remove-edge', 'sourceFile', 'canvasInteractionCommandSurface.ts'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:edge:remove-edge:350')
  ),
  (
    'web.component.canvas.CanvasNodeContextMenu',
    'node',
    'open-node-workbench',
    'Open node workbench',
    'node-workbench',
    'valid',
    'ResolveCanvasContextMenu',
    10,
    jsonb_build_object('existingComponent', 'web.component.canvas.CanvasNodeContextMenu'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:node:open-node-workbench:350')
  ),
  (
    'web.component.canvas.CanvasSelectionContextMenu',
    'selection',
    'selection-actions',
    'Selection actions',
    'selection-operation',
    'planned',
    null,
    10,
    jsonb_build_object('reason', 'Selection context menu is intentionally separate and not implemented by the background menu.'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('action:selection:selection-actions:350')
  )
on conflict (component_id, context_id, action_id) do update set
  action_label = excluded.action_label,
  action_kind = excluded.action_kind,
  action_status = excluded.action_status,
  rail_name = excluded.rail_name,
  action_order = excluded.action_order,
  raw_action = excluded.raw_action,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_plugin_scopes (
  component_id,
  plugin_id,
  scope_status,
  raw_scope,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'dbt',
    'current',
    jsonb_build_object('scopeReason', 'DBT canvas can create DBT authoring nodes through the background context.'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('scope:CanvasBackgroundContextMenu:dbt:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'dvt',
    'current',
    jsonb_build_object('scopeReason', 'DVT canvas can create DVT authoring nodes through the background context.'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('scope:CanvasBackgroundContextMenu:dvt:350')
  ),
  (
    'web.component.canvas.CanvasEdgeContextMenu',
    'dbt',
    'current',
    jsonb_build_object('scopeReason', 'DBT graph edges can be removed through the edge context.'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('scope:CanvasEdgeContextMenu:dbt:350')
  ),
  (
    'web.component.canvas.CanvasEdgeContextMenu',
    'dvt',
    'current',
    jsonb_build_object('scopeReason', 'DVT graph edges can be removed through the edge context.'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('scope:CanvasEdgeContextMenu:dvt:350')
  )
on conflict (component_id, plugin_id) do update set
  scope_status = excluded.scope_status,
  raw_scope = excluded.raw_scope,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_capability_gaps (
  component_id,
  gap_id,
  gap_kind,
  gap_status,
  description,
  owning_task_id,
  raw_gap,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasSelectionContextMenu',
    'CANVAS-SELECTION-CONTEXT-MENU-NOT-IMPLEMENTED',
    'missing-context-actions',
    'planned',
    'Selection context actions are explicitly separated from the background menu but remain unimplemented.',
    'DVT-CANVAS-P0-PRO-FLOW-1',
    jsonb_build_object('fowlerSignal', 'responsibility_overload', 'notOwnedBy', 'CanvasBackgroundContextMenu'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('gap:selection-context-menu:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'CANVAS-PREVIEW-ACTION-BELONGS-TO-RUN-PREVIEW',
    'misplaced-action',
    'planned',
    'PreviewExecutionPlan is still visible through Canvas background wiring but product ownership belongs with Run and Preview.',
    'DVT-CANVAS-P0-PRO-FLOW-1',
    jsonb_build_object('rail', 'PreviewExecutionPlan', 'decision', 'run-preview-owning-context'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('gap:preview-action-run-preview:350')
  )
on conflict (component_id, gap_id) do update set
  gap_kind = excluded.gap_kind,
  gap_status = excluded.gap_status,
  description = excluded.description,
  owning_task_id = excluded.owning_task_id,
  raw_gap = excluded.raw_gap,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id,
  evidence_id,
  evidence_kind,
  evidence_status,
  evidence_ref,
  rail_name,
  context_id,
  proves,
  raw_evidence,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'EV-CANVAS-BACKGROUND-CONTEXT-ACTION-SURFACE-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
    'ResolveCanvasContextMenu',
    'canvas-background',
    'Background context resolves add/import/settings/validation actions without project navigation.',
    jsonb_build_object('semanticCoverage', 'context action catalog'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('evidence:background:command-surface:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'EV-CANVAS-BACKGROUND-CONTEXT-VIEW-MODEL-UNIT',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'RenderCanvasContextMenu',
    'canvas-background',
    'Background context menu sections are projected through the presenter before rendering.',
    jsonb_build_object('semanticCoverage', 'presentation model'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('evidence:background:view-model:350')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'EV-CANVAS-CONTEXT-MENU-HOST-INTEGRATION',
    'integration-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'RenderCanvasContextMenu',
    'host',
    'Canvas shell hosts the context menu through the dedicated host/layer instead of inline ad hoc rendering.',
    jsonb_build_object('semanticCoverage', 'host layer'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('evidence:host:integration:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'EV-CANVAS-BACKGROUND-CONTEXT-BROWSER-PROOF',
    'e2e-test',
    'current',
    'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
    'ResolveCanvasContextMenu',
    'canvas-background',
    'Browser proof opens the background context menu and confirms project commands live under Workspace instead.',
    jsonb_build_object('semanticCoverage', 'browser-visible context grammar'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('evidence:background:e2e:350')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
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
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasContextMenuLayer.tsx',
    'component',
    'CanvasContextMenuLayer',
    jsonb_build_object('responsibility', 'host layer'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:CanvasContextMenuLayer:350')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'component',
    'CanvasContextMenuView',
    jsonb_build_object('responsibility', 'passive ContextMenuTemplate renderer'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:CanvasContextMenuView:350')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasContextMenuPrimitives.tsx',
    'component',
    'CanvasContextMenuSurface',
    jsonb_build_object('responsibility', 'global reusable context-menu primitives'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:CanvasContextMenuPrimitives:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'model',
    'buildCanvasContextMenuModel',
    jsonb_build_object('responsibility', 'context action catalog model for background and edge actions'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:canvasInteractionCommandSurface:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'view-model',
    'buildCanvasContextMenuSections',
    jsonb_build_object('responsibility', 'project resolved actions into template sections'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:canvasContextMenuViewModel:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
    'test',
    null,
    jsonb_build_object('responsibility', 'semantic unit evidence for background context actions'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:canvasInteractionCommandSurface.test:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'test',
    null,
    jsonb_build_object('responsibility', 'semantic unit evidence for section projection'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:canvasContextMenuViewModel.test:350')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasShell.contextMenuIntegration.test.tsx',
    'test',
    null,
    jsonb_build_object('responsibility', 'host integration evidence'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:CanvasShell.contextMenuIntegration.test:350')
  ),
  (
    'web.component.canvas.CanvasBackgroundContextMenu',
    'apps/web/cypress/e2e/shell/canvas-workbench-screen-composition.cy.ts',
    'e2e-test',
    null,
    jsonb_build_object('responsibility', 'browser evidence for background context grammar'),
    'tools/planning-db/migrations/350_canvas_context_menu_context_action_catalog.sql',
    md5('file:canvas-workbench-screen-composition.cy:350')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
