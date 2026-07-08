-- Keep the DB-first feature mechanization manifest aligned with the live
-- Source Import Cypress proof. The helper functions below are test-support
-- symbols for the existing AttachWarehouseSourceFromCanvasContext flow; they
-- do not introduce new command/query rails.

with new_symbols as (
  select jsonb_build_array(
    jsonb_build_object(
      'name', 'toStableYamlIdentifierPart',
      'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'dddOwner', 'CanvasSourceImportDialog',
      'cqRails', jsonb_build_array('AttachWarehouseSourceFromCanvasContext'),
      'fowlerSignals', jsonb_build_array('primitive_obsession', 'test_only_confidence'),
      'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
    ),
    jsonb_build_object(
      'name', 'expectedLivePostgresSourceName',
      'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'dddOwner', 'CanvasSourceImportDialog',
      'cqRails', jsonb_build_array(
        'AttachWarehouseSourceFromCanvasContext',
        'ImportWarehouseSources'
      ),
      'fowlerSignals', jsonb_build_array('hidden_authority', 'test_only_confidence'),
      'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts')
    ),
    jsonb_build_object(
      'name', 'createLivePostgresConnection',
      'path', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'dddOwner', 'CanvasSourceImportDialog',
      'cqRails', jsonb_build_array(
        'CreateWarehouseConnection',
        'TestWarehouseConnection',
        'ListWarehouseConnectionTables',
        'AttachWarehouseSourceFromCanvasContext'
      ),
      'fowlerSignals', jsonb_build_array('hidden_authority', 'test_only_confidence'),
      'architectureGuard', 'apps/web/src/app/views/canvas/CanvasSourceImportLiveProof.architecture.test.ts',
      'cypressCoverage', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'unitTests', jsonb_build_array('apps/web/src/app/components/SourceImportWizard.test.tsx')
    )
  ) as symbols
),
new_symbol_refs as (
  select jsonb_build_array(
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#toStableYamlIdentifierPart',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#expectedLivePostgresSourceName',
    'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts#createLivePostgresConnection'
  ) as refs
),
target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id = 'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.symbol_refs, '[]'::jsonb)
        || (select refs from new_symbol_refs)
      ) as item(value)
    ) as symbol_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
          'tools/planning-db/migrations/552_source_import_live_cypress_helper_symbols.sql'
        )
      ) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || jsonb_build_array(
          'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
          'tools/planning-db/migrations/552_source_import_live_cypress_helper_symbols.sql'
        )
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(symbol order by symbol->>'name')
      from (
        select distinct on (symbol->>'path', symbol->>'name') symbol
        from jsonb_array_elements(
          coalesce(rail.raw_manifest->'symbols', '[]'::jsonb)
          || (select symbols from new_symbols)
        ) as item(symbol)
        order by symbol->>'path', symbol->>'name'
      ) distinct_symbols
    ) as raw_symbols
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  symbol_refs = merged.symbol_refs,
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        coalesce(rail.raw_manifest, '{}'::jsonb),
        '{symbols}',
        merged.raw_symbols,
        true
      ),
      '{implementationRefs}',
      merged.implementation_refs,
      true
    ),
    '{allowedImplementationSurfaces}',
    merged.allowed_surfaces,
    true
  ),
  source_path = 'tools/planning-db/migrations/552_source_import_live_cypress_helper_symbols.sql',
  source_content_sha256 = md5('source-import-live-cypress-helper-symbols:552:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
