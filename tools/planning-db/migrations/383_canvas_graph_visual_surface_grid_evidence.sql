-- Record the Canvas viewport single-grid visual contract and close the
-- GraphNodeHealthPopover test ownership gap discovered during Fowler QA.

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
    'web.component.canvas.CanvasViewport',
    'EV-CANVAS-VIEWPORT-SINGLE-CSS-GRID-LAYER',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/CanvasViewport.test.tsx',
    'RenderCanvasContextualGraphSurface',
    'canvas-viewport',
    'CanvasViewport renders one governed CSS grid layer instead of stacking React Flow Background over the viewport background.',
    jsonb_build_object(
      'singleGridLayer', true,
      'reactFlowBackgroundRendered', false,
      'gridVisibilityCssVariable', '--canvas-grid',
      'gridSizeCssVariable', '--canvas-grid-gap',
      'noParallelGridRenderer', true
    ),
    'tools/planning-db/migrations/383_canvas_graph_visual_surface_grid_evidence.sql',
    md5('evidence:CanvasViewport:single-css-grid-layer:383')
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
    'web.component.canvas.GraphNodeHealthPopover',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove GraphNodeHealthPopoverView renders supplied detail rows and closes from Escape without data lookup.',
      'rail', 'RenderCanvasNodeHealthPopover',
      'evidenceId', 'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-VIEW'
    ),
    'tools/planning-db/migrations/383_canvas_graph_visual_surface_grid_evidence.sql',
    md5('file:GraphNodeHealthPopoverView.test.tsx:383')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'),
        ('apps/web/src/app/views/canvas/canvasViewportStyle.ts'),
        ('apps/web/src/app/views/canvas/CanvasViewport.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx'),
        ('tools/planning-db/migrations/383_canvas_graph_visual_surface_grid_evidence.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/views/canvas/CanvasViewport.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewportSurfaceView.tsx'),
        ('apps/web/src/app/views/canvas/canvasViewportStyle.ts'),
        ('apps/web/src/app/views/canvas/CanvasViewport.test.tsx'),
        ('apps/web/src/app/views/canvas/CanvasViewport.testHarness.tsx'),
        ('tools/planning-db/migrations/383_canvas_graph_visual_surface_grid_evidence.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'canvasViewportSingleGridLayer',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.CanvasViewport',
        'rail', 'RenderCanvasContextualGraphSurface',
        'noReactFlowBackgroundLayer', true,
        'cssVariables', jsonb_build_array('--canvas-grid', '--canvas-grid-gap')
      )
    ),
  source_path = 'tools/planning-db/migrations/383_canvas_graph_visual_surface_grid_evidence.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasViewportSingleGridLayer:383'
  ),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
