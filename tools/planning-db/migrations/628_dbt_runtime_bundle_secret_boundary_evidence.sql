-- Record implementation evidence for the profiles.yml containment slice.
-- The F-03 risk stays open until execution targets use server-owned credential
-- references, so this migration does not overstate full feature closure.

update architecture.design
set
  title = 'Exclude profiles.yml from dbt runtime project bundles',
  status = 'implemented',
  rationale = 'DbtRunExecutionContextBindingUseCase remains an internal StartRun policy. Bundle collection rejects profiles.yml by normalized filename before exact-file and directory allowlists, which covers root and nested paths while preserving executable dbt project sources.',
  rail_ref = 'StartRun',
  updated_at = now()
where design_id = 'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712';

update architecture.risk
set
  probability = 'low',
  status = 'open'
where risk_id = 'R-20260712-DBT-RUNTIME-BUNDLE-SECRETS';

update planning_query_store.governance_component_local_definitions
set
  cq_rails = 'StartRun;AdmitStartRun;ResolveExecutableSubgraph',
  source_content_sha256 = md5('SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION:628')
    || md5('start-run-internal-dbt-binding:628')
where component_id = 'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION';

update planning_query_store.governance_component_local_definitions
set
  cq_rails = 'ValidateApiStartRunAdmissionEvidence;StartRun;AdmitStartRun;ResolveExecutableSubgraph',
  source_content_sha256 = md5('SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION:628')
    || md5('start-run-internal-dbt-binding-evidence:628')
where component_id = 'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION';

delete from planning_query_store.governance_component_local_semantic_items
where component_id in (
  'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
  'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION'
)
and item_kind = 'public_api'
and item_value = 'BindDbtRunExecutionContext';

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values (
  'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION',
  'owns',
  'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts',
  24
)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into architecture.component_test (
  test_id,
  component_id,
  test_path,
  test_kind,
  coverage_level,
  required,
  validation_command
)
values
  (
    'TEST-API-START-RUN-DBT-BUNDLE-SECURITY',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts',
    'integration',
    'negative',
    true,
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts'
  ),
  (
    'TEST-API-START-RUN-DBT-BUNDLE-SECURITY-OWNERSHIP',
    'SYS-API-TESTS-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts',
    'integration',
    'negative',
    true,
    'pnpm --filter dvt-api exec vitest run --config vitest.config.ts test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts'
  )
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values (
  'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
  'test',
  'TEST-API-START-RUN-DBT-BUNDLE-SECURITY',
  'must_prove',
  true
)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into architecture.evidence (
  evidence_id,
  subject_kind,
  subject_id,
  evidence_kind,
  source_ref,
  result_state
)
values
  (
    'EV-DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-TEST-20260712',
    'check',
    'DBT-RUNTIME-BUNDLE-SECRET-BOUNDARY-20260712',
    'test',
    'apps/api/test/application/services/DbtRunExecutionContextBindingUseCase.bundleSecurity.test.ts',
    'pass'
  ),
  (
    'EV-START-RUN-DBT-BUNDLE-NEGATIVE-RAIL-20260712',
    'component',
    'SYS-API-APPLICATION-SERVICES-START-RUN-ADMISSION',
    'test',
    'apps/api/test/entrypoints/http/protectedRuntimeRouteGroup.architecture.test.ts',
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
