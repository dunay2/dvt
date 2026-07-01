-- Prune GraphNodeCard ownership to the card concern. Copy catalog and
-- React Flow viewport projection are supporting components, not card
-- presentation responsibilities.

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
values (
  'web.component.canvas.CanvasCopyCatalog',
  'CanvasCopyCatalog',
  'query-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Resolve localized Canvas copy for route, toolbar, context-menu, authoring, execution, port, and draft surfaces without owning their UI behavior.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-COPY-CATALOG-OWNERSHIP'),
  jsonb_build_object(
    'dbFirst', true,
    'renderConsumers', jsonb_build_array(
      'web.component.canvas.CanvasViewport',
      'web.component.canvas.NodeFloatingToolbar',
      'web.component.canvas.CanvasNodePortHandle',
      'web.component.canvas.CanvasContextMenu',
      'web.component.canvas.CanvasNodeWorkbenchPanel'
    ),
    'rails', jsonb_build_array('ResolveCanvasViewCopy'),
    'doesNotOwnUiBehavior', true,
    'doesNotOwnGraphNodeCardRendering', true
  ),
  'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
  md5('component:CanvasCopyCatalog:ownership:458')
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

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values (
  'web.component.canvas.CanvasCopyCatalog',
  'ResolveCanvasViewCopy',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Resolve locale-aware Canvas UI strings from the governed Canvas copy catalog.',
    'readModel', 'CanvasViewCopy',
    'adapterSurface', 'apps/web/src/app/views/canvas/copy.ts',
    'doesNotOwnPresentation', true
  ),
  'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
  md5('rail:CanvasCopyCatalog:ResolveCanvasViewCopy:458')
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
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/copy.ts',
    'barrel',
    null,
    jsonb_build_object('rail', 'ResolveCanvasViewCopy'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:copy.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/copy.test.ts',
    'unit-test',
    null,
    jsonb_build_object('coverage', 'Canvas copy catalog resolves route, toolbar, port, inspector, and validation copy across locales.'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:copy.test.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'contract',
    'CanvasViewCopy',
    jsonb_build_object('readModel', 'CanvasViewCopy'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopy.types.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.ts',
    'resolver',
    'resolveCanvasViewCopy;detectCanvasViewLocale;canvasViewCopy',
    jsonb_build_object('rail', 'ResolveCanvasViewCopy'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyFormatting.ts',
    'formatter',
    'formatCanvasConnectionRejection;formatCanvasNodeAddedMessage;formatCanvasNodeRemovedMessage;formatTransformationGraphValidationSummary',
    jsonb_build_object('rail', 'ResolveCanvasViewCopy'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyFormatting.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.route.ts',
    'copy',
    'canvasViewRouteCopyByKey',
    jsonb_build_object('copySection', 'route'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.route.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.route.es.ts',
    'copy',
    'canvasViewRouteCopyEs',
    jsonb_build_object('copySection', 'route', 'locale', 'es'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.route.es.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
    'copy',
    'canvasViewToolbarCopyByKey',
    jsonb_build_object('copySection', 'toolbar-context-port-and-draft'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.toolbar.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts',
    'copy',
    'canvasViewToolbarCopyEs',
    jsonb_build_object('copySection', 'toolbar-context-port-and-draft', 'locale', 'es'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.toolbar.es.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.ts',
    'copy',
    'canvasViewAuthoringCopyByKey',
    jsonb_build_object('copySection', 'authoring'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.authoring.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.authoring.es.ts',
    'copy',
    'canvasViewAuthoringCopyEs',
    jsonb_build_object('copySection', 'authoring', 'locale', 'es'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.authoring.es.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.ts',
    'copy',
    'canvasViewExecutionCopyByKey',
    jsonb_build_object('copySection', 'execution'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.execution.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.execution.es.ts',
    'copy',
    'canvasViewExecutionCopyEs',
    jsonb_build_object('copySection', 'execution', 'locale', 'es'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasCopyCatalog.execution.es.ts:458')
  ),
  (
    'web.component.canvas.CanvasCopyCatalog',
    'apps/web/src/app/views/canvas/canvasExecutionCopy.test.ts',
    'unit-test',
    null,
    jsonb_build_object('coverage', 'Execution and toolbar copy remain synchronized across the Canvas copy catalog.'),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:CanvasCopyCatalog:canvasExecutionCopy.test.ts:458')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
  'web.component.canvas.CanvasCopyCatalog',
  'EV-CANVAS-COPY-CATALOG-OWNERSHIP',
  'unit-test',
  'current',
  'apps/web/src/app/views/canvas/copy.test.ts',
  'ResolveCanvasViewCopy',
  'canvas-copy-catalog',
  'Canvas copy catalog owns locale copy resolution independently of GraphNodeCard rendering.',
  jsonb_build_object(
    'redGreen', false,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/copy.test.ts src/app/views/canvas/canvasExecutionCopy.test.ts'
  ),
  'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
  md5('evidence:CanvasCopyCatalog:copy-tests:458')
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
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.es.ts',
    'copy',
    'canvasViewToolbarCopyEs',
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasCopyCatalog',
      'reassignedRail',
      'ResolveCanvasViewCopy',
      'reason',
      'Canvas copy is shared locale infrastructure and is not GraphNodeCard presentation ownership.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:canvasCopyCatalog.toolbar.es.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopyCatalog.toolbar.ts',
    'copy',
    'canvasViewToolbarCopyByKey',
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasCopyCatalog',
      'reassignedRail',
      'ResolveCanvasViewCopy',
      'reason',
      'Canvas copy is shared locale infrastructure and is not GraphNodeCard presentation ownership.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:canvasCopyCatalog.toolbar.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasCopy.types.ts',
    'copy-contract',
    'CanvasViewCopy',
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasCopyCatalog',
      'reassignedRail',
      'ResolveCanvasViewCopy',
      'reason',
      'Canvas copy contract is shared locale infrastructure and is not GraphNodeCard presentation ownership.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:canvasCopy.types.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/copy.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasCopyCatalog',
      'reassignedRail',
      'ResolveCanvasViewCopy',
      'reason',
      'Canvas copy tests prove copy catalog behavior, not GraphNodeCard rendering.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:copy.test.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasNodeMapper.ts',
    'adapter',
    'mapCanonicalNodeToCanvasNode;mapDroppedCanonicalNodeToCanvasNode',
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasViewport',
      'reassignedRail',
      'RenderCanvasContextualGraphSurface',
      'reason',
      'React Flow node projection belongs to the viewport graph model, not GraphNodeCard presentation.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:canvasNodeMapper.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/canvasNodeMapper.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasViewport',
      'reassignedRail',
      'RenderCanvasContextualGraphSurface',
      'reason',
      'React Flow node projection tests belong to the viewport graph model, not GraphNodeCard rendering.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:canvasNodeMapper.test.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.ts',
    'view-model',
    'useCanvasViewportGraphModel',
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasViewport',
      'reassignedRail',
      'RenderCanvasContextualGraphSurface',
      'reason',
      'Viewport graph model belongs to CanvasViewport, not GraphNodeCard presentation.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:useCanvasViewportGraphModel.ts:retired:458')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/app/views/canvas/useCanvasViewportGraphModel.nodeData.test.tsx',
    'presentation-test',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership',
      true,
      'reassignedToComponent',
      'web.component.canvas.CanvasViewport',
      'reassignedRail',
      'RenderCanvasContextualGraphSurface',
      'reason',
      'Viewport graph model tests prove CanvasViewport projection behavior, not GraphNodeCard rendering.'
    ),
    'tools/planning-db/migrations/458_canvas_copy_catalog_and_viewport_projection_ownership.sql',
    md5('file:GraphNodeCard:useCanvasViewportGraphModel.nodeData.test.tsx:retired:458')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
