-- Add the shared base prop type introduced by the GraphNodeOperationalRail
-- static/interactive contract split to feature mechanization. This is an
-- incremental correction after migration 429; it does not change component
-- behavior or command/query rail ownership.

update planning_query_store.feature_mechanization_local_rails
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(symbol_refs, '[]'::jsonb)) refs(value)
      union all
      values ('apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#GraphNodeOperationalRailBaseProps')
    ) updated_refs(value)
  ),
  raw_manifest = coalesce(raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'graphNodeOperationalRailBasePropsSymbol',
      jsonb_build_object(
        'status', 'implemented',
        'componentId', 'web.component.canvas.GraphNodeOperationalRail',
        'rail', 'RenderCanvasGraphNodeOperationalSummary',
        'symbol', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.tsx#GraphNodeOperationalRailBaseProps',
        'reason', 'Shared props base for the static and interactive operational rail presentation contracts.',
        'componentTest', 'apps/web/src/app/plugins/graph/GraphNodeOperationalRail.test.tsx'
      )
    ),
  source_path = 'tools/planning-db/migrations/430_graph_node_operational_rail_base_props_symbol.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeOperationalRail:base-props-symbol:component-test:430'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
