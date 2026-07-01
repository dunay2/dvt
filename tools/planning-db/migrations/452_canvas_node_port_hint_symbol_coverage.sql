-- Normalize feature-mechanization symbol coverage for the Canvas node port
-- compatibility hint rail. The rail is presentation-only and is covered by
-- component tests rather than Cypress E2E flows.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when value->>'path' = 'apps/web/src/app/components/canvas/CanvasNodePortHandle.tsx'
            then value || jsonb_build_object(
              'cypressCoverage',
              coalesce(value->>'cypressCoverage', 'not_applicable:component_test_modularization')
            )
          else value
        end
        order by value->>'name'
      )
      from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) symbols(value)
    ),
    true
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(implementation_refs, '[]'::jsonb)
      || jsonb_build_array('tools/planning-db/migrations/452_canvas_node_port_hint_symbol_coverage.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array('tools/planning-db/migrations/452_canvas_node_port_hint_symbol_coverage.sql')
    ) refs(value)
  ),
  source_path = 'tools/planning-db/migrations/452_canvas_node_port_hint_symbol_coverage.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:CanvasNodePortHandle:port-compatibility-hint-coverage:452'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
