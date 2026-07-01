-- Complete the Canvas node port tokenization manifest after the feature
-- mechanization implementation gate required explicit Cypress coverage and
-- allowed-surface coverage for the shared theme token file.

update planning_query_store.feature_mechanization_local_rails
set
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from jsonb_array_elements_text(
      coalesce(allowed_implementation_surfaces, '[]'::jsonb)
      || jsonb_build_array('apps/web/src/styles/theme.css')
    ) as refs(value)
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      coalesce(raw_manifest, '{}'::jsonb),
      '{allowedImplementationSurfaces}',
      (
        select jsonb_agg(distinct value order by value)
        from jsonb_array_elements_text(
          coalesce(raw_manifest->'allowedImplementationSurfaces', '[]'::jsonb)
          || jsonb_build_array('apps/web/src/styles/theme.css')
        ) as refs(value)
      ),
      true
    ),
    '{symbols}',
    (
      select jsonb_agg(
        case
          when symbol->>'path' = 'apps/web/src/styles/theme.css'
            and symbol->>'name' like '--canvas-node-port-%'
          then symbol || jsonb_build_object(
            'cypressCoverage',
            jsonb_build_array(
              'apps/web/cypress/e2e/canvas/canvas-dbt-author-code-run-live.cy.ts',
              'apps/web/cypress/e2e/canvas/canvas-happy-path-draggable.cy.ts'
            )
          )
          else symbol
        end
        order by symbol->>'path', symbol->>'name'
      )
      from jsonb_array_elements(coalesce(raw_manifest->'symbols', '[]'::jsonb)) as symbols(symbol)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/404_canvas_node_port_design_token_manifest_completion.sql',
  source_content_sha256 = md5('E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:port-design-token-manifest-completion:404'),
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1'
  and rail_name = 'RenderCanvasNodePortHandle';
