-- Register tokenized operational metric tone rendering for Graph node cards.
-- GraphNodeOperationalRail renders the supplied GraphNodeCardMetric.tone value;
-- it does not derive health semantics or invent missing metrics.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricToneContract',
      jsonb_build_object(
        'toneField', 'GraphNodeCardMetric.tone',
        'renderOwner', 'web.component.canvas.GraphNodeOperationalRail',
        'semanticOwner', 'read-model-builder',
        'doesNotResolveMetricSemantics', true
      )
    ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('file:graphNodeCardStrategyContracts.ts:operational-metric-tone:443'),
  updated_at = now()
where component_id in ('web.component.canvas.GraphNodeCard', 'web.component.canvas.GraphNodeCardStrategy')
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricTone',
      jsonb_build_object(
        'toneField', 'GraphNodeCardMetric.tone',
        'dataAttribute', 'data-tone',
        'valueToken', 'graphNodeOperationalRailClasses.valueTone',
        'doesNotResolveMetricSemantics', true
      )
    ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail.tsx:operational-metric-tone:443'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricTonePresentationCoverage',
      jsonb_build_object(
        'presentationTest', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
        'assertsDataTone', 'warning',
        'assertsValueToken', 'graphNodeOperationalRailClasses.valueTone.warning'
      )
    ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('file:GraphNodeOperationalRail.test.tsx:operational-metric-tone:443'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeOperationalRail'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'operationalMetricToneTokens',
      jsonb_build_object(
        'valueToneMap', 'graphNodeOperationalRailClasses.valueTone',
        'tones', jsonb_build_array('neutral', 'info', 'success', 'warning', 'danger', 'running'),
        'noHardcodedColorsInRail', true
      )
    ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('file:graphVisualTokens.ts:operational-metric-tone:443'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCard'
  and file_path = 'apps/web/src/app/plugins/graph/graphVisualTokens.ts';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricTone',
      true,
      'toneField', 'GraphNodeCardMetric.tone',
      'doesNotResolveMetricSemantics', true
    ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:operational-metric-tone:443'),
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
  'web.component.canvas.GraphNodeOperationalRail',
  'EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-METRIC-TONE-RENDER',
  'presentation-test',
  'current',
  'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
  'RenderCanvasGraphNodeOperationalSummary',
  'graph-node-operational-rail',
  'GraphNodeOperationalRail renders the supplied metric tone through stable data-tone attributes and tokenized value classes.',
  jsonb_build_object(
    'redGreen', true,
    'command', 'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeOperationalRail.test.tsx',
    'toneField', 'GraphNodeCardMetric.tone',
    'dataAttribute', 'data-tone',
    'valueToken', 'graphNodeOperationalRailClasses.valueTone',
    'doesNotResolveMetricSemantics', true,
    'featureMechanizationCommand', 'pnpm docs:feature-mechanization:implementation'
  ),
  'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  md5('evidence:GraphNodeOperationalRail:operational-metric-tone:443')
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
      values ('EV-CANVAS-GRAPH-NODE-OPERATIONAL-RAIL-METRIC-TONE-RENDER')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricTone',
      true,
      'toneSemanticsOwner',
      'supplied-read-model'
    ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('component:GraphNodeOperationalRail:operational-metric-tone:443'),
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
          where value->>'name' not in ('graphNodeOperationalRailClasses')
          union all
          select jsonb_build_object(
            'name', 'graphNodeOperationalRailClasses',
            'path', 'apps/web/src/app/plugins/graph/graphVisualTokens.ts',
            'dddOwner', 'web.component.canvas.GraphNodeOperationalRail',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('presentation_token_map', 'no_hardcoded_metric_tones'),
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
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql')
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
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/443_graph_node_operational_metric_tone.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-metric-tone:443'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
