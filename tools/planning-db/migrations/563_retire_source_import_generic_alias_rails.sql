-- Retire obsolete generic SourceImport rail aliases now that the implemented
-- warehouse source-import rails are canonical. These aliases came from the
-- provider-extensibility debt plan/review and must not be offered as reusable
-- active command/query rails beside the Warehouse rails.

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
target_rails as (
  select
    rail.rail_id,
    rail.raw_rail,
    rail.raw_manifest,
    alias_map.rail_name,
    alias_map.rail_type,
    alias_map.canonical_rail_name,
    alias_map.canonical_owner,
    alias_map.canonical_refs
  from planning_query_store.feature_mechanization_local_rails rail
  join alias_map
    on rail.normalized_rail_name = lower(alias_map.rail_name)
   and rail.rail_type = alias_map.rail_type
  where rail.feature_id = 'SOURCE-IMPORT-PROVIDER-EXTENSIBILITY-DEBT'
)
update planning_query_store.feature_mechanization_local_rails rail
set
  ddd_owner = target_rails.canonical_owner,
  mechanization_status = 'closed',
  rail_status = 'retired',
  source_path = 'tools/planning-db/migrations/563_retire_source_import_generic_alias_rails.sql',
  source_content_sha256 = md5('source-import-generic-alias-rail-retirement:563:' || target_rails.rail_name),
  implementation_refs = target_rails.canonical_refs,
  documentation_refs = jsonb_build_array(
    'docs/planning/proposals/mandatory/frontend-and-ux/source-import-provider-extensibility-debt-plan-20260503.md',
    'docs/planning/reviews/architecture-and-governance/20260503-source-import-provider-extensibility-debt-review.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  governing_sources = jsonb_build_array(
    'docs/architecture/command-query-rail-governance.md',
    'docs/adr/ADR-0058-warehouse-source-import-rails.md'
  ),
  allowed_implementation_surfaces = target_rails.canonical_refs,
  architecture_guards = jsonb_build_array(
    'pnpm planning:db:query command-query-rails --filter SourceImport --limit 160 must label retired aliases as retired-rail-do-not-reuse',
    'pnpm planning:db:query rail-vocabulary --filter SourceImport --limit 80 must not report active duplicate source-import vocabulary'
  ),
  completion_gate = jsonb_build_array(
    'node --test scripts/planning-db-migrate.test.cjs',
    'pnpm planning:db:query command-query-rails --filter SourceImport --limit 160',
    'pnpm verify:prepush'
  ),
  raw_rail = (
    coalesce(target_rails.raw_rail, '{}'::jsonb)
    || jsonb_build_object(
      'status', 'retired',
      'retirementReason', 'Generic SourceImport rail alias superseded by the implemented Warehouse source-import rail.',
      'canonicalRail', target_rails.canonical_rail_name,
      'canonicalOwner', target_rails.canonical_owner,
      'retiredBy', '563_retire_source_import_generic_alias_rails'
    )
  ),
  raw_manifest = (
    coalesce(target_rails.raw_manifest, '{}'::jsonb)
    || jsonb_build_object(
      'mechanizationStatus', 'closed',
      'commandQueryRails', jsonb_build_array(
        jsonb_build_object(
          'name', target_rails.rail_name,
          'type', target_rails.rail_type,
          'status', 'retired',
          'canonicalRail', target_rails.canonical_rail_name,
          'dddOwner', target_rails.canonical_owner,
          'retirementReason', 'Generic SourceImport rail alias superseded by the implemented Warehouse source-import rail.'
        )
      ),
      'retiredBy', '563_retire_source_import_generic_alias_rails'
    )
  ),
  revision = greatest(rail.revision, 1) + 1,
  updated_at = now()
from target_rails
where rail.rail_id = target_rails.rail_id;
