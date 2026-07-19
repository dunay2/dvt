-- Record the browser-proven DBT Code reconciliation states without creating a
-- parallel persistence or project-analysis rail.

update architecture.component_observability
set
  signal_name = 'CodeWorkingTreeStatus exposes synchronized, modified, syncing, reconciling, conflict, failed, reconciliation_failed, persisted_stale, persisted_invalid, persisted_unavailable, and read_only posture.',
  status = 'implemented'
where observability_id = 'OBS-WEB-CODE-WORKING-TREE-SYNC';

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values (
  'TEST-WEB-CODE-WORKING-TREE-RECONCILIATION-LIVE',
  'SYS-WEB-CODE-WORKING-TREE-SYNC',
  'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
  'e2e',
  'flow',
  true,
  'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts'
)
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.design_scope (
  design_id, subject_kind, subject_id, scope_kind, required
)
values (
  'DBT-CODE-RECONCILIATION-TRUTH-20260719',
  'test',
  'TEST-WEB-CODE-WORKING-TREE-RECONCILIATION-LIVE',
  'must_prove',
  true
)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.frontend_component_validation_evidence (
  component_id, evidence_id, evidence_kind, evidence_status, evidence_ref,
  rail_name, context_id, proves, raw_evidence, source_path,
  source_content_sha256
)
values (
  'web.component.code.CodeWorkingTreeSync',
  'EV-CODE-WORKING-TREE-DBT-RECONCILIATION-LIVE',
  'e2e-test',
  'current',
  'apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
  'ProjectDbtGraphFromFiles',
  'dbt-contextual-code-workbench',
  'A demanding user sees persisted_invalid after exact invalid SQL persistence, corrects the same file, reaches synchronized only after fresh DBT analysis, then previews, runs, and reopens the authoritative content.',
  jsonb_build_object(
    'executedCommand', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
    'result', '1 passing',
    'realAdapters', jsonb_build_array('protected HTTP', 'PostgreSQL', 'Temporal', 'dbt project analysis', 'scoped workspace files'),
    'invalidPosture', 'persisted_invalid',
    'freshPosture', 'synchronized',
    'exactContentPersistence', true,
    'previewAndRun', true,
    'browserReopen', true,
    'workspaceFileIntercept', false,
    'directEditedContentSeeding', false
  ),
  'tools/planning-db/migrations/759_dbt_code_reconciliation_live_evidence.sql',
  md5('evidence:code-working-tree-dbt-reconciliation-live:759')
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
begin
  if not exists (
    select 1
    from architecture.component_observability
    where observability_id = 'OBS-WEB-CODE-WORKING-TREE-SYNC'
      and status = 'implemented'
      and signal_name like '%persisted_invalid%'
      and signal_name like '%persisted_unavailable%'
  ) then
    raise exception 'Code working-tree observability does not expose degraded reconciliation posture';
  end if;

  if not exists (
    select 1
    from planning_query_store.frontend_component_validation_evidence
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and evidence_id = 'EV-CODE-WORKING-TREE-DBT-RECONCILIATION-LIVE'
      and evidence_status = 'current'
      and raw_evidence ->> 'result' = '1 passing'
  ) then
    raise exception 'DBT Code reconciliation strict-live evidence is not current';
  end if;
end
$$;
