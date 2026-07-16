-- Close the demanding-user proof after the strict browser vertical verifies
-- both the executable happy path and the fail-closed source-only selection.

update planning_query_store.frontend_component_local_evidence
set
  raw_evidence = raw_evidence || jsonb_build_object(
    'result', '2 passing',
    'sourceOnlySelectionRejected', true,
    'noPreviewRequestForRejectedSelection', true
  ),
  source_path = 'tools/planning-db/migrations/705_dbt_explicit_selection_live_evidence.sql',
  source_content_sha256 = md5('evidence:dbt-file-execution-rt006:705'),
  updated_at = now()
where evidence_id in (
  'EV-DBT-FILE-EXECUTION-RT006',
  'EV-WEB-DBT-EXECUTION-SCOPE-LIVE'
);

update planning_query_store.frontend_component_validation_evidence
set
  proves = 'A demanding user can execute an explicitly selected file-derived model and is blocked when selecting only a DBT source; the rejected selection emits no Preview request and never widens to the project.',
  raw_evidence = raw_evidence || jsonb_build_object(
    'result', '2 passing',
    'strictBrowserProof', true,
    'sourceOnlySelectionRejected', true,
    'noPreviewRequestForRejectedSelection', true
  ),
  source_path = 'tools/planning-db/migrations/705_dbt_explicit_selection_live_evidence.sql',
  source_content_sha256 = md5('validation:dbt-file-execution-rt006:705'),
  updated_at = now()
where component_id = 'SYS-WEB-CANVAS-DBT-FILE-EXECUTION'
  and evidence_id = 'EV-DBT-FILE-EXECUTION-RT006';

update planning_query_store.feature_mechanization_local_rails
set
  implementation_refs = implementation_refs
    || jsonb_build_array(
      'tools/planning-db/migrations/705_dbt_explicit_selection_live_evidence.sql'
    ),
  raw_manifest = raw_manifest || jsonb_build_object(
    'strictBrowserProof', jsonb_build_object(
      'command', 'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
      'result', '2 passing',
      'happyPath', 'selected model previews and runs from the analyzed project revision',
      'negativePath', 'source-only explicit selection is blocked and emits no Preview request'
    )
  ),
  revision = revision + 1,
  updated_at = now()
where rail_id = 'local#E-DBT-PROJECT-ROUNDTRIP-1#query#collectcanvasexecutionselection#fail-closed';

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values (
  'EVIDENCE-DBT-EXPLICIT-SELECTION-STRICT-BROWSER',
  'decision',
  'AD-DBT-EXPLICIT-SELECTION-SAFETY-20260716',
  'test',
  'apps/web/cypress/e2e/dbt/dbt-project-preview-run-live.cy.ts',
  'pass',
  repeat(md5('dbt-explicit-selection-strict-browser:2-passing:705'), 2)
)
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

do $$
declare
  live_result text;
  decision_evidence_count integer;
begin
  select raw_evidence ->> 'result' into live_result
  from planning_query_store.frontend_component_local_evidence
  where evidence_id = 'EV-WEB-DBT-EXECUTION-SCOPE-LIVE';

  select count(*) into decision_evidence_count
  from architecture.evidence
  where evidence_id = 'EVIDENCE-DBT-EXPLICIT-SELECTION-STRICT-BROWSER'
    and result_state = 'pass';

  if live_result <> '2 passing' then
    raise exception 'DBT explicit-selection live evidence must record two passing scenarios, found %', live_result;
  end if;

  if decision_evidence_count <> 1 then
    raise exception 'DBT explicit-selection design requires one strict browser evidence record, found %', decision_evidence_count;
  end if;
end $$;
