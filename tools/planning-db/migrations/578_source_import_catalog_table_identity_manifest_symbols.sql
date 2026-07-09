-- The implementation guard reads raw_manifest.symbols for newly exported code
-- symbols. Migration 577 registered the table identity symbols in symbol_refs
-- for rail queries; this migration aligns the feature manifest itself without
-- changing the already-applied component/file ownership evidence.

with target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1'
    and rail_name = 'RenderSourceImportCatalogView'
),
new_symbols(symbol) as (
  values (
    jsonb_build_object(
      'name', 'buildWarehouseTableIdentityKey',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array(
        'structured source table identity',
        'display text is not selection authority',
        'database.schema.table collisions remain selectable'
      ),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
      'unitTests', jsonb_build_array(
        'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
      )
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
    ) as manifest_symbols
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/578_source_import_catalog_table_identity_manifest_symbols.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1:RenderSourceImportCatalogView:table-identity-manifest-symbols:578'),
  revision = rails.revision + 1,
  updated_at = now()
from patched
where rails.rail_id = patched.rail_id;
