-- Record the StartRun provenance guard that prevents inbound DBT execution
-- context references from bypassing profile admission.

update architecture.design
set
  status = 'implemented',
  rationale = 'DbtRunExecutionContextBindingUseCase resolves the persisted plan first, preserves pass-through behavior for non-DBT plans, and rejects any inbound DBT runExecutionContextRef before bundle construction or engine dispatch. The internally generated reference is added only on the downstream delegate call and does not re-enter admission.',
  rail_ref = 'StartRun',
  updated_at = now()
where design_id = 'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712';

update architecture.risk
set
  probability = 'low',
  status = 'open'
where risk_id = 'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS';

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 = md5('SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION:633')
    || md5('dbt-context-ref-provenance-guard:633')
where component_id = 'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION';

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 = md5('SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION:633')
    || md5('dbt-context-ref-provenance-evidence:633')
where component_id = 'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION';

insert into architecture.evidence (
  evidence_id,
  subject_kind,
  subject_id,
  evidence_kind,
  source_ref,
  result_state
)
values (
  'EV-DBT-RUNTIME-CONTEXT-REF-PROVENANCE-TEST-20260712',
  'check',
  'DBT-RUNTIME-CONTEXT-REF-PROVENANCE-20260712',
  'test',
  'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts',
  'pass'
)
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = now();

refresh materialized view planning_query_store.component_engineering_component_tree_projection;
