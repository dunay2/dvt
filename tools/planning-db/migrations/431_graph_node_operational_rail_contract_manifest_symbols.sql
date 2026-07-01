-- Declare GraphNodeOperationalRail contract split symbols in the feature
-- mechanization manifest. Migrations 429 and 430 registered files, rails, and
-- symbol refs; this migration adds the semantic symbol records used by the
-- implementation guard.

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
            'GraphNodeOperationalRailBaseProps',
            'GraphNodeOperationalRailInteractiveProps',
            'GraphNodeOperationalRailStaticProps'
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeOperationalRailBaseProps',
            'path', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
            'dddOwner', 'web.component.canvas.GraphNodeOperationalRail',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('presentation_contract', 'shared_props_base'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeOperationalRailInteractiveProps',
            'path', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
            'dddOwner', 'web.component.canvas.GraphNodeOperationalRail',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('presentation_contract', 'requires_supplied_aria_label'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx')
          )
          union all
          select jsonb_build_object(
            'name', 'GraphNodeOperationalRailStaticProps',
            'path', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx',
            'dddOwner', 'web.component.canvas.GraphNodeOperationalRail',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeOperationalSummary'),
            'fowlerSignals', jsonb_build_array('presentation_contract', 'static_noninteractive_metrics'),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:type_contract',
            'unitTests', jsonb_build_array('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx')
          )
        ) all_symbols(value)
      ) distinct_symbols
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/431_graph_node_operational_rail_contract_manifest_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeOperationalRail:contract-manifest-symbols:431'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
