-- Preserve specialized plugin identity through the Canvas render path.
-- GraphNodeTitlePresentation already owns the warehouse-source visible-title
-- rule; this migration records the mapper and node-card adapter handoff that
-- keeps dvt.warehouse-source reachable after CanonicalNode -> React Flow data
-- projection.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'pluginIdentityProjection',
    jsonb_build_object(
      'source', 'CanonicalNode.pluginId',
      'target', 'DbtNodeData.pluginId',
      'reason', 'Preserve specialized source plugin identity for GraphNodeTitlePresentation render-path title decisions.',
      'rails', jsonb_build_array(
        'RenderCanvasGraphNodeCard',
        'RenderCanvasGraphNodeTitlePresentation'
      )
    )
  ),
  source_path = 'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
  source_content_sha256 = md5('file:canvasNodeMapper:plugin-identity-render-path:454'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/views/canvas/canvasNodeMapper.ts'
  and file_role = 'adapter';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'pluginIdentityProjectionCoverage',
    'Mapper preserves CanonicalNode.pluginId in React Flow node data while keeping pluginKind as the node kind discriminator.'
  ),
  source_path = 'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
  source_content_sha256 = md5('file:canvasNodeMapper.test:plugin-identity-render-path:454'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts'
  and file_role = 'unit-test';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'pluginIdentityHandoff',
    jsonb_build_object(
      'source', 'DbtNodeData.pluginId',
      'fallback', 'parsePluginNodeKind(pluginKind).pluginId',
      'target', 'CanonicalNode.pluginId',
      'reason', 'GraphNodeRenderer receives a reconstructed CanonicalNode and must not collapse dvt.warehouse-source to dvt.'
    )
  ),
  source_path = 'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
  source_content_sha256 = md5('file:DbtNodeComponent:plugin-identity-render-path:454'),
  updated_at = now()
where component_id = 'web.component.canvas.DbtNodeCard'
  and file_path = 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx'
  and file_role = 'adapter';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb) || jsonb_build_object(
    'pluginIdentityProjectionCoverage',
    'Viewport graph model node data preserves dvt.warehouse-source pluginId for rendered card strategy/title decisions.'
  ),
  source_path = 'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
  source_content_sha256 = md5('file:useCanvasViewportGraphModel.nodeData.test:plugin-identity-render-path:454'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'
  and file_role = 'unit-test';

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
    'EV-CANVAS-GRAPH-NODE-PLUGIN-IDENTITY-MAPPER-PROJECTION',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
    'RenderCanvasGraphNodeCard',
    'node-card-data-projection',
    'Canvas node mapper preserves CanonicalNode.pluginId separately from pluginKind so specialized source plugins survive React Flow data projection.',
    jsonb_build_object(
      'redGreen', true,
      'redFailure', 'expected dvt.warehouse-source but received undefined',
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/canvasNodeMapper.test.ts'
    ),
    'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
    md5('evidence:canvasNodeMapper:plugin-identity-render-path:454')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'EV-CANVAS-GRAPH-NODE-PLUGIN-IDENTITY-VIEWPORT-PROJECTION',
    'presentation-test',
    'current',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'RenderCanvasGraphNodeCard',
    'node-card-data-projection',
    'Viewport graph model preserves dvt.warehouse-source pluginId in node data before the rendered card reconstructs CanonicalNode.',
    jsonb_build_object(
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.canvas-unit.config.ts src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
      'specializedPluginId', 'dvt.warehouse-source'
    ),
    'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
    md5('evidence:useCanvasViewportGraphModel.nodeData:plugin-identity-render-path:454')
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
  'web.component.canvas.GraphNodeTitlePresentation',
  'EV-CANVAS-GRAPH-NODE-TITLE-PRESENTATION-PLUGIN-ID-RENDER-PATH',
  'presentation-test',
  'current',
  'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
  'RenderCanvasGraphNodeTitlePresentation',
  'node-card-title',
  'The rendered Canvas node data path preserves dvt.warehouse-source plugin identity before GraphNodeTitlePresentation applies the warehouse relation title rule.',
  jsonb_build_object(
    'reviewComment', 'Preserve warehouse-source plugin id before branching',
    'renderPath', 'CanonicalNode -> React Flow node data -> DbtNodeComponent -> GraphNodeRenderer',
    'specializedPluginId', 'dvt.warehouse-source'
  ),
  'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
  md5('evidence:GraphNodeTitlePresentation:plugin-id-render-path:454')
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
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(symbol_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx#DbtNodeData.pluginId',
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts#mapCanonicalNodeToCanvasNode',
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts#mapDroppedCanonicalNodeToCanvasNode'
      )
    ) as refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql'
      )
    ) as refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array(
        'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
        'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
        'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
        'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql'
      )
    ) as refs(value)
  ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'pluginIdentityRenderPath',
    jsonb_build_object(
      'rail', 'RenderCanvasGraphNodeTitlePresentation',
      'mapper', 'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
      'adapter', 'apps/web/src/app/components/canvas/DbtNodeComponent.tsx',
      'tests', jsonb_build_array(
        'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
        'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx'
      ),
      'reviewCommentClosed', 'Preserve warehouse-source plugin id before branching'
    )
  ),
  source_path = 'tools/planning-db/migrations/454_graph_node_title_plugin_identity_render_path.sql',
  source_content_sha256 = md5('E-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-UX-1:plugin-identity-render-path:454'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-GRAPH-NODE-CARD-PROFESSIONAL-UX-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
