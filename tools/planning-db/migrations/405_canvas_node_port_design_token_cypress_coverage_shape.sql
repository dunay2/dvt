-- Normalize Canvas node port design-token symbol evidence to the manifest
-- shape enforced by check-feature-mechanization: cypressCoverage is a single
-- non-empty string, while unitTests remains the array evidence field.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    coalesce(raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when symbol->>'path' = 'apps/web/src/styles/theme.css'
            and symbol->>'name' like '--canvas-node-port-%'
          then symbol || jsonb_build_object(
            'cypressCoverage',
            'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts'
          )
          else symbol
        end
        order by ordinal
      )
      from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb))
        with ordinality as symbols(symbol, ordinal)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/405_canvas_node_port_design_token_cypress_coverage_shape.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:port-design-token-cypress-coverage-shape:405'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
