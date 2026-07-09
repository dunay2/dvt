-- Tighten the ImportWarehouseSources HTTP adapter contract: client-supplied
-- discovery metadata must be structurally valid even though the command uses
-- catalog-authoritative table metadata for writes.

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where rail_name = 'ImportWarehouseSources'
    and rail_type = 'command'
    and ddd_owner = 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase'
),
new_symbols(symbol) as (
  values
    (
      jsonb_build_object(
        'name', 'isNonNegativeFiniteNumber',
        'path', 'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'HTTP adapter rejects impossible source metadata before command execution',
          'client-supplied discovery metadata cannot weaken the source import command contract'
        ),
        'architectureGuard', 'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
      )
    )
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(symbol order by symbol ->> 'path', symbol ->> 'name')
      from (
        select distinct on (symbol ->> 'path', symbol ->> 'name') symbol
        from (
          select existing.symbol
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(symbol)
          union all
          select symbol from new_symbols
        ) symbols
        order by symbol ->> 'path', symbol ->> 'name'
      ) unique_symbols
    ) as manifest_symbols,
    (
      select jsonb_agg(ref order by ref)
      from (
        select distinct ref
        from (
          select existing.ref
          from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
          union all
          select (symbol ->> 'path') || '#' || (symbol ->> 'name') as ref
          from new_symbols
        ) refs
      ) unique_refs
    ) as symbol_refs
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rails
set
  symbol_refs = coalesce(patched.symbol_refs, '[]'::jsonb),
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb)
      || jsonb_build_array(
        'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
        'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts',
        'tools/planning-db/migrations/582_source_import_http_metadata_validation.sql'
      )
    ) as refs(ref)
  ),
  architecture_guards = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.architecture_guards, '[]'::jsonb)
      || jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
    ) as refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb)
      || jsonb_build_object(
        'httpMetadataValidation',
        jsonb_build_object(
          'invariant', 'ImportWarehouseSources rejects impossible client-supplied rowCount and byteSize metadata before workspace writes.',
          'negativeTest', 'warehouseSourceImportRoutes.test.ts rejects impossible client-supplied source metadata before import',
          'noNewRail', true
        )
      ),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/582_source_import_http_metadata_validation.sql',
  source_content_sha256 = md5('ImportWarehouseSources:http-metadata-validation:582'),
  revision = rails.revision + 1,
  updated_at = now()
from patched
where rails.rail_id = patched.rail_id;
