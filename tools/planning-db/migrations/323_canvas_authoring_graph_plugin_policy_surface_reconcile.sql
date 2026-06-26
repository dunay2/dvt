-- Reconcile the AuthorCanvasGraphEdge local rail with the complete plugin
-- policy implementation surface set. This keeps the DB-local rail authoritative
-- after the imported manifest is refreshed.

with target_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id =
    'docs/planning/proposals/mandatory/frontend-and-ux/authoring-graph-lab-roadmap-plan-20260603.md#CANVAS-AUTHORING-GRAPH-LAB-20260603#command#001#authorcanvasgraphedge'
),
patch as (
  select jsonb_build_array(
    'apps/web/src/app/plugins/contracts/ConnectionRules.ts',
    'apps/web/src/app/plugins/contracts/ConnectionRules.test.ts',
    'apps/web/src/app/plugins/nodeTypeCatalog.ts',
    'apps/web/src/app/plugins/nodeTypeRegistry.ts',
    'apps/web/src/app/views/canvas/canvasConnectionAggregate.ts',
    'apps/web/src/app/views/canvas/canvasConnectionAggregate.test.ts',
    'apps/web/src/app/views/canvas/canvasCopyFormatting.ts',
    'apps/web/src/app/views/canvas/canvasEdgeAdmissionTransaction.test.ts',
    'apps/web/src/app/views/canvas/useCanvasGraphHandlers.edgeAuthoring.test.tsx',
    'tools/planning-db/migrations/321_canvas_authoring_graph_plugin_policy_manifest.sql',
    'tools/planning-db/migrations/322_canvas_authoring_graph_plugin_policy_symbol_completion.sql',
    'tools/planning-db/migrations/323_canvas_authoring_graph_plugin_policy_surface_reconcile.sql'
  ) as allowed_surfaces
),
merged_allowed_surfaces as (
  select coalesce(jsonb_agg(value order by value), '[]'::jsonb) as value
  from (
    select value
    from target_rail,
      jsonb_array_elements_text(coalesce(target_rail.allowed_implementation_surfaces, '[]'::jsonb))
    union
    select value
    from patch, jsonb_array_elements_text(patch.allowed_surfaces)
  ) refs
)
update planning_query_store.feature_mechanization_local_rails rail
set
  allowed_implementation_surfaces = merged_allowed_surfaces.value,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{allowedImplementationSurfaces}',
    merged_allowed_surfaces.value,
    true
  ),
  implementation_refs = (
    select coalesce(jsonb_agg(ref order by ref->>'path', ref->>'name'), '[]'::jsonb)
    from (
      select ref
      from jsonb_array_elements(coalesce(rail.implementation_refs, '[]'::jsonb)) refs(ref)
      union all
      select jsonb_build_object(
        'name', 'Canvas authoring graph plugin policy surface reconcile',
        'path', 'tools/planning-db/migrations/323_canvas_authoring_graph_plugin_policy_surface_reconcile.sql',
        'sourceKind', 'planning_db_overlay'
      )
    ) all_refs
  ),
  source_path = 'tools/planning-db/migrations/323_canvas_authoring_graph_plugin_policy_surface_reconcile.sql',
  source_content_sha256 = repeat('7', 64),
  updated_at = now()
from target_rail
cross join merged_allowed_surfaces
where rail.rail_id = target_rail.rail_id;
