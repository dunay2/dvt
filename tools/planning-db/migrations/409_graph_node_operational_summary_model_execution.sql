-- Record model execution operational metrics on the existing GraphNodeCardStrategy
-- projection rail. This extends the current graph-node operational summary
-- builder; it does not introduce a new command/query vocabulary.

update planning_query_store.frontend_component_local_files
set
  raw_file = coalesce(raw_file, '{}'::jsonb)
    || jsonb_build_object(
      'modelExecutionSemantics',
      jsonb_build_object(
        'lastRun', 'lastRunMinutesAgo, lastRunAgeMinutes, or lastRunAt',
        'duration', 'durationSeconds or durationMs',
        'rows', 'rowCount from the resolved card projection',
        'cost', 'costUsd, cost, or costLabel',
        'tests', 'testStatus or testsStatus',
        'doesNotInventMetrics', true
      )
    ),
  source_path = 'tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql',
  source_content_sha256 = md5('file:graphNodeOperationalSummary.ts:model-execution:409'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and file_path = 'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts'
  and file_role = 'projection-builder';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'modelExecutionSemantics',
      jsonb_build_object(
        'railMetrics',
        jsonb_build_array('last-run', 'duration', 'rows', 'cost', 'tests'),
        'sourceHealthTakesPriority',
        true,
        'noPlaceholderMetrics',
        true
      ),
      'negativeTests',
      coalesce(raw_rail->'negativeTests', '[]'::jsonb)
        || jsonb_build_array(
          'model execution cost is only shown from recorded cost data',
          'durationSeconds is rendered through the shared duration formatter',
          'runtime rows remain absent when no resolved row count exists'
        )
    ),
  source_path = 'tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql',
  source_content_sha256 = md5('rail:GraphNodeCardStrategy:model-execution:409'),
  updated_at = now()
where component_id = 'web.component.canvas.GraphNodeCardStrategy'
  and rail_name = 'RenderGraphNodeCardMetrics';

update planning_query_store.frontend_component_local_cq_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'modelExecutionSemantics',
      jsonb_build_object(
        'implementedBy',
        'web.component.canvas.GraphNodeCardStrategy',
        'railMetrics',
        jsonb_build_array('last-run', 'duration', 'rows', 'cost', 'tests')
      )
    ),
  source_path = 'tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql',
  source_content_sha256 = md5('rail:GraphNodeOperationalRail:model-execution:409'),
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
  'EV-GRAPH-NODE-OPERATIONAL-SUMMARY-MODEL-EXECUTION',
  'unit-test',
  'current',
  'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
  'RenderGraphNodeCardMetrics',
  'graph-node-card-operational-summary-model-execution',
  'Model execution metrics project last-run age, duration, rows, cost, and tests only from recorded run data.',
  jsonb_build_object(
    'command',
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/plugins/graph/graphNodeOperationalSummary.test.ts',
    'redFailure',
    'Expected last-run/duration/cost/tests metrics but received only rows before model-execution projection support existed'
  ),
  'tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql',
  md5('evidence:GraphNodeCardStrategy:model-execution:409')
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
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatCost'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#firstRuntimeNumericValue'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#firstRuntimeStringValue'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#buildModelExecutionMetrics')
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
        ('tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql')
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
        ('tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'graphNodeOperationalSummaryModelExecution',
        jsonb_build_object(
          'status',
          'implemented',
          'componentId',
          'web.component.canvas.GraphNodeCardStrategy',
          'rail',
          'RenderCanvasGraphNodeOperationalSummary',
          'doesNotInventMetrics',
          true,
          'modelExecutionMetrics',
          jsonb_build_array('last-run', 'duration', 'rows', 'cost', 'tests')
        )
      ),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'formatCost',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'model_execution_metric_format'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'firstRuntimeNumericValue',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'runtime_data_resolution'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'firstRuntimeStringValue',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'runtime_data_resolution'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'buildModelExecutionMetrics',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_builder', 'model_execution_semantics', 'no_placeholder_metrics'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/409_graph_node_operational_summary_model_execution.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-model-execution:409'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
