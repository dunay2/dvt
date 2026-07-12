-- Record the fail-closed StartRun profile admission implementation and keep
-- the broader credential-reference risk open until the runtime contract owns
-- a server-resolved profile reference.

update architecture.design
set
  status = 'implemented',
  rationale = 'DbtRunExecutionContextBindingUseCase classifies workspace files before bundle construction. If any profiles.yml is present, StartRun returns a run_execution_context plan rejection before writing an artifact or delegating to the engine; profile-free projects retain the existing binding path.',
  rail_ref = 'StartRun',
  updated_at = now()
where design_id = 'DBT-RUNTIME-PROFILE-ADMISSION-20260712';

update architecture.design
set
  rationale = 'DbtRunExecutionContextBindingUseCase never serializes profiles.yml. A workspace profile now causes fail-closed StartRun admission until a server-owned profile reference exists, while profile-free executable project sources remain bundleable.',
  updated_at = now()
where design_id = 'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712';

update architecture.risk
set
  probability = 'low',
  status = 'open'
where risk_id = 'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS';

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'path',
    'apps/api/src/application/ports/protectedRuntimeRailVocabulary.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'path',
    'apps/api/src/application/ports/protectedRuntimePlanCommandQueryRails.ts',
    'may_update',
    true
  ),
  (
    'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
    'path',
    'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
    'may_update',
    true
  )
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 = md5('SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION:631')
    || md5('dbt-profile-fail-closed-admission:631')
where component_id = 'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION';

update planning_query_store.governance_component_local_definitions
set
  source_content_sha256 = md5('SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION:631')
    || md5('dbt-profile-fail-closed-evidence:631')
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
  'EV-DBT-RUNTIME-PROFILE-ADMISSION-TEST-20260712',
  'check',
  'DBT-RUNTIME-PROFILE-ADMISSION-20260712',
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
