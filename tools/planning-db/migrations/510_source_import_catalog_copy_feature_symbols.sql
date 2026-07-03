-- Complete feature-mechanization symbol visibility for the Source Import
-- catalog copy-token contract. Migration 509 registered component ownership;
-- this migration makes the symbols visible through feature-mechanization-symbols.

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-SEARCH-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#query#listwarehouseconnectiontables'),
    ('local#E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1#command#importwarehousesources')
),
new_symbols(value) as (
  values
    (
      jsonb_build_object(
        'name', 'sourceImportWizardCopy.catalog',
        'path', 'apps/web/src/app/components/sourceImportWizard/copy.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_copy_contract', 'no_model_copy_literals'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'sourceImportCatalogNumberFormatter',
        'path', 'apps/web/src/app/components/sourceImportWizard/copy.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('presentation_formatting_contract', 'locale_boundary'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts'),
        'presentationTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'SourceImportCatalogCopy',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
        'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
        'fowlerSignals', jsonb_build_array('read_model_dependency_contract', 'copy_injection'),
        'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
      )
    )
),
new_symbol_refs(ref) as (
  values
    ('apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportWizardCopy.catalog'),
    ('apps/web/src/app/components/sourceImportWizard/copy.ts#sourceImportCatalogNumberFormatter'),
    ('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportCatalogCopy')
),
patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(value order by value ->> 'path', value ->> 'name')
      from (
        select distinct on (value ->> 'path', value ->> 'name') value
        from (
          select existing.value
          from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
          union all
          select new_symbols.value
          from new_symbols
        ) combined
        order by value ->> 'path', value ->> 'name'
      ) deduped
    ) as manifest_symbols,
    (
      select jsonb_agg(to_jsonb(ref) order by ref)
      from (
        select distinct existing.ref
        from jsonb_array_elements_text(coalesce(rail.symbol_refs, '[]'::jsonb)) existing(ref)
        union
        select ref from new_symbol_refs
      ) refs
    ) as symbol_refs
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rails
    on target_rails.rail_id = rail.rail_id
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched.symbol_refs,
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5(
    'source-import-catalog-copy-feature-symbols:510:' || rail.rail_id
  ),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
