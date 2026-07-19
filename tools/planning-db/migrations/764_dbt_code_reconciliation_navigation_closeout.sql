-- Close the Fowler QA findings for Code navigation and selection recovery.
-- Workspace bytes remain governed by SaveWorkspaceFileContent; DBT semantic
-- usability remains governed by ProjectDbtGraphFromFiles.

update architecture.component_responsibility
set
  status = 'implemented'
where responsibility_id in (
  'RESP-WEB-CODE-WORKING-TREE-SYNC',
  'RESP-WEB-DBT-SELECTION-RECOVERY'
);

update architecture.component_port
set
  status = 'implemented'
where port_id = 'PORT-WEB-CODE-WORKING-TREE-SYNC'
   or (
     component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
     and port_name = 'RecoverCanvasExecutionSelection'
   );

update architecture.component_observability
set
  signal_name = 'CodeWorkingTreeStatus exposes synchronized, modified, syncing, reconciling, conflict, failed, reconciliation_failed, persisted_stale, persisted_invalid, persisted_unavailable, persisted_verification_unavailable, persisted_superseded, and read_only posture.',
  status = 'implemented'
where observability_id = 'OBS-WEB-CODE-WORKING-TREE-SYNC';

update planning_query_store.frontend_component_local_files
set
  raw_file = jsonb_set(coalesce(raw_file, '{}'::jsonb), '{status}', '"implemented"'::jsonb),
  source_path = 'tools/planning-db/migrations/764_dbt_code_reconciliation_navigation_closeout.sql',
  source_content_sha256 = md5('code-navigation-file-closeout:' || file_path || ':764'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and file_path in (
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx',
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.test.ts'
  );

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values (
  'SYS-WEB-CANVAS-DBT-PROJECT-CODE-WORKBENCH-ADAPTER',
  'invariant',
  'A fresh ProjectDbtGraphFromFiles result represents one atomically hashed project-source snapshot; later concurrent edits form a newer revision and do not invalidate that point-in-time result.',
  2
)
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values
  (
    'web.component.code.CodeWorkingTreeSync',
    'EV-CODE-WORKING-TREE-NAVIGATION-INTEGRITY',
    'integration-test',
    'current',
    'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx;apps/web/src/app/views/CodeView.test.tsx',
    'SaveWorkspaceFileContent',
    'code-workbench-navigation',
    'File, contextual-target, SPA-route, and hard-browser transitions cannot silently discard unpersisted workspace-file bytes; persisted semantic degradation remains navigable.',
    jsonb_build_object(
      'fileTransitionFlush', true,
      'contextualTargetTransitionFlush', true,
      'spaNavigationGuard', true,
      'hardBrowserNavigationGuard', true,
      'failedPersistenceBlocksTransition', true,
      'persistedDegradationBlocksTransition', false
    ),
    'tools/planning-db/migrations/764_dbt_code_reconciliation_navigation_closeout.sql',
    md5('evidence:code-working-tree-navigation-integrity:764')
  ),
  (
    'web.component.code.CodeWorkingTreeSync',
    'EV-CODE-WORKING-TREE-FILE-AUTHORITY-CORRELATION',
    'unit-test',
    'current',
    'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.test.ts',
    'SaveWorkspaceFileContent',
    'code-workbench-reconciliation',
    'A synchronized result requires the final authoritative file path and content SHA to match the save receipt; a newer revision remains persisted_superseded.',
    jsonb_build_object(
      'pathCorrelation', true,
      'contentShaCorrelation', true,
      'supersededStatePreserved', true
    ),
    'tools/planning-db/migrations/764_dbt_code_reconciliation_navigation_closeout.sql',
    md5('evidence:code-working-tree-file-authority-correlation:764')
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

update planning_query_store.frontend_component_validation_evidence
set
  evidence_status = 'current',
  proves = 'Query errors and successful responses carrying unusable DBT freshness both reject and cannot fabricate recovery success.',
  raw_evidence = jsonb_build_object(
    'falseTransportSuccessRejected', true,
    'freshAccepted', true,
    'staleLastValidRejected', true,
    'invalidRejected', true,
    'unavailableRejected', true,
    'validationCommand', 'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/canvas/canvasExecutionSelectionRecoveryAuthorityAdapter.test.ts'
  ),
  source_path = 'tools/planning-db/migrations/764_dbt_code_reconciliation_navigation_closeout.sql',
  source_content_sha256 = md5('validation:selection-recovery-authority-freshness:764'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
  and evidence_id = 'VAL-WEB-DBT-SELECTION-RECOVERY-AUTHORITY';

do $$
declare
  implemented_file_count integer;
begin
  select count(*) into implemented_file_count
  from planning_query_store.frontend_component_local_files
  where component_id = 'web.component.code.CodeWorkingTreeSync'
    and file_path in (
      'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.tsx',
      'apps/web/src/app/views/code/CodeWorkingTreeNavigationGuard.test.tsx',
      'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.ts',
      'apps/web/src/app/views/code/workspaceFileReconciliationAuthority.test.ts'
    )
    and raw_file ->> 'status' = 'implemented';

  if implemented_file_count <> 4 then
    raise exception 'Code navigation closeout expected four implemented files, found %', implemented_file_count;
  end if;

  if not exists (
    select 1
    from planning_query_store.frontend_component_validation_evidence
    where component_id = 'SYS-WEB-CANVAS-EXECUTION-SELECTION-RECOVERY'
      and evidence_id = 'VAL-WEB-DBT-SELECTION-RECOVERY-AUTHORITY'
      and evidence_status = 'current'
  ) then
    raise exception 'DBT selection recovery authority evidence is not current';
  end if;

  if exists (
    select 1
    from planning_query_store.frontend_component_local_cq_rails
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and rail_name <> 'SaveWorkspaceFileContent'
  ) then
    raise exception 'CodeWorkingTreeSync acquired a parallel command/query rail during closeout';
  end if;
end
$$;
