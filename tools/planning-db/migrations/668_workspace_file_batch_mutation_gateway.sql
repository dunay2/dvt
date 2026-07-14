-- Define the internal multi-file mutation gateway before implementation. This
-- gateway is an outbound adapter boundary, not a product command/query rail.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'may_update', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'path', 'apps/api/src/application/ports/workspaceFiles.ts', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
  'tools/planning-db/migrations/668_workspace_file_batch_mutation_gateway.sql',
  repeat(md5('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS:668'), 2),
  0,
  'Workspace file batch mutation gateway',
  'component',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'SYS-DVT',
  'SYS-API-ROOT',
  'review',
  false,
  'Preflight, idempotently apply, and receipt one scoped multi-file workspace mutation without partial publication.',
  'WorkspaceFileBatchMutation',
  '',
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
where component_id = 'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'owns', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS', 'owns', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
  'Workspace file batch mutation gateway',
  'adapter',
  'adapter',
  'Workspace Files',
  'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts',
  'IWorkspaceFileBatchMutationPort',
  'node',
  'critical',
  'proposed',
  'SYS-API-INFRA-WORKSPACE-FILES'
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
values (
  'RESP-WORKSPACE-FILE-BATCH-MUTATION',
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
  'Preflight every expected revision, apply one deterministic multi-file mutation, and preserve an idempotent receipt.',
  'Scoped workspace multi-file transaction semantics change.',
  'WorkspaceFileBatchMutation',
  'proposed'
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
    'REL-SOURCE-IMPORT-USES-BATCH-FILE-MUTATION',
    'SYS-API-APPLICATION-SERVICES-WAREHOUSE-SOURCES',
    'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
    'calls', 'outbound', 'async',
    'A multi-file source import publishes a partial YAML set.',
    'workspace:source-import:import',
    jsonb_build_array('apps/api/src/application/ports/workspaceFiles.ts'),
    'proposed'
  ),
  (
    'REL-WORKSPACE-FILE-BATCH-IMPLEMENTS-PORT',
    'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
    'SYS-API-APPLICATION-PORTS',
    'implements_port', 'outbound', 'sync',
    'Application code depends on local filesystem transaction details.',
    'not_applicable',
    jsonb_build_array(
      'apps/api/src/application/ports/workspaceFiles.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts'
    ),
    'proposed'
  ),
  (
    'REL-WORKSPACE-FILE-BATCH-USES-MUTATION-COORDINATOR',
    'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
    'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
    'depends_on', 'outbound', 'async',
    'The batch gateway duplicates locking, staging, or rollback mechanics.',
    'not_applicable',
    jsonb_build_array(
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.ts',
      'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts'
    ),
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
values (
  'TEST-WORKSPACE-FILE-BATCH-MUTATION',
  'SYS-API-INFRA-WORKSPACE-FILE-BATCH-MUTATIONS',
  'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts',
  'integration', 'negative', true,
  'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileBatchMutationGateway.test.ts test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;
