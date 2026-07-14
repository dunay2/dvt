-- Model completed ImportDbtProject command receipts before implementation so
-- retries replay accepted results without consulting mutable project files.

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'component', 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS', 'may_create', true),
  ('DBT-PROJECT-IMPORT-PHASE3-20260714', 'command', 'ImportDbtProject', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id, source_path, source_content_sha256, revision, name, level,
  parent_id, root_unit, domain_unit, status, children_required, owned_concern,
  ddd_owner, cq_rails, created_by
)
values (
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
  'tools/planning-db/migrations/680_dbt_project_import_result_receipt.sql',
  repeat(md5('SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS:680'), 2),
  0,
  'dbt project import receipt store',
  'component',
  'SYS-API-INFRASTRUCTURE',
  'SYS-DVT',
  'SYS-API-ROOT',
  'review',
  false,
  'Persist and replay the exact completed result of one scoped ImportDbtProject command.',
  'IDbtProjectImportReceiptStore',
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
where component_id = 'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS', 'owns', 'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts', 0),
  ('SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS', 'owns', 'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component (
  component_id, name, kind, layer, owner, repo_path, public_contract, runtime,
  criticality, status, parent_component_id
)
values (
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
  'dbt project import receipt store',
  'adapter',
  'adapter',
  'dbt Project Authoring',
  'apps/api/src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.ts',
  'IDbtProjectImportReceiptStore',
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
  'RESP-DBT-PROJECT-IMPORT-RECEIPT-STORE',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
  'Persist and replay one completed import result by workspace scope, Canvas, idempotency key, and request hash.',
  'Import command replay or PostgreSQL receipt persistence semantics change.',
  'IDbtProjectImportReceiptStore',
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
values (
  'REL-DBT-IMPORT-PERSISTS-COMPLETED-RECEIPT',
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
  'calls',
  'outbound',
  'async',
  'An accepted retry revalidates changed project files or returns a different result.',
  'workspace:files:save',
  jsonb_build_array(
    'apps/api/src/application/ports/dbtProjectImport.ts',
    'apps/api/src/application/services/importDbtProjectUseCase.ts'
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
  'TEST-DBT-PROJECT-IMPORT-RECEIPT-STORE',
  'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
  'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts',
  'integration',
  'negative',
  true,
  'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts test/application/dbtProjectImportUseCases.test.ts'
),
(
  'TEST-DBT-PROJECT-IMPORT-COMPLETED-REPLAY',
  'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
  'apps/api/test/application/dbtProjectImportReplay.test.ts',
  'unit',
  'negative',
  true,
  'pnpm --filter dvt-api exec vitest run test/application/dbtProjectImportReplay.test.ts'
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
  (
    'SYS-API-APPLICATION-DBT-PROJECT-IMPORT',
    'invariant',
    'ImportDbtProject must replay an equivalent completed result before inspecting mutable project files.',
    0
  ),
  (
    'SYS-API-INFRA-DBT-PROJECT-IMPORT-RECEIPTS',
    'invariant',
    'The same scoped idempotency key with a different request hash fails closed.',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

do $$
declare
  updated_count integer;
begin
  update planning_query_store.feature_mechanization_local_rails
  set
    raw_rail = raw_rail || jsonb_build_object(
      'completedImportReplay', 'persisted_result_before_mutable_project_validation',
      'negativeEvidence', coalesce(raw_rail->'negativeEvidence', '[]'::jsonb) || jsonb_build_array(
        'apps/api/test/application/dbtProjectImportReplay.test.ts#replays an accepted import before validating later project changes',
        'apps/api/test/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.test.ts#rejects reuse of an idempotency key for another import command'
      )
    ),
    source_path = 'tools/planning-db/migrations/680_dbt_project_import_result_receipt.sql',
    source_content_sha256 = repeat(md5('ImportDbtProject:680'), 2),
    revision = revision + 1,
    updated_at = now()
  where rail_name = 'ImportDbtProject';

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'ImportDbtProject requires exactly one active local rail, found %', updated_count;
  end if;
end $$;
