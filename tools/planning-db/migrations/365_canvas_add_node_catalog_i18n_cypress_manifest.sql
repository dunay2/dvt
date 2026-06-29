-- Extend the CanvasAddNodeCatalog feature manifest with the i18n-safe Cypress
-- interaction helper and browser proof. Migration 363 introduced the feature;
-- this migration records the later user-flow evidence without mutating an
-- already-applied migration file.

with extra_symbol_refs as (
  select jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts#CanvasMenuLabel',
    'apps/web/cypress/support/canvasExecutionSelection.ts#clickCanvasContextMenuItem'
  ) as refs
),
extra_surfaces as (
  select jsonb_build_array(
    'apps/web/cypress/support/canvasExecutionSelection.ts',
    'apps/web/cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts',
    'tools/planning-db/migrations/365_canvas_add_node_catalog_i18n_cypress_manifest.sql'
  ) as refs
),
extra_symbols as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'CanvasMenuLabel',
      'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array(
        'apps/web/cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts'
      ),
      'fowlerSignals', jsonb_build_array(
        'i18n_safe_user_flow',
        'semantic_context_menu_interaction'
      ),
      'cypressCoverage', 'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'clickCanvasContextMenuItem',
      'path', 'apps/web/cypress/support/canvasExecutionSelection.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array(
        'apps/web/cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts'
      ),
      'fowlerSignals', jsonb_build_array(
        'i18n_safe_user_flow',
        'semantic_context_menu_interaction'
      ),
      'cypressCoverage', 'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    )
  ) as refs
),
browser_flow as (
  select jsonb_build_array(
    'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts'
  ) as refs
),
completion_gate as (
  select jsonb_build_array(
    'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-preview-run-authoring.cy.ts',
    'pnpm docs:feature-mechanization:implementation'
  ) as refs
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb) || extra_symbol_refs.refs) as item(value)
    ) as symbol_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb) || extra_surfaces.refs) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb) || extra_surfaces.refs) as item(value)
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.architecture_guards, '[]'::jsonb) || browser_flow.refs) as item(value)
    ) as architecture_guards,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb) || completion_gate.refs) as item(value)
    ) as completion_gate,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(rail.raw_manifest, '{}'::jsonb),
            '{allowedImplementationSurfaces}',
            (
              select jsonb_agg(distinct value order by value)
              from jsonb_array_elements_text(
                coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) ||
                  extra_surfaces.refs
              ) as item(value)
            )
          ),
          '{symbols}',
          coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || extra_symbols.refs
        ),
        '{cypressFlows}',
        (
          select jsonb_agg(distinct value order by value)
          from jsonb_array_elements_text(
            coalesce(rail.raw_manifest -> 'cypressFlows', '[]'::jsonb) || browser_flow.refs
          ) as item(value)
        )
      ),
      '{completionGate}',
      (
        select jsonb_agg(distinct value order by value)
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest -> 'completionGate', '[]'::jsonb) || completion_gate.refs
        ) as item(value)
      )
    ) as raw_manifest
  from planning_query_store.feature_mechanization_local_rails rail
  cross join extra_symbol_refs
  cross join extra_surfaces
  cross join extra_symbols
  cross join browser_flow
  cross join completion_gate
  where rail.rail_id = 'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_implementation_surfaces,
  architecture_guards = merged.architecture_guards,
  completion_gate = merged.completion_gate,
  source_path = 'tools/planning-db/migrations/365_canvas_add_node_catalog_i18n_cypress_manifest.sql',
  source_content_sha256 = md5('CANVAS-ADD-NODE-CATALOG-20260628:ResolveCanvasAddNodeCatalog:365'),
  raw_manifest = merged.raw_manifest,
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
