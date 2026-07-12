-- Keep browser and provider-boundary evidence scopes truthful. The live Cypress
-- flow proves successful metadata discovery; the denied-metadata fallback is a
-- provider adapter branch proved by its focused integration test.

update planning_query_store.feature_mechanization_local_rails rails
set
  raw_manifest = jsonb_set(
    jsonb_set(
      rails.raw_manifest,
      '{symbols}',
      (
        select jsonb_agg(
          symbol || jsonb_build_object(
            'cypressCoverage',
            'not_applicable: metadata-permission fallback is provider-boundary behavior covered by apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts; the successful discovery flow is covered by apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'
          )
          order by symbol ->> 'path', symbol ->> 'name'
        )
        from jsonb_array_elements(rails.raw_manifest -> 'symbols') symbols(symbol)
      ),
      true
    ),
    '{metadataPermissionFallbackEvidence}',
    jsonb_build_object(
      'scope', 'provider-adapter-negative-branch',
      'integrationTest', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'browserFlow', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'browserFlowProves', 'successful real Postgres discovery and source import',
      'browserFlowDoesNotClaim', 'provider metadata permission denial'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/604_source_metadata_fallback_evidence_scope.sql',
  source_content_sha256 = repeat(md5('E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1:evidence-scope:604'), 2),
  revision = rails.revision + 1,
  updated_at = now()
where rails.feature_id = 'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1'
  and rails.rail_name = 'ListWarehouseConnectionTables';

