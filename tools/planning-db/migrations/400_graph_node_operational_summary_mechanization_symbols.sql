-- Declare GraphNode operational summary builder symbols in the feature
-- mechanization manifest. Migration 399 registered symbol_refs for search;
-- the implementation guard also requires structured raw_manifest symbols.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(raw_manifest->'symbols', '[]'::jsonb)
      || jsonb_build_array(
        jsonb_build_object(
          'name',
          'GraphNodeOperationalSummary',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('duplicate_semantics', 'projection_builder'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'GraphNodeOperationalSummaryInput',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('parameter_object', 'projection_builder'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        ),
        jsonb_build_object(
          'name',
          'buildGraphNodeOperationalSummary',
          'path',
          'apps/web/src/app/plugins/graph/graphNodeOperationalSummary.ts',
          'dddOwner',
          'GraphNodeCardStrategy',
          'cqRails',
          jsonb_build_array('RenderGraphNodeCardMetrics', 'RenderCanvasGraphNodeOperationalSummary'),
          'fowlerSignals',
          jsonb_build_array('duplicate_semantics', 'projection_builder', 'no_placeholder_metrics'),
          'architectureGuard',
          'scripts/planning-db-migrate.test.cjs',
          'unitTests',
          jsonb_build_array('apps/web/src/app/plugins/graph/graphNodeOperationalSummary.test.ts')
        )
      ),
    true
  ),
  source_path = 'tools/planning-db/migrations/400_graph_node_operational_summary_mechanization_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:operational-summary-symbols:400'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
