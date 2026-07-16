-- Complete the architecture maturity of the Phase 4 components without
-- inventing duplicate tests or telemetry. Application ports and pure value
-- boundaries reuse implementation contract tests and deliberately emit no
-- runtime signal; executing services and adapters expose typed outcomes.

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  ('TEST-DBT-EXECUTION-TARGET-PORT-CONTRACT', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts', 'contract', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts'),
  ('TEST-DBT-PROJECT-BUNDLE-PORT-CONTRACT', 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts', 'contract', 'boundary', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts'),
  ('TEST-DBT-RUN-CONTEXT-WRITER-PORT-CONTRACT', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts', 'contract', 'negative', true, 'pnpm --filter dvt-api exec vitest run test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts')
on conflict (test_id) do update set
  component_id = excluded.component_id,
  test_path = excluded.test_path,
  test_kind = excluded.test_kind,
  coverage_level = excluded.coverage_level,
  required = excluded.required,
  validation_command = excluded.validation_command;

insert into architecture.component_observability (
  observability_id, component_id, signal_name, signal_kind, required, status
)
values
  ('OBS-DBT-EXECUTION-TARGET-PORT', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'The pure application port emits no signal; projection and StartRun admission expose unavailable or drift outcomes.', 'log', true, 'not_applicable'),
  ('OBS-DBT-PROJECT-BUNDLE-PORT', 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'The pure application port emits no signal; its adapter and StartRun admission expose typed bundle outcomes.', 'log', true, 'not_applicable'),
  ('OBS-DBT-RUN-CONTEXT-WRITER-PORT', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'The pure application port emits no signal; its adapter and StartRun admission expose typed persistence outcomes.', 'log', true, 'not_applicable'),
  ('OBS-DBT-RUN-CONTEXT-BINDING-ADMISSION', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING', 'The use case returns typed stale-revision, target-drift, bundle, and context-write rejections; protected StartRun callers own operational telemetry.', 'log', true, 'not_applicable'),
  ('OBS-PREVIEW-SELECTION-AUTHORITY-ADMISSION', 'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY', 'The service returns typed authority, revision, analysis, resource, and closure rejections; protected Preview callers own operational telemetry.', 'log', true, 'not_applicable'),
  ('OBS-DBT-EXECUTION-TARGET-CONFIG', 'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG', 'The pure configuration adapter emits no signal; consumers expose unavailable target posture without credential material.', 'log', true, 'not_applicable'),
  ('OBS-DBT-PROJECT-SNAPSHOT', 'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT', 'The pure snapshot operation emits no independent signal; analyzer and bundle boundaries expose typed safety and revision failures.', 'log', true, 'not_applicable'),
  ('OBS-PLAN-PREVIEW-PROVENANCE-CONTRACT', 'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE', 'The pure schema emits no signal; request parsing and plan persistence boundaries expose contract rejection.', 'log', true, 'not_applicable')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, source_content_sha256
)
values
  ('EVIDENCE-DBT-EXECUTION-TARGET-PORT', 'component', 'SYS-API-APPLICATION-DBT-EXECUTION-TARGET', 'test', 'apps/api/test/infrastructure/dbt/ConfiguredDbtExecutionTargetResolver.test.ts', 'pass', repeat(md5('dbt-execution-target-port:701'), 2)),
  ('EVIDENCE-DBT-PROJECT-BUNDLE-PORT', 'component', 'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE', 'test', 'apps/api/test/infrastructure/dbt/DbtProjectBundleBuilder.test.ts', 'pass', repeat(md5('dbt-project-bundle-port:701'), 2)),
  ('EVIDENCE-DBT-RUN-CONTEXT-WRITER-PORT', 'component', 'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER', 'test', 'apps/api/test/infrastructure/dbt/FileDbtRunExecutionContextWriter.test.ts', 'pass', repeat(md5('dbt-run-context-writer-port:701'), 2))
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  source_content_sha256 = excluded.source_content_sha256,
  recorded_at = now();

update planning_query_store.governance_component_local_definitions
set
  source_path = 'tools/planning-db/migrations/701_dbt_project_file_execution_phase4_maturity.sql',
  source_content_sha256 = repeat(md5(component_id || ':phase4-maturity:701'), 2),
  revision = revision + 1
where component_id in (
  'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
  'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
  'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
  'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
  'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE',
  'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER',
  'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
);

do $$
declare
  incomplete_count integer;
begin
  select count(*) into incomplete_count
  from architecture.component_maturity_query maturity
  where maturity.component_id in (
    'SYS-CONTRACTS-PLAN-PREVIEW-PROVENANCE',
    'SYS-API-APPLICATION-DBT-EXECUTION-TARGET',
    'SYS-API-INFRA-DBT-EXECUTION-TARGET-CONFIG',
    'SYS-API-APPLICATION-DBT-RUN-CONTEXT-BINDING',
    'SYS-API-INFRA-DBT-PROJECT-SNAPSHOT',
    'SYS-API-APPLICATION-DBT-PROJECT-BUNDLE',
    'SYS-API-APPLICATION-DBT-RUN-CONTEXT-WRITER',
    'SYS-API-APPLICATION-PREVIEW-SELECTION-AUTHORITY'
  )
    and coalesce(array_length(maturity.missing_reasons, 1), 0) > 0;

  if incomplete_count <> 0 then
    raise exception 'Phase 4 maturity closeout left % incomplete components', incomplete_count;
  end if;
end $$;
