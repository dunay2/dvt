-- Authorize the narrow composition seams required to mount the file-backed
-- projection. Existing shared components retain ownership of these files.

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/services/composition/appServices.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/services/AppServicesContext.tsx', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/testing/appServicesTestDoubles.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/queries/queryKeys.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/queries/workspaceQueries.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/views/Canvas.tsx', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/views/CodeView.tsx', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/views/code/codeViewFileSelection.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/views/canvas/CanvasShell.tsx', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/views/canvas/canvasShell.types.ts', 'may_update', true),
  ('DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713', 'path', 'apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

with required_surface(surface) as (
  values
    ('apps/web/src/app/services/composition/appServices.ts'),
    ('apps/web/src/app/services/AppServicesContext.tsx'),
    ('apps/web/src/app/services/AppServicesContext.test.tsx'),
    ('apps/web/src/testing/appServicesTestDoubles.ts'),
    ('apps/web/src/app/queries/queryKeys.ts'),
    ('apps/web/src/app/queries/workspaceQueries.ts'),
    ('apps/web/src/app/views/Canvas.tsx'),
    ('apps/web/src/app/views/Canvas.*.test.tsx'),
    ('apps/web/src/app/views/CodeView.tsx'),
    ('apps/web/src/app/views/code/codeViewFileSelection.ts'),
    ('apps/web/src/app/views/code/codeViewFileSelection.test.ts'),
    ('apps/web/src/app/plugins/canvasSurfaceStrategyContracts.ts'),
    ('apps/web/src/app/views/canvas/CanvasShell.tsx'),
    ('apps/web/src/app/views/canvas/canvasShell.types.ts'),
    ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'),
    ('apps/web/src/app/views/canvas/CanvasViewport*.test.tsx'),
    ('tools/planning-db/migrations/656_dbt_project_file_projection_phase2_web_composition_design.sql'),
    ('tools/planning-db/migrations/657_dbt_project_file_projection_phase2_live_closeout.sql')
), reconciled_surface as (
  select jsonb_agg(to_jsonb(surface) order by surface) as surfaces
  from (
    select value as surface
    from planning_query_store.feature_mechanization_local_rails rail,
      lateral jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) item(value)
    where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles'
      and value not like 'tools/planning-db/migrations/656_dbt_project_file_projection_phase2_%'
    union
    select surface from required_surface
  ) all_surface
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = reconciled_surface.surfaces,
  implementation_refs = coalesce(rail.implementation_refs, '[]'::jsonb)
    || jsonb_build_array('tools/planning-db/migrations/656_dbt_project_file_projection_phase2_web_composition_design.sql'),
  raw_manifest = jsonb_set(
    rail.raw_manifest,
    '{allowedImplementationSurfaces}',
    reconciled_surface.surfaces,
    true
  ),
  revision = rail.revision + 1,
  updated_at = now()
from reconciled_surface
where rail.rail_id = 'local#E-DBT-PROJECT-FILE-PROJECTION-PHASE2-20260713#query#projectdbtgraphfromfiles';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'The Canvas route resolves authority before invoking either the graph-draft controller or file-backed controller, so hooks from both authorities never run in one render branch.', 4),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'Shared Canvas presentation accepts inspectable/selectable nodes independently from semantic edge mutation.', 5),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'invariant', 'CodeView scopes files by projectRoot and selected originalFilePath without querying WorkspaceGraphAuthoringDraft.v1.', 6),
  ('SYS-WEB-CANVAS-DBT-FILE-PROJECTION', 'non_goal', 'Transfer ownership of AppServices, CanvasShell, CanvasViewport, or CodeView to the file projection component.', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;
