-- Complete the Canvas context-menu view-model feature manifest with explicit
-- Cypress coverage posture per symbol. The slice is a pure presenter/component
-- refactor, so browser coverage is intentionally not applicable and remains
-- covered by the existing context-menu E2E rail.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    raw_manifest,
    '{symbols}',
    (
      select jsonb_agg(
        symbol || jsonb_build_object(
          'cypressCoverage',
          coalesce(symbol->>'cypressCoverage', 'not_applicable:presentation_view_model_slice')
        )
        order by ordinal
      )
      from jsonb_array_elements(raw_manifest->'symbols') with ordinality as symbols(symbol, ordinal)
    )
  ),
  source_path = 'tools/planning-db/migrations/343_canvas_context_menu_view_model_symbol_cypress_coverage.sql',
  source_content_sha256 = md5(
    'E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1:ResolveCanvasContextMenu:viewmodel-symbol-cypress:343'
  ),
  revision = 2,
  updated_at = now()
where rail_id = 'local#E-CANVAS-COMPONENT-PRESENTATION-SYSTEM-1#query#resolvecanvascontextmenu#viewmodel';
