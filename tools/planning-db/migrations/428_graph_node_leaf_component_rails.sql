-- Complete the GraphNodeCard leaf component rail model. These components are
-- intentionally small presentational leaves, but DB-first governance still
-- needs to expose what each one renders and which evidence proves it.

update planning_query_store.frontend_component_local_components
set
  evidence_refs = jsonb_build_array('EV-CANVAS-GRAPH-NODE-STATUS-CHIP-LEAF-RAIL'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'leafRenderRail', 'RenderCanvasGraphNodeStatusChip',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotHandleNodeActions', true,
      'parentComponentId', 'web.component.canvas.GraphNodeCardView'
    ),
  source_path = 'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
  source_content_sha256 = md5('component:GraphNodeStatusChip:leaf-rail:428'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeStatusChip';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = jsonb_build_array('EV-CANVAS-GRAPH-NODE-TAG-LIST-LEAF-RAIL'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'leafRenderRail', 'RenderCanvasGraphNodeTagList',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotHandleNodeActions', true,
      'parentComponentId', 'web.component.canvas.GraphNodeCardView'
    ),
  source_path = 'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
  source_content_sha256 = md5('component:GraphNodeTagList:leaf-rail:428'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeTagList';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = jsonb_build_array('EV-CANVAS-GRAPH-NODE-METRIC-ROW-LEAF-RAIL'),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'leafRenderRail', 'RenderCanvasGraphNodeMetricRow',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotHandleNodeActions', true,
      'parentComponentId', 'web.component.canvas.GraphNodeCardView'
    ),
  source_path = 'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
  source_content_sha256 = md5('component:GraphNodeMetricRow:leaf-rail:428'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeMetricRow';

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id,
  rail_name,
  rail_kind,
  rail_status,
  raw_rail,
  source_path,
  source_content_sha256
)
values
  (
    'web.component.canvas.GraphNodeStatusChip',
    'RenderCanvasGraphNodeStatusChip',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Render the already-projected GraphNodeCardStatus label and tone as a node-card status chip.',
      'parentRail', 'RenderCanvasGraphNodeCard',
      'inputModel', 'GraphNodeCardStatus',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotHandleNodeActions', true,
      'negativeTests', jsonb_build_array(
        'Does not derive status from CanonicalNode.',
        'Does not run preview or node execution commands.'
      )
    ),
    'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
    md5('rail:GraphNodeStatusChip:RenderCanvasGraphNodeStatusChip:428')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'RenderCanvasGraphNodeTagList',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Render already-selected display tags for a graph node card.',
      'parentRail', 'RenderCanvasGraphNodeCard',
      'inputModel', 'readonly string[]',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotHandleNodeActions', true,
      'negativeTests', jsonb_build_array(
        'Does not choose tags from node metadata.',
        'Does not expose node menu actions.'
      )
    ),
    'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
    md5('rail:GraphNodeTagList:RenderCanvasGraphNodeTagList:428')
  ),
  (
    'web.component.canvas.GraphNodeMetricRow',
    'RenderCanvasGraphNodeMetricRow',
    'local-query',
    'implemented-local',
    jsonb_build_object(
      'purpose', 'Render summary metrics supplied by GraphNodeCardReadModel.metrics.',
      'parentRail', 'RenderCanvasGraphNodeCard',
      'inputModel', 'readonly GraphNodeCardMetric[]',
      'presentationOnly', true,
      'doesNotProjectData', true,
      'doesNotHandleNodeActions', true,
      'negativeTests', jsonb_build_array(
        'Does not invent metrics when the read model has no metrics.',
        'Does not calculate row counts or byte sizes from raw metadata.'
      )
    ),
    'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
    md5('rail:GraphNodeMetricRow:RenderCanvasGraphNodeMetricRow:428')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
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
values
  (
    'web.component.canvas.GraphNodeStatusChip',
    'EV-CANVAS-GRAPH-NODE-STATUS-CHIP-LEAF-RAIL',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeStatusChip',
    'graph-node-card-status-chip',
    'GraphNodeCardView proves GraphNodeStatusChip renders supplied status labels and tone tokens without deriving card state.',
    jsonb_build_object(
      'redGreen', true,
      'presentationOnly', true,
      'parentRail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
    md5('evidence:GraphNodeStatusChip:leaf-rail:428')
  ),
  (
    'web.component.canvas.GraphNodeTagList',
    'EV-CANVAS-GRAPH-NODE-TAG-LIST-LEAF-RAIL',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeTagList',
    'graph-node-card-tag-list',
    'GraphNodeCardView proves GraphNodeTagList renders supplied display tags and omits itself when no tags exist.',
    jsonb_build_object(
      'redGreen', true,
      'presentationOnly', true,
      'parentRail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
    md5('evidence:GraphNodeTagList:leaf-rail:428')
  ),
  (
    'web.component.canvas.GraphNodeMetricRow',
    'EV-CANVAS-GRAPH-NODE-METRIC-ROW-LEAF-RAIL',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeMetricRow',
    'graph-node-card-metric-row',
    'GraphNodeCardView proves GraphNodeMetricRow renders supplied summary metrics without inventing row counts, sizes, or runtime state.',
    jsonb_build_object(
      'redGreen', true,
      'presentationOnly', true,
      'parentRail', 'RenderCanvasGraphNodeCard',
      'doesNotInventMetrics', true
    ),
    'tools/planning-db/migrations/428_graph_node_leaf_component_rails.sql',
    md5('evidence:GraphNodeMetricRow:leaf-rail:428')
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

