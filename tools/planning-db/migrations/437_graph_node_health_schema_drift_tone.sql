-- Preserve schema drift as a semantic health tone from the Graph node card
-- projection through the health popover presentation. The strategy owns the
-- domain projection; the popover only renders supplied tone tokens.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDriftToneProjection',
      jsonb_build_object(
        'okTone',
        'success',
        'driftTone',
        'warning',
        'doesNotInventMissingMetrics',
        true
      )
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.ts:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDriftToneCoverage',
      jsonb_build_object(
        'success',
        'No drift detected',
        'warning',
        'Drift detected',
        'doesNotInventMissingMetrics',
        true
      )
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.test.ts:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricTone',
      true,
      'tonePresentationSurface',
      'data-tone + graphNodeHealthPopoverClasses.valueTone'
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('file:GraphNodeHealthPopoverView.tsx:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx';

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDriftTonePresentationCoverage',
      true,
      'assertsDataTone',
      'success'
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('file:GraphNodeHealthPopoverView.test.tsx:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and file_path = 'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDriftToneProjection',
      true,
      'okTone',
      'success',
      'driftTone',
      'warning'
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricTone',
      true,
      'doesNotResolveHealthSemantics',
      true
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('rail:GraphNodeHealthPopover:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover'
  and rail_name = 'RenderCanvasNodeHealthPopover';

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
    'EV-CANVAS-GRAPH-NODE-SCHEMA-DRIFT-TONE-PROJECTION',
    'unit-test',
    'current',
    'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'RenderGraphNodeCardMetrics',
    'graph-node-operational-summary',
    'GraphNodeCardStrategy projects schema drift health as success or warning tone without inventing missing source metrics.',
    jsonb_build_object(
      'redGreen',
      true,
      'command',
      'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
      'successTone',
      'No drift detected',
      'warningTone',
      'Drift detected',
      'doesNotInventMissingMetrics',
      true
    ),
    'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
    md5('evidence:GraphNodeCardStrategy:schema-drift-tone:437')
  ),
  (
    'web.component.canvas.GraphNodeHealthPopover',
    'EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-SCHEMA-DRIFT-TONE',
    'presentation-test',
    'current',
    'apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
    'RenderCanvasNodeHealthPopover',
    'graph-node-health-popover',
    'GraphNodeHealthPopover renders the supplied metric tone through tokenized presentation classes and stable data-tone attributes.',
    jsonb_build_object(
      'redGreen',
      true,
      'command',
      'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx',
      'dataTone',
      'success',
      'tokenizedClassMap',
      'graphNodeHealthPopoverClasses.valueTone',
      'doesNotResolveHealthSemantics',
      true
    ),
    'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
    md5('evidence:GraphNodeHealthPopover:schema-drift-tone:437')
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
      values ('EV-CANVAS-GRAPH-NODE-SCHEMA-DRIFT-TONE-PROJECTION')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'schemaDriftToneProjection',
      true,
      'toneOwner',
      'read-model-builder'
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('component:GraphNodeCardStrategy:schema-drift-tone:437'),
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
      values ('EV-CANVAS-GRAPH-NODE-HEALTH-POPOVER-SCHEMA-DRIFT-TONE')
    ) updated_refs(value)
  ),
  raw_component = coalesce(raw_component, '{}'::jsonb)
    || jsonb_build_object(
      'rendersSuppliedMetricTone',
      true,
      'toneOwner',
      'supplied-read-model'
    ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('component:GraphNodeHealthPopover:schema-drift-tone:437'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeHealthPopover';

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
            'SchemaDriftProjection',
            'resolveSchemaDriftProjection'
          )
          union all
          select jsonb_build_object(
            'name', 'SchemaDriftProjection',
            'path', 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
            'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics'),
            'fowlerSignals', jsonb_build_array('read_model_projection_contract', 'semantic_health_tone'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:pure_read_model',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
          )
          union all
          select jsonb_build_object(
            'name', 'resolveSchemaDriftProjection',
            'path', 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCardStrategy',
            'cqRails', jsonb_build_array('RenderGraphNodeCardMetrics'),
            'fowlerSignals', jsonb_build_array('pure_projection_helper', 'semantic_health_tone'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:pure_read_model',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
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
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyContracts.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeCardStrategyUtils.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.tsx'),
        ('apps/web/src/app/plugins/graph/GraphNodeHealthPopoverView.test.tsx'),
        ('apps/web/src/app/plugins/graph/graphVisualTokens.ts'),
        ('tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/437_graph_node_health_schema_drift_tone.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:schema-drift-tone:437'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
