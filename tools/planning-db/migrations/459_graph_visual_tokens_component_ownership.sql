-- Make graph visual tokens an explicit DB-first component. GraphNodeCard
-- consumes these tokens, but the token module also serves the card view,
-- operational rail, health popover, fallback renderer, React Flow edge style,
-- and node kind palette. Treating it as GraphNodeCard-owned hides that shared
-- presentation boundary.

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
  'web.component.canvas.GraphVisualTokens',
  'GraphVisualTokens',
  'state-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Own shared React Flow graph visual token groups without owning graph-node card behavior or data projection.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array('EV-CANVAS-GRAPH-VISUAL-TOKENS-OWNERSHIP'),
  jsonb_build_object(
    'dbFirst', true,
    'presentationOnly', true,
    'fileOwnershipModel', 'owned-files',
    'ownedFile', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'consumerComponents', jsonb_build_array(
      'web.component.canvas.GraphNodeCard',
      'web.component.canvas.GraphNodeCardView',
      'web.component.canvas.GraphNodeStatusChip',
      'web.component.canvas.GraphNodeTagList',
      'web.component.canvas.GraphNodeMetricRow',
      'web.component.canvas.GraphNodeOperationalRail',
      'web.component.canvas.GraphNodeHealthPopover',
      'web.component.canvas.CanvasNodePortHandle'
    ),
    'doesNotOwnCardReadModel', true,
    'doesNotOwnRunCommands', true
  ),
  'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
  md5('component:GraphVisualTokens:ownership:459')
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
  'web.component.canvas.GraphVisualTokens',
  'RenderCanvasGraphVisualTokens',
  'local-query',
  'implemented-local',
  jsonb_build_object(
    'purpose', 'Resolve shared graph presentation class tokens for React Flow canvas node and edge rendering.',
    'readModel', 'GraphVisualTokenGroups',
    'adapterSurface', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
    'presentationSupportOnly', true,
    'doesNotCreateNewUserAction', true
  ),
  'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
  md5('rail:GraphVisualTokens:RenderCanvasGraphVisualTokens:459')
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
values (
  'web.component.canvas.GraphVisualTokens',
  'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
  'style-token',
  'graphNodeCardSurfaceClasses;graphNodeCardLayoutClasses;graphNodeMetricRowClasses;graphNodeTagListClasses;graphNodeOperationalRailClasses;graphNodeHealthPopoverClasses;fallbackGraphNodeClasses;graphNodeColumnClasses;graphNodeStatusChipClasses;graphStatusRingClasses;graphStatusBadgeClasses;graphNodeKindToneClasses;graphFlowPalette;resolveGraphNodeKindTone;createGraphFlowEdgeStyle',
  jsonb_build_object(
    'rail', 'RenderCanvasGraphVisualTokens',
    'presentationOnly', true,
    'tokenGroups', jsonb_build_array(
      'graphNodeCardSurfaceClasses',
      'graphNodeCardLayoutClasses',
      'graphNodeMetricRowClasses',
      'graphNodeTagListClasses',
      'graphNodeOperationalRailClasses',
      'graphNodeHealthPopoverClasses',
      'fallbackGraphNodeClasses',
      'graphNodeColumnClasses',
      'graphNodeStatusChipClasses',
      'graphStatusRingClasses',
      'graphStatusBadgeClasses',
      'graphNodeKindToneClasses',
      'graphFlowPalette'
    ),
    'sharedByMultipleGraphComponents', true
  ),
  'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
  md5('file:GraphVisualTokens:graphVisualTokens.ts:459')
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
  'web.component.canvas.GraphVisualTokens',
  'EV-CANVAS-GRAPH-VISUAL-TOKENS-OWNERSHIP',
  'architecture-test',
  'current',
  'apps/web/src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
  'RenderCanvasGraphVisualTokens',
  'graph-visual-tokens',
  'Shared graph visual token groups are explicitly modeled outside GraphNodeCard ownership.',
  jsonb_build_object(
    'redGreen', false,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/plugins/graph/graphVisualTokenConvergence.architecture.test.ts',
    'ownershipCheck', 'pnpm planning:db:query frontend-component-files --component web.component.canvas.GraphVisualTokens --limit 40'
  ),
  'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
  md5('evidence:GraphVisualTokens:ownership:459')
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
values (
  'web.component.canvas.GraphNodeCard',
  'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
  'style-token',
  'graphNodeCardSurfaceClasses;graphNodeCardLayoutClasses;graphNodeMetricRowClasses;graphNodeTagListClasses;graphNodeOperationalRailClasses;graphNodeHealthPopoverClasses;fallbackGraphNodeClasses;graphNodeColumnClasses;graphNodeStatusChipClasses',
  jsonb_build_object(
    'retiredForPresentationOwnership', true,
    'reassignedToComponent', 'web.component.canvas.GraphVisualTokens',
    'reassignedRail', 'RenderCanvasGraphVisualTokens',
    'reason', 'Graph visual tokens are a shared presentation token module, not GraphNodeCard behavior or read-model ownership.'
  ),
  'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
  md5('file:GraphNodeCard:graphVisualTokens.ts:retired:459')
)
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
    'web.component.canvas.CanvasNodePortHandle',
    'apps/web/src/styles/theme.css',
    'design-token',
    null,
    jsonb_build_object(
      'responsibility', 'Expose global canvas node port tone design tokens consumed by CanvasNodeShell.module.css.',
      'rail', 'RenderCanvasNodePortHandle',
      'tokenPrefix', '--canvas-node-port-',
      'presentationOnly', true
    ),
    'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
    md5('file:CanvasNodePortHandle:theme.css:459')
  ),
  (
    'web.component.canvas.GraphNodeCard',
    'apps/web/src/styles/theme.css',
    'design-token',
    null,
    jsonb_build_object(
      'retiredForPresentationOwnership', true,
      'reassignedToComponent', 'web.component.canvas.CanvasNodePortHandle',
      'reassignedRail', 'RenderCanvasNodePortHandle',
      'reason', 'Port design tokens belong to the port handle rendering rail, not GraphNodeCard ownership.'
    ),
    'tools/planning-db/migrations/459_graph_visual_tokens_component_ownership.sql',
    md5('file:GraphNodeCard:theme.css:retired:459')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();
