-- Harden the existing SourceObject query and import rails without creating a
-- parallel product intent. Live provider discovery, exact physical identity,
-- and constraint-derived column semantics are one application policy.

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
  'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
  'apps/api/src/application/services/WarehouseConnectionSourceObjectReader.ts',
  repeat(md5('SYS-API-APPLICATION-SOURCE-OBJECT-READER:611'), 2),
  0,
  'Warehouse connection source object reader',
  'component',
  'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
  'SYS-DVT',
  'SYS-API',
  'canonical',
  false,
  'Resolve one authorized warehouse connection and return a freshly inspected SourceObject catalog for query and import consumers.',
  'WarehouseConnectionSourceObjectReader',
  'ListWarehouseConnectionSourceObjects;ImportWarehouseSources',
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
where component_id = 'SYS-API-APPLICATION-SOURCE-OBJECT-READER';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'owns', 'apps/api/src/application/services/WarehouseConnectionSourceObjectReader.ts', 0),
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'owns', 'apps/api/test/application/services/WarehouseConnectionSourceObjectReader.test.ts', 1);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'responsibility', 'Read connection configuration and acquire a fresh provider-owned SourceObject catalog.', 0),
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'invariant', 'Stored connection snapshots never satisfy ListWarehouseConnectionSourceObjects or ImportWarehouseSources.', 0),
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'fowler_signal', 'Gateway plus Application Service', 0),
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'public_api', 'read(scope, connectionId) returns connection configuration and freshly inspected SourceObjects or an explicit discovery failure.', 0),
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'transition', 'The reader changes only when provider discovery authority or connection resolution policy changes.', 0),
  ('SYS-API-APPLICATION-SOURCE-OBJECT-READER', 'consumer', 'ListWarehouseConnectionSourceObjectsUseCase;ImportWarehouseSourcesUseCase', 0)
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
  'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
  'Warehouse connection source object reader',
  'service',
  'application',
  'WarehouseConnectionSourceObjectReader',
  'apps/api/src/application/services/WarehouseConnectionSourceObjectReader.ts',
  'Fresh SourceObject catalog read used by the existing list query and import command',
  'node',
  'high',
  'implemented',
  'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES'
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

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-LIVE-SOURCE-OBJECT-DISCOVERY',
  'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
  'Resolve live provider metadata and metrics for the authorized connection.',
  'The provider discovery or freshness policy changes.',
  'SourceObjectCatalogResponse',
  'implemented'
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
  'TEST-LIVE-SOURCE-OBJECT-DISCOVERY',
  'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
  'apps/api/test/application/services/WarehouseConnectionSourceObjectReader.test.ts',
  'unit',
  'behavior',
  true,
  'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/WarehouseConnectionSourceObjectReader.test.ts'
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
  (
    'REL-SOURCE-OBJECT-READER-USES-PROVIDER-PROBE',
    'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
    'SYS-API-INFRA-WAREHOUSE-SOURCES',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
    'Catalog and imports expose stale metrics from connection creation',
    'tenant/project/environment',
    jsonb_build_array(
      'apps/api/src/application/services/WarehouseConnectionSourceObjectReader.ts',
      'apps/api/src/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.ts'
    ),
    'implemented'
  ),
  (
    'REL-SOURCE-OBJECT-READER-SERVES-LIST-AND-IMPORT',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
    'depends_on',
    'outbound',
    'sync',
    'CONTRACT-SOURCE-OBJECT-CATALOG-V1',
    'List and import resolve different SourceObject authorities',
    'tenant/project/environment',
    jsonb_build_array(
      'apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts',
      'apps/api/src/application/services/importWarehouseSourcesUseCase.ts'
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

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-CONTRACTS-SOURCE-OBJECT-CATALOG', 'invariant', 'SourceObject constraints are the sole key authority; column key and uniqueness labels are derived projections.', 8),
  ('SYS-API-INFRA-WAREHOUSE-SOURCES', 'invariant', 'Postgres catalog grouping preserves exact quoted identifier case.', 8),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'invariant', 'dbt source and table aliases are deterministic functions of exact physical identity and never of import batch membership.', 8)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'sourceObjectAuthority', 'live-provider-discovery',
  'physicalIdentityPolicy', 'exact-case-sensitive',
  'constraintAuthority', 'source-object-constraints'
)
where rail_name in ('ListWarehouseConnectionSourceObjects', 'ImportWarehouseSources')
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

update planning_query_store.feature_mechanization_local_rails
set
  raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
    'sourceObjectAuthority', 'live-provider-discovery',
    'physicalIdentityPolicy', 'exact-case-sensitive',
    'constraintAuthority', 'source-object-constraints'
  ),
  source_content_sha256 = repeat(md5(rail_id || ':source-authority:611'), 2),
  revision = revision + 1,
  updated_at = now()
where rail_name in ('ListWarehouseConnectionSourceObjects', 'ImportWarehouseSources')
  and lower(coalesce(rail_status, '')) not in ('deprecated', 'retired');

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
  'EV-LIVE-SOURCE-OBJECT-DISCOVERY',
  'component',
  'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
  'test',
  'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/WarehouseConnectionSourceObjectReader.test.ts test/application/services/importWarehouseSourcesUseCase.test.ts test/application/services/warehouseSourceYaml.test.ts test/entrypoints/http/warehouseSourceImportRoutes.test.ts test/infrastructure/warehouseSourceImport/WorkspaceWarehouseConnectionProbe.test.ts',
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
