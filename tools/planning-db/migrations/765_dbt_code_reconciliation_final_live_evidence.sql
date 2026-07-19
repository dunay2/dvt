-- Bind the final strict-live DBT Code proof to the exact committed spec and
-- implementation revision that produced it.

update planning_query_store.frontend_component_validation_evidence
set
  evidence_status = 'current',
  proves = 'A demanding user persists invalid SQL, sees unresolved DBT analysis, corrects the same authoritative file, reaches synchronized only after fresh analysis, previews, runs, and reopens the exact persisted content.',
  raw_evidence = jsonb_build_object(
    'executedCommand', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-yaml-description-edit-live.cy.ts',
    'result', '1 passing',
    'durationSeconds', 201,
    'implementationCommit', '55928c82898c7c453a8ce3201538e7f81271ea2d',
    'specSha256', 'd646eaa2b8a8a26e7b5af29321ac1e4015048f76adf7510165876cb9e8da7ceb',
    'runId', 'run_019f7a06-6765-7a6b-bb16-24ddbd984846',
    'realAdapters', jsonb_build_array(
      'protected HTTP',
      'PostgreSQL',
      'Temporal',
      'dbt project analysis',
      'scoped workspace files'
    ),
    'invalidPosture', 'persisted_invalid',
    'freshPosture', 'synchronized',
    'saveReceiptFileReadCorrelation', true,
    'exactContentPersistence', true,
    'previewAndRun', true,
    'browserReopen', true,
    'workspaceFileIntercept', false,
    'directEditedContentSeeding', false
  ),
  source_path = 'tools/planning-db/migrations/765_dbt_code_reconciliation_final_live_evidence.sql',
  source_content_sha256 = md5('evidence:code-working-tree-dbt-reconciliation-final-live:765'),
  updated_at = now()
where component_id = 'web.component.code.CodeWorkingTreeSync'
  and evidence_id = 'EV-CODE-WORKING-TREE-DBT-RECONCILIATION-LIVE';

do $$
begin
  if not exists (
    select 1
    from planning_query_store.frontend_component_validation_evidence
    where component_id = 'web.component.code.CodeWorkingTreeSync'
      and evidence_id = 'EV-CODE-WORKING-TREE-DBT-RECONCILIATION-LIVE'
      and evidence_status = 'current'
      and raw_evidence ->> 'result' = '1 passing'
      and raw_evidence ->> 'implementationCommit' = '55928c82898c7c453a8ce3201538e7f81271ea2d'
      and raw_evidence ->> 'specSha256' = 'd646eaa2b8a8a26e7b5af29321ac1e4015048f76adf7510165876cb9e8da7ceb'
      and (raw_evidence ->> 'saveReceiptFileReadCorrelation')::boolean
      and not (raw_evidence ->> 'workspaceFileIntercept')::boolean
      and not (raw_evidence ->> 'directEditedContentSeeding')::boolean
  ) then
    raise exception 'Final DBT Code reconciliation strict-live evidence is incomplete';
  end if;
end
$$;
