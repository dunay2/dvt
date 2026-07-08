-- Keep the CreateWarehouseConnection feature mechanization manifest aligned with
-- the provider catalog exports. The implementation guard reads raw_manifest.symbols
-- for declared code symbols, while symbol_refs powers rail queries; both must carry
-- the same public contract symbols.

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1'
    and rail_name = 'CreateWarehouseConnection'
),
new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name', 'SUPPORTED_WAREHOUSE_CONNECTION_TYPES',
        'path', 'apps/web/src/app/ports/workspace.ts',
        'dddOwner', 'Workspace Source Import',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('Shared provider catalog', 'No duplicated UI literal'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'WarehouseConnectionType',
        'path', 'apps/web/src/app/ports/workspace.ts',
        'dddOwner', 'Workspace Source Import',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('Type derives from provider catalog', 'No aspirational vendor union'),
        'architectureGuard', 'apps/web/src/app/components/SourceImportWizard.architecture.test.tsx',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'SUPPORTED_WAREHOUSE_CONNECTION_TYPES',
        'path', 'apps/api/src/application/ports/warehouseSourceImport.ts',
        'dddOwner', 'Workspace Source Import',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('Shared provider catalog', 'Runtime parser owns supported providers'),
        'architectureGuard', 'apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
      )
    ),
    (
      jsonb_build_object(
        'name', 'WarehouseConnectionType',
        'path', 'apps/api/src/application/ports/warehouseSourceImport.ts',
        'dddOwner', 'Workspace Source Import',
        'cqRails', jsonb_build_array('CreateWarehouseConnection'),
        'fowlerSignals', jsonb_build_array('Type derives from provider catalog', 'No unsupported provider command surface'),
        'architectureGuard', 'apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
      )
    )
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(symbol order by symbol->>'path', symbol->>'name')
      from (
        select existing.symbol
        from jsonb_array_elements(coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)) existing(symbol)
        where not (
          existing.symbol->>'name' = ('supported' || 'Warehouse' || 'Connection' || 'Types')
          and existing.symbol->>'path' = 'apps/web/src/app/components/sourceImportWizard/WarehouseConnectionCreateForm.tsx'
        )
        union
        select symbol from new_symbols
      ) symbols
    ) as symbols
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/562_source_import_provider_catalog_manifest_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:provider-catalog-manifest-symbols:562'),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
