-- Promote GraphNodeOperationalSummary from an implicit GraphNodeCardStrategy
-- helper into a DB-queryable component. The source files already implement the
-- manual's pure operational-summary builder; this migration fixes ownership so
-- Fowler reviews can query the component, files, rail, tests, and relations
-- without treating the strategy as the file owner.

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
  'web.component.canvas.GraphNodeOperationalSummary',
  'GraphNodeOperationalSummary',
  'query-view',
  'current',
  'extract',
  'Frontend / Canvas',
  'Project recorded graph-node metadata and runtime facts into operational rail metrics and health-detail rows without rendering UI or inventing placeholder data.',
  '@dvt/web',
  '/canvas',
  'dbt;dvt',
  '[]'::jsonb,
  jsonb_build_array(
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'
  ),
  jsonb_build_object(
    'dbFirst', true,
    'parentComponentId', 'web.component.canvas.GraphNodeCard',
    'usedBy', jsonb_build_array(
      'web.component.canvas.GraphNodeCardStrategy',
      'web.component.canvas.GraphNodeOperationalRail',
      'web.component.canvas.GraphNodeHealthPopover'
    ),
    'governingRail', 'RenderCanvasGraphNodeOperationalSummary',
    'doesNotRender', true,
    'doesNotInventMetrics', true,
    'manualReference', 'buzon/manual de implementacion.txt'
  ),
  'tools/planning-db/migrations/475_graph_node_operational_summary_component_ownership.sql',
  md5('component:GraphNodeOperationalSummary:475')
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
    'web.component.canvas.GraphNodeOperationalSummary',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
    'projection-builder',
    'buildGraphNodeOperationalSummary',
    jsonb_build_object(
      'responsibility', 'Project recorded source-health and model-execution facts into operational metrics and detail rows.',
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'pluginScope', jsonb_build_array('dbt', 'dvt'),
      'doesNotRender', true,
      'doesNotInventMetrics', true
    ),
    'tools/planning-db/migrations/475_graph_node_operational_summary_component_ownership.sql',
    md5('file:graphNodeOperationalSummary.ts:475')
  ),
  (
    'web.component.canvas.GraphNodeOperationalSummary',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove source-health, schema-drift, model-execution, cost, and no-placeholder metric projection.',
      'rail', 'RenderCanvasGraphNodeOperationalSummary',
      'redGreen', true
    ),
    'tools/planning-db/migrations/475_graph_node_operational_summary_component_ownership.sql',
    md5('file:graphNodeOperationalSummary.test.ts:475')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  component_id = 'web.component.canvas.GraphNodeOperationalSummary',
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'kind', 'query',
      'dddObject', 'GraphNodeOperationalSummary',
      'applicationPort', 'graph-node-operational-summary',
      'projectionBuilder', 'buildGraphNodeOperationalSummary',
      'consumedBy', jsonb_build_array(
        'web.component.canvas.GraphNodeCardStrategy',
        'web.component.canvas.GraphNodeOperationalRail',
        'web.component.canvas.GraphNodeHealthPopover'
      ),
      'negativeTests', jsonb_build_array(
        'source without health signals falls back to recorded row and byte metrics only',
        'missing row and byte metadata emits no placeholder operational metrics',
        'schema drift tone is projected from recorded metadata only'
      )
    ),
  source_path = 'tools/planning-db/migrations/475_graph_node_operational_summary_component_ownership.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalSummary:RenderCanvasGraphNodeOperationalSummary:475'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and rail_name = 'RenderCanvasGraphNodeOperationalSummary';

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
  'web.component.canvas.GraphNodeOperationalSummary',
  'EV-CANVAS-GRAPH-NODE-OPERATIONAL-SUMMARY-COMPONENT',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
  'RenderCanvasGraphNodeOperationalSummary',
  'graph-node-operational-summary',
  'GraphNodeOperationalSummary is a query component with focused tests for source health, schema drift, model execution metrics, and no placeholder projection.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'componentProfile',
    'pnpm planning:db:query component-profile --component web.component.canvas.GraphNodeOperationalSummary',
    'doesNotRender',
    true,
    'doesNotInventMetrics',
    true
  ),
  'tools/planning-db/migrations/475_graph_node_operational_summary_component_ownership.sql',
  md5('evidence:GraphNodeOperationalSummary:component:475')
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

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status
)
values (
  'web.component.canvas.GraphNodeOperationalSummary',
  'GraphNodeOperationalSummary',
  'module',
  'ui',
  'Frontend / Canvas',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
  'RenderCanvasGraphNodeOperationalSummary',
  'typescript',
  'high',
  'implemented'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-GRAPH-NODE-OPERATIONAL-RAIL-READS-OPERATIONAL-SUMMARY',
    'web.component.canvas.GraphNodeOperationalRail',
    'web.component.canvas.GraphNodeOperationalSummary',
    'reads',
    'outbound',
    'sync',
    'renders_empty_when_summary_empty',
    'canvas_presentation',
    jsonb_build_array(
      'RenderCanvasGraphNodeOperationalSummary',
      'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
      'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
    ),
    'implemented'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();
