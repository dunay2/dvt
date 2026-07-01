-- Register the shared GraphNode operational summary projection builder.
-- The builder removes duplicated metric semantics from DBT/DVT strategies
-- without introducing a new product rail.

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
    'web.component.canvas.GraphNodeCardStrategy',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
    'projection-builder',
    'buildGraphNodeOperationalSummary',
    jsonb_build_object(
      'responsibility', 'Project recorded graph node operational metrics and detail rows for DBT/DVT card strategies.',
      'rails', jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
      'fowlerOpportunity', 'duplicate_semantics',
      'doesNotInventMetrics', true,
      'noPresentationDependency', true
    ),
    'tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql',
    md5('file:graphNodeOperationalSummary.ts:399')
  ),
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'unit-test',
    null,
    jsonb_build_object(
      'responsibility', 'Prove runtime-first and static fallback operational summary projection without placeholder metrics.',
      'rails', jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
      'redGreen', true
    ),
    'tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql',
    md5('file:graphNodeOperationalSummary.test.ts:399')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
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
  'web.component.canvas.GraphNodeCardStrategy',
  'RenderGraphNodeCardMetrics',
  'query',
  'implemented-projection',
  jsonb_build_object(
    'kind', 'query',
    'dddObject', 'GraphNodeCardReadModel',
    'applicationPort', 'graph-node-card-strategy',
    'projectionBuilder', 'buildGraphNodeOperationalSummary',
    'internalRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
    'negativeTests', jsonb_build_array(
      'missing row and byte metadata emits no placeholder operational metrics',
      'runtime duration uses normalized strategy runtime data',
      'DBT and DVT strategies reuse the same operational summary builder'
    )
  ),
  'tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql',
  md5('rail:GraphNodeCardStrategy:RenderGraphNodeCardMetrics:399')
)
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'projectionBuilder',
      'buildGraphNodeOperationalSummary',
      'strategyComponentId',
      'web.component.canvas.GraphNodeCardStrategy',
      'doesNotInventMetrics',
      true
    ),
  source_path = 'tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:summary-builder:399'),
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
  'web.component.canvas.GraphNodeCardStrategy',
  'EV-GRAPH-NODE-OPERATIONAL-SUMMARY-BUILDER',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-operational-summary',
  'Operational summary projection is centralized, runtime-first, and does not emit placeholder metrics when recorded data is absent.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'redFailure',
    'Failed to resolve import ./graphNodeOperationalSummary before builder creation'
  ),
  'tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql',
  md5('evidence:GraphNodeCardStrategy:operational-summary-builder:399')
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
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#GraphNodeOperationalSummary'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#GraphNodeOperationalSummaryInput'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#buildGraphNodeOperationalSummary')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeOperationalSummaryBuilder',
      jsonb_build_object(
        'status',
        'implemented',
        'componentId',
        'web.component.canvas.GraphNodeCardStrategy',
        'rails',
        jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
        'fowlerOpportunity',
        'duplicate_semantics',
        'doesNotInventMetrics',
        true
      )
    ),
  source_path = 'tools/planning-db/migrations/399_graph_node_operational_summary_builder.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-builder:399'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
