-- Record source-health operational metrics on the existing GraphNodeCardStrategy
-- projection rail. This extends the existing builder without creating a new
-- product command/query vocabulary.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'sourceHealthSemantics',
      jsonb_build_object(
        'freshness', 'freshnessMinutes or freshnessAgeMinutes',
        'cadence', 'cadenceMinutes or scheduleMinutes',
        'throughput', 'throughputBytesPerMinute or bytesPerMinute',
        'size', 'datasetSizeBytes or sourceSizeBytes',
        'schemaDrift', 'schemaDriftStatus or schemaDrift',
        'doesNotInventMetrics', true
      )
    ),
  source_path = 'tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.ts:source-health:407'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
  and file_role = 'projection-builder';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'sourceHealthSemantics',
      jsonb_build_object(
        'railMetrics',
        jsonb_build_array('freshness', 'cadence', 'throughput', 'size'),
        'detailOnlyMetrics',
        jsonb_build_array('rows', 'schema-drift'),
        'noPlaceholderMetrics',
        true
      ),
      'negativeTests',
      coalesce(raw_rail->'negativeTests', '[]'::jsonb)
        || jsonb_build_array(
          'schema drift detail can render without placeholder rail metrics',
          'generic byteSize alone does not switch model runtime summaries into source health mode'
        )
    ),
  source_path = 'tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:source-health:407'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'sourceHealthSemantics',
      jsonb_build_object(
        'implementedBy', 'web.component.canvas.GraphNodeCardStrategy',
        'railMetrics', jsonb_build_array('freshness', 'cadence', 'throughput', 'size'),
        'detailOnlyMetrics', jsonb_build_array('rows', 'schema-drift')
      )
    ),
  source_path = 'tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:source-health:407'),
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
  'EV-GRAPH-NODE-OPERATIONAL-SUMMARY-SOURCE-HEALTH',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-operational-summary-source-health',
  'Source health metrics are projected only from recorded warehouse metadata; schema drift detail does not create placeholder rail metrics.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'redFailure',
    'Expected freshness/cadence/throughput/schema drift metrics before source-health projection support existed'
  ),
  'tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql',
  md5('evidence:GraphNodeCardStrategy:source-health:407')
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
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql')
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
        ('tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeOperationalSummarySourceHealth',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeCardStrategy',
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'doesNotInventMetrics', true,
        'sourceHealthMetrics',
        jsonb_build_array('freshness', 'cadence', 'throughput', 'size', 'rows', 'schema-drift')
      )
    ),
  source_path = 'tools/planning-db/migrations/407_graph_node_operational_summary_source_health.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-source-health:407'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
