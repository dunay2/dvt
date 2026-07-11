-- Plan the hard workspace-scope storage boundary before implementation. This
-- migration reuses existing command/query rails and makes their storage scope
-- explicit; it does not introduce parallel product intents.

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-API-INFRA-WORKSPACE-FILES',
  'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
  repeat(md5('SYS-API-INFRA-WORKSPACE-FILES:609'), 2),
  0,
  'API scoped workspace file adapter',
  'component',
  'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS',
  'SYS-DVT',
  'SYS-API-INFRASTRUCTURE',
  'review',
  false,
  'Own safe tenant/project/environment storage partitioning and bounded local workspace file persistence.',
  'ScopedWorkspaceFileRepository',
  'ListWorkspaceFiles;GetWorkspaceFileContent;SaveWorkspaceFileContent',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails,
  revision = planning_query_store.governance_component_local_definitions.revision + 1;

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS'
  and pattern in (
    'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
    'apps/api/src/infrastructure/workspaceFiles/workspaceScopeStoragePath.ts',
    'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts'
  );

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-INFRA-WORKSPACE-FILES';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-INFRA-WORKSPACE-FILES', 'owns', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts', 0),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'owns', 'apps/api/src/infrastructure/workspaceFiles/workspaceScopeStoragePath.ts', 1),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'owns', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts', 2)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-API-INFRA-WORKSPACE-FILES', 'responsibility', 'Project an authorized tenant/project/environment scope to one safe storage partition and perform bounded workspace file IO inside it.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'invariant', 'Every IWorkspaceFileRepository operation receives an explicit authorized WorkspaceStorageScope.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'invariant', 'Different tenant/project/environment tuples resolve to different roots and cannot read or overwrite each other.', 1),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'invariant', 'DVT_WORKSPACE_FILES_ROOT is a namespace root and never direct workspace authority.', 2),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'fowler_signal', 'Explicit Context; Gateway; Separated Interface', 0),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'public_api', 'IWorkspaceFileRepository requires WorkspaceStorageScope on list, read, save, and delete operations.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'transition', 'The component becomes implemented only after cross-scope negative tests cover file reads, writes, warehouse catalog access, and dbt bundle resolution.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILES', 'consumer', 'SYS-API-APPLICATION-SERVICES-WORKSPACE;SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES;SYS-API-APPLICATION-SERVICES-START-RUN', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  parent_component_id
)
values (
  'SYS-API-INFRA-WORKSPACE-FILES',
  'API scoped workspace file adapter',
  'adapter',
  'adapter',
  'ScopedWorkspaceFileRepository',
  'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts',
  'Scope-explicit IWorkspaceFileRepository with deterministic isolated storage roots',
  'node',
  'critical',
  'approved',
  'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values (
  'CONTRACT-WORKSPACE-FILE-SCOPE-PORT-V1',
  'port',
  'SYS-API-APPLICATION-PORTS',
  'apps/api/src/application/ports/workspaceFiles.ts',
  'breaking',
  'approved',
  'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts test/entrypoints/http/workspaceFilesRoutes.test.ts'
)
on conflict (contract_id) do update set
  contract_kind = excluded.contract_kind,
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SCOPED-WORKSPACE-FILE-STORAGE',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'Isolate local workspace files by the authorized tenant/project/environment tuple.',
  'The workspace storage partition algorithm or file persistence policy changes.',
  'ScopedWorkspaceFileRepository',
  'approved'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

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
  'TEST-SCOPED-WORKSPACE-FILE-STORAGE',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts',
  'integration',
  'negative',
  true,
  'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts test/entrypoints/http/workspaceFilesRoutes.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

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
values
  ('REL-WORKSPACE-LOCAL-ADAPTERS-CONTAINS-SCOPED-FILES', 'SYS-API-INFRA-WORKSPACE-LOCAL-ADAPTERS', 'SYS-API-INFRA-WORKSPACE-FILES', 'contains', 'outbound', 'sync', null, 'Workspace file persistence remains hidden inside a mixed-responsibility adapter component', 'not_applicable', jsonb_build_array('apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts'), 'approved'),
  ('REL-SCOPED-WORKSPACE-FILES-IMPLEMENTS-PORT', 'SYS-API-INFRA-WORKSPACE-FILES', 'SYS-API-APPLICATION-PORTS', 'implements_port', 'inbound', 'sync', 'CONTRACT-WORKSPACE-FILE-SCOPE-PORT-V1', 'A file operation can execute without an explicit authorized scope', 'tenant/project/environment', jsonb_build_array('apps/api/src/application/ports/workspaceFiles.ts', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts'), 'approved'),
  ('REL-WAREHOUSE-CATALOG-USES-SCOPED-WORKSPACE-FILES', 'SYS-API-INFRA-WAREHOUSE-SOURCES', 'SYS-API-INFRA-WORKSPACE-FILES', 'depends_on', 'outbound', 'sync', 'CONTRACT-WORKSPACE-FILE-SCOPE-PORT-V1', 'Warehouse connections or source objects leak across workspace scopes', 'tenant/project/environment', jsonb_build_array('apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionCatalog.ts', 'apps/api/src/application/ports/workspaceFiles.ts'), 'approved')
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

-- Existing rails keep their names and owners. Scope is now part of every
-- command/query contract and must reach the storage adapter explicitly.
update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'requiredScopeFields', jsonb_build_array('tenantId', 'projectId', 'environmentId'),
  'storageScopeInvariant', 'authorized_scope_equals_storage_scope',
  'storageBoundaryStatus', 'approved'
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
    'requiredScopeFields', jsonb_build_array('tenantId', 'projectId', 'environmentId'),
    'storageScopeInvariant', 'authorized_scope_equals_storage_scope',
    'storageBoundaryStatus', 'approved'
  ),
  source_path = 'tools/planning-db/migrations/609_workspace_scope_storage_boundary.sql',
  source_content_sha256 = repeat(md5(rail_id || ':scope-boundary:609'), 2),
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

insert into architecture.decision (
  decision_id,
  decision_kind,
  title,
  status,
  source_ref,
  applies_to,
  rationale
)
values (
  'ADR-0058-WORKSPACE-SCOPE-STORAGE-BOUNDARY',
  'adr',
  'Bind workspace authorization scope to physical storage scope',
  'accepted',
  'docs/adr/ADR-0058-warehouse-source-import-rails.md',
  jsonb_build_array('SYS-API-INFRA-WORKSPACE-FILES', 'SYS-API-INFRA-WAREHOUSE-SOURCES', 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'SYS-API-HTTP-WORKSPACE-ROUTES'),
  'Authorization without matching storage partitioning permits cross-workspace data disclosure and incorrect dbt bundle construction.'
)
on conflict (decision_id) do update set
  decision_kind = excluded.decision_kind,
  title = excluded.title,
  status = excluded.status,
  source_ref = excluded.source_ref,
  applies_to = excluded.applies_to,
  rationale = excluded.rationale;
