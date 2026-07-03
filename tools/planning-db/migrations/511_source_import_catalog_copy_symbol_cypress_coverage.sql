-- Backfill Cypress coverage evidence onto Source Import catalog copy symbols
-- that are exposed through feature-mechanization-symbols.

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#listwarehouseconnectiontables'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources')
),
patched as (
  select
    rail.rail_id,
    jsonb_agg(
      case
        when symbol.value ->> 'path' in (
          'apps/web/src/app/components/sourceImportWizard/copy.ts',
          'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
        )
        and symbol.value ->> 'name' in (
          'sourceImportWizardCopy.catalog',
          'sourceImportCatalogNumberFormatter',
          'SourceImportCatalogCopy'
        )
        then symbol.value || jsonb_build_object(
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
        )
        else symbol.value
      end
      order by symbol.value ->> 'path', symbol.value ->> 'name'
    ) as manifest_symbols
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rails
    on target_rails.rail_id = rail.rail_id
  cross join lateral jsonb_array_elements(
    coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)
  ) symbol(value)
  group by rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5(
    'source-import-catalog-copy-symbol-cypress-coverage:511:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
