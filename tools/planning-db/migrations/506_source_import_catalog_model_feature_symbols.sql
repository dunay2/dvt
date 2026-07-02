-- Declare the extracted Source Import catalog read-model file in the existing
-- RenderSourceImportCatalogView feature-mechanization rails. This keeps the
-- DB-first catalog authoritative after moving the catalog query model out of
-- sourceImportWizardModel.ts.

with target_rails(rail_id) as (
  values
    ('local#E-CANVAS-ADD-SOURCE-CATALOG-CATEGORIES-1#query#rendersourceimportcatalogview'),
    ('local#E-CANVAS-ADD-SOURCE-INSPECT-SELECT-1#query#rendersourceimportcatalogview')
),
new_symbol_refs as (
  select jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportCatalogViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportColumnViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportDatabaseGroupViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportSchemaGroupViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#SourceImportTableViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportCatalogViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportSchemaGroup',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildSourceImportTableViewModel',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#buildWarehouseTableKey',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatNumber',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatSourceImportByteSize',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatSourceImportColumnCount',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatSourceImportNullability',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatSourceImportRowCount',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatSourceImportSchemaCount',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#formatSourceImportTableCount',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#normalizeCatalogSearchValue',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts#tableMatchesSourceImportSearch'
  ) as refs
),
new_surfaces as (
  select jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
    'tools/planning-db/migrations/505_source_import_catalog_model_ownership.sql',
    'tools/planning-db/migrations/506_source_import_catalog_model_feature_symbols.sql'
  ) as surfaces
),
new_guards as (
  select jsonb_build_array(
    'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
    'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'
  ) as guards
),
new_completion_tests as (
  select jsonb_build_array(
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
    'pnpm --filter @dvt/web exec vitest run --config vitest.architecture.config.ts src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts'
  ) as tests
),
new_symbols as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'SourceImportCatalogViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_contract', 'single_responsibility'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'SourceImportColumnViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_contract', 'column_metadata_projection'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'SourceImportDatabaseGroupViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_contract', 'categorized_catalog'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'SourceImportSchemaGroupViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_contract', 'categorized_catalog'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'SourceImportTableViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_contract', 'table_metadata_projection'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'buildSourceImportCatalogViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_projection', 'pure_function'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'buildSourceImportSchemaGroup',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_projection', 'private_helper'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'buildSourceImportTableViewModel',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('read_model_projection', 'pure_function'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/SourceImportCatalogView.architecture.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'buildWarehouseTableKey',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('value_object_identity', 'pure_function'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatNumber',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('presentation_formatting', 'private_helper'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatSourceImportByteSize',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('presentation_formatting', 'real_metadata'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatSourceImportColumnCount',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('presentation_formatting'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatSourceImportNullability',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('column_metadata_projection'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatSourceImportRowCount',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('presentation_formatting', 'real_metadata'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatSourceImportSchemaCount',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('presentation_formatting', 'categorized_catalog'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'formatSourceImportTableCount',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('presentation_formatting', 'categorized_catalog'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'normalizeCatalogSearchValue',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('search_normalization', 'private_helper'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    ),
    jsonb_build_object(
      'name', 'tableMatchesSourceImportSearch',
      'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.ts',
      'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-CATALOG-VIEW',
      'cqRails', jsonb_build_array('RenderSourceImportCatalogView'),
      'fowlerSignals', jsonb_build_array('catalog_search_projection', 'private_helper'),
      'architectureGuard', 'apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportCatalogModel.test.ts')
    )
  ) as symbols
),
patched_rails as (
  select
    rail.rail_id,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.symbol_refs, '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_symbol_refs.refs) as added(value)
      ) merged
    ) as symbol_refs,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.implementation_refs, '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_surfaces.surfaces) as added(value)
      ) merged
    ) as implementation_refs,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_surfaces.surfaces) as added(value)
      ) merged
    ) as allowed_implementation_surfaces,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.architecture_guards, '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_guards.guards) as added(value)
      ) merged
    ) as architecture_guards,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_symbols.symbols) as added(value)
      ) merged
    ) as manifest_symbols,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.raw_manifest -> 'allowedImplementationSurfaces', '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_surfaces.surfaces) as added(value)
      ) merged
    ) as manifest_allowed_surfaces,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.raw_manifest -> 'architectureGuards', '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_guards.guards) as added(value)
      ) merged
    ) as manifest_architecture_guards,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.raw_manifest -> 'completionGate', '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_completion_tests.tests) as added(value)
      ) merged
    ) as manifest_completion_gate,
    (
      select jsonb_agg(value order by value)
      from (
        select distinct value
        from jsonb_array_elements(coalesce(rail.completion_gate -> 'tests', '[]'::jsonb)) as existing(value)
        union
        select value
        from jsonb_array_elements(new_completion_tests.tests) as added(value)
      ) merged
    ) as completion_tests
  from planning_query_store.feature_mechanization_local_rails rail
  join target_rails
    on target_rails.rail_id = rail.rail_id
  cross join new_symbol_refs
  cross join new_surfaces
  cross join new_guards
  cross join new_completion_tests
  cross join new_symbols
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = patched_rails.symbol_refs,
  implementation_refs = patched_rails.implementation_refs,
  allowed_implementation_surfaces = patched_rails.allowed_implementation_surfaces,
  architecture_guards = patched_rails.architecture_guards,
  completion_gate = jsonb_set(
    coalesce(rail.completion_gate, '{}'::jsonb),
    '{tests}',
    coalesce(patched_rails.completion_tests, '[]'::jsonb),
    true
  ),
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{symbols}',
          coalesce(patched_rails.manifest_symbols, '[]'::jsonb),
          true
        ),
        '{allowedImplementationSurfaces}',
        coalesce(patched_rails.manifest_allowed_surfaces, '[]'::jsonb),
        true
      ),
      '{architectureGuards}',
      coalesce(patched_rails.manifest_architecture_guards, '[]'::jsonb),
      true
    ),
    '{completionGate}',
    coalesce(patched_rails.manifest_completion_gate, '[]'::jsonb),
    true
  ),
  source_content_sha256 = md5('source-import-catalog-model-feature-symbols:506:' || rail.rail_id),
  revision = rail.revision + 1,
  updated_at = now()
from patched_rails
where rail.rail_id = patched_rails.rail_id;
