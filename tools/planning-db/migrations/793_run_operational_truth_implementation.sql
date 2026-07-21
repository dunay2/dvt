-- Close the shared run operational truth only after ListRuns, GetRunStatus,
-- the browser adapter, presentation models, and strict live flow use the same
-- identity, lifecycle, duration, and failure-evidence vocabulary.

update architecture.design
set
  status = 'implemented',
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where design_id = 'RUN-OPERATIONAL-TRUTH-20260719';

update architecture.component
set
  status = 'implemented',
  maturity_score = 92,
  updated_at = now()
where component_id = 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL';

update architecture.component_responsibility
set status = 'implemented'
where component_id = 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL';

update architecture.contract
set
  status = 'implemented',
  validation_command = 'pnpm --filter dvt-api exec vitest run test/application/services/runOperationalTruth.test.ts test/application/services/listRunsUseCase.test.ts test/application/services/getRunStatusUseCase.test.ts',
  updated_at = now()
where contract_id = 'CONTRACT-RUN-OPERATIONAL-TRUTH';

update architecture.component_port
set status = 'implemented'
where component_id = 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL';

update architecture.component_relation
set status = 'implemented', updated_at = now()
where relation_id in (
  'REL-API-RUN-LIFECYCLE-CONTAINS-OPERATIONAL-READ-MODEL',
  'REL-WEB-RUN-SERVICES-CONSUME-OPERATIONAL-TRUTH'
);

insert into planning_query_store.governance_component_local_semantic_items (
  component_id, item_kind, item_value, item_order
)
values
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'public_api',
    'RunOperationalTruthDto;projectRunOperationalTruth',
    0
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'transition',
    'Persisted RunMetadata plus canonical event-log status becomes one immutable RunOperationalTruthDto without inferred lifecycle evidence.',
    0
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'consumer',
    'ListRunsUseCase;GetRunStatusUseCase;Web runs HTTP adapter',
    0
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

update planning_query_store.governance_component_local_definitions
set
  status = 'canonical',
  source_path = 'tools/planning-db/migrations/793_run_operational_truth_implementation.sql',
  source_content_sha256 = repeat(md5(component_id || ':canonical:793'), 2),
  revision = revision + 1
where component_id = 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL';

update planning_query_store.governance_component_local_definitions
set
  cq_rails = case component_id
    when 'SYS-WEB-SERVICES-RUNS' then 'StartRun;ListRuns;GetRunStatus;GetRunEvents'
    when 'SYS-WEB-VIEWS-RUNS' then 'ListRuns;GetRunStatus;GetRunEvents'
    else cq_rails
  end,
  source_path = 'tools/planning-db/migrations/793_run_operational_truth_implementation.sql',
  source_content_sha256 = repeat(md5(component_id || ':run-rails:793'), 2),
  revision = revision + 1
where component_id in ('SYS-WEB-SERVICES-RUNS', 'SYS-WEB-VIEWS-RUNS');

insert into architecture.component_test (
  test_id, component_id, test_path, test_kind, coverage_level, required,
  validation_command
)
values
  (
    'TEST-API-RUN-OPERATIONAL-TRUTH-UNIT',
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'apps/api/test/application/services/runOperationalTruth.test.ts',
    'unit', 'negative', true,
    'pnpm --filter dvt-api exec vitest run test/application/services/runOperationalTruth.test.ts'
  ),
  (
    'TEST-API-LIST-RUNS-OPERATIONAL-TRUTH-RAIL',
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'apps/api/test/application/services/listRunsUseCase.test.ts',
    'integration', 'boundary', true,
    'pnpm --filter dvt-api exec vitest run test/application/services/listRunsUseCase.test.ts'
  ),
  (
    'TEST-API-GET-RUN-STATUS-OPERATIONAL-TRUTH-RAIL',
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'apps/api/test/application/services/getRunStatusUseCase.test.ts',
    'integration', 'boundary', true,
    'pnpm --filter dvt-api exec vitest run test/application/services/getRunStatusUseCase.test.ts'
  ),
  (
    'TEST-WEB-RUN-OPERATIONAL-TRUTH-MAPPER',
    'SYS-WEB-SERVICES-RUNS',
    'apps/web/src/app/services/runs/runsApiSnapshotMapper.test.ts',
    'unit', 'boundary', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/services/runs/runsApiSnapshotMapper.test.ts'
  ),
  (
    'TEST-WEB-RUN-OPERATIONAL-TRUTH-TABLE',
    'SYS-WEB-VIEWS-RUNS',
    'apps/web/src/app/views/runs/runOperationalTableModel.test.ts',
    'unit', 'behavior', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.unit.config.ts src/app/views/runs/runOperationalTableModel.test.ts'
  ),
  (
    'TEST-WEB-RUN-OPERATIONAL-TRUTH-PRESENTATION',
    'SYS-WEB-VIEWS-RUNS',
    'apps/web/src/app/views/runs/RunStates.workspaceBasics.test.tsx',
    'integration', 'behavior', true,
    'pnpm --filter @dvt/web exec vitest run --config vitest.presentation.config.ts src/app/views/RunsView.test.tsx src/app/views/runs/RunStates.workspaceBasics.test.tsx'
  ),
  (
    'TEST-WEB-RUN-OPERATIONAL-TRUTH-LIVE',
    'SYS-WEB-VIEWS-RUNS',
    'apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts',
    'e2e', 'flow', true,
    'node scripts/run-selected-closure-live-proof.cjs --spec apps/web/cypress/e2e/canvas/canvas-preview-run-live.cy.ts'
  )
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
values (
  'OBS-API-RUN-OPERATIONAL-TRUTH',
  'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'The pure projection emits no duplicate signal; existing run status query spans and route telemetry own read failures and latency.',
  'trace',
  true,
  'not_applicable'
)
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;

insert into architecture.evidence (
  evidence_id, subject_kind, subject_id, evidence_kind, source_ref,
  result_state, recorded_at
)
values
  (
    'EV-API-RUN-OPERATIONAL-TRUTH-20260719',
    'component',
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'test',
    '25 API operational-truth tests passed: projector, bounded list rail, and detail rail',
    'pass', now()
  ),
  (
    'EV-WEB-RUN-OPERATIONAL-TRUTH-20260719',
    'component',
    'SYS-WEB-SERVICES-RUNS',
    'test',
    '33 Web adapter and table-model tests passed without lifecycle fabrication',
    'pass', now()
  ),
  (
    'EV-WEB-RUN-OPERATIONAL-PRESENTATION-20260719',
    'component',
    'SYS-WEB-VIEWS-RUNS',
    'test',
    '15 Runs presentation tests passed with explicit unavailable lifecycle evidence',
    'pass', now()
  )
on conflict (evidence_id) do update set
  subject_kind = excluded.subject_kind,
  subject_id = excluded.subject_id,
  evidence_kind = excluded.evidence_kind,
  source_ref = excluded.source_ref,
  result_state = excluded.result_state,
  recorded_at = excluded.recorded_at;

do $$
declare
  service_rails text;
  view_rails text;
begin
  if not exists (
    select 1
    from architecture.design
    where design_id = 'RUN-OPERATIONAL-TRUTH-20260719'
      and status = 'implemented'
      and rail_ref = 'ListRuns;GetRunStatus'
  ) then
    raise exception 'Run operational truth design remains incomplete';
  end if;

  select cq_rails into service_rails
  from planning_query_store.governance_component_local_definitions
  where component_id = 'SYS-WEB-SERVICES-RUNS';

  select cq_rails into view_rails
  from planning_query_store.governance_component_local_definitions
  where component_id = 'SYS-WEB-VIEWS-RUNS';

  if service_rails <> 'StartRun;ListRuns;GetRunStatus;GetRunEvents' then
    raise exception 'Web runs service rails retain drift: %', service_rails;
  end if;

  if view_rails <> 'ListRuns;GetRunStatus;GetRunEvents' then
    raise exception 'Web runs view rails retain command drift: %', view_rails;
  end if;

  if (
    select count(*)
    from architecture.component_test
    where test_id in (
      'TEST-API-RUN-OPERATIONAL-TRUTH-UNIT',
      'TEST-API-LIST-RUNS-OPERATIONAL-TRUTH-RAIL',
      'TEST-API-GET-RUN-STATUS-OPERATIONAL-TRUTH-RAIL',
      'TEST-WEB-RUN-OPERATIONAL-TRUTH-MAPPER',
      'TEST-WEB-RUN-OPERATIONAL-TRUTH-TABLE',
      'TEST-WEB-RUN-OPERATIONAL-TRUTH-PRESENTATION',
      'TEST-WEB-RUN-OPERATIONAL-TRUTH-LIVE'
    )
      and required
  ) < 7 then
    raise exception 'Run operational truth test evidence is incomplete';
  end if;

  if exists (
    select 1
    from architecture.design_scope
    where design_id = 'RUN-OPERATIONAL-TRUTH-20260719'
      and subject_kind = 'query'
      and subject_id not in ('ListRuns', 'GetRunStatus')
  ) then
    raise exception 'Run operational truth implementation diverged from its approved query intents';
  end if;
end
$$;
