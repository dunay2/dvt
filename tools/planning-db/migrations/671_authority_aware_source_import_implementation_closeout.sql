-- Close the implemented authority-aware Source Import component family and
-- remove the broad-component ownership and relation drift it replaces.

update architecture.component
set
  status = 'implemented',
  maturity_score = 92,
  updated_at = now()
where component_id in (
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS'
);

update architecture.component
set
  repo_path = 'apps/api/src/application/services/createWarehouseConnectionUseCase.ts',
  updated_at = now()
where component_id = 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES';

update architecture.component_responsibility
set status = 'implemented'
where responsibility_id in (
  'RESP-AUTHORITY-AWARE-WAREHOUSE-SOURCE-IMPORT',
  'RESP-GRAPH-DRAFT-WAREHOUSE-SOURCE-IMPORT',
  'RESP-DBT-FILE-WAREHOUSE-SOURCE-IMPORT',
  'RESP-WORKSPACE-FILE-BATCH-MUTATION'
);

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/671_authority_aware_source_import_implementation_closeout.sql',
  source_content_sha256 = repeat(md5(component_id || ':implemented:671'), 2),
  revision = revision + 1
where component_id in (
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS'
);

delete from planning_query_store.governance_component_local_ownership_patterns
where component_id = 'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES'
  and pattern_kind = 'owns'
  and pattern = 'apps/api/src/application/services/importWarehouseSourcesUseCase.ts';

delete from architecture.component_relation
where relation_id in (
  'REL-SOURCE-IMPORT-USES-BATCH-FILE-MUTATION',
  'REL-SOURCE-OBJECT-READER-SERVES-LIST-AND-IMPORT'
);

update architecture.component_relation
set
  target_component_id = 'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
  status = 'implemented',
  updated_at = now()
where relation_id = 'REL-SOURCE-IMPORT-OPERATIONS-TO-API';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-SOURCE-IMPORT-RESOLVES-PERSISTED-AUTHORITY',
  'REL-SOURCE-IMPORT-DELEGATES-GRAPH-DRAFT-STRATEGY',
  'REL-SOURCE-IMPORT-DELEGATES-DBT-FILE-STRATEGY',
  'REL-SOURCE-IMPORT-GRAPH-DRAFT-USES-BATCH',
  'REL-SOURCE-IMPORT-DBT-FILES-USES-BATCH',
  'REL-SOURCE-IMPORT-DBT-FILES-REFRESHES-PROJECTION',
  'REL-WORKSPACE-FILE-BATCH-IMPLEMENTS-PORT',
  'REL-WORKSPACE-FILE-BATCH-USES-MUTATION-COORDINATOR'
);

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-WAREHOUSE-SOURCE-SERVICES-CONTAINS-SOURCE-IMPORT',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'contains',
    'outbound',
    'sync',
    'The broad source-services family reclaims command orchestration owned by the Source Import host.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
    'implemented'
  ),
  (
    'REL-WAREHOUSE-SOURCE-LIST-READS-SOURCE-OBJECTS',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
    'calls',
    'outbound',
    'async',
    'Source-object listing returns stale embedded catalog objects instead of a live read.',
    'workspace:source-import:view',
    jsonb_build_array('apps/api/src/application/services/listWarehouseConnectionSourceObjectsUseCase.ts'),
    'implemented'
  ),
  (
    'REL-SOURCE-IMPORT-READS-SOURCE-OBJECTS',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-SOURCE-OBJECT-READER',
    'calls',
    'outbound',
    'async',
    'Import accepts caller-supplied metadata or an object no longer present in the live catalog.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/services/importWarehouseSourcesUseCase.ts'),
    'implemented'
  ),
  (
    'REL-HTTP-WORKSPACE-ROUTES-CALLS-SOURCE-IMPORT',
    'SYS-API-HTTP-WORKSPACE-ROUTES',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'calls',
    'outbound',
    'async',
    'The HTTP adapter bypasses V2 validation, persisted authority, or stable error translation.',
    'workspace:source-import:import with tenant/project/environment scope',
    jsonb_build_array(
      'apps/api/src/entrypoints/http/warehouseSourceImportRouteGroup.ts',
      'apps/api/src/entrypoints/http/warehouseSourceImportRoutes.ts'
    ),
    'implemented'
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

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  (
    'OBS-AUTHORITY-AWARE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
    'Versioned import receipts and stable typed failures identify the selected Canvas authority and outcome.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-GRAPH-DRAFT-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
    'Draft revision, imported node identities, idempotency mismatch, conflict, and rollback failure are explicit command outcomes.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-DBT-FILE-SOURCE-IMPORT',
    'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
    'Project revision, analysis hash, projected source identities, projection failure, and rollback failure are explicit command outcomes.',
    'log',
    true,
    'implemented'
  ),
  (
    'OBS-WORKSPACE-FILE-BATCH-MUTATION',
    'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
    'The idempotent batch receipt records each applied file revision and exposes conflict or rollback failure without partial success.',
    'log',
    true,
    'implemented'
  )
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'responsibility', 'Validate one Source Import V2 command, resolve persisted Canvas authority, and dispatch exactly one strategy.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'non_goal', 'Write workspace files, mutate a graph draft, or analyze a dbt project directly.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'reason_to_change', 'Source Import command policy or authority dispatch changes.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'public_api', 'ImportWarehouseSourcesUseCase.execute', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'invariant', 'Caller-supplied authority and project roots are never trusted.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'invariant', 'Every accepted source identity is rehydrated from the live catalog before mutation.', 1),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'transition', 'V2 request validation precedes catalog read, authority resolution, and strategy dispatch.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'consumer', 'Protected workspace Source Import HTTP adapter', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'governance_ref', 'ADR-0060', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT', 'fowler_signal', 'Hidden authority', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'responsibility', 'Publish source YAML and target-Canvas semantic nodes as one compensated graph-authority command.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'non_goal', 'Analyze dbt files or infer file authority.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'invariant', 'A missing target Canvas fails before any file mutation.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'invariant', 'Draft conflict or idempotency mismatch compensates the complete YAML batch.', 1),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'transition', 'An authorized graph-draft binding moves from catalog identities to one YAML receipt and one draft revision.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'consumer', 'ImportWarehouseSourcesUseCase', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT', 'public_api', 'GraphDraftWarehouseSourceImportStrategy.execute', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'responsibility', 'Publish source YAML beneath persisted dbt authority and prove it through a fresh analyzer projection.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'non_goal', 'Write graph-draft nodes or accept a caller-selected project root.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'invariant', 'Success requires exact source name, table name, and original file path in a fresh projection.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'invariant', 'Projection failure compensates the complete YAML batch.', 1),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'transition', 'An authorized dbt-file binding moves from catalog identities to one YAML receipt and one proven fresh projection.', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'consumer', 'ImportWarehouseSourcesUseCase', 0),
  ('SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES', 'public_api', 'DbtProjectFilesWarehouseSourceImportStrategy.execute', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'responsibility', 'Publish or compensate a scoped multi-file mutation atomically with an idempotent receipt.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'non_goal', 'Interpret source YAML, Canvas authority, or dbt projection semantics.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'invariant', 'The same idempotency key with a different request hash is rejected.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'transition', 'A validated batch moves from expected file revisions to one complete receipt or no published mutation.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'consumer', 'GraphDraftWarehouseSourceImportStrategy', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'consumer', 'DbtProjectFilesWarehouseSourceImportStrategy', 1),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'public_api', 'IWorkspaceFileBatchMutationPort.apply', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  revision = revision + 1
where component_id in (
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT',
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-GRAPH-DRAFT',
  'SYS-API-APPLICATION-WAREHOUSE-SOURCE-IMPORT-DBT-FILES',
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS'
);
