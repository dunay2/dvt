-- Complete the revealOperationalDrawer feature-mechanization symbol with the
-- architecture guard required by the implementation checker.

with helper_symbol as (
  select
    'apps/web/cypress/support/canvasExecutionSelection.ts#revealOperationalDrawer'::text
      as symbol_ref,
    jsonb_build_object(
      'name', 'revealOperationalDrawer',
      'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
      'cqRails', jsonb_build_array('PreviewExecutionPlan'),
      'dddOwner', 'web.component.canvas.RunPreviewSurface',
      'unitTests', jsonb_build_array(
        'apps/web/cypress/e2e/canvas/canvas-preview-run-rejections.cy.ts'
      ),
      'fowlerSignals', jsonb_build_array(
        'test_fixture_facade',
        'state_independent_browser_proof'
      ),
      'cypressCoverage',
      'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-preview-run-rejections.cy.ts',
      'architectureGuard',
      'pnpm docs:feature-mechanization:implementation'
    ) as symbol_manifest
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    (
      select jsonb_agg(symbol_value order by symbol_value::text)
      from (
        select distinct symbol_value
        from (
          select symbol_value
          from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) as symbols(symbol_value)
          where not (
            symbol_value->>'name' = 'revealOperationalDrawer'
            and symbol_value->>'path' = 'apps/web/cypress/support/canvasExecutionSelection.ts'
          )
          union all
          select helper_symbol.symbol_manifest
          from helper_symbol
        ) candidate_symbols(symbol_value)
      ) manifest_symbols(symbol_value)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/376_canvas_preview_drawer_cypress_helper_guard.sql',
  source_content_sha256 = md5('CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628:revealOperationalDrawer:376'),
  revision = rail.revision + 1,
  updated_at = now()
from helper_symbol
where rail.feature_id = 'CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628'
  and rail.rail_name = 'ResolveCanvasContextMenu';
