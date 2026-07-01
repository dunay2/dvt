-- Declare the local helper introduced by the GraphNodeCard port
-- compatibility label presenter. The helper is intentionally private to the
-- presenter and belongs to the RenderCanvasGraphNodeCard read rail.

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
          where value->>'name' <> 'resolveCompatibleNodeLabel'
          union all
          select jsonb_build_object(
            'name', 'resolveCompatibleNodeLabel',
            'path', 'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.ts',
            'dddOwner', 'web.component.canvas.GraphNodeCard',
            'cqRails', jsonb_build_array('RenderCanvasGraphNodeCard'),
            'fowlerSignals', jsonb_build_array(
              'passive_presentation_label',
              'delegates_to_graph_node_title_presenter',
              'does_not_own_edge_admission'
            ),
            'architectureGuard', 'pnpm docs:feature-mechanization:implementation',
            'cypressCoverage', 'not_applicable:pure_presenter_unit_covered',
            'unitTests', jsonb_build_array(
              'apps/web/src/app/views/canvas/canvasConnectionCompatibilityPresenter.test.ts'
            )
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
      values ('tools/planning-db/migrations/450_graph_node_card_port_compatibility_label_symbol.sql')
    ) updated_refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(allowed_implementation_surfaces, '[]'::jsonb)) refs(value)
      union all
      values ('tools/planning-db/migrations/450_graph_node_card_port_compatibility_label_symbol.sql')
    ) updated_refs(value)
  ),
  source_path = 'tools/planning-db/migrations/450_graph_node_card_port_compatibility_label_symbol.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:GraphNodeCard:port-compatibility-label-symbol:450'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
