-- Model crash-safe ImportDbtProject process ownership before implementation.
-- This replaces the completed-receipt-only adapter; it does not create a new
-- product rail. ImportDbtProject remains the single command intent.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'DBT-PROJECT-IMPORT-PHASE3-RECOVERY-20260715',
  'E-DBT-PROJECT-ROUNDTRIP-P3-WEB',
  'Crash-safe dbt project import process ownership',
  'dbt Project Authoring / Canvas',
  'approved',
  'Replace separate authority and completed-receipt transactions with one durable leased process so an incomplete import is replayable or safely compensable.',
  'boundary_drift',
  'ImportDbtProject',
  now()
)
on conflict (design_id) do update set
  work_item_id = excluded.work_item_id,
  title = excluded.title,
  owner = excluded.owner,
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  approved_at = coalesce(architecture.design.approved_at, excluded.approved_at),
  updated_at = now();

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-RECOVERY-20260715', 'component', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-RECOVERY-20260715', 'component', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS', 'may_delete', true),
  ('DBT-PROJECT-IMPORT-PHASE3-RECOVERY-20260715', 'command', 'ImportDbtProject', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
  'tools/planning-db/migrations/691_dbt_project_import_process_recovery_design.sql',
  repeat(md5('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS:691'), 2),
  0,
  'dbt project import process store',
  'component',
  'SYS-API-INFRASTRUCTURE',
  'SYS-DVT',
  'SYS-API-ROOT',
  'review',
  false,
  'Own one durable ImportDbtProject operation, active lease, authority transition, compensation, and exact completed replay.',
  'IDbtProjectImportProcessStore',
  'ImportDbtProject',
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
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'owns', 'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'owns', 'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
  'dbt project import process store',
  'adapter',
  'adapter',
  'dbt Project Authoring',
  '',
  'IDbtProjectImportProcessStore',
  'node',
  'critical',
  'proposed',
  'SYS-API-INFRASTRUCTURE'
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
  'RESP-DBT-PROJECT-IMPORT-PROCESS-STORE',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
  'Persist and serialize the complete import process from authority acquisition through completed replay or lease-guarded compensation.',
  'Import crash recovery, operation leasing, authority transaction, or PostgreSQL process persistence semantics change.',
  'IDbtProjectImportProcessStore',
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
    'REL-DBT-IMPORT-OWNS-DURABLE-PROCESS',
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
    'calls',
    'outbound',
    'async',
    'A crash can leave Canvas authority without a recoverable command outcome.',
    'workspace:files:save',
    jsonb_build_array(
      'apps/api/src/application/ports/dbtProjectImport.ts',
      'apps/api/src/application/services/importDbtProjectUseCase.ts'
    ),
    'proposed'
  ),
  (
    'REL-DBT-IMPORT-PROCESS-COORDINATES-AUTHORITY',
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
    'SYS-API-INFRA-CANVAS-AUTHORITY-STORE',
    'writes',
    'outbound',
    'sync',
    'Operation state and Canvas authority can commit independently.',
    'tenant/project/environment/Canvas',
    jsonb_build_array('docs/architecture/components/web/graph/dbt-project-import-and-source-authority-component.md'),
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
  'TEST-DBT-PROJECT-IMPORT-PROCESS-STORE',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS',
  'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts',
  'integration',
  'negative',
  true,
  'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/PostgresDbtProjectImportProcessStore.test.ts test/application/dbtProjectImportUseCases.test.ts test/application/dbtProjectImportReplay.test.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'public_api', 'IDbtProjectImportProcessStore.readCompleted', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'public_api', 'IDbtProjectImportProcessStore.begin', 1),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'public_api', 'IDbtProjectImportProcessStore.complete', 2),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'public_api', 'IDbtProjectImportProcessStore.fail', 3),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'transition', 'absent|failed -> in_progress -> completed', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'invariant', 'Beginning an operation and binding its Canvas authority commit in one PostgreSQL transaction.', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'invariant', 'At most one unexpired lease token may complete or compensate an operation.', 1),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'invariant', 'A completed result wins over compensation and replays before mutable validation.', 2),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'invariant', 'A stale lease owner cannot complete or release authority after recovery.', 3),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-PROCESS', 'non_goal', 'Create another command/query rail or parse dbt project files.', 0)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

do $$
declare
  updated_count integer;
begin
  update planning_query_store.feature_mechanization_local_rails
  set
    architecture_guards = coalesce(architecture_guards, '[]'::jsonb) || jsonb_build_array(
      'ImportDbtProject owns authority acquisition, active-operation leasing, exact replay, and compensation through one durable process store.',
      'A retry cannot recover an operation before lease expiry, and a stale owner cannot complete or compensate after recovery.'
    ),
    completion_gate = coalesce(completion_gate, '[]'::jsonb) || jsonb_build_array(
      'Real PostgreSQL evidence proves crash recovery, one active lease owner, completed-result precedence, and safe compensation.'
    ),
    source_path = 'tools/planning-db/migrations/691_dbt_project_import_process_recovery_design.sql',
    source_content_sha256 = repeat(md5('ImportDbtProject:process-recovery:691'), 2),
    revision = revision + 1,
    updated_at = now()
  where rail_name = 'ImportDbtProject';

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'ImportDbtProject requires exactly one active local rail, found %', updated_count;
  end if;
end $$;
