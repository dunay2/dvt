-- Preserve live Postgres row metrics for newly seeded/imported tables whose
-- pg_class.reltuples value is still -1 before ANALYZE has run. This keeps the
-- existing ListWarehouseConnectionTables rail authoritative instead of letting
-- Source Import regress to "Rows unknown" while the warehouse can report live
-- tuple statistics.

with implementation_refs(ref) as (
  values
    ('apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts'),
    ('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('tools/planning-db/migrations/551_source_import_postgres_live_tuple_fallback.sql')
),
architecture_guards(ref) as (
  values
    ('apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'),
    ('apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts'),
    ('scripts/planning-db-migrate.test.cjs'),
    ('pnpm docs:feature-mechanization:implementation')
),
target_rails as (
  select *
  from planning_query_store.feature_mechanization_local_rails
  where feature_id in (
    'E-CANVAS-SOURCE-IMPORT-METADATA-PROBE-1',
    'E-CANVAS-ADD-SOURCE-LIVE-FLOW-1'
  )
),
merged as (
  select
    rail.rail_id,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.implementation_refs, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as implementation_refs,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.allowed_implementation_surfaces, '[]'::jsonb)
        || (select jsonb_agg(ref) from implementation_refs)
      ) as item(value)
    ) as allowed_surfaces,
    (
      select jsonb_agg(distinct value order by value)
      from jsonb_array_elements_text(
        coalesce(rail.architecture_guards, '[]'::jsonb)
        || (select jsonb_agg(ref) from architecture_guards)
      ) as item(value)
    ) as architecture_guards
  from target_rails rail
)
update planning_query_store.feature_mechanization_local_rails rail
set
  implementation_refs = merged.implementation_refs,
  allowed_implementation_surfaces = merged.allowed_surfaces,
  architecture_guards = merged.architecture_guards,
  raw_manifest = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          coalesce(rail.raw_manifest, '{}'::jsonb),
          '{implementationRefs}',
          merged.implementation_refs,
          true
        ),
        '{allowedImplementationSurfaces}',
        merged.allowed_surfaces,
        true
      ),
      '{architectureGuards}',
      merged.architecture_guards,
      true
    ),
    '{postgresLiveTupleFallback}',
    jsonb_build_object(
      'component', 'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
      'queryRail', 'ListWarehouseConnectionTables',
      'sqlFunction', 'pg_stat_get_live_tuples',
      'rootCause', 'pg_class.reltuples remains -1 on newly seeded local warehouse tables until ANALYZE runs',
      'userImpact', 'Source Import showed Rows unknown even though the live warehouse reported 3 tuples for public.source_1',
      'unitProof', 'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
      'browserProof', 'apps/web/cypress/e2e/canvas/canvas-source-import-live-clean.cy.ts',
      'noStub', true
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/551_source_import_postgres_live_tuple_fallback.sql',
  source_content_sha256 = md5('source-import-postgres-live-tuple-fallback:551:' || rail.rail_id),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from merged
where rail.rail_id = merged.rail_id;
