-- Extend GraphNodeCard with a passive connection-compatibility projection.
-- AuthorCanvasGraphEdge remains the admission authority; RenderCanvasNodePortHandle
-- renders caller-owned compatibility hints without duplicating edge policy.

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
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
    'presenter',
    'buildCanvasConnectionCompatibilityByNodeId',
    jsonb_build_object(
      'responsibility', 'Project governed AuthorCanvasGraphEdge admission into passive port compatibility hints for visible Canvas nodes.',
      'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
      'dddOwner', 'CanvasConnectionAggregate read projection',
      'presentationOnly', false,
      'policyAuthority', 'AuthorCanvasGraphEdge',
      'doesNotConfirmEdges', true
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:canvasConnectionCompatibilityPresenter:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'coverage', 'Presenter projects available, blocked, and unavailable port compatibility states from governed edge admission.',
      'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:canvasConnectionCompatibilityPresenter.test:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
    'view-model',
    'useCanvasViewportGraphModel',
    jsonb_build_object(
      'responsibility', 'Attach visible-node port compatibility hints to React Flow node data.',
      'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
      'callerOwnedProjection', true
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:useCanvasViewportGraphModel:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage', 'Viewport graph model projects source/model port compatibility into node data.',
      'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:useCanvasViewportGraphModel.nodeData.test:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
    'component',
    'CanvasNodePortHandle;CanvasNodePortCompatibilityView',
    jsonb_build_object(
      'responsibility', 'Render tokenized Canvas node port handle state, including caller-owned compatibility hints.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:CanvasNodePortHandle:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
    'style',
    null,
    jsonb_build_object(
      'responsibility', 'Tokenized available, blocked, and unavailable port compatibility affordances.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'noLocalHex', true
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:CanvasNodeShell.module.css:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'coverage', 'CanvasNodeShell passes caller-owned compatibility state and descriptions into port handles.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle')
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:CanvasNodeShell.test:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
    'copy',
    'canvasViewToolbarCopyByKey',
    jsonb_build_object(
      'responsibility', 'Declare default Canvas node port compatibility descriptions.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'copyKeys', jsonb_build_array(
        'canvas.nodePort.compatibleWithPrefix',
        'canvas.nodePort.noCompatibleNodesMessage',
        'canvas.nodePort.blockedMessage'
      )
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:canvasCopyCatalog.toolbar:port-compatibility-projection:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts',
    'copy',
    'canvasViewToolbarCopyEs',
    jsonb_build_object(
      'responsibility', 'Declare Spanish Canvas node port compatibility descriptions.',
      'rails', jsonb_build_array('RenderCanvasNodePortHandle'),
      'copyKeys', jsonb_build_array(
        'canvas.nodePort.compatibleWithPrefix',
        'canvas.nodePort.noCompatibleNodesMessage',
        'canvas.nodePort.blockedMessage'
      )
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('file:canvasCopyCatalog.toolbar.es:port-compatibility-projection:414')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'connectionCompatibilityProjection',
    'GraphNodeCard projects AuthorCanvasGraphEdge admission into passive RenderCanvasNodePortHandle hints; edge confirmation remains owned by AuthorCanvasGraphEdge.'
  ),
  source_path = 'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
  source_content_sha256 = md5('rail:RenderCanvasNodePortHandle:connection-compatibility-projection:414'),
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
    'EV-CANVAS-NODE-PORT-COMPATIBILITY-PRESENTER',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
    'AuthorCanvasGraphEdge',
    'node-port-compatibility',
    'Visible node port compatibility is derived from governed edge admission, including available, blocked, and unavailable states.',
    jsonb_build_object(
      'redGreen', true,
      'redFailure', 'missing canvasConnectionCompatibilityPresenter module',
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('evidence:canvasConnectionCompatibilityPresenter:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-NODE-PORT-COMPATIBILITY-VIEWPORT-PROJECTION',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'RenderCanvasNodePortHandle',
    'node-port-compatibility',
    'Viewport graph model projects compatibility state into React Flow node data for GraphNodeCard rendering.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('evidence:useCanvasViewportGraphModel.nodeData:414')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-NODE-PORT-COMPATIBILITY-RENDERING',
    'presentation-test',
    'current',
    'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
    'RenderCanvasNodePortHandle',
    'node-port-compatibility',
    'CanvasNodeShell renders caller-owned compatibility state and descriptions through CanvasNodePortHandle.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/components/canvas/CanvasNodeShell.test.tsx'
    ),
    'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
    md5('evidence:CanvasNodeShell.portCompatibility:414')
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
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql'
      )
    ) as refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
        'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'apps/web/src/app/components/canvas/CanvasNodeShell.module.css',
        'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx',
        'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = raw_manifest
    || jsonb_build_object(
      'connectionCompatibilityProjection',
      jsonb_build_object(
        'rails', jsonb_build_array('AuthorCanvasGraphEdge', 'RenderCanvasNodePortHandle'),
        'presenter', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
        'viewportProjection', 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
        'template', 'apps/web/src/app/components/canvas/CanvasNodeShell.tsx',
        'tests', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts',
          'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
          'apps/web/src/app/components/canvas/CanvasNodeShell.test.tsx'
        )
      )
    ),
  source_path = 'tools/planning-db/migrations/414_canvas_node_port_connection_compatibility_projection.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:connection-compatibility-projection:414'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
