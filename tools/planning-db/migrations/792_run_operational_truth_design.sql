-- Design the shared operational run projection before changing runtime code.
-- ListRuns and GetRunStatus remain the canonical product query rails.

insert into architecture.design (
  design_id,
  work_item_id,
  title,
  owner,
  status,
  rationale,
  fowler_signal,
  rail_ref,
  approved_at
)
values (
  'RUN-OPERATIONAL-TRUTH-20260719',
  'E-RUN-OPERATIONAL-TRUTH-1',
  'Shared runs operational truth projection',
  'Architecture / API / Web Runs',
  'review',
  'ListRuns and GetRunStatus currently expose different identity and time shapes, while the browser fabricates startedAt from its local clock. A pure projection must bind persisted run metadata to canonical event-log status once, preserve missing evidence honestly, and feed both query rails without creating a third product query.',
  'boundary_drift',
  'ListRuns;GetRunStatus',
  null
)
on conflict (design_id) do update set
  status = excluded.status,
  rationale = excluded.rationale,
  fowler_signal = excluded.fowler_signal,
  rail_ref = excluded.rail_ref,
  updated_at = now();

insert into architecture.design_scope (
  design_id,
  subject_kind,
  subject_id,
  scope_kind,
  required
)
values
  ('RUN-OPERATIONAL-TRUTH-20260719', 'component', 'SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'component', 'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL', 'may_create', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'component', 'SYS-WEB-SERVICES-RUNS', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'component', 'SYS-WEB-VIEWS-RUNS', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'query', 'ListRuns', 'must_prove', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'query', 'GetRunStatus', 'must_prove', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/api/src/application/services/runOperationalTruth.ts', 'may_create', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/api/test/application/services/runOperationalTruth.test.ts', 'may_create', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/api/src/application/services/listRunsUseCase.ts', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/api/src/application/services/getRunStatusUseCase.ts', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/api/src/application/ports/runtime.ts', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/web/src/app/services/runs/**', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/web/src/app/ports/runs.ts', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/web/src/app/views/runs/**', 'may_update', true),
  ('RUN-OPERATIONAL-TRUTH-20260719', 'path', 'apps/web/src/app/views/RunsView.tsx', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

insert into planning_query_store.governance_component_local_definitions (
  component_id,
  source_path,
  source_content_sha256,
  revision,
  name,
  level,
  parent_id,
  root_unit,
  domain_unit,
  status,
  children_required,
  owned_concern,
  ddd_owner,
  cq_rails,
  created_by
)
values (
  'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'tools/planning-db/migrations/792_run_operational_truth_design.sql',
  repeat(md5('SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL:design:792'), 2),
  0,
  'API run operational read model',
  'component',
  'SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE',
  'SYS-DVT',
  'SYS-DVT',
  'review',
  false,
  'Projects persisted run identity and canonical event-log status into the common operational fields consumed by ListRuns and GetRunStatus.',
  'RunOperationalReadModel',
  'ListRuns;GetRunStatus',
  'codex'
)
on conflict (component_id) do update set
  source_path = excluded.source_path,
  source_content_sha256 = excluded.source_content_sha256,
  name = excluded.name,
  level = excluded.level,
  parent_id = excluded.parent_id,
  root_unit = excluded.root_unit,
  domain_unit = excluded.domain_unit,
  status = excluded.status,
  children_required = excluded.children_required,
  owned_concern = excluded.owned_concern,
  ddd_owner = excluded.ddd_owner,
  cq_rails = excluded.cq_rails;

insert into planning_query_store.governance_component_local_ownership_patterns (
  component_id,
  pattern_kind,
  pattern,
  pattern_order
)
values
  ('SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL', 'owns', 'apps/api/src/application/services/runOperationalTruth.ts', 0),
  ('SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL', 'owns', 'apps/api/test/application/services/runOperationalTruth.test.ts', 1)
on conflict (component_id, pattern_kind, pattern) do update set
  pattern_order = excluded.pattern_order;

insert into planning_query_store.governance_component_local_semantic_items (
  component_id,
  item_kind,
  item_value,
  item_order
)
values
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'responsibility',
    'Combine persisted run metadata and canonical event-log status into one immutable operational projection for the existing ListRuns and GetRunStatus rails.',
    0
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'reason_to_change',
    'The shared operator-visible identity, status, timestamp, duration, or failure-evidence vocabulary changes.',
    0
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'invariant',
    'Platform runId, projectId, environmentId, planId, planVersion, logical attempt, provider, and createdAt come only from persisted RunMetadata.',
    0
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'invariant',
    'Status, substatus, message, startedAt, completedAt, and execution evidence come only from canonical event-log status.',
    1
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'invariant',
    'durationMs exists only when valid canonical startedAt and completedAt values define a non-negative interval.',
    2
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'invariant',
    'Failure step and reason preserve canonical failure evidence and may be enriched only by the existing run-read evidence model.',
    3
  ),
  (
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'non_goal',
    'Create a third run query rail, infer provider status, or synthesize absent runtime timestamps.',
    0
  ),
  (
    'SYS-WEB-SERVICES-RUNS',
    'invariant',
    'The HTTP adapter preserves absent run timestamps and unknown status honestly; it never substitutes browser time, createdAt, or another alias for startedAt.',
    20
  ),
  (
    'SYS-WEB-VIEWS-RUNS',
    'invariant',
    'Runs list and detail render missing operational evidence as unavailable and derive no runtime truth from the browser clock.',
    20
  )
on conflict (component_id, item_kind, item_value) do update set
  item_order = excluded.item_order;

insert into architecture.component (
  component_id,
  name,
  kind,
  layer,
  owner,
  repo_path,
  public_contract,
  runtime,
  criticality,
  status,
  maturity_score,
  parent_component_id
)
values (
  'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'API run operational read model',
  'module',
  'application',
  'RunOperationalReadModel',
  'apps/api/src/application/services/runOperationalTruth.ts',
  'Pure RunMetadata plus CanonicalRunStatus to operational truth projection reused by ListRuns and GetRunStatus.',
  'node',
  'critical',
  'proposed',
  70,
  'SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE'
)
on conflict (component_id) do update set
  name = excluded.name,
  kind = excluded.kind,
  layer = excluded.layer,
  owner = excluded.owner,
  repo_path = excluded.repo_path,
  public_contract = excluded.public_contract,
  runtime = excluded.runtime,
  criticality = excluded.criticality,
  status = excluded.status,
  maturity_score = excluded.maturity_score,
  parent_component_id = excluded.parent_component_id,
  updated_at = now();

insert into architecture.component_responsibility (
  responsibility_id,
  component_id,
  responsibility,
  reason_to_change,
  ddd_owner,
  status
)
values (
  'RESP-SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'Project persisted identity and canonical status into one operator-facing run truth.',
  'The operator-visible run identity, lifecycle timing, duration, or failure-evidence contract changes.',
  'RunOperationalReadModel',
  'proposed'
)
on conflict (responsibility_id) do update set
  component_id = excluded.component_id,
  responsibility = excluded.responsibility,
  reason_to_change = excluded.reason_to_change,
  ddd_owner = excluded.ddd_owner,
  status = excluded.status;

insert into architecture.contract (
  contract_id,
  contract_kind,
  owner_component_id,
  contract_ref,
  compatibility,
  status,
  validation_command
)
values (
  'CONTRACT-RUN-OPERATIONAL-TRUTH',
  'type',
  'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'RunOperationalTruthDto',
  'internal',
  'proposed',
  'pnpm --filter dvt-api test -- apps/api/test/application/services/runOperationalTruth.test.ts apps/api/test/application/services/listRunsUseCase.test.ts apps/api/test/application/services/getRunStatusUseCase.test.ts'
)
on conflict (contract_id) do update set
  owner_component_id = excluded.owner_component_id,
  contract_ref = excluded.contract_ref,
  compatibility = excluded.compatibility,
  status = excluded.status,
  validation_command = excluded.validation_command;

insert into architecture.component_port (
  port_id,
  component_id,
  port_name,
  port_kind,
  direction,
  input_contract_id,
  output_contract_id,
  negative_tests,
  status
)
values (
  'PORT-API-RUN-OPERATIONAL-TRUTH-PROJECTION',
  'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
  'ProjectRunOperationalTruth',
  'query',
  'inbound',
  'CONTRACT-RUN-OPERATIONAL-TRUTH',
  'CONTRACT-RUN-OPERATIONAL-TRUTH',
  array[
    'provider run id replaces platform run id',
    'browser or server clock fabricates startedAt',
    'createdAt is relabeled as startedAt',
    'duration is emitted without two valid canonical timestamps',
    'list and detail disagree on shared operational fields',
    'failure evidence is discarded from a failed run'
  ]::text[],
  'proposed'
)
on conflict (port_id) do update set
  component_id = excluded.component_id,
  port_name = excluded.port_name,
  port_kind = excluded.port_kind,
  direction = excluded.direction,
  input_contract_id = excluded.input_contract_id,
  output_contract_id = excluded.output_contract_id,
  negative_tests = excluded.negative_tests,
  status = excluded.status;

insert into architecture.component_relation (
  relation_id,
  source_component_id,
  target_component_id,
  relation_type,
  direction,
  sync_async,
  contract_id,
  failure_mode,
  authorization_scope,
  source_refs,
  status
)
values
  (
    'REL-API-RUN-LIFECYCLE-CONTAINS-OPERATIONAL-READ-MODEL',
    'SYS-API-APPLICATION-SERVICES-RUN-LIFECYCLE',
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'contains',
    'outbound',
    'sync',
    'CONTRACT-RUN-OPERATIONAL-TRUTH',
    'ListRuns and GetRunStatus can drift into separate operational vocabularies.',
    'authorized run query scope',
    jsonb_build_array('ListRuns', 'GetRunStatus'),
    'proposed'
  ),
  (
    'REL-WEB-RUN-SERVICES-CONSUME-OPERATIONAL-TRUTH',
    'SYS-WEB-SERVICES-RUNS',
    'SYS-API-APPLICATION-RUN-OPERATIONAL-READ-MODEL',
    'consumes',
    'outbound',
    'sync',
    'CONTRACT-RUN-OPERATIONAL-TRUTH',
    'The browser fabricates or drops operational fields returned by the API.',
    'authorized workspace scope',
    jsonb_build_array('apps/web/src/app/services/runs/runsApiSnapshotMapper.ts'),
    'proposed'
  )
on conflict (relation_id) do update set
  source_component_id = excluded.source_component_id,
  target_component_id = excluded.target_component_id,
  relation_type = excluded.relation_type,
  direction = excluded.direction,
  sync_async = excluded.sync_async,
  contract_id = excluded.contract_id,
  failure_mode = excluded.failure_mode,
  authorization_scope = excluded.authorization_scope,
  source_refs = excluded.source_refs,
  status = excluded.status,
  updated_at = now();

do $$
begin
  if (
    select count(*)
    from architecture.design_scope
    where design_id = 'RUN-OPERATIONAL-TRUTH-20260719'
      and subject_kind = 'query'
      and subject_id in ('ListRuns', 'GetRunStatus')
      and required
  ) <> 2 then
    raise exception 'Run operational truth design must reuse ListRuns and GetRunStatus';
  end if;

  if exists (
    select 1
    from architecture.design_scope
    where design_id = 'RUN-OPERATIONAL-TRUTH-20260719'
      and subject_kind = 'query'
      and subject_id not in ('ListRuns', 'GetRunStatus')
  ) then
    raise exception 'Run operational truth design introduced a parallel product query intent';
  end if;
end
$$;
