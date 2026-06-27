-- Retire superseded CanvasContextMenu aggregate ownership rows after the context-action
-- split. The historical imports remain in the database, but effective query
-- views must not keep attributing context-specific actions or files to the
-- host alias. Those responsibilities are now queryable through
-- frontend_component_context_action_query and the child components.
-- RenderCanvasContextMenu remains the only effective host rail.

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
    'web.component.canvas.CanvasContextMenu',
    'CreateCanvasAuthoringNode',
    'command',
    'not-front-default',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementView', 'planning_query_store.frontend_component_context_action_query',
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'contextId', 'canvas-background'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:CreateCanvasAuthoringNode:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'ImportWarehouseSources',
    'command',
    'not-front-default',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementView', 'planning_query_store.frontend_component_context_action_query',
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'contextId', 'canvas-background'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:ImportWarehouseSources:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'RemoveCanvasEdgeFromContext',
    'command',
    'not-front-default',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementView', 'planning_query_store.frontend_component_context_action_query',
      'replacementComponentId', 'web.component.canvas.CanvasEdgeContextMenu',
      'contextId', 'edge'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:RemoveCanvasEdgeFromContext:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'ResolveCanvasContextMenu',
    'local-query',
    'not-front-default',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementView', 'planning_query_store.frontend_component_context_action_query',
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'contextId', 'canvas-background'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:ResolveCanvasContextMenu:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'PreviewExecutionPlan',
    'command',
    'not-front-default',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementView', 'planning_query_store.frontend_component_context_action_query',
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'contextId', 'canvas-background',
      'gapId', 'CANVAS-PREVIEW-ACTION-BELONGS-TO-RUN-PREVIEW'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:PreviewExecutionPlan:retired:352')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'model',
    'buildCanvasContextMenuModel',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'reason', 'Background action model is not host presentation ownership.'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:canvasInteractionCommandSurface.ts:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'presenter',
    'buildCanvasContextMenuSections',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'reason', 'Background view-model projection is not host presentation ownership.'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:canvasContextMenuViewModel.ts:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
    'test',
    null,
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'reason', 'This test proves background action semantics.'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:canvasInteractionCommandSurface.test.ts:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'test',
    null,
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementComponentId', 'web.component.canvas.CanvasBackgroundContextMenu',
      'reason', 'This test proves background view-model semantics.'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:canvasContextMenuViewModel.test.ts:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasShell.tsx',
    'integration',
    'CanvasShell',
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementComponentId', 'web.component.canvas.CanvasContextMenu',
      'reason', 'CanvasShell consumes the host but is not owned by the host component.'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:CanvasShell.tsx:retired:352')
  ),
  (
    'web.component.canvas.CanvasContextMenu',
    'apps/web/src/app/views/canvas/CanvasShell.architecture.test.tsx',
    'test',
    null,
    jsonb_build_object(
      'retiredForContextActionCatalog', true,
      'replacementComponentId', 'web.component.canvas.CanvasContextMenu',
      'reason', 'The shell architecture test is broader than host template ownership.'
    ),
    'tools/planning-db/migrations/352_retire_canvas_context_menu_host_superseded_ownership.sql',
    md5('CanvasContextMenu:CanvasShell.architecture.test.tsx:retired:352')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

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
  on component.component_id = file_ref.component_id
where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false);

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
  on component.component_id = rail.component_id
where not coalesce((rail.raw_rail ->> 'retiredForContextActionCatalog')::boolean, false);

create or replace view planning_query_store.frontend_component_summary_query as
with effective_files as (
  select
    imported.component_id,
    imported.file_path,
    imported.file_role,
    imported.raw_file
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
    local_file.raw_file
  from planning_query_store.frontend_component_local_files local_file
),
effective_rails as (
  select
    imported.component_id,
    imported.rail_name,
    imported.raw_rail
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
    local_rail.raw_rail
  from planning_query_store.frontend_component_local_cq_rails local_rail
),
effective_evidence as (
  select
    imported.component_id,
    imported.evidence_id
  from planning_query_store.frontend_component_evidence imported
  where not exists (
    select 1
    from planning_query_store.frontend_component_local_evidence local_evidence
    where local_evidence.evidence_id = imported.evidence_id
  )
  union all
  select
    local_evidence.component_id,
    local_evidence.evidence_id
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
  select
    file_ref.component_id,
    count(*)::int as file_count
  from effective_files file_ref
  where not coalesce((file_ref.raw_file ->> 'retiredForContextActionCatalog')::boolean, false)
  group by file_ref.component_id
),
rail_counts as (
  select
    rail_relation.component_id,
    count(*)::int as rail_count
  from (
    select distinct
      rail.component_id,
      rail.rail_name
    from effective_rails rail
    where not coalesce((rail.raw_rail ->> 'retiredForContextActionCatalog')::boolean, false)
    union
    select distinct
      action.component_id,
      action.rail_name
    from planning_query_store.frontend_component_context_actions action
    where action.rail_name is not null
      and action.action_status <> 'retired'
  ) rail_relation
  group by rail_relation.component_id
),
evidence_counts as (
  select
    evidence.component_id,
    count(*)::int as evidence_count
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
