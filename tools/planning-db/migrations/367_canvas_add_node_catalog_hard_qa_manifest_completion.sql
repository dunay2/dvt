-- Complete the CanvasAddNodeCatalog hard-QA manifest after Source Import and
-- duplicate-label reconciliation. Migration 366 registered the behavior; this
-- migration completes the feature-mechanization symbol evidence shape.

with symbol_ref_patch as (
  select jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx#selectCanvasCatalogAction',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts#catalogActionItem'
  ) as refs
),
symbol_patch as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'countDuplicateVisibleLabels',
      'path', 'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts'),
      'fowlerSignals', jsonb_build_array('no_duplicate_visible_actions', 'catalog_item_disambiguation'),
      'cypressCoverage', 'covered by catalog unit/presentation tests before browser source-import flow',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'visibleLabelKey',
      'path', 'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts'),
      'fowlerSignals', jsonb_build_array('no_duplicate_visible_actions', 'catalog_item_disambiguation'),
      'cypressCoverage', 'covered by catalog unit/presentation tests before browser source-import flow',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'CanvasContextMenuSourceImportCatalogAction',
      'path', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts'),
      'fowlerSignals', jsonb_build_array('source_import_catalog_entry', 'source_import_not_root_canvas_action'),
      'cypressCoverage', 'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'selectCanvasCatalogAction',
      'path', 'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx'),
      'fowlerSignals', jsonb_build_array('catalog_selection_dispatch', 'source_import_catalog_entry'),
      'cypressCoverage', 'node tools/ci/run-web-cypress-native.mjs --spec cypress/e2e/canvas/canvas-source-import-contextual.cy.ts',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'catalogActionItem',
      'path', 'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts'),
      'fowlerSignals', jsonb_build_array('catalog_view_model_item', 'source_import_catalog_entry'),
      'cypressCoverage', 'covered by catalog unit/presentation tests before browser source-import flow',
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    )
  ) as refs
),
surface_patch as (
  select jsonb_build_array(
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.ts',
    'apps/web/src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'tools/planning-db/migrations/367_canvas_add_node_catalog_hard_qa_manifest_completion.sql'
  ) as refs
),
focused_tests as (
  select jsonb_build_array(
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts src/app/views/canvas/canvasInteractionCommandSurface.test.ts src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx'
  ) as refs
),
current_rail as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_id = 'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog'
),
normalized_existing_symbols as (
  select
    current_rail.rail_id,
    coalesce(
      jsonb_agg(
        case
          when symbol ->> 'name' in (
            'CanvasAddNodeCatalogAction',
            'resolveCanvasAddNodeCatalogVisibleLabel',
            'CanvasContextMenuCatalogAction'
          )
            then symbol || jsonb_build_object(
              'cypressCoverage',
              'covered by catalog unit/presentation tests before browser source-import flow'
            )
          else symbol
        end
        order by ordinal
      ),
      '[]'::jsonb
    ) as symbols
  from current_rail
  left join lateral jsonb_array_elements(coalesce(current_rail.raw_manifest -> 'symbols', '[]'::jsonb))
    with ordinality as existing(symbol, ordinal) on true
  group by current_rail.rail_id
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb) || symbol_ref_patch.refs) as item(value)
    ) as symbol_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.implementation_refs, '[]'::jsonb) || surface_patch.refs) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb) || surface_patch.refs) as item(value)
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb) || focused_tests.refs) as item(value)
    ) as completion_gate,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{symbols}',
          normalized_existing_symbols.symbols || symbol_patch.refs
        ),
        '{allowedImplementationSurfaces}',
        (
          select jsonb_agg(distinct value order by value)
          from jsonb_array_elements_text(
            coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) ||
              surface_patch.refs
          ) as item(value)
        )
      ),
      '{completionGate}',
      (
        select jsonb_agg(distinct value order by value)
        from jsonb_array_elements_text(
          coalesce(rail.raw_manifest -> 'completionGate', '[]'::jsonb) || focused_tests.refs
        ) as item(value)
      )
    ) as raw_manifest
  from current_rail rail
  join normalized_existing_symbols on normalized_existing_symbols.rail_id = rail.rail_id
  cross join symbol_ref_patch
  cross join symbol_patch
  cross join surface_patch
  cross join focused_tests
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_implementation_surfaces,
  completion_gate = merged.completion_gate,
  source_path = 'tools/planning-db/migrations/367_canvas_add_node_catalog_hard_qa_manifest_completion.sql',
  source_content_sha256 = md5('CANVAS-ADD-NODE-CATALOG-20260628:ResolveCanvasAddNodeCatalog:367'),
  raw_manifest = merged.raw_manifest,
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
