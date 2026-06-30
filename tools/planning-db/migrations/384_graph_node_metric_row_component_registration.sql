-- Complete the GraphNodeMetricRow DB-first component registration. Migration
-- 378 registered the file as a presentation leaf, but without the component
-- row the frontend-component query views cannot expose the leaf.

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
values
  (
    'web.component.canvas.GraphNodeMetricRow',
    'GraphNodeMetricRow',
    'state-view',
    'current',
    'extract',
    'Frontend / Canvas',
    'Render summary metrics already projected into GraphNodeCardReadModel.metrics without deriving or inventing metric values.',
    '@dvt/web',
    '/canvas',
    'dbt;dvt',
    '[]'::jsonb,
    jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx'),
    jsonb_build_object(
      'dbFirst', true,
      'parentComponentId', 'web.component.canvas.GraphNodeCard',
      'fileOwnershipModel', 'owned-leaf-component-files',
      'presentationOnly', true,
      'doesNotInventMetrics', true,
      'railOwnerComponentId', 'web.component.canvas.GraphNodeCard',
      'governingRail', 'RenderCanvasGraphNodeCard'
    ),
    'tools/planning-db/migrations/384_graph_node_metric_row_component_registration.sql',
    md5('web.component.canvas.GraphNodeMetricRow:384')
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
    'web.component.canvas.GraphNodeMetricRow',
    'apps/web/src/app/plugins/graph/GraphNodeMetricRow.tsx',
    'presentation',
    'GraphNodeMetricRow',
    jsonb_build_object(
      'responsibility', 'Render supplied GraphNodeCardMetric rows.',
      'railOwnerComponentId', 'web.component.canvas.GraphNodeCard',
      'governingRail', 'RenderCanvasGraphNodeCard',
      'presentationOnly', true,
      'doesNotInventMetrics', true
    ),
    'tools/planning-db/migrations/384_graph_node_metric_row_component_registration.sql',
    md5('file:GraphNodeMetricRow.tsx:384')
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
values
  (
    'web.component.canvas.GraphNodeMetricRow',
    'EV-CANVAS-GRAPH-NODE-METRIC-ROW-PROJECTION',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
    'RenderCanvasGraphNodeCard',
    'node-card',
    'GraphNodeCardView proves GraphNodeMetricRow displays metrics supplied by GraphNodeCardReadModel.',
    jsonb_build_object('redGreen', true, 'noMetricDerivation', true),
    'tools/planning-db/migrations/384_graph_node_metric_row_component_registration.sql',
    md5('evidence:GraphNodeMetricRow:projection:384')
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
