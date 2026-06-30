update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select coalesce(
        jsonb_agg(
          case
            when symbol_value ? 'cypressCoverage' then symbol_value
            else symbol_value || jsonb_build_object(
              'cypressCoverage',
              'covered by CanvasViewport.nodeFloatingToolbar presentation integration before browser-flow expansion'
            )
          end
          order by symbol_value::text
        ),
        '[]'::jsonb
      )
      from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) as symbols(symbol_value)
    ),
    true
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(completion_gate, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasViewport.nodeFloatingToolbar.test.tsx'),
        ('pnpm docs:feature-mechanization:implementation')
    ) gates(value)
  ),
  source_path = 'tools/planning-db/migrations/374_canvas_node_floating_toolbar_cypress_coverage_manifest.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:NodeFloatingToolbar:374'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasGraphNodeCard';
