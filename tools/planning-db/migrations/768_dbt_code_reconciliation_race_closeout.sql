-- Close the two local race conditions exposed by hard QA. Exact save-plus-
-- project publication identity remains assigned to the existing atomic
-- publication task; this closeout does not manufacture atomicity with reads.

update architecture.design
set
  status = 'implemented',
  rationale = 'CodeView retains a requested contextual target until revision-guarded byte persistence succeeds. CodeWorkingTreeSync releases navigation on the save receipt, reconciles semantics in the background, and accepts an outcome only for the receipt that initiated it. Exact whole-project revision binding remains governed by E-WEB-DBT-ATOMIC-PUBLICATION-1.',
  updated_at = now()
where design_id = 'DBT-CODE-RECONCILIATION-TRUTH-20260719';

update architecture.component_responsibility
set
  responsibility = case responsibility_id
    when 'RESP-SYS-WEB-VIEWS-CODE' then
      'Render the Code workbench, coordinate contextual file-target transitions, and retain a requested target until revision-guarded persistence allows the transition.'
    else
      'Serialize revision-guarded workspace-file writes, release navigation after byte persistence, reconcile semantic authority asynchronously, and reject outcomes for superseded save receipts.'
  end,
  reason_to_change = case responsibility_id
    when 'RESP-SYS-WEB-VIEWS-CODE' then
      'Code workbench presentation, file selection, contextual target, or navigation coordination changes.'
    else
      'Working-tree persistence, concurrency, conflict, retry, or post-save reconciliation policy changes.'
  end,
  status = 'implemented'
where responsibility_id in (
  'RESP-WEB-CODE-WORKING-TREE-SYNC',
  'RESP-SYS-WEB-VIEWS-CODE'
);

update architecture.component_port
set status = 'implemented'
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC';

update planning_query_store.frontend_component_capability_gaps
set
  gap_status = 'closed',
  raw_gap = raw_gap || jsonb_build_object(
    'closedBy', 'tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql',
    'closedReason', 'receipt-correlated asynchronous reconciliation and retry-retained contextual target are implemented'
  ),
  source_path = 'tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql',
  source_content_sha256 = md5(component_id || ':' || gap_id || ':closed:768'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and owning_task_id = 'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1'
  and gap_id in (
    'GAP-CODE-PENDING-TARGET-RETRY',
    'GAP-CODE-PERSISTENCE-RECONCILIATION-COUPLING'
  );

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-WEB-CODE-VIEW-CONTEXTUAL-TARGET-RETRY',
    'SYS-WEB-VIEWS-CODE',
    'apps/web/src/app/views/CodeView.test.tsx',
    'integration',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/CodeView.test.tsx'
  ),
  (
    'TEST-WEB-CODE-WORKING-TREE-PERSISTENCE-BOUNDARY',
    'SYS-WEB-CODE-WORKING-TREE-SYNC',
    'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx',
    'unit',
    'negative',
    true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/code/useCodeWorkingTreeSync.test.tsx'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.code.CodeWorkingTreeSync',
    'EV-CODE-CONTEXTUAL-TARGET-RETRY',
    'integration-test',
    'current',
    'apps/web/src/app/views/CodeView.test.tsx',
    'SaveWorkspaceFileContent',
    'code-workbench-contextual-target',
    'A contextual target rejected by failed persistence remains pending and is selected exactly once after Retry proves byte persistence.',
    jsonb_build_object(
      'coordinatorComponentId', 'SYS-WEB-VIEWS-CODE',
      'failedSaveRetainsTarget', true,
      'retryAppliesTarget', true,
      'duplicateApplicationRejected', true
    ),
    'tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql',
    md5('evidence:code-contextual-target-retry:768')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'EV-CODE-PERSISTENCE-RECONCILIATION-BOUNDARY',
    'unit-test',
    'current',
    'apps/web/src/app/views/code/useCodeWorkingTreeSync.test.tsx;apps/web/src/app/views/code/codeWorkingTreeSyncModel.test.ts',
    'SaveWorkspaceFileContent',
    'code-working-tree-reconciliation',
    'A save receipt releases navigation while semantic analysis remains observable in the background; stale outcomes cannot reduce newer receipt state.',
    jsonb_build_object(
      'backgroundReconciliation', true,
      'receiptCorrelation', true,
      'staleOutcomeRejected', true,
      'parallelRailCreated', false
    ),
    'tools/planning-db/migrations/768_dbt_code_reconciliation_race_closeout.sql',
    md5('evidence:code-persistence-reconciliation-boundary:768')
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
  closed_local_gap_count integer;
begin
  select count(*) into closed_local_gap_count
  from planning_query_store.frontend_component_capability_gaps
  where component_id = 'web.component.code.CodeWorkingTreeSync'
    and owning_task_id = 'E-WEB-DBT-CODE-RECONCILIATION-TRUTH-1'
    and gap_status = 'closed'
    and gap_id in (
      'GAP-CODE-PENDING-TARGET-RETRY',
      'GAP-CODE-PERSISTENCE-RECONCILIATION-COUPLING'
    );

  if closed_local_gap_count <> 2 then
    raise exception 'DBT Code race closeout expected two closed local gaps, found %', closed_local_gap_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.frontend_component_capability_gaps
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and gap_id = 'GAP-DBT-RECONCILIATION-EXACT-PROJECT-REVISION'
      and owning_task_id = 'E-WEB-DBT-ATOMIC-PUBLICATION-1'
      and gap_status = 'open'
  ) then
    raise exception 'Exact DBT project revision gap was hidden or assigned outside atomic publication';
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'CodeWorkingTreeSync acquired a parallel command/query rail during closeout';
  end if;

  if (
    select count(*)
    from architecture.component_responsibility
    where responsibility_id in (
      'RESP-WEB-CODE-WORKING-TREE-SYNC',
      'RESP-SYS-WEB-VIEWS-CODE'
    )
      and status = 'implemented'
  ) <> 2 then
    raise exception 'CodeView and CodeWorkingTreeSync responsibility closeout is incomplete';
  end if;
end
$$;
