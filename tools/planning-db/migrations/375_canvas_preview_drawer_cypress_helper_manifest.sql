-- Register the Cypress helper symbol added to keep PreviewExecutionPlan
-- browser proofs independent from persisted drawer state.

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
      'pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-preview-run-rejections.cy.ts'
    ) as symbol_manifest
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb))
      union all
      select helper_symbol.symbol_ref
      from helper_symbol
    ) refs(value)
  ),
  implementation_refs = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb))
      union all
      values
        ('apps/web/cypress/e2e/canvas/canvas-preview-run-rejections.cy.ts'),
        ('tools/planning-db/migrations/375_canvas_preview_drawer_cypress_helper_manifest.sql')
    ) refs(value)
  ),
  allowed_implementation_surfaces = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb))
      union all
      values
        ('apps/web/cypress/e2e/canvas/canvas-preview-run-rejections.cy.ts'),
        ('tools/planning-db/migrations/375_canvas_preview_drawer_cypress_helper_manifest.sql')
    ) surfaces(value)
  ),
  completion_gate = (
    select jsonb_agg(distinct value order by value)
    from (
      select value
      from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb))
      union all
      values
        ('pnpm --filter @dvt/web test:e2e:native -- --spec cypress/e2e/canvas/canvas-preview-run-rejections.cy.ts'),
        ('pnpm docs:feature-mechanization:implementation')
    ) gates(value)
  ),
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
          union all
          select helper_symbol.symbol_manifest
          from helper_symbol
        ) candidate_symbols(symbol_value)
      ) manifest_symbols(symbol_value)
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/375_canvas_preview_drawer_cypress_helper_manifest.sql',
  source_content_sha256 = md5('CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628:revealOperationalDrawer:375'),
  revision = rail.revision + 1,
  updated_at = now()
from helper_symbol
where rail.feature_id = 'CANVAS-CONTEXT-MENU-PRESENTER-SRP-SPLIT-20260628'
  and rail.rail_name = 'ResolveCanvasContextMenu';
