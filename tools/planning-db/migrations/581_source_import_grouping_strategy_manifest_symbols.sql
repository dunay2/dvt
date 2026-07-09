-- Declare the Source Import grouping-strategy symbols introduced by migration
-- 580 in the existing ImportWarehouseSources feature manifest. The
-- implementation gate reads raw_manifest.symbols; this migration keeps the
-- symbol catalog DB-first without creating a new command/query rail.

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
        'name', 'SUPPORTED_SOURCE_IMPORT_GROUPINGS',
        'path', 'apps/api/src/application/ports/warehouseSourceImport.ts',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'closed source import grouping value set',
          'unsupported strategy must fail closed before write side effects'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
      )
    ),
    (
      jsonb_build_object(
        'name', 'isSupportedSourceImportGrouping',
        'path', 'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts',
        'dddOwner', 'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'HTTP adapter validates against the port-owned grouping value set',
          'unsupported strategy does not reach workspace writes'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts')
      )
    ),
    (
      jsonb_build_object(
        'name', 'SUPPORTED_SOURCE_IMPORT_GROUPINGS',
        'path', 'apps/web/src/app/ports/workspace.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'web port mirrors ImportWarehouseSources grouping contract',
          'UI cannot invent unavailable grouping semantics'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
        )
      )
    ),
    (
      jsonb_build_object(
        'name', 'SourceImportGrouping',
        'path', 'apps/web/src/app/ports/workspace.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'web port type is generated from the supported grouping value set',
          'unsupported grouping cannot be represented by the public web port type'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
        )
      )
    ),
    (
      jsonb_build_object(
        'name', 'SOURCE_IMPORT_GROUPING_STRATEGIES',
        'path', 'apps/web/src/app/components/sourceImportWizard/types.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'wizard state uses a closed grouping value set',
          'source import grouping options remain DB-backed and finite'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
        )
      )
    ),
    (
      jsonb_build_object(
        'name', 'SourceImportGroupingStrategy',
        'path', 'apps/web/src/app/components/sourceImportWizard/types.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'wizard state type is derived from the supported grouping value set',
          'unsupported grouping cannot be selected by presentation state'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array(
          'apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx',
          'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts'
        )
      )
    ),
    (
      jsonb_build_object(
        'name', 'GROUPING_OPTIONS',
        'path', 'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'presentation options are derived from the finite grouping strategy catalog',
          'custom grouping is not advertised before a governed value object exists'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'GroupingOption',
        'path', 'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'presentation option contract names the supported grouping value object',
          'copy and selection state cannot drift independently'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'isSourceImportGroupingStrategy',
        'path', 'apps/web/src/app/components/sourceImportWizard/GroupingStep.tsx',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'presentation adapter rejects unsupported grouping values',
          'radix radio change cannot inject a non-catalog grouping strategy'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/GroupingStep.test.tsx')
      )
    ),
    (
      jsonb_build_object(
        'name', 'sourceImportGroupingValue',
        'path', 'apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.ts',
        'dddOwner', 'SYS-WEB-CANVAS-SOURCE-IMPORT-WIZARD-STEPS',
        'cqRails', jsonb_build_array('ImportWarehouseSources'),
        'fowlerSignals', jsonb_build_array(
          'registry path model fails closed for unsupported grouping',
          'unsupported grouping is not aliased to schema semantics'
        ),
        'architectureGuard', 'scripts/planning-db-migrate.test.cjs',
        'cypressCoverage', 'scripts/run-canvas-source-import-live-proof.cjs',
        'unitTests', jsonb_build_array('apps/web/src/app/components/sourceImportWizard/sourceImportWizardModel.test.ts')
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
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.manifest_symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/581_source_import_grouping_strategy_manifest_symbols.sql',
  source_content_sha256 = md5('ImportWarehouseSources:source-import-grouping-strategy-manifest-symbols:581'),
  revision = rails.revision + 1,
  updated_at = now()
from patched
where rails.rail_id = patched.rail_id;
