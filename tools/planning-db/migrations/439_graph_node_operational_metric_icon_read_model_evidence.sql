-- Register read-model coverage for operational metric icon propagation. This
-- is intentionally incremental because migration 438 may already be applied in
-- local Planning DB instances.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconReadModelCoverage',
      jsonb_build_object(
        'unitTest', 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
        'assertsStrategyProjectedIcons', true,
        'assertsOperationalDetailIcons', true
      )
    ),
  source_path = 'tools/planning-db/migrations/439_graph_node_operational_metric_icon_read_model_evidence.sql',
  source_content_sha256 = md5('file:graphNodeCardReadModel.test.ts:operational-metric-icons:439'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts';

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
  'EV-CANVAS-GRAPH-NODE-READ-MODEL-METRIC-ICON-PROPAGATION',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-read-model',
  'GraphNodeCard read models preserve strategy-projected operational metric icons into card and detail projections.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeCardReadModel.test.ts',
    'assertsStrategyProjectedIcons', true,
    'assertsOperationalDetailIcons', true,
    'doesNotInventMissingMetrics', true
  ),
  'tools/planning-db/migrations/439_graph_node_operational_metric_icon_read_model_evidence.sql',
  md5('evidence:GraphNodeCardStrategy:read-model-operational-metric-icons:439')
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

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-READ-MODEL-METRIC-ICON-PROPAGATION')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconReadModelCoverage',
      true,
      'readModelPreservesProjectedIcons',
      true
    ),
  source_path = 'tools/planning-db/migrations/439_graph_node_operational_metric_icon_read_model_evidence.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:read-model-operational-metric-icons:439'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('tools/planning-db/migrations/439_graph_node_operational_metric_icon_read_model_evidence.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardReadModel.test.ts'),
        ('tools/planning-db/migrations/439_graph_node_operational_metric_icon_read_model_evidence.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/439_graph_node_operational_metric_icon_read_model_evidence.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:read-model-operational-metric-icons:439'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
