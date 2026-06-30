-- Complete CanvasAddNodeCatalog feature mechanization with explicit red/green
-- evidence cycles. Migration 363 registered symbols and surfaces; this
-- migration adds the required test-driven proof metadata.

update planning_query_store.feature_mechanization_local_rails
set
  raw_manifest = jsonb_set(
    raw_manifest,
    '{redGreenCycles}',
    jsonb_build_array(
      jsonb_build_object(
        'id', 'canvas-add-node-catalog-model-invariants',
        'redTest', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts',
        'expectedFailure', 'Catalog model test fails before category mapping, duplicate rejection, filter subset, and filter idempotence are implemented.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.ts',
          'apps/web/src/app/views/canvas/canvasAddNodeCatalogModel.test.ts'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:unit:run -- src/app/views/canvas/canvasAddNodeCatalogModel.test.ts'
      ),
      jsonb_build_object(
        'id', 'canvas-add-node-catalog-view-presentation',
        'redTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx',
        'expectedFailure', 'Presentation test fails before the catalog renders searchable categories, descriptions, and semantic item selection.',
        'patchSurfaces', jsonb_build_array(
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.tsx',
          'apps/web/src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'
        ),
        'greenTest', 'pnpm --filter @dvt/web test:presentation:run -- src/app/views/canvas/CanvasAddNodeCatalogView.test.tsx'
      )
    ),
    true
  ),
  source_content_sha256 = md5(
    'CANVAS-ADD-NODE-CATALOG-20260628:red-green-cycles:364'
  ),
  revision = greatest(revision, 2),
  updated_at = now()
where rail_id = 'local#CANVAS-ADD-NODE-CATALOG-20260628#query#resolvecanvasaddnodecatalog';
