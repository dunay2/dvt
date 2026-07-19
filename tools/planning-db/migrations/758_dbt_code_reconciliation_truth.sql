-- Close the DBT Code persistence/re-analysis truth gap without adding a
-- parallel command or query. SaveWorkspaceFileContent persists bytes;
-- ProjectDbtGraphFromFiles determines whether semantic analysis is fresh.

insert into architecture.design (
  design_id, work_item_id, title, owner, status, rationale, fowler_signal,
  rail_ref, approved_at
)
values (
  'DBT-CODE-RECONCILIATION-TRUTH-20260719',
  'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1',
  'DBT Code persistence and semantic reconciliation truth',
  'Frontend / Code workbench',
  'implemented',
  'Revision-guarded persistence and DBT semantic analysis are distinct outcomes. The Code workbench exposes fresh, stale-last-valid, invalid, unavailable, transport-failed, and revision-conflict posture; route teardown flushes the latest modified buffer through the existing save command.',
  'hidden_authority',
  'SaveWorkspaceFileContent;ProjectDbtGraphFromFiles',
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
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'component', 'SYS-WEB-CODE-WORKING-TREE-SYNC', 'may_update', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'component', 'SYS-WEB-VIEWS-CODE', 'may_update', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'component', 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'may_update', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'component', 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW', 'may_update', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'command', 'SaveWorkspaceFileContent', 'may_reference', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'query', 'ProjectDbtGraphFromFiles', 'may_reference', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'test', 'TEST-WEB-CODE-WORKING-TREE-RECONCILIATION', 'must_prove', true),
  ('DBT-CODE-RECONCILIATION-TRUTH-20260719', 'test', 'TEST-WEB-DBT-CODE-RECONCILIATION-ADAPTER', 'must_prove', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component_responsibility
set
  responsibility = 'Serialize revision-guarded workspace-file writes, preserve later edits and teardown edits, expose persistence and reconciliation as separate states, and notify contextual consumers after an authoritative save.',
  reason_to_change = 'Working-tree synchronization, concurrency, teardown flush, conflict, or post-save reconciliation policy changes.',
  status = 'implemented'
where responsibility_id = 'RESP-WEB-CODE-WORKING-TREE-SYNC';

update architecture.component_port
set
  negative_tests = array[
    'later edit is lost while a write is in flight',
    'modified content is lost when the workbench unmounts before debounce',
    'post-save consumer runs before the authoritative save receipt',
    'synchronized posture is emitted for stale-last-valid, invalid, or unavailable DBT analysis',
    'post-save reconciliation causes a duplicate file write'
  ],
  status = 'implemented'
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC';

update architecture.component_relation
set
  status = 'implemented',
  failure_mode = 'A saved file is presented as semantically synchronized when ProjectDbtGraphFromFiles reports stale-last-valid, invalid, unavailable, or transport failure.',
  source_refs = jsonb_build_array(
    'buildDbtProjectFileCodeWorkbench',
    'reconcileCodeFilePersistence',
    'projectDbtCodeReconciliationOutcome'
  ),
  updated_at = now()
where relation_id = 'REL-WEB-DBT-CODE-ADAPTER-REFRESHES-PROJECTION-AFTER-SAVE';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-CODE-WORKING-TREE-STATE-MODEL',
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/code/codeWorkingTreeSyncModel.test.ts'
  ),
  (
    'TEST-WEB-DBT-CODE-RECONCILIATION-ADAPTER',
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts',
    'unit',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/dbtProjectCodeReconciliation.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id, pattern_kind, pattern, pattern_order
)
values
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'owns', 'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts', 3),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'owns', 'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts', 4)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'invariant', 'A successful SaveWorkspaceFileContent receipt proves byte persistence, not fresh DBT semantic analysis.', 2),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'invariant', 'Unmounting before debounce starts the same revision-guarded command for the latest modified buffer.', 3),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'transition', 'reconciling -> synchronized only for fresh ProjectDbtGraphFromFiles analysis.', 2),
  ('SYS-WEB-CODE-WORKING-TREE-SYNC', 'transition', 'reconciling -> persisted_stale, persisted_invalid, persisted_unavailable, or reconciliation_failed preserves unresolved analysis truth.', 3),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'public_api', 'projectDbtCodeReconciliationOutcome; buildDbtProjectFileCodeWorkbench', 1),
  ('SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER', 'invariant', 'ProjectDbtGraphFromFiles freshness is mapped losslessly into the Code reconciliation outcome.', 1)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
  source_content_sha256 = repeat(md5(component_id || ':reconciliation-truth:758'), 2),
  revision = revision + 1,
  owned_concern = case component_id
    when 'SYS-WEB-CODE-WORKING-TREE-SYNC' then
      'Own serialized revision-guarded writes, teardown flush, and explicit post-save reconciliation states.'
    else
      'Resolve exact DBT Code targets and adapt DBT project-analysis freshness to Code reconciliation truth.'
  end,
  cq_rails = case component_id
    when 'SYS-WEB-CODE-WORKING-TREE-SYNC' then 'SaveWorkspaceFileContent'
    else 'GetWorkspaceFileContent;ListWorkspaceFiles;SaveWorkspaceFileContent;ProjectDbtGraphFromFiles'
  end
where component_id in (
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
);

insert into planning_query_store.frontend_component_local_files (
  component_id, file_path, file_role, exported_symbol, raw_file,
  source_path, source_content_sha256
)
values
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts',
    'semantic-adapter',
    'projectDbtCodeReconciliationOutcome',
    jsonb_build_object('ownership', 'exclusive', 'inputRail', 'ProjectDbtGraphFromFiles', 'output', 'CodeWorkingTreeReconciliationOutcome'),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('file:dbt-project-code-reconciliation:758')
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts',
    'unit-test',
    null,
    jsonb_build_object('proves', 'freshness mapping is total and lossless'),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('file:dbt-project-code-reconciliation-test:758')
  )
on conflict (component_id, file_path, file_role) do update set
  exported_symbol = excluded.exported_symbol,
  raw_file = excluded.raw_file,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_local_cq_rails (
  component_id, rail_name, rail_kind, rail_status, raw_rail, source_path,
  source_content_sha256
)
values
  (
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'SaveWorkspaceFileContent',
    'command',
    'implemented',
    jsonb_build_object('ownership', 'consumed', 'purpose', 'revision-guarded byte persistence and teardown flush'),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('rail:code-sync:save:758')
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'ProjectDbtGraphFromFiles',
    'query',
    'implemented',
    jsonb_build_object('ownership', 'consumed', 'afterCommand', 'SaveWorkspaceFileContent', 'purpose', 'classify semantic analysis freshness without fabricating success'),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('rail:dbt-code-reconciliation:project-graph:758')
  )
on conflict (component_id, rail_name) do update set
  rail_kind = excluded.rail_kind,
  rail_status = excluded.rail_status,
  raw_rail = excluded.raw_rail,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.code.CodeWorkingTreeSync',
    'EV-CODE-WORKING-TREE-RECONCILIATION-TRUTH',
    'integration-test',
    'current',
    'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx',
    'SaveWorkspaceFileContent',
    'dbt-contextual-code-workbench',
    'The latest modified buffer persists on teardown; invalid DBT analysis remains unresolved; retry does not duplicate the file write.',
    jsonb_build_object('teardownFlush', true, 'degradedFreshness', true, 'duplicateWrite', false),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('evidence:code-working-tree-reconciliation-truth:758')
  ),
  (
    'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
    'VAL-WEB-DBT-CODE-RECONCILIATION-MAPPING',
    'unit-test',
    'current',
    'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts',
    'ProjectDbtGraphFromFiles',
    'canvas-contextual-code-workbench',
    'Fresh analysis carries provenance and each degraded freshness value remains distinct.',
    jsonb_build_object('fresh', true, 'staleLastValid', true, 'invalid', true, 'unavailable', true),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('evidence:dbt-code-reconciliation-mapping:758')
  ),
  (
    'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY-VIEW',
    'VAL-WEB-SELECTION-RECOVERY-LOCALIZED-FAILURE',
    'presentation-test',
    'current',
    'apps/web/src/app/components/shell/OperationalDrawerSelectionRecoveryView.test.tsx',
    'RecoverCanvasExecutionSelection',
    'bottom-operational-drawer',
    'The recovery surface renders localized product copy and never leaks adapter or transport detail.',
    jsonb_build_object('localized', true, 'technicalDetailVisible', false),
    'tools/planning-db/migrations/758_dbt_code_reconciliation_truth.sql',
    md5('evidence:selection-recovery-localized-failure:758')
  )
on conflict (component_id, evidence_id) do update set
  evidence_kind = excluded.evidence_kind,
  evidence_status = excluded.evidence_status,
  evidence_ref = excluded.evidence_ref,
  rail_name = excluded.rail_name,
  context_id = excluded.context_id,
  proves = excluded.proves,
  raw_evidence = excluded.raw_evidence,
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  updated_at = now();

do $$
declare
  canonical_rail_count integer;
  mapped_adapter_file_count integer;
  duplicate_owned_file_count integer;
begin
  select count(*) into canonical_rail_count
  from planning_query_store.command_query_rail_query
  where (rail_name, rail_type) in (
    ('SaveWorkspaceFileContent', 'command'),
    ('ProjectDbtGraphFromFiles', 'query')
  );

  select count(*) into mapped_adapter_file_count
  from planning_query_store.frontend_component_file_query
  where component_id = 'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER'
    and file_path in (
      'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts',
      'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts'
    );

  select count(*) into duplicate_owned_file_count
  from (
    select pattern
    from planning_query_store.governance_component_local_ownership_patterns
    where pattern in (
      'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.ts',
      'apps/web/src/app/views/canvas/dbtProjectCodeReconciliation.test.ts'
    )
      and pattern_kind = 'owns'
    group by pattern
    having count(*) > 1
  ) duplicates;

  if canonical_rail_count <> 2 then
    raise exception 'DBT Code reconciliation requires exactly two canonical rails, found %', canonical_rail_count;
  end if;
  if mapped_adapter_file_count <> 2 then
    raise exception 'DBT Code reconciliation adapter files are not mapped exactly once, found %', mapped_adapter_file_count;
  end if;
  if duplicate_owned_file_count <> 0 then
    raise exception 'DBT Code reconciliation adapter has duplicate file ownership';
  end if;
end
$$;
