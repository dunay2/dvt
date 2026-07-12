-- Register the GraphNode operational summary detail policy: the health popover
-- is only interactive when its detail rows add information beyond the visible
-- operational rail metrics.

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'noDuplicateDetailPolicy',
      jsonb_build_object(
        'implementedBy', 'buildAdditionalOperationalDetail',
        'rule', 'Operational detail is null when its rows do not add ids beyond the visible rail metrics.',
        'staticMetricsRemainOnCard', true,
        'detailRequiresAdditionalRows', true
      ),
      'negativeTests',
      coalesce(raw_rail->'negativeTests', '[]'::jsonb)
        || jsonb_build_array(
          'static row column and size metrics do not open a duplicate health popover',
          'schema drift alone stays visible on the rail without duplicating itself in a popover'
        )
    ),
  source_path = 'tools/planning-db/migrations/589_graph_node_operational_summary_no_duplicate_detail.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:no-duplicate-detail:589'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

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
  'EV-GRAPH-NODE-OPERATIONAL-SUMMARY-NO-DUPLICATE-DETAIL',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-operational-summary-no-duplicate-detail',
  'Static and single-row operational rail metrics do not create a duplicate GraphNodeHealthPopover; source health detail remains available only when it adds rows.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'redFailures',
    jsonb_build_array(
      'expected static Rows/Columns/Size detail to be null but received duplicate health rows',
      'expected schema-drift-only detail to be null but received duplicate health rows'
    )
  ),
  'tools/planning-db/migrations/589_graph_node_operational_summary_no_duplicate_detail.sql',
  md5('evidence:GraphNodeCardStrategy:no-duplicate-detail:589')
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
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#buildAdditionalOperationalDetail')
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
        ('tools/planning-db/migrations/589_graph_node_operational_summary_no_duplicate_detail.sql')
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
        ('tools/planning-db/migrations/589_graph_node_operational_summary_no_duplicate_detail.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeOperationalSummaryNoDuplicateDetail',
        jsonb_build_object(
          'status', 'implemented',
          'componentId', 'web.component.canvas.GraphNodeCardStrategy',
          'rail', 'RenderCanvasGraphNodeOperationalSummary',
          'rule', 'Health popover details must add information beyond the visible rail metrics.',
          'staticMetricsRemainOnCard', true,
          'detailRequiresAdditionalRows', true
        )
      ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'buildAdditionalOperationalDetail',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'no_duplicate_detail', 'presentation_query_policy'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'cypressCoverage',
          'not_applicable:component_projection_unit_covered',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/589_graph_node_operational_summary_no_duplicate_detail.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-no-duplicate-detail:589'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
