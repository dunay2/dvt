-- Close the scope-storage implementation planned in migration 609. Existing
-- rail source provenance is preserved; this migration records implementation
-- state and evidence without creating another product rail.

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_content_sha256 = repeat(md5('SYS-API-INFRA-WORKSPACE-FILES:implemented:610'), 2),
  revision = revision + 1
where component_id = 'SYS-API-INFRA-WORKSPACE-FILES';

delete from planning_query_store.governance_component_local_semantic_items
where component_id = 'SYS-API-INFRA-WORKSPACE-FILES'
  and item_kind = 'consumer'
  and item_value = 'SYS-API-APPLICATION-SERVICES-WORKSPACE;SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES;SYS-API-APPLICATION-SERVICES-START-RUN';

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values (
  'SYS-API-INFRA-WORKSPACE-FILES',
  'consumer',
  'SYS-API-APPLICATION-SERVICES-WORKSPACE;SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES;SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
  0
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update architecture.component
set status = 'implemented', updated_at = now()
where component_id = 'SYS-API-INFRA-WORKSPACE-FILES';

update architecture.contract
set status = 'implemented', updated_at = now()
where contract_id = 'CONTRACT-WORKSPACE-FILE-SCOPE-PORT-V1';

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id = 'RESP-SCOPED-WORKSPACE-FILE-STORAGE';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-WORKSPACE-LOCAL-ADAPTERS-CONTAINS-SCOPED-FILES',
  'REL-SCOPED-WORKSPACE-FILES-IMPLEMENTS-PORT',
  'REL-WAREHOUSE-CATALOG-USES-SCOPED-WORKSPACE-FILES'
);

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values (
  'REL-DBT-RUN-BINDING-USES-SCOPED-WORKSPACE-ROOT',
  'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'depends_on',
  'outbound',
  'sync',
  'CONTRACT-WORKSPACE-FILE-SCOPE-PORT-V1',
  'A DBT plan can bundle files from another project or environment',
  'tenant/project/environment',
  jsonb_build_array(
    'apps/api/src/application/services/DbtRunExecutionContextBindingUseCase.ts',
    'apps/api/src/modules/startRun/buildProtectedStartRunRuntime.ts',
    'apps/api/src/infrastructure/workspaceFiles/workspaceScopeStoragePath.ts',
    'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.test.ts'
  ),
  'implemented'
)
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'storageBoundaryStatus', 'implemented',
  'negativeEvidence', jsonb_build_array(
    'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts',
    'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
    'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
    'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts'
  )
)
where rail_name in (
  'ListWorkspaceFiles',
  'GetWorkspaceFileContent',
  'SaveWorkspaceFileContent',
  'ListWarehouseConnections',
  'ListWarehouseConnectionSourceObjects',
  'CreateWarehouseConnection',
  'TestWarehouseConnection',
  'ImportWarehouseSources'
)
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'storageBoundaryStatus', 'implemented',
    'negativeEvidence', jsonb_build_array(
      'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts',
      'apps/api/test/entrypoints/http/workspaceFilesRoutes.test.ts',
      'apps/api/test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts',
      'apps/api/test/entrypoints/http/warehouseSourceImportRoutes.test.ts'
    )
  ),
  source_content_sha256 = repeat(md5(rail_id || ':scope-implemented:610'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name in (
  'ListWorkspaceFiles',
  'GetWorkspaceFileContent',
  'SaveWorkspaceFileContent',
  'ListWarehouseConnections',
  'ListWarehouseConnectionSourceObjects',
  'CreateWarehouseConnection',
  'TestWarehouseConnection',
  'ImportWarehouseSources'
)
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

-- Migration 609 temporarily split this feature's local manifest by changing
-- two rail source paths. Restore the established complete-manifest source so
-- feature queries continue to return one coherent feature row.
update planning_query_store.feature_mechanization_local_rails
set
  source_path = 'tools/planning-db/migrations/608_source_import_operations_and_metric_presentation.sql',
  revision = revision + 1,
  updated_at = now()
where feature_id = 'E-CANVAS-SOURCE-IMPORT-BYTE-SIZE-1'
  and rail_name in ('ImportWarehouseSources', 'ListWarehouseConnectionSourceObjects');

insert into architecture.evidence (
  evidence_id,
  subject_kind,
  subject_id,
  evidence_kind,
  source_ref,
  result_state,
  recorded_at
)
values (
  'EV-SCOPED-WORKSPACE-FILE-STORAGE-IMPLEMENTED',
  'component',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'test',
  'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts test/entrypoints/http/workspaceFilesRoutes.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.test.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/application/services/DbtRunExecutionContextBindingUseCase.test.ts',
  'pass',
  now()
)
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;
