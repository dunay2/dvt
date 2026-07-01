-- Extend RenderCanvasNodePortHandle with the accessible-copy projection
-- contract. The mapper owns Canvas view copy injection; CanvasNodeShell remains
-- a presentation template that receives labels from its caller.

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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
    'adapter',
    'mapCanonicalNodeToCanvasNode;mapDroppedCanonicalNodeToCanvasNode',
    jsonb_build_object(
      'responsibility', 'Project localized Canvas node port labels into DbtNodeData for CanvasNodeShell consumption.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'globalOwner', 'SYS-WEB-CANVAS-NODE-EDGE-AUTHORING',
      'presentationOnly', false,
      'ownsPortCopyProjection', true
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('file:canvasNodeMapper:port-accessible-copy-projection:413')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage', 'Mapper projects localized target/source port labels into React Flow node data.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('file:canvasNodeMapper.test:port-accessible-copy-projection:413')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
    'copy',
    'canvasViewToolbarCopyByKey',
    jsonb_build_object(
      'responsibility', 'Declare default Canvas node port accessible labels.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'copyKeys', jsonb_build_array('canvas.nodePort.targetLabel', 'canvas.nodePort.sourceLabel')
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('file:canvasCopyCatalog.toolbar:port-accessible-copy-projection:413')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts',
    'copy',
    'canvasViewToolbarCopyEs',
    jsonb_build_object(
      'responsibility', 'Declare Spanish Canvas node port accessible labels.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'copyKeys', jsonb_build_array('canvas.nodePort.targetLabel', 'canvas.nodePort.sourceLabel')
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('file:canvasCopyCatalog.toolbar.es:port-accessible-copy-projection:413')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/copy.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage', 'Canvas copy catalog resolves node port accessible labels in English and Spanish.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('file:copy.test:port-accessible-copy-projection:413')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
    'architecture-test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasNodeShell does not own hardcoded node port copy.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('file:DbtNodeComponent.architecture.test:port-accessible-copy-projection:413')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = raw_rail || jsonb_build_object(
    'accessibleCopyProjection',
    'Canvas view mapper projects localized target/source port labels; CanvasNodeShell receives caller-owned labels.'
  ),
  source_path = 'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
  source_content_sha256 = md5('rail:RenderCanvasNodePortHandle:accessible-copy-projection:413'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and rail_name = 'RenderCanvasNodePortHandle';

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
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-NODE-PORT-HANDLE-ACCESSIBLE-COPY-PROJECTION',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
    'RenderCanvasNodePortHandle',
    'node-card',
    'Canvas node port accessible labels are projected from the Canvas i18n catalog into node data.',
    jsonb_build_object(
      'redGreen', true,
      'redFailure', 'expected localized portLabels but received undefined',
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasNodeMapper.test.ts'
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('evidence:canvasNodeMapper:port-accessible-copy-projection:413')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-NODE-PORT-HANDLE-CALLER-OWNED-LABELS',
    'presentation-test',
    'current',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'RenderCanvasNodePortHandle',
    'node-card',
    'CanvasNodeShell renders caller-owned target/source port labels instead of owning user-visible copy.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
    ),
    'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
    md5('evidence:CanvasNodeShell:caller-owned-port-labels:413')
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
        'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
        'apps/web/src/app/views/canvas/canvasCopy.types.ts',
        'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
        'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts',
        'apps/web/src/app/views/canvas/copy.test.ts',
        'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql'
      )
    ) as refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
        'apps/web/src/app/views/canvas/canvasCopy.types.ts',
        'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
        'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts',
        'apps/web/src/app/views/canvas/copy.test.ts',
        'apps/web/src/app/components/canvas/DbtNodeComponent.architecture.test.ts',
        'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = raw_manifest
    || jsonb_build_object(
      'accessibleCopyProjection',
      jsonb_build_object(
        'rail', 'RenderCanvasNodePortHandle',
        'mapper', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'template', 'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'copyCatalog', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
          'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts'
        ),
        'tests', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
          'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
          'apps/web/src/app/views/canvas/copy.test.ts'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/413_canvas_node_port_accessible_copy_projection.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:port-accessible-copy-projection:413'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
