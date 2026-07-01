-- Keep recorded column metadata visible on Canvas node cards independently of
-- the column-lineage overlay posture. This belongs to CanvasViewport node-data
-- projection, not GraphNodeCard presentation.

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
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
    'mapper',
    'mapCanonicalNodeToCanvasNode;mapDroppedCanonicalNodeToCanvasNode',
    jsonb_build_object(
      'responsibility', 'Project CanonicalNode column metadata into React Flow node data for CanvasViewport.',
      'rail', 'RenderCanvasContextualGraphSurface',
      'recordedColumnsVisibleWithoutLineageOverlay', true,
      'doesNotOwnCardPresentation', true
    ),
    'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
    md5('file:CanvasViewport:canvasNodeMapper:recorded-columns-visible:462')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove CanvasViewport projects recorded columns as visible card data independent of lineage overlay posture.',
      'rail', 'RenderCanvasContextualGraphSurface',
      'redGreen', true
    ),
    'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
    md5('file:CanvasViewport:useCanvasViewportGraphModel.nodeData:recorded-columns-visible:462')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = coalesce(planning_query_store.frontend_component_local_files.raw_file, '{}'::jsonb)
    || excluded.raw_file,
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
values (
  'web.component.canvas.CanvasViewport',
  'EV-CANVAS-VIEWPORT-RECORDED-COLUMNS-VISIBLE-WITHOUT-LINEAGE',
  'presentation-test',
  'current',
  'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
  'RenderCanvasContextualGraphSurface',
  'node-card-data-projection',
  'CanvasViewport keeps recorded column metadata visible on node cards even when the column-lineage overlay is disabled.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected nodeData.showColumns true but received false when canonical metadata.columns existed',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'lineageOverlayPosture', 'disabled'
  ),
  'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
  md5('evidence:CanvasViewport:recorded-columns-visible-without-lineage:462')
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

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql'
      )
    ) as refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
    'recordedColumnsVisibility',
    jsonb_build_object(
      'componentId', 'web.component.canvas.CanvasViewport',
      'rail', 'RenderCanvasContextualGraphSurface',
      'mapper', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
      'test', 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'lineageOverlayDoesNotHideRecordedColumns', true
    )
  ),
  source_path = 'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
  source_content_sha256 = md5('E-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-UX-1:recorded-columns-visible:462'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-UX-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
