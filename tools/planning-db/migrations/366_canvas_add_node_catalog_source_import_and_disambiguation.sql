-- Reconcile CanvasAddNodeCatalog after hard QA: Source Import remains a
-- categorized catalog action, and duplicate visible labels are disambiguated.

with extra_symbol_refs as (
  select jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#CanvasAddNodeCatalogAction',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#countDuplicateVisibleLabels',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#resolveCanvasAddNodeCatalogVisibleLabel',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts#visibleLabelKey',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#CanvasContextMenuCatalogAction',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts#CanvasContextMenuSourceImportCatalogAction'
  ) as refs
),
extra_surfaces as (
  select jsonb_build_array(
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
    'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.tsx',
    'apps/web/src/app/views/canvas/CanvasContextMenuView.test.tsx',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
    'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts',
    'tools/planning-db/migrations/366_canvas_add_node_catalog_source_import_and_disambiguation.sql'
  ) as refs
),
extra_symbols as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'CanvasAddNodeCatalogAction',
      'path', 'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts'),
      'fowlerSignals', jsonb_build_array('catalog_action_not_node_kind_only', 'source_import_catalog_entry'),
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'resolveCanvasAddNodeCatalogVisibleLabel',
      'path', 'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts'),
      'fowlerSignals', jsonb_build_array('no_duplicate_visible_actions', 'catalog_item_disambiguation'),
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    ),
    jsonb_build_object(
      'name', 'CanvasContextMenuCatalogAction',
      'path', 'apps/web/src/app/views/canvas/canvasInteractionCommandSurface.ts',
      'cqRails', jsonb_build_array('ResolveCanvasAddNodeCatalog'),
      'dddOwner', 'web.component.canvas.CanvasAddNodeCatalog',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/canvasInteractionCommandSurface.test.ts'),
      'fowlerSignals', jsonb_build_array('catalog_action_union', 'source_import_not_root_canvas_action'),
      'architectureGuard', 'pnpm docs:feature-mechanization:implementation'
    )
  ) as refs
),
focused_tests as (
  select jsonb_build_array(
    'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts src/app/views/canvas/canvasInteractionCommandSurface.test.ts src/app/views/canvas/canvasContextMenuViewModel.test.ts',
    'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasContextMenuView.test.tsx src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx src/app/views/canvas/useCanvasContextMenuPresenter.graphActions.test.tsx'
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
      from jsonb_array_elements_text(coalesce(rail.completion_gate, '[]'::jsonb) || focused_tests.refs) as item(value)
    ) as completion_gate,
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            coalesce(rail.raw_manifest, '{}'::jsonb),
            '{symbols}',
            coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb) || extra_symbols.refs
          ),
          '{allowedImplementationSurfaces}',
          (
            select jsonb_agg(distinct value order by value)
            from jsonb_array_elements_text(
              coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb) ||
                extra_surfaces.refs
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
      ),
      '{hardQaFindingsResolved}',
      jsonb_build_array(
        'source_import_is_catalog_item_not_background_action',
        'duplicate_visible_catalog_labels_are_disambiguated'
      )
    ) as raw_manifest
  from planning_query_store.feature_mechanization_local_rails rail
  cross join extra_symbol_refs
  cross join extra_surfaces
  cross join extra_symbols
  cross join focused_tests
  where rail.rail_id = 'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_implementation_surfaces,
  completion_gate = merged.completion_gate,
  source_path = 'tools/planning-db/migrations/366_canvas_add_node_catalog_source_import_and_disambiguation.sql',
  source_content_sha256 = md5('CANVAS-ADD-NODE-CATALOG-20260628:ResolveCanvasAddNodeCatalog:366'),
  raw_manifest = merged.raw_manifest,
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
