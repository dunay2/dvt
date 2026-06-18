-- Sanitize component integrity baseline regressions exposed by the local
-- pre-push gate. This migration records DB-first component path ownership and
-- observability facts; it does not relax the integrity check or delete source.

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
  'PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618',
  'UXDB-CANVAS-FIRST-TEST-SLICES-1',
  'Planning DB component integrity baseline sanitization',
  'Architecture / Planning DB',
  'review',
  'The pre-push integrity gate requires zero phantom component paths, duplicate repo paths, and missing observability maturity. The affected records are existing DB component metadata, not product code. This design remaps composite components to canonical directories and records explicit observability evidence for static contracts, CI governance, and outbox worker operational surfaces.',
  'hidden_authority',
  'RecordArchitectureComponent;RecordArchitectureObservabilityEvidence;CheckPlanningDbComponentIntegrity',
  now()
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
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CI-GOVERNANCE-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CI-GOVERNANCE-SCRIPTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CONTRACTS-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-CONTRACTS-PACKAGE-TESTS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-REPO-METADATA-ROOT', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-REPO-METADATA-FOWLER-INBOX', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS', 'may_update', true),
  ('PLANNING-DB-COMPONENT-INTEGRITY-BASELINE-SANITIZE-20260618', 'component', 'SYS-WORKERS-ROOT', 'may_update', true)
on conflict (design_id, subject_kind, subject_id, scope_kind) do update set
  required = excluded.required;

update architecture.component
set
  repo_path = case component_id
    when 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS' then 'tools/planning-db/migrations'
    when 'SYS-CI-GOVERNANCE-ROOT' then '.github'
    when 'SYS-CI-GOVERNANCE-SCRIPTS' then 'scripts'
    when 'SYS-CONTRACTS-ROOT' then 'packages/@dvt/contracts'
    when 'SYS-CONTRACTS-PACKAGE-TESTS' then 'packages/@dvt/contracts/test'
    when 'SYS-REPO-METADATA-ROOT' then '.'
    when 'SYS-REPO-METADATA-FOWLER-INBOX' then 'buzon'
    when 'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS' then 'infra/db/migrations'
    when 'SYS-WORKERS-ROOT' then 'apps/outbox-worker'
    else repo_path
  end,
  updated_at = now()
where component_id in (
  'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS',
  'SYS-CI-GOVERNANCE-ROOT',
  'SYS-CI-GOVERNANCE-SCRIPTS',
  'SYS-CONTRACTS-ROOT',
  'SYS-CONTRACTS-PACKAGE-TESTS',
  'SYS-REPO-METADATA-ROOT',
  'SYS-REPO-METADATA-FOWLER-INBOX',
  'SYS-REPO-METADATA-INFRA-DB-MIGRATIONS',
  'SYS-WORKERS-ROOT'
);

insert into architecture.component_observability (
  observability_id,
  component_id,
  signal_name,
  signal_kind,
  required,
  status
)
values
  ('OBS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS-CHECKS', 'SYS-CI-GOVERNANCE-PLANNING-DB-MIGRATIONS', 'Planning DB migration health is observable through planning:db:migrate and test:planning:db:migrations.', 'log', true, 'implemented'),
  ('OBS-CI-GOVERNANCE-ROOT-CHECKS', 'SYS-CI-GOVERNANCE-ROOT', 'CI governance health is observable through verify:prepush, governance:refresh, and workflow validation logs.', 'log', true, 'implemented'),
  ('OBS-CI-GOVERNANCE-SCRIPTS-CHECKS', 'SYS-CI-GOVERNANCE-SCRIPTS', 'Governance script health is observable through governance:refresh, planning:db:check, and governance:db:check output.', 'log', true, 'implemented'),
  ('OBS-CONTRACTS-COMPAT-MATRIX-STATIC', 'SYS-CONTRACTS-COMPAT-MATRIX', 'Static contract artifact; runtime telemetry is not applicable and contract health is validated by contracts tests.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS-STATIC', 'SYS-CONTRACTS-ENGINE-RUNTIME-CONTRACTS', 'Static contract API; runtime telemetry is owned by engine runtime adapters, not this contract declaration.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-PACKAGE-ENTRYPOINTS-STATIC', 'SYS-CONTRACTS-PACKAGE-ENTRYPOINTS', 'Static package entrypoint; runtime telemetry is not applicable and API health is validated by package tests.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-PACKAGE-TESTS-STATIC', 'SYS-CONTRACTS-PACKAGE-TESTS', 'Test evidence component; runtime telemetry is not applicable and execution is observable through package test output.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-PLANNER-CONTRACTS-STATIC', 'SYS-CONTRACTS-PLANNER-CONTRACTS', 'Static planner contract declarations; runtime telemetry is owned by planner execution surfaces.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-ROOT-STATIC', 'SYS-CONTRACTS-ROOT', 'Contracts package root is a static package boundary; runtime telemetry is not applicable to the declaration surface.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-SCHEMA-PACKS-STATIC', 'SYS-CONTRACTS-SCHEMA-PACKS', 'Schema pack declarations are static contract artifacts validated through contract tests, not runtime telemetry.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-SHARED-TYPES-UTILS-STATIC', 'SYS-CONTRACTS-SHARED-TYPES-UTILS', 'Shared contract primitives are static code; runtime telemetry is not applicable to this component.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-STEP-REGISTRY-STATIC', 'SYS-CONTRACTS-STEP-REGISTRY', 'Step registry contract declarations are static and validated by contract tests; runtime telemetry is owned by step executors.', 'log', true, 'not_applicable'),
  ('OBS-CONTRACTS-VALIDATION-RUNTIME-STATIC', 'SYS-CONTRACTS-VALIDATION-RUNTIME', 'Contract validation helpers are static library code; runtime telemetry is not applicable to this component.', 'log', true, 'not_applicable'),
  ('OBS-PLANNER-CONTRACTS-PACKAGE-STATIC', 'SYS-PLANNER-CONTRACTS-PACKAGE', 'Planner contracts compatibility package is a static contract package; runtime telemetry is not applicable.', 'log', true, 'not_applicable'),
  ('OBS-WORKERS-OUTBOX-BUS-ADAPTERS-LOGS', 'SYS-WORKERS-OUTBOX-BUS-ADAPTERS', 'Outbox bus adapter delivery failures are observable through structured worker logs and outbox delivery metrics.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-CANARY-TESTS-HEALTH', 'SYS-WORKERS-OUTBOX-CANARY-TESTS', 'Outbox canary health is observable through standalone canary /healthz, /readyz, and /metrics assertions.', 'dashboard', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-DB-ADAPTER-LOGS', 'SYS-WORKERS-OUTBOX-DB-ADAPTER', 'Outbox database adapter health is observable through worker operational metrics and structured database error logs.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-HOST-LIFECYCLE-LOGS', 'SYS-WORKERS-OUTBOX-HOST-LIFECYCLE', 'Outbox host lifecycle is observable through bootstrap, shutdown, and cleanup structured logs.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-OPS-HEALTH', 'SYS-WORKERS-OUTBOX-OPS', 'Outbox operational server exposes /healthz, /readyz, and /metrics.', 'dashboard', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-OWNERSHIP-LOGS', 'SYS-WORKERS-OUTBOX-OWNERSHIP', 'Outbox ownership state is observable through ownership logs, readiness owner flags, and runtime owner metrics.', 'log', true, 'implemented'),
  ('OBS-WORKERS-OUTBOX-RUNTIME-METRICS', 'SYS-WORKERS-OUTBOX-RUNTIME', 'Outbox runtime state is observable through dvt_outbox_runtime_* readiness, state, error, and delivery metrics.', 'dashboard', true, 'implemented'),
  ('OBS-WORKERS-ROOT-HEALTH', 'SYS-WORKERS-ROOT', 'Worker root health is observable through outbox worker operational /healthz, /readyz, and /metrics surfaces.', 'dashboard', true, 'implemented')
on conflict (observability_id) do update set
  component_id = excluded.component_id,
  signal_name = excluded.signal_name,
  signal_kind = excluded.signal_kind,
  required = excluded.required,
  status = excluded.status;
