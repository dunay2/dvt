-- Split local workspace mutation coordination from repository read/path policy
-- and align the existing SaveWorkspaceFileContent rail with mandatory CAS.

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
  'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
  'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts',
  repeat(md5('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS:624'), 2),
  0,
  'Local workspace file mutation coordinator',
  'component',
  'SYS-API-INFRA-WORKSPACE-FILES',
  'SYS-DVT',
  'SYS-API-INFRASTRUCTURE',
  'canonical',
  false,
  'Serialize same-path local mutations across repository instances and perform durable temporary-file replacement and revision-guarded deletion.',
  'LocalWorkspaceFileMutationCoordinator',
  'SaveWorkspaceFileContent',
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
where component_id = 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'owns', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'owns', 'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'responsibility', 'Coordinate and execute one local filesystem mutation for one resolved workspace path.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'invariant', 'All repository instances in one API process serialize mutations by resolved absolute path.', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'invariant', 'A failed temporary write or rename never replaces the current target and attempts temporary-file cleanup.', 1),
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'fowler_signal', 'Gateway; Unit of Work boundary; Separated Interface', 0),
  ('SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'public_api', 'runExclusive;replaceFileAtomically;deleteFile', 0)
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
  'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
  'Local workspace file mutation coordinator',
  'adapter',
  'adapter',
  'LocalWorkspaceFileMutationCoordinator',
  'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts',
  'Process-wide same-path exclusion and atomic local file replacement',
  'node',
  'critical',
  'approved',
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
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-LOCAL-WORKSPACE-FILE-MUTATION',
  'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
  'Serialize and atomically apply local workspace file mutations.',
  'The local filesystem mutation, durability, or same-path coordination policy changes.',
  'LocalWorkspaceFileMutationCoordinator',
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
  'TEST-LOCAL-WORKSPACE-FILE-MUTATION',
  'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS',
  'apps/api/test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts',
  'unit',
  'negative',
  true,
  'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts'
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
  ('REL-WORKSPACE-FILES-CONTAINS-MUTATION-COORDINATOR', 'SYS-API-INFRA-WORKSPACE-FILES', 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'contains', 'outbound', 'sync', null, 'Workspace file mutations bypass the shared coordinator', 'not_applicable', jsonb_build_array('apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts', 'apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.ts'), 'approved'),
  ('REL-WORKSPACE-FILE-REPOSITORY-USES-MUTATION-COORDINATOR', 'SYS-API-INFRA-WORKSPACE-FILES', 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS', 'depends_on', 'outbound', 'sync', 'CONTRACT-WORKSPACE-FILE-REVISION-CAS-V1', 'Two repository instances accept writes against the same stale revision', 'tenant/project/environment', jsonb_build_array('apps/api/src/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.ts'), 'approved')
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
  'expectedRevision', 'mandatory_content_sha256_or_absent',
  'retrySemantics', 'same_desired_content_returns_unchanged',
  'successReceipt', 'path_content_sha256_last_modified_disposition',
  'conflictReason', 'workspace_file_revision_conflict',
  'commandReturnsContent', false,
  'localMutationCoordinator', 'SYS-API-INFRA-WORKSPACE-FILE-MUTATIONS'
)
where rail_name = 'SaveWorkspaceFileContent';

update planning_query_store.command_query_rails
set raw_rail = coalesce(raw_rail, '{}'::jsonb) || jsonb_build_object(
  'revisionField', 'contentSha256'
)
where rail_name = 'GetWorkspaceFileContent';

update architecture.contract
set
  status = 'implemented',
  validation_command = 'pnpm --filter dvt-api exec vitest run test/infrastructure/workspaceFiles/LocalWorkspaceFileMutationCoordinator.test.ts test/infrastructure/workspaceFiles/LocalWorkspaceFileRepository.test.ts test/entrypoints/http/workspaceFilesRoutes.test.ts',
  updated_at = now()
where contract_id = 'CONTRACT-WORKSPACE-FILE-REVISION-CAS-V1';
