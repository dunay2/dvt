-- Preserve DB-first retirement of the generic SourceImport aliases declared by
-- the provider-extensibility debt feature. Governance import can rehydrate that
-- historical plan as active SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT rows; the
-- command_query_rail_query canonical view only surfaces the retirement when all
-- imported active aliases are covered by local retired rows.

with alias_map(rail_name, rail_type, canonical_rail_name, canonical_owner, canonical_refs) as (
  values
    (
      'ListSourceImportConnections',
      'query',
      'ListWarehouseConnections',
      'Warehouse connection read model',
      jsonb_build_array(
        'GET /workspace/warehouse/connections',
        'apps/api/src/application/services/listWarehouseConnectionsUseCase.ts#ListWarehouseConnectionsUseCase',
        'apps/web/src/app/services/workspace/workspacePorts.api.ts#listWarehouseConnections'
      )
    ),
    (
      'ListSourceImportObjects',
      'query',
      'ListWarehouseConnectionTables',
      'api.component.warehouseSourceImport.WorkspaceWarehouseConnectionProbe',
      jsonb_build_array(
        'GET /workspace/warehouse/connections/:connectionId/tables',
        'apps/api/src/application/services/listWarehouseConnectionTablesUseCase.ts#ListWarehouseConnectionTablesUseCase',
        'apps/web/src/app/services/workspace/workspacePorts.api.ts#listWarehouseTables'
      )
    ),
    (
      'ImportSourceObjects',
      'command',
      'ImportWarehouseSources',
      'api.component.warehouseSourceImport.ImportWarehouseSourcesUseCase',
      jsonb_build_array(
        'POST /workspace/sources/import',
        'apps/api/src/application/services/importWarehouseSourcesUseCase.ts#ImportWarehouseSourcesUseCase',
        'apps/web/src/app/services/workspace/workspacePorts.api.ts#importSources'
      )
    ),
    (
      'CheckSourceImportProviderExtensibility',
      'query',
      'CreateWarehouseConnection',
      'Warehouse source import provider catalog policy',
      jsonb_build_array(
        'apps/api/src/application/ports/warehouseSourceImport.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES',
        'apps/web/src/app/ports/workspace.ts#SUPPORTED_WAREHOUSE_CONNECTION_TYPES',
        'apps/api/test/architecture/warehouseSourceImportRails.architecture.test.ts'
      )
    )
),
override_rows as (
  select
    concat(
      'SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT',
      '#',
      alias_map.rail_type,
      '#retired-source-import-alias#',
      lower(alias_map.rail_name)
    ) as rail_id,
    alias_map.rail_name,
    lower(alias_map.rail_name) as normalized_rail_name,
    alias_map.rail_type,
    alias_map.canonical_rail_name,
    alias_map.canonical_owner,
    alias_map.canonical_refs
  from alias_map
)
insert into planning_query_store.feature_mechanization_local_rails (
  rail_id,
  feature_id,
  mechanization_status,
  rail_name,
  normalized_rail_name,
  rail_type,
  ddd_owner,
  rail_status,
  symbol_refs,
  implementation_refs,
  documentation_refs,
  governing_sources,
  allowed_implementation_surfaces,
  architecture_guards,
  completion_gate,
  source_path,
  source_content_sha256,
  raw_rail,
  raw_manifest,
  revision,
  created_by,
  created_at,
  updated_at
)
select
  override_rows.rail_id,
  'SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT',
  'closed',
  override_rows.rail_name,
  override_rows.normalized_rail_name,
  override_rows.rail_type,
  override_rows.canonical_owner,
  'retired',
  '[]'::jsonb,
  override_rows.canonical_refs,
  jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/source-import-provider-extensibility-debt-plan-20260503.md',
    'docs/planning/reviews/architecture-and-governance/20260503-source-import-provider-extensibility-debt-review.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  override_rows.canonical_refs,
  jsonb_build_array(
    'pnpm governance:refresh must not restore provider debt generic SourceImport aliases as active rails',
    'pnpm planning:db:query creation-intent --intent "import source objects" must not prefer generic aliases'
  ),
  jsonb_build_array(
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm governance:refresh',
    'pnpm planning:db:query command-query-rails --filter SourceImport --limit 160',
    'pnpm planning:db:query creation-intent --intent "import source objects" --limit 20',
    'pnpm verify:prepush'
  ),
  'tools/planning-db/migrations/567_retire_provider_debt_source_import_alias_local_overrides.sql',
  md5('provider-debt-source-import-generic-alias-local-override:567:' || override_rows.rail_name),
  jsonb_build_object(
    'name', override_rows.rail_name,
    'type', override_rows.rail_type,
    'status', 'retired',
    'retirementReason', 'Provider debt generic SourceImport alias local override keeps the DB-first catalog on the implemented Warehouse source-import rail.',
    'canonicalRail', override_rows.canonical_rail_name,
    'canonicalOwner', override_rows.canonical_owner,
    'retiredBy', '567_retire_provider_debt_source_import_alias_local_overrides'
  ),
  jsonb_build_object(
    'featureId', 'SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT',
    'mechanizationStatus', 'closed',
    'commandQueryRails', jsonb_build_array(
      jsonb_build_object(
        'name', override_rows.rail_name,
        'type', override_rows.rail_type,
        'status', 'retired',
        'canonicalRail', override_rows.canonical_rail_name,
        'dddOwner', override_rows.canonical_owner,
        'retirementReason', 'Provider debt generic SourceImport alias local override keeps the DB-first catalog on the implemented Warehouse source-import rail.'
      )
    ),
    'retiredBy', '567_retire_provider_debt_source_import_alias_local_overrides'
  ),
  1,
  'planning-db-migration',
  now(),
  now()
from override_rows
on conflict (rail_id) do update set
  feature_id = excluded.feature_id,
  mechanization_status = excluded.mechanization_status,
  rail_name = excluded.rail_name,
  normalized_rail_name = excluded.normalized_rail_name,
  rail_type = excluded.rail_type,
  ddd_owner = excluded.ddd_owner,
  rail_status = excluded.rail_status,
  symbol_refs = excluded.symbol_refs,
  implementation_refs = excluded.implementation_refs,
  documentation_refs = excluded.documentation_refs,
  governing_sources = excluded.governing_sources,
  allowed_implementation_surfaces = excluded.allowed_implementation_surfaces,
  architecture_guards = excluded.architecture_guards,
  completion_gate = excluded.completion_gate,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  raw_rail = excluded.raw_rail,
  raw_manifest = excluded.raw_manifest,
  revision = greatest(planning_query_store.feature_mechanization_local_rails.revision, excluded.revision) + 1,
  updated_at = now();
