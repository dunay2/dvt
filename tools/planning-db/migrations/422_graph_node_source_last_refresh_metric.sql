-- Extend the existing GraphNodeCardStrategy source-health projection with
-- recorded source refresh timestamps. This reuses RenderGraphNodeCardMetrics
-- and does not create a new command/query rail.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'sourceHealthSemantics',
      coalesce(raw_file->'sourceHealthSemantics', '{}'::jsonb)
        || jsonb_build_object(
          'lastRefresh', 'lastRefreshAt or lastRefresh',
          'doesNotInventMetrics', true
        )
    ),
  source_path = 'tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.ts:source-last-refresh:422'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
  and file_role = 'projection-builder';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'sourceHealthSemantics',
      coalesce(raw_rail->'sourceHealthSemantics', '{}'::jsonb)
        || jsonb_build_object(
          'railMetrics',
          jsonb_build_array('freshness', 'last-refresh', 'cadence', 'throughput', 'size'),
          'detailOnlyMetrics',
          jsonb_build_array('rows', 'schema-drift'),
          'noPlaceholderMetrics',
          true
        ),
      'negativeTests',
      coalesce(raw_rail->'negativeTests', '[]'::jsonb)
        || jsonb_build_array(
          'lastRefreshAt projects source health without replacing recorded row counts'
        )
    ),
  source_path = 'tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:source-last-refresh:422'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'sourceHealthSemantics',
      coalesce(raw_rail->'sourceHealthSemantics', '{}'::jsonb)
        || jsonb_build_object(
          'railMetrics',
          jsonb_build_array('freshness', 'last-refresh', 'cadence', 'throughput', 'size'),
          'detailOnlyMetrics',
          jsonb_build_array('rows', 'schema-drift')
        )
    ),
  source_path = 'tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:source-last-refresh:422'),
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
  'EV-GRAPH-NODE-OPERATIONAL-SUMMARY-SOURCE-LAST-REFRESH',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-operational-summary-source-last-refresh',
  'Recorded source lastRefreshAt metadata projects as a source health metric and detail row without inventing freshness values.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts -t "uses recorded source refresh timestamps"',
    'redFailure',
    'Expected last-refresh source health metric but received static rows fallback'
  ),
  'tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql',
  md5('evidence:GraphNodeCardStrategy:source-last-refresh:422')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql')
    ) refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeOperationalSummarySourceHealth',
      coalesce(raw_manifest->'graphNodeOperationalSummarySourceHealth', '{}'::jsonb)
        || jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeCardStrategy',
          'rail', 'RenderCanvasGraphNodeOperationalSummary',
          'doesNotInventMetrics', true,
          'sourceHealthMetrics',
          jsonb_build_array(
            'freshness',
            'last-refresh',
            'cadence',
            'throughput',
            'size',
            'rows',
            'schema-drift'
          )
        )
    ),
  source_path = 'tools/planning-db/migrations/422_graph_node_source_last_refresh_metric.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:source-last-refresh:422'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
