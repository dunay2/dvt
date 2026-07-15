-- Split the existing ImportWarehouseSources command from the broad warehouse
-- service component and model its mutually exclusive authority strategies.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'may_create', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'tools/planning-db/migrations/670_authority_aware_warehouse_source_import_components.sql',
    repeat(md5('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT:670'), 2), 0,
    'Authority-aware warehouse source import', 'component',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'SYS-DVT', 'SYS-API-ROOT',
    'review', true,
    'Validate one ImportWarehouseSources command, resolve persisted Canvas authority, and delegate exactly one mutation strategy.',
    'WarehouseSourceImport', 'ImportWarehouseSources', 'codex'
  ),
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'tools/planning-db/migrations/670_authority_aware_warehouse_source_import_components.sql',
    repeat(md5('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT:670'), 2), 0,
    'Graph-draft source import strategy', 'component',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'SYS-DVT', 'SYS-API-ROOT',
    'review', false,
    'Apply source YAML and semantic source nodes to graph-draft authority with compensating rollback.',
    'GraphDraftWarehouseSourceImportStrategy', '', 'codex'
  ),
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'tools/planning-db/migrations/670_authority_aware_warehouse_source_import_components.sql',
    repeat(md5('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES:670'), 2), 0,
    'dbt-file source import strategy', 'component',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'SYS-DVT', 'SYS-API-ROOT',
    'review', false,
    'Apply source YAML only beneath persisted dbt project authority and verify a fresh analyzer projection without graph-draft writes.',
    'DbtProjectFilesWarehouseSourceImportStrategy', '', 'codex'
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

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'owns', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'owns', 'apps/api/src/application/services/warehouseSourceImportPlan.ts', 1),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'owns', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts', 2),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'owns', 'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'owns', 'apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts', 1),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'owns', 'apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'owns', 'apps/api/test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts', 1),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts', 100),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/src/application/services/warehouseSourceImportPlan.ts', 101),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts', 102),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts', 103),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts', 104),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts', 105),
  ('SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES', 'excludes', 'apps/api/test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts', 106)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'Authority-aware warehouse source import', 'service', 'application',
    'Warehouse Source Import',
    'apps/api/src/application/services/importWarehouseSourcesUseCase.ts',
    'ImportWarehouseSourcesUseCase', 'node', 'critical', 'proposed',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES'
  ),
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'Graph-draft source import strategy', 'service', 'application',
    'Warehouse Source Import',
    'apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts',
    'GraphDraftWarehouseSourceImportStrategy', 'node', 'critical', 'proposed',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT'
  ),
  (
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'dbt-file source import strategy', 'service', 'application',
    'Warehouse Source Import',
    'apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts',
    'DbtProjectFilesWarehouseSourceImportStrategy', 'node', 'critical', 'proposed',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT'
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
  responsibility_id, component_id, responsibility, reason_to_change,
  ddd_owner, status
)
values
  (
    'RESP-AUTHORITY-AWARE-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'Resolve persisted Canvas authority and dispatch one validated ImportWarehouseSources command.',
    'Source import command policy or authority dispatch changes.',
    'WarehouseSourceImport', 'proposed'
  ),
  (
    'RESP-GRAPH-DRAFT-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'Mutate source YAML and the target graph-draft Canvas as one compensated command.',
    'Graph-draft source import aggregate semantics change.',
    'GraphDraftWarehouseSourceImportStrategy', 'proposed'
  ),
  (
    'RESP-DBT-FILE-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'Mutate source YAML beneath dbt file authority and verify the refreshed projection.',
    'File-backed source import or projection verification changes.',
    'DbtProjectFilesWarehouseSourceImportStrategy', 'proposed'
  )
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id, source_component_id, target_component_id, relation_type,
  direction, sync_async, failure_mode, authorization_scope, source_refs, status
)
values
  (
    'REL-SOURCE-IMPORT-RESOLVES-PERSISTED-AUTHORITY',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-CANVAS-AUTHORITY-POLICY',
    'calls', 'outbound', 'async',
    'Source Import trusts caller authority or writes both semantic authorities.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
    'proposed'
  ),
  (
    'REL-SOURCE-IMPORT-DELEGATES-GRAPH-DRAFT-STRATEGY',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'calls', 'outbound', 'async',
    'Graph-draft semantics leak into command dispatch.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
    'proposed'
  ),
  (
    'REL-SOURCE-IMPORT-DELEGATES-DBT-FILE-STRATEGY',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'calls', 'outbound', 'async',
    'File authority silently falls back to graph-draft mutation.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
    'proposed'
  ),
  (
    'REL-SOURCE-IMPORT-GRAPH-DRAFT-USES-BATCH',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
    'calls', 'outbound', 'async',
    'Generated YAML publishes partially or cannot be compensated after draft conflict.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/graphDraftWarehouseSourceImportStrategy.ts'),
    'proposed'
  ),
  (
    'REL-SOURCE-IMPORT-DBT-FILES-USES-BATCH',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
    'calls', 'outbound', 'async',
    'Authoritative dbt YAML publishes partially.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts'),
    'proposed'
  ),
  (
    'REL-SOURCE-IMPORT-DBT-FILES-REFRESHES-PROJECTION',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'SYS-API-APPLICATION-DBT-PROJECT-GRAPH',
    'calls', 'outbound', 'async',
    'Source Import succeeds without proving the dbt analyzer can project the new source.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/dbtProjectFilesWarehouseSourceImportStrategy.ts'),
    'proposed'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-AUTHORITY-AWARE-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'apps/api/test/application/services/importWarehouseSourcesUseCase.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter dvt-api exec vitest run test/application/services/importWarehouseSourcesUseCase.test.ts'
  ),
  (
    'TEST-GRAPH-DRAFT-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'apps/api/test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts',
    'unit', 'negative', true,
    'pnpm --filter dvt-api exec vitest run test/application/services/graphDraftWarehouseSourceImportStrategy.test.ts'
  ),
  (
    'TEST-DBT-FILE-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'apps/api/test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts',
    'unit', 'negative', true,
    'pnpm --filter dvt-api exec vitest run test/application/services/dbtProjectFilesWarehouseSourceImportStrategy.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
