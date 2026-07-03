-- Complete the DB-first CreateWarehouseConnection mechanization manifest after
-- owner reconciliation introduced symbols without the required cypressCoverage
-- field. These entries remain explicit about whether the proof is browser-level
-- or presentation-level support for the Add Source create-connection rail.

with patched as (
  select
    rail.rail_id,
    (
      select jsonb_agg(
        case
          when value ->> 'name' = 'supportedWarehouseConnectionTypes'
            then value || jsonb_build_object(
              'cypressCoverage',
              'not_applicable: supported adapter option projection is covered by SourceImportWizard presentation tests; the backend-backed Add Source browser proof remains apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
            )
          when value ->> 'name' = 'buildWarehouseSourceImportPort'
            then value || jsonb_build_object(
              'cypressCoverage',
              'not_applicable: source import test-harness port factory is covered by SourceImportWizard presentation-port tests, not a browser-only behavior'
            )
          when value ->> 'name' = 'mockConnections'
            then value || jsonb_build_object(
              'cypressCoverage',
              'not_applicable: workspace port double catalog is covered by SourceImportWizard presentation tests; the live browser source import path uses apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
            )
          else value
        end
        order by value ->> 'path', value ->> 'name'
      )
      from jsonb_array_elements(coalesce(rail.raw_manifest -> 'symbols', '[]'::jsonb)) existing(value)
    ) as symbols
  from planning_query_store.feature_mechanization_local_rails rail
  where rail.rail_id = 'local#E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1#command#createwarehouseconnection'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  raw_manifest = jsonb_set(
    coalesce(rail.raw_manifest, '{}'::jsonb),
    '{symbols}',
    coalesce(patched.symbols, '[]'::jsonb),
    true
  ),
  source_path = 'tools/planning-db/migrations/523_source_import_create_connection_cypress_coverage.sql',
  source_content_sha256 = md5('E-CANVAS-ADD-SOURCE-CREATE-CONNECTION-1:cypress-coverage:523'),
  revision = rail.revision + 1,
  updated_at = now()
from patched
where rail.rail_id = patched.rail_id;
