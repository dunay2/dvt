-- Register semantic operational metric icons for Graph node cards. The read
-- model owns which icon a real metric carries; GraphNodeOperationalRail only
-- renders the supplied icon token.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconContract',
      jsonb_build_object(
        'iconField', 'GraphNodeCardMetric.icon',
        'doesNotInventMissingMetrics', true,
        'renderOwner', 'web.component.canvas.GraphNodeOperationalRail'
      )
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategyContracts.ts:operational-metric-icons:438'),
  updated_at = now()
where component_id in ('web.component.canvas.GraphNodeCard', 'web.component.canvas.GraphNodeCardStrategy')
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconProjection',
      jsonb_build_object(
        'sourceHealthIcons', jsonb_build_array('clock', 'refresh', 'throughput', 'database', 'rows', 'drift'),
        'modelExecutionIcons', jsonb_build_array('clock', 'timer', 'rows', 'cost'),
        'doesNotInventMissingMetrics', true
      )
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.ts:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconCoverage',
      jsonb_build_object(
        'unitTest', 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
        'coversSourceHealthIcons', true,
        'coversModelExecutionIcons', true
      )
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.test.ts:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricIcon',
      true,
      'iconMapOwner',
      'GraphNodeOperationalRail',
      'doesNotResolveMetricSemantics',
      true
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail.tsx:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconPresentationCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
        'assertsDataIcon', 'database',
        'decorative', true
      )
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail.test.tsx:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconTokens',
      jsonb_build_object(
        'iconClass', 'graphNodeOperationalRailClasses.icon',
        'iconSvgClass', 'graphNodeOperationalRailClasses.iconSvg',
        'noHardcodedColors', true
      )
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('file:graphVisualTokens.ts:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconProjection',
      true,
      'doesNotInventMissingMetrics',
      true
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricIcon',
      true,
      'doesNotResolveMetricSemantics',
      true
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:operational-metric-icons:438'),
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
values
  (
    'web.component.canvas.GraphNodeCardStrategy',
    'EV-CANVAS-GRAPH-NODE-OPERATIONAL-METRIC-ICON-PROJECTION',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'RenderGraphNodeCardMetrics',
    'graph-node-operational-summary',
    'GraphNodeCardStrategy projects semantic metric icons only when the underlying metric exists.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
      'sourceIcons', jsonb_build_array('clock', 'refresh', 'throughput', 'database', 'rows', 'drift'),
      'modelIcons', jsonb_build_array('clock', 'timer', 'rows', 'cost'),
      'doesNotInventMissingMetrics', true
    ),
    'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
    md5('evidence:GraphNodeCardStrategy:operational-metric-icons:438')
  ),
  (
    'web.component.canvas.GraphNodeOperationalRail',
    'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-METRIC-ICON-RENDER',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
    'RenderCanvasGraphNodeOperationalSummary',
    'graph-node-operational-rail',
    'GraphNodeOperationalRail renders supplied metric icons as decorative tokenized UI without deriving metric semantics.',
    jsonb_build_object(
      'redGreen', true,
      'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
      'dataSlot', 'graph-node-operational-icon',
      'dataIcon', 'database',
      'ariaHidden', true,
      'doesNotResolveMetricSemantics', true
    ),
    'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
    md5('evidence:GraphNodeOperationalRail:operational-metric-icons:438')
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
      values ('EV-CANVAS-GRAPH-NODE-OPERATIONAL-METRIC-ICON-PROJECTION')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricIconProjection',
      true,
      'iconSemanticsOwner',
      'read-model-builder'
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy';

update planning_query_store.frontend_component_local_components
set
  evidence_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(evidence_refs, '[]'::jsonb)) refs(value)
      union all
      values ('EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-METRIC-ICON-RENDER')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricIcon',
      true,
      'iconSemanticsOwner',
      'supplied-read-model'
    ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:operational-metric-icons:438'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail';

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(value order by value->>'name')
      from (
        select distinct on (value->>'name', value->>'path') value
        from (
          select value
          from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) existing(value)
          where value->>'name' not in (
            'GraphNodeCardMetricIcon',
            'PushMetricOptions',
            'metricIconByName'
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeCardMetricIcon',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
            'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('read_model_contract', 'semantic_metric_icon'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'PushMetricOptions',
            'path', 'apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
            'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('projection_helper_options', 'semantic_metric_icon'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:pure_read_model_helper',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'metricIconByName',
            'path', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
            'dddOwner', 'web.component.canvas.GraphNodeOperationalRail',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('presentation_icon_map', 'no_metric_semantics_lookup'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:presentation_component_test',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx')
          )
        ) all_symbols(value)
      ) distinct_symbols
    ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/438_graph_node_operational_metric_icons.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-metric-icons:438'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
