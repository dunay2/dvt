-- Complete evidence fields for schema-identity symbols added after migration
-- 512 was already applied in local development. Fresh databases receive the
-- same fields from 512; this keeps already-migrated DBs aligned.

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview')
),
patched as (
  select
    rail.rail_id,
    jsonb_agg(
      case
        when symbol.value ->> 'name' = 'SourceImportSchemaIdentity'
          and symbol.value ->> 'path' = 'apps/web/src/app/components/sourceImportWizard/types.ts'
        then symbol.value || jsonb_build_object(
          'architectureGuard',
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
        )
        when symbol.value ->> 'name' = 'buildSourceImportSchemaKey'
          and symbol.value ->> 'path' =
            'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts'
        then symbol.value || jsonb_build_object(
          'architectureGuard',
          'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx',
          'cypressCoverage',
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
        )
        when symbol.value ->> 'name' = 'toggleSourceImportSchemaSelection'
          and symbol.value ->> 'path' =
            'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts'
        then symbol.value || jsonb_build_object(
          'architectureGuard',
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts',
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
    'source-import-schema-identity-evidence-completion:513:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
