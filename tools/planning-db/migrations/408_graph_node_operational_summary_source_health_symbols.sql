-- Declare the source-health helper symbols introduced under the existing
-- GraphNode operational summary projection builder.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#firstNumericValue'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatMinutes'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatCadenceMinutes'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#formatThroughputBytesPerMinute'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#resolveSchemaDriftLabel'),
        ('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts#buildSourceHealthRows')
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(implementation_refs, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/408_graph_node_operational_summary_source_health_symbols.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('tools/planning-db/migrations/408_graph_node_operational_summary_source_health_symbols.sql')
    ) refs(value)
  ),
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'firstNumericValue',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'no_placeholder_metrics'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'formatMinutes',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'source_health_metric_format'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'formatCadenceMinutes',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'source_health_metric_format'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'formatThroughputBytesPerMinute',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'source_health_metric_format'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'resolveSchemaDriftLabel',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_helper', 'source_health_semantics'),
          'architectureGuard',
          'apps/web/src/app/plugins/graph/graphNodeCardReadModel.architecture.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-ready-node-authoring.cy.ts',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'buildSourceHealthRows',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('projection_builder', 'source_health_semantics', 'no_placeholder_metrics'),
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
  source_path = 'tools/planning-db/migrations/408_graph_node_operational_summary_source_health_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-source-health-symbols:408'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
