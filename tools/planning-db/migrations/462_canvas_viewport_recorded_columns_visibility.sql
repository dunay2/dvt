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
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/canvasImpactOverlay.ts',
    'projection-policy',
    'buildNodesWithImpact',
    jsonb_build_object(
      'responsibility', 'Preserve node card data posture while applying impact decoration for CanvasViewport.',
      'rail', 'RenderCanvasContextualGraphSurface',
      'preservesRecordedColumnVisibility', true,
      'doesNotOwnCardPresentation', true
    ),
    'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
    md5('file:CanvasViewport:canvasImpactOverlay:recorded-columns-visible:462')
  ),
  (
    'web.component.canvas.CanvasViewport',
    'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
    'integration-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove recorded column visibility survives impact decoration before CanvasViewport renders cards.',
      'rail', 'RenderCanvasContextualGraphSurface',
      'redGreen', true,
      'reviewFeedback', 'PR-1870-recorded-column-impact-decoration'
    ),
    'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
    md5('file:CanvasViewport:useCanvasControllerReadModel:recorded-columns-visible:462')
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
    'commands', jsonb_build_array(
      'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'pnpm --filter @dvt/web test:canvas-presentation:run -- src/app/views/canvas/useCanvasControllerReadModel.test.tsx'
    ),
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
        'apps/web/src/app/views/canvas/canvasImpactOverlay.ts',
        'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
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
        'apps/web/src/app/views/canvas/canvasImpactOverlay.ts',
        'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb) || jsonb_build_object(
      'recordedColumnsVisibility',
      jsonb_build_object(
        'componentId', 'web.component.canvas.CanvasViewport',
        'rail', 'RenderCanvasContextualGraphSurface',
        'mapper', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'decorator', 'apps/web/src/app/views/canvas/canvasImpactOverlay.ts',
        'tests', jsonb_build_array(
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx'
        ),
        'lineageOverlayDoesNotHideRecordedColumns', true
      )
    ),
    '{symbols}',
    (
      select jsonb_agg(value order by value::text)
      from (
        select distinct value
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) symbols(value)
          where value->>'name' <> 'shouldShowColumns'
          union all
          select jsonb_build_object(
            'name', 'shouldShowColumns',
            'path', 'apps/web/src/app/views/canvas/canvasImpactOverlay.ts',
            'dddOwner', 'web.component.canvas.CanvasViewport',
            'cqRails', jsonb_build_array('RenderCanvasContextualGraphSurface'),
            'fowlerSignals', jsonb_build_array('projection_policy_guard'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:covered_by_controller_read_model_integration',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/views/canvas/useCanvasControllerReadModel.test.tsx',
              'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'
            )
          )
        ) merged_symbols(value)
      ) distinct_symbols
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/462_canvas_viewport_recorded_columns_visibility.sql',
  source_content_sha256 = md5('E-CANVAS-UXDB-COMPONENT-SLICES-1:recorded-columns-visible:462'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-UXDB-COMPONENT-SLICES-1'
  and rail_name = 'RenderCanvasContextualGraphSurface';
