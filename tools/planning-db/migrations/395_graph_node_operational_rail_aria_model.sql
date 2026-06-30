-- Move GraphNodeOperationalRail accessibility copy into the projected read
-- model. The rail remains a presentation component: it renders supplied
-- metrics, supplied action label, and supplied open handler only.

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = raw_rail || jsonb_build_object(
    'accessibilityContract',
    jsonb_build_object(
      'ariaLabelSource', 'GraphNodeOperationalDetail.ariaLabel',
      'noHardcodedPresentationCopy', true,
      'projectionOwner', 'buildGraphNodeOperationalDetail'
    )
  ),
  source_path = 'tools/planning-db/migrations/395_graph_node_operational_rail_aria_model.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:aria-model:395'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and rail_name = 'RenderCanvasGraphNodeOperationalSummary';

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
    'web.component.canvas.GraphNodeOperationalRail',
    'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
    'contract',
    'GraphNodeOperationalDetail.ariaLabel',
    jsonb_build_object(
      'responsibility', 'Declare the operational rail action label as part of the projected detail read model.',
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'presentationDoesNotInventCopy', true
    ),
    'tools/planning-db/migrations/395_graph_node_operational_rail_aria_model.sql',
    md5('file:GraphNodeOperationalDetail:ariaLabel:395')
  ),
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
    'projection-helper',
    'buildGraphNodeOperationalDetail',
    jsonb_build_object(
      'responsibility', 'Project the operational detail title, aria label, and rows from supplied metrics.',
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'noViewCopyFallback', true
    ),
    'tools/planning-db/migrations/395_graph_node_operational_rail_aria_model.sql',
    md5('file:buildGraphNodeOperationalDetail:ariaLabel:395')
  ),
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
    'presentation',
    'GraphNodeOperationalRail',
    jsonb_build_object(
      'responsibility', 'Render operational metrics and the supplied accessibility action label without inventing node semantics.',
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'requiresSuppliedAriaLabelWhenActionable', true
    ),
    'tools/planning-db/migrations/395_graph_node_operational_rail_aria_model.sql',
    md5('file:GraphNodeOperationalRail:ariaLabel:395')
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
  'web.component.canvas.GraphNodeOperationalRail',
  'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-ARIA-MODEL',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeCardView.test.tsx',
  'RenderCanvasGraphNodeOperationalSummary',
  'graph-node-card-operational-rail',
  'GraphNodeOperationalRail uses GraphNodeOperationalDetail.ariaLabel supplied by the card read model instead of hardcoded presentation copy.',
  jsonb_build_object(
    'redGreen', true,
    'redFailure', 'expected Open Orders model health metrics but received Open node operational details',
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeCardView.test.tsx'
  ),
  'tools/planning-db/migrations/395_graph_node_operational_rail_aria_model.sql',
  md5('evidence:GraphNodeOperationalRail:ariaLabel:395')
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
