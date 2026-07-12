-- Keep column metadata aligned with the bounded set of importable objects.
-- A global row limit could silently truncate later objects and corrupt both
-- schema display and schema-width byte estimates.

update planning_query_store.feature_mechanization_local_rails rails
set
  implementation_refs = (
    select jsonb_agg(distinct ref order by ref)
    from jsonb_array_elements_text(
      coalesce(rails.implementation_refs, '[]'::jsonb)
        || jsonb_build_array(
          'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts',
          'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'
        )
    ) refs(ref)
  ),
  raw_manifest = jsonb_set(
    coalesce(rails.raw_manifest, '{}'::jsonb),
    '{sourceObjectMetricEvidence,columnCatalogScope}',
    jsonb_build_object(
      'boundedBy', 'the same 500 SELECT-authorized objects returned by discovery',
      'globalColumnRowLimit', false,
      'silentPartialMetadata', false,
      'invariant', 'Every discovered object receives all provider-visible columns before schema-width estimation.'
    ),
    true
  ),
  source_path = 'tools/planning-db/migrations/598_source_object_column_catalog_scope.sql',
  source_content_sha256 = md5('ListWarehouseConnectionTables:column-catalog-scope:598'),
  revision = rails.revision + 1,
  updated_at = now()
where rails.rail_name = 'ListWarehouseConnectionTables'
  and rails.rail_type = 'query';

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values (
  'TEST-WAREHOUSE-SOURCE-COLUMN-CATALOG-SCOPE',
  'SYS-API-INFRA-WAREHOUSE-SOURCES',
  'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
  'integration',
  'boundary',
  true,
  'pnpm --filter dvt-api exec vitest run test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
